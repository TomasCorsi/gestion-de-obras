import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Download,
  DollarSign,
  CheckCircle,
  XCircle,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import { PersonalDB } from "@/hooks/usePersonal";
import { useSueldos } from "@/hooks/useSueldos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface SueldosTabProps {
  personal: PersonalDB[];
}

interface ImportRow {
  legajo: string;
  nombre: string;
  sueldo_blanco: number;
  sueldo_negro: number;
  modalidad_pago: string;
  personal_id: string | null;
  status: "ok" | "not_found";
}

function parseNumber(value: string | number): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const str = String(value).trim();
  const plain = parseFloat(str);
  if (!isNaN(plain) && /^-?\d+\.?\d*$/.test(str)) return plain;
  if (str.includes(",")) {
    const cleaned = str.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  }
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount > 1) {
    return parseFloat(str.replace(/\s/g, "").replace(/\./g, "")) || 0;
  }
  return parseFloat(str.replace(/\s/g, "")) || 0;
}

function findCol(headers: string[], names: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().trim());
  for (const n of names) {
    const idx = norm.findIndex((h) => h.includes(n.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function SueldosTab({ personal }: SueldosTabProps) {
  const now = new Date();
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [filterModalidad, setFilterModalidad] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const periodo = `${anio}-${mes}`;
  const { sueldos, isLoading, upsertSueldos, deletePeriodo } = useSueldos(periodo);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, []);

  const processFile = (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result as ArrayBuffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
        parseRows(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
        const rows = lines.map((l) => l.split(sep));
        parseRows(rows);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const parseRows = (rows: unknown[][]) => {
    if (rows.length < 2) {
      toast.error("Archivo sin datos suficientes");
      return;
    }
    const headers = (rows[0] as string[]).map((h) => String(h || "").trim());
    const legajoIdx = findCol(headers, ["legajo", "leg", "nro"]);
    const nombreIdx = findCol(headers, ["nombre", "apellido", "empleado"]);
    const blancoIdx = findCol(headers, ["blanco", "sueldo blanco", "sueldo_blanco"]);
    const negroIdx = findCol(headers, ["negro", "sueldo negro", "sueldo_negro"]);
    const modalidadIdx = findCol(headers, ["modalidad", "mod", "tipo pago", "modalidad_pago"]);

    if (legajoIdx === -1) { toast.error("No se encontró columna 'Legajo'"); return; }
    if (blancoIdx === -1) { toast.error("No se encontró columna 'Blanco'"); return; }

    const result: ImportRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i] as (string | number)[];
      if (!cols || cols.length <= legajoIdx) continue;
      const legajo = String(cols[legajoIdx] ?? "").trim();
      if (!legajo) continue;

      const blanco = parseNumber(cols[blancoIdx] ?? 0);
      const negro = negroIdx !== -1 ? parseNumber(cols[negroIdx] ?? 0) : 0;
      const nombre = nombreIdx !== -1 ? String(cols[nombreIdx] ?? "").trim() : "";
      let modalidad = modalidadIdx !== -1 ? String(cols[modalidadIdx] ?? "").trim().toLowerCase() : "quincenal";
      if (modalidad.startsWith("quince") || modalidad === "q") modalidad = "quincenal";
      else if (modalidad.startsWith("mens") || modalidad === "m") modalidad = "mensual";

      const emp = personal.find((p) => p.legajo === legajo);
      result.push({
        legajo,
        nombre: nombre || (emp ? `${emp.nombre || ""} ${emp.apellido || ""}`.trim() : ""),
        sueldo_blanco: blanco,
        sueldo_negro: negro,
        modalidad_pago: modalidad,
        personal_id: emp?.id || null,
        status: emp ? "ok" : "not_found",
      });
    }
    if (result.length === 0) { toast.error("No se encontraron registros válidos"); return; }
    setImportRows(result);
    toast.success(`${result.length} registros leídos`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const confirmImport = () => {
    const rows = importRows.map((r) => ({
      personal_id: r.personal_id,
      legajo: r.legajo,
      nombre: r.nombre,
      sueldo_blanco: r.sueldo_blanco,
      sueldo_negro: r.sueldo_negro,
      modalidad_pago: r.modalidad_pago,
      periodo,
    }));
    upsertSueldos.mutate(rows, { onSuccess: () => setImportRows([]) });
  };

  // Filter data for display
  const displayData = useMemo(() => {
    if (filterModalidad.length === 0) return sueldos;
    return sueldos.filter((s) => filterModalidad.includes(s.modalidad_pago));
  }, [sueldos, filterModalidad]);

  // KPIs
  const kpis = useMemo(() => {
    const quinc = sueldos.filter((s) => s.modalidad_pago === "quincenal");
    const mens = sueldos.filter((s) => s.modalidad_pago === "mensual");
    return {
      quincBlanco: quinc.reduce((a, s) => a + s.sueldo_blanco, 0),
      quincNegro: quinc.reduce((a, s) => a + s.sueldo_negro, 0),
      quincCount: quinc.length,
      mensBlanco: mens.reduce((a, s) => a + s.sueldo_blanco, 0),
      mensNegro: mens.reduce((a, s) => a + s.sueldo_negro, 0),
      mensCount: mens.length,
      totalBlanco: sueldos.reduce((a, s) => a + s.sueldo_blanco, 0),
      totalNegro: sueldos.reduce((a, s) => a + s.sueldo_negro, 0),
      total: sueldos.reduce((a, s) => a + s.sueldo_blanco + s.sueldo_negro, 0),
    };
  }, [sueldos]);

  const fmt = (n: number) => "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0 });

  // Table totals
  const tableTotals = useMemo(() => ({
    blanco: displayData.reduce((a, s) => a + s.sueldo_blanco, 0),
    negro: displayData.reduce((a, s) => a + s.sueldo_negro, 0),
    total: displayData.reduce((a, s) => a + s.sueldo_blanco + s.sueldo_negro, 0),
  }), [displayData]);

  return (
    <div className="space-y-6">
      {/* Period selector + Import */}
      <div className="card-industrial p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Sueldos por Período</h3>
            <p className="text-sm text-muted-foreground">
              Importá el Excel del estudio contable y visualizá blanco y negro
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="space-y-2">
            <Label>Año</Label>
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger className="w-[100px] bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mes</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[150px] bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {meses.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sueldos.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletePeriodo.mutate()}
              disabled={deletePeriodo.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Borrar período
            </Button>
          )}
        </div>

        {/* Upload zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            "border-primary/50 bg-primary/5 hover:border-primary"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-primary" />
          <p className="text-foreground font-medium">Arrastrá el Excel con los sueldos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Columnas esperadas: Legajo, Blanco, Negro, Modalidad (opcional: Nombre)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Import preview */}
      {importRows.length > 0 && (
        <div className="card-industrial overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Preview — {importRows.length} registros para {meses[parseInt(mes) - 1]} {anio}
              </span>
              <Badge variant="outline">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                {importRows.filter((r) => r.status === "ok").length} encontrados
              </Badge>
              {importRows.some((r) => r.status === "not_found") && (
                <Badge variant="outline">
                  <XCircle className="w-3 h-3 mr-1 text-red-500" />
                  {importRows.filter((r) => r.status === "not_found").length} no encontrados
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportRows([])}>
                Cancelar
              </Button>
              <Button
                onClick={confirmImport}
                disabled={upsertSueldos.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                {sueldos.length > 0 ? "Reemplazar período" : "Importar"}
              </Button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Legajo</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Nombre</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Modalidad</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Blanco</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Negro</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Total</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importRows.map((row, idx) => (
                  <TableRow key={idx} className="border-border">
                    <TableCell className="font-mono text-sm">{row.legajo}</TableCell>
                    <TableCell>{row.nombre || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{row.modalidad_pago}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(row.sueldo_blanco)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(row.sueldo_negro)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(row.sueldo_blanco + row.sueldo_negro)}</TableCell>
                    <TableCell>
                      {row.status === "ok" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* KPIs */}
      {sueldos.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard title="Blanco Quincenal" value={fmt(kpis.quincBlanco)} sub={`${kpis.quincCount} empleados`} color="blue" />
            <KPICard title="Negro Quincenal" value={fmt(kpis.quincNegro)} sub={`${kpis.quincCount} empleados`} color="red" />
            <KPICard title="Blanco Mensual" value={fmt(kpis.mensBlanco)} sub={`${kpis.mensCount} empleados`} color="blue" />
            <KPICard title="Negro Mensual" value={fmt(kpis.mensNegro)} sub={`${kpis.mensCount} empleados`} color="red" />
            <KPICard title="TOTAL GENERAL" value={fmt(kpis.total)} sub={`B: ${fmt(kpis.totalBlanco)} | N: ${fmt(kpis.totalNegro)}`} color="primary" />
          </div>

          {/* Filter + Table */}
          <div className="card-industrial overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="font-medium text-foreground">
                Detalle — {meses[parseInt(mes) - 1]} {anio}
              </span>
              <ToggleGroup
                type="multiple"
                value={filterModalidad}
                onValueChange={setFilterModalidad}
                className="gap-2"
              >
                <ToggleGroupItem
                  value="quincenal"
                  variant="outline"
                  size="sm"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  Quincenal ({kpis.quincCount})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="mensual"
                  variant="outline"
                  size="sm"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  Mensual ({kpis.mensCount})
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="max-h-[calc(100vh-500px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent sticky top-0 bg-card z-10">
                    <TableHead className="text-muted-foreground font-medium">Legajo</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Nombre</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Modalidad</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right">Blanco</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right">Negro</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((s) => (
                    <TableRow key={s.id} className="border-border">
                      <TableCell className="font-mono text-sm">{s.legajo}</TableCell>
                      <TableCell>{s.nombre || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{s.modalidad_pago}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(s.sueldo_blanco)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(s.sueldo_negro)}</TableCell>
                      <TableCell className="text-right font-bold">{fmt(s.sueldo_blanco + s.sueldo_negro)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-border bg-muted/50 font-bold">
                    <TableCell colSpan={3} className="text-right text-muted-foreground">TOTALES</TableCell>
                    <TableCell className="text-right">{fmt(tableTotals.blanco)}</TableCell>
                    <TableCell className="text-right">{fmt(tableTotals.negro)}</TableCell>
                    <TableCell className="text-right text-primary">{fmt(tableTotals.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {!isLoading && sueldos.length === 0 && importRows.length === 0 && (
        <div className="card-industrial p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No hay sueldos cargados para {meses[parseInt(mes) - 1]} {anio}.
            <br />
            Importá el Excel del estudio contable para comenzar.
          </p>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400",
    red: "text-red-400",
    primary: "text-primary",
  };
  return (
    <div className="card-industrial p-4">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className={cn("text-lg font-bold", colorMap[color] || "text-foreground")}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
