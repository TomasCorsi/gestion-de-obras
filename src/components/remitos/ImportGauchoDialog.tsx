import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { RemitoForm } from "@/hooks/useRemitos";
import { formatDate } from "@/lib/utils";
import {
  findMaquinariaId,
  parseDate,
  parseNumber,
  matchFromMap,
  normalizeValue,
  tipoMaterialNormalize,
  validMaterialTypes,
} from "./CSVImportDialog";

const PROVEEDOR_FIJO = "Canteras del Gaucho";
const TRANSPORTE_FIJO = "Calamina Sur";

interface ImportGauchoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (remitos: RemitoForm[]) => Promise<void>;
  maquinariasMap: Record<string, string>; // codigo -> id
  patentesMap: Record<string, string>; // patente normalizada -> id
  obrasMap: Record<string, string>; // nombre normalizado -> nombre real
  obrasClienteMap: Record<string, string>; // nombre real de obra -> cliente
}

interface ParsedRow {
  data: RemitoForm;
  row: number;
  patenteInput: string;
  patenteOk: boolean;
  obraInput: string;
  obraOk: boolean;
  materialOk: boolean;
}

interface ParseResult {
  valid: ParsedRow[];
  errors: { row: number; message: string }[];
}

const COLUMN_ALIASES: Record<string, string[]> = {
  fecha: ["fecha", "date"],
  remito: ["remito n°", "remito nº", "remito n", "remito no", "remito", "remito numero", "remito número", "n° remito", "nro remito"],
  material: ["material", "tipo material", "tipo_material"],
  patente: ["patente", "dominio", "vehiculo", "vehículo"],
  hasta: ["hasta", "obra"],
  m3: ["m3", "m³", "cantidad", "metros cubicos", "metros cúbicos"],
  precio: ["precio", "precio unitario", "precio uni", "precio uni."],
  importe: ["importe", "total", "precio total", "monto"],
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, " ");
}

function excelSerialToISO(serial: number): string | null {
  if (!isFinite(serial) || serial <= 0) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function parseRows(rows: unknown[][], maps: {
  maquinariasMap: Record<string, string>;
  patentesMap: Record<string, string>;
  obrasMap: Record<string, string>;
  obrasClienteMap: Record<string, string>;
}): ParseResult {
  const valid: ParsedRow[] = [];
  const errors: { row: number; message: string }[] = [];

  // Buscar la fila de encabezados (primeras 10 filas)
  let headerIdx = -1;
  let colIndex: Record<string, number> = {};
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const headers = (rows[r] || []).map(normalizeHeader);
    const idx: Record<string, number> = {};
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      const found = headers.findIndex((h) => aliases.includes(h));
      if (found !== -1) idx[key] = found;
    }
    if (idx.fecha !== undefined && (idx.m3 !== undefined || idx.material !== undefined)) {
      headerIdx = r;
      colIndex = idx;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      valid: [],
      errors: [{ row: 0, message: "No se encontraron los encabezados esperados (fecha, remito N°, material, patente, Hasta, m3, precio, importe)" }],
    };
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const values = rows[i] || [];
    const raw = (key: string): string => {
      const idx = colIndex[key];
      if (idx === undefined) return "";
      const v = values[idx];
      return v === null || v === undefined ? "" : String(v).trim();
    };

    const fechaCell = colIndex.fecha !== undefined ? values[colIndex.fecha] : undefined;
    const remitoRaw = raw("remito");
    const materialRaw = raw("material");
    const patenteRaw = raw("patente");
    const hastaRaw = raw("hasta");
    const m3Raw = raw("m3");
    const precioRaw = raw("precio");
    const importeRaw = raw("importe");

    // Fila vacía
    if (!remitoRaw && !materialRaw && !patenteRaw && !hastaRaw && !m3Raw) continue;

    let fecha: string | null = null;
    if (typeof fechaCell === "number") {
      fecha = excelSerialToISO(fechaCell);
    } else if (fechaCell instanceof Date) {
      fecha = `${fechaCell.getFullYear()}-${String(fechaCell.getMonth() + 1).padStart(2, "0")}-${String(fechaCell.getDate()).padStart(2, "0")}`;
    } else {
      fecha = parseDate(String(fechaCell ?? "").trim());
    }
    if (!fecha) {
      errors.push({ row: i + 1, message: `Fecha inválida: ${String(fechaCell ?? "")}` });
      continue;
    }

    const { id: maquinaria_id } = patenteRaw
      ? findMaquinariaId(patenteRaw, maps.maquinariasMap, maps.patentesMap)
      : { id: undefined };

    const obraMatch = matchFromMap(hastaRaw, maps.obrasMap);
    const hasta = obraMatch.matched;
    const cliente = obraMatch.found ? maps.obrasClienteMap[hasta] : undefined;

    const tipo_material = normalizeValue(materialRaw, tipoMaterialNormalize) || materialRaw || "";
    const materialOk = !materialRaw || validMaterialTypes.has(tipo_material);

    const cantidad = parseNumber(m3Raw);
    const precio_unitario = parseNumber(precioRaw);
    const importe = parseNumber(importeRaw);
    const precio_total = importe || precio_unitario * cantidad;

    valid.push({
      data: {
        numero: remitoRaw || `CDG-${Date.now()}-${i}`,
        fecha,
        material: tipo_material,
        cantidad,
        unidad: "M3",
        recibido_por: "",
        firmado: false,
        remito_tercero: remitoRaw || undefined,
        hasta: hasta || undefined,
        cantidad_viajes: 1,
        cantidad_uni: cantidad,
        tipo_material: tipo_material || undefined,
        precio_unitario,
        precio_calc_mode: "cantidad",
        precio_total,
        tipo_transporte: TRANSPORTE_FIJO,
        maquinaria_id: maquinaria_id || undefined,
        proveedor: PROVEEDOR_FIJO,
        cliente: cliente || undefined,
      },
      row: i + 1,
      patenteInput: patenteRaw,
      patenteOk: !!maquinaria_id,
      obraInput: hastaRaw,
      obraOk: obraMatch.found,
      materialOk,
    });
  }

  return { valid, errors };
}

export function ImportGauchoDialog({
  open,
  onOpenChange,
  onImport,
  maquinariasMap,
  patentesMap,
  obrasMap,
  obrasClienteMap,
}: ImportGauchoDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = [".xlsx", ".xls", ".csv", ".tsv", ".txt"];
    if (!validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext))) {
      toast.error("Formato no soportado. Usá Excel (.xlsx) o CSV");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
      setFile(selectedFile);
      setParseResult(parseRows(rows, { maquinariasMap, patentesMap, obrasMap, obrasClienteMap }));
    } catch {
      toast.error("No se pudo leer el archivo");
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(parseResult.valid.map((r) => r.data));
      toast.success(`${parseResult.valid.length} remitos importados correctamente`);
      handleClose();
    } catch {
      toast.error("Error al importar remitos");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const headers = ["fecha", "remito N°", "nombre cliente", "material", "transporte", "patente", "Hasta", "Destino", "m3", "precio", "importe"];
    const example = ["01/08/2026", "12345", "Cliente Ejemplo", "Suelo seleccionado", "Calamina Sur", "AB629JD", "Ceamse Tristan Suarez", "Obra", "18", "12000", "216000"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Remitos");
    XLSX.writeFile(wb, "plantilla_canteras_del_gaucho.xlsx");
  };

  const sinPatente = parseResult?.valid.filter((r) => r.patenteInput && !r.patenteOk).length ?? 0;
  const sinObra = parseResult?.valid.filter((r) => r.obraInput && !r.obraOk).length ?? 0;
  const materialDesconocido = parseResult?.valid.filter((r) => !r.materialOk).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar remitos Canteras del Gaucho</DialogTitle>
          <DialogDescription>
            Subí el Excel (o CSV) con las columnas: fecha, remito N°, nombre cliente, material, transporte, patente, Hasta, Destino, m3, precio, importe.
            Todos se cargan con unidad M3, 1 viaje, transporte Calamina Sur y proveedor Canteras del Gaucho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Descargar plantilla
          </Button>

          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="w-5 h-5 text-primary" />
                <span>{file.name}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Hacé clic para seleccionar el archivo</p>
              </div>
            )}
          </div>

          {parseResult && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {parseResult.valid.length} remitos listos
                </Badge>
                {sinPatente > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {sinPatente} sin vehículo vinculado
                  </Badge>
                )}
                {sinObra > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {sinObra} sin obra vinculada
                  </Badge>
                )}
                {materialDesconocido > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {materialDesconocido} material no reconocido
                  </Badge>
                )}
                {parseResult.errors.length > 0 && (
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {parseResult.errors.length} filas con error
                  </Badge>
                )}
              </div>

              {parseResult.errors.length > 0 && (
                <ScrollArea className="h-24 rounded border border-destructive/30 p-2">
                  {parseResult.errors.map((e, idx) => (
                    <p key={idx} className="text-xs text-destructive">
                      Fila {e.row}: {e.message}
                    </p>
                  ))}
                </ScrollArea>
              )}

              {parseResult.valid.length > 0 && (
                <ScrollArea className="h-64 rounded border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left">
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Remito</th>
                        <th className="p-2">Material</th>
                        <th className="p-2">Patente</th>
                        <th className="p-2">Hasta</th>
                        <th className="p-2">Cliente</th>
                        <th className="p-2 text-right">M3</th>
                        <th className="p-2 text-right">Precio</th>
                        <th className="p-2 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.valid.map((r) => (
                        <tr key={r.row} className="border-t border-border">
                          <td className="p-2">{r.data.fecha}</td>
                          <td className="p-2">{r.data.remito_tercero}</td>
                          <td className={`p-2 ${r.materialOk ? "" : "text-amber-600"}`}>{r.data.tipo_material}</td>
                          <td className={`p-2 ${r.patenteInput && !r.patenteOk ? "text-amber-600" : ""}`}>{r.patenteInput || "-"}</td>
                          <td className={`p-2 ${r.obraInput && !r.obraOk ? "text-amber-600" : ""}`}>{r.data.hasta || "-"}</td>
                          <td className="p-2">{r.data.cliente || "-"}</td>
                          <td className="p-2 text-right">{r.data.cantidad}</td>
                          <td className="p-2 text-right">{r.data.precio_unitario}</td>
                          <td className="p-2 text-right">{r.data.precio_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !parseResult || parseResult.valid.length === 0}>
              {isImporting ? "Importando..." : `Importar ${parseResult?.valid.length ?? 0} remitos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
