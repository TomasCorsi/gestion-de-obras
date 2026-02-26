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
import { Upload, FileText, AlertCircle, CheckCircle, Download, Hash, CreditCard, Type, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { RemitoForm } from "@/hooks/useRemitos";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (remitos: RemitoForm[]) => Promise<void>;
  maquinariasMap: Record<string, string>; // codigo -> id
  patentesMap: Record<string, string>; // patente normalizada -> id
}

type MatchMethod = 'codigo' | 'patente' | 'no_encontrada';

interface ParsedRow {
  data: RemitoForm;
  patenteInput: string;
  matchMethod: MatchMethod;
  row: number;
}

interface ValidationWarning {
  field: string;
  value: string;
  row: number;
}

interface ParseResult {
  valid: ParsedRow[];
  errors: { row: number; message: string }[];
  warnings: ValidationWarning[];
}

function detectSeparator(line: string): string {
  const separators = [";", "\t", ","];
  let maxCount = 0;
  let detectedSeparator = ",";
  
  for (const sep of separators) {
    const count = (line.match(new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedSeparator = sep;
    }
  }
  
  return detectedSeparator;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try DD/MM/YYYY or D/M/YYYY format
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

function findMaquinariaId(
  value: string,
  maquinariasMap: Record<string, string>,
  patentesMap: Record<string, string>
): { id: string | undefined; method: MatchMethod } {
  if (!value) return { id: undefined, method: 'no_encontrada' };
  
  const trimmed = value.trim();
  const upperTrimmed = trimmed.toUpperCase();
  const normalized = upperTrimmed.replace(/[-\s]/g, '');
  const lowerTrimmed = trimmed.toLowerCase();
  
  // 1. Búsqueda exacta por código
  if (maquinariasMap[trimmed]) {
    return { id: maquinariasMap[trimmed], method: 'codigo' };
  }
  
  // 2. Extraer código de formato "708-TOPADOR-LIUGONG"
  const codePart = trimmed.split('-')[0]?.trim();
  if (codePart && maquinariasMap[codePart]) {
    return { id: maquinariasMap[codePart], method: 'codigo' };
  }
  
  // 3. Búsqueda exacta por patente (mayúsculas)
  if (patentesMap[upperTrimmed]) {
    return { id: patentesMap[upperTrimmed], method: 'patente' };
  }
  
  // 4. Búsqueda normalizada por patente (sin espacios/guiones)
  if (patentesMap[normalized]) {
    return { id: patentesMap[normalized], method: 'patente' };
  }
  
  // 5. Búsqueda case-insensitive en códigos
  for (const [codigo, id] of Object.entries(maquinariasMap)) {
    if (codigo.toLowerCase() === lowerTrimmed) {
      return { id, method: 'codigo' };
    }
    if (codigo.toLowerCase() === codePart?.toLowerCase()) {
      return { id, method: 'codigo' };
    }
  }
  
  return { id: undefined, method: 'no_encontrada' };
}

// Material type normalization
const tipoMaterialNormalize: Record<string, string> = {
  'residuos': 'Residuos',
  'desmonte': 'Desmonte',
  'cascote': 'Cascote',
  'escombro': 'Escombro',
  'tierra': 'Tierra',
  'piedra': 'Piedra',
  'movimiento interno': 'Movimiento interno',
  'mov interno': 'Movimiento interno',
  'mov. interno': 'Movimiento interno',
  'tosca': 'Tosca',
  'cemento': 'Cemento',
  'hormigon': 'Hormigon',
  'hormigón': 'Hormigon',
  'traslado': 'Traslado',
  'cubiertas': 'Cubiertas',
  'frezado': 'Frezado',
  'cobertura de residuos': 'Cobertura de residuos',
  'cobertura de basura': 'Cobertura de residuos',
  'arena': 'Arena',
  'hormigon h30': 'Hormigon H30',
  'hormigón h30': 'Hormigon H30',
  'tierra negra': 'Tierra negra',
  'relleno': 'Relleno',
  'piedra 30/50': 'Piedra 30/50',
  'materiales varios': 'Materiales varios',
};

// Valid material types for validation
const validMaterialTypes = new Set(Object.values(tipoMaterialNormalize));

// Transport type normalization
const tipoTransporteNormalize: Record<string, string> = {
  'calamina sur': 'Calamina Sur',
  'calamina': 'Calamina Sur',
  'geo hermanos': 'Geo hermanos',
  'geo': 'Geo hermanos',
  'diaz neiva': 'Diaz Neiva',
  'diaz': 'Diaz Neiva',
  'japones': 'japones',
  'japonés': 'japones',
  'cato': 'Cato',
  'tatu': 'Tatu',
  'patan': 'Patan',
  'patán': 'Patan',
  'hormigret': 'Hormigret',
  'lamacol': 'Lamacol',
  'britcom': 'Britcom',
  'ramon romero gomez': 'Ramon romero gomez',
  'ramon romero': 'Ramon romero gomez',
  'duraez': 'Duraez',
};

// Valid transport types for validation
const validTransportTypes = new Set(Object.values(tipoTransporteNormalize));

// Unit normalization
const unidadNormalize: Record<string, string> = {
  'tn': 'TN',
  'tonelada': 'TN',
  'toneladas': 'TN',
  'kg': 'KG',
  'kilogramo': 'KG',
  'kilogramos': 'KG',
  'm3': 'M3',
  'm³': 'M3',
  'metros cubicos': 'M3',
  'm2': 'M2',
  'm²': 'M2',
  'metros cuadrados': 'M2',
  'u': 'U',
  'unidad': 'U',
  'unidades': 'U',
};

function normalizeValue(value: string, map: Record<string, string>): string | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  return map[lower];
}

function parseCSV(
  text: string,
  maquinariasMap: Record<string, string>,
  patentesMap: Record<string, string>
): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "El archivo debe tener al menos una fila de encabezados y una de datos" }], warnings: [] };
  }

  const firstLine = lines[0];
  const separator = detectSeparator(firstLine);

  const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  // Map possible column names
  const columnAliases: Record<string, string[]> = {
    remito_tercero: ['remito_tercero', 'remito tercero', 'rem_tercero', 'tercero', 'externo'],
    remito_local: ['remito_local', 'remito local', 'rem_local', 'local', 'interno', 'numero', 'nro'],
    fecha: ['fecha', 'date'],
    desde: ['desde', 'origen', 'from', 'de'],
    hasta: ['hasta', 'destino', 'to', 'a'],
    cantidad_viajes: ['cantidad_viajes', 'viajes', 'cant_viajes', 'trips'],
    unidad: ['unidad', 'unit', 'un'],
    cantidad: ['cantidad', 'cant', 'quantity', 'amount'],
    tipo_material: ['tipo_material', 'tipo', 'material', 'type'],
    precio_total: ['precio_total', 'precio', 'total', 'price', 'monto'],
    tipo_transporte: ['tipo_transporte', 'transporte', 'transport', 'empresa'],
    patente: ['patente', 'maquinaria', 'maquinaria_id', 'equipo', 'dominio', 'vehiculo'],
    proveedor: ['proveedor', 'provider', 'supplier'],
    cliente: ['cliente', 'client', 'customer'],
  };

  // Find column indices
  const colIndex: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(columnAliases)) {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) {
        colIndex[key] = idx;
        break;
      }
    }
  }

  const valid: ParsedRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const warnings: ValidationWarning[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim().replace(/['"]/g, ''));
    
    const getValue = (key: string): string => {
      const idx = colIndex[key];
      return idx !== undefined ? values[idx] || "" : "";
    };

    // Parse fecha
    const fechaRaw = getValue('fecha');
    const fecha = fechaRaw ? parseDate(fechaRaw) : new Date().toISOString().split('T')[0];

    // Parse patente/maquinaria
    const patenteValue = getValue('patente');
    const { id: maquinaria_id, method: matchMethod } = patenteValue 
      ? findMaquinariaId(patenteValue, maquinariasMap, patentesMap) 
      : { id: undefined, method: 'no_encontrada' as MatchMethod };
    
    if (patenteValue && !maquinaria_id) {
      errors.push({ row: i + 1, message: `Patente/Maquinaria no encontrada: ${patenteValue}` });
    }

    // Parse cantidad_viajes
    const viajesRaw = getValue('cantidad_viajes');
    const cantidad_viajes = viajesRaw ? parseInt(viajesRaw, 10) : 1;

    // Parse unidad
    const unidadRaw = getValue('unidad');
    const unidad = normalizeValue(unidadRaw, unidadNormalize) || unidadRaw?.toUpperCase() || 'M3';

    // Parse cantidad
    const cantidadRaw = getValue('cantidad');
    const cantidad = cantidadRaw ? parseFloat(cantidadRaw.replace(',', '.')) : 0;

    // Parse tipo_material
    const tipoMaterialRaw = getValue('tipo_material');
    const tipo_material = normalizeValue(tipoMaterialRaw, tipoMaterialNormalize) || tipoMaterialRaw || '';
    
    // Warn if material type is not recognized
    if (tipoMaterialRaw && !validMaterialTypes.has(tipo_material)) {
      warnings.push({ field: 'tipo_material', value: tipoMaterialRaw, row: i + 1 });
    }
    // Parse precio_total
    const precioRaw = getValue('precio_total');
    const precio_total = precioRaw ? parseFloat(precioRaw.replace(',', '.').replace(/[^\d.]/g, '')) : 0;

    // Parse tipo_transporte
    const tipoTransporteRaw = getValue('tipo_transporte');
    const tipo_transporte = normalizeValue(tipoTransporteRaw, tipoTransporteNormalize) || tipoTransporteRaw || '';

    // Warn if transport type is not recognized
    if (tipoTransporteRaw && !validTransportTypes.has(tipo_transporte)) {
      warnings.push({ field: 'tipo_transporte', value: tipoTransporteRaw, row: i + 1 });
    }
    // Get text fields
    const remito_tercero = getValue('remito_tercero');
    const remito_local = getValue('remito_local');
    const desde = getValue('desde');
    const hasta = getValue('hasta');
    const proveedor = getValue('proveedor');
    const cliente = getValue('cliente');

    // Generate numero for legacy field
    const numero = remito_local || `IMP-${i}`;

    // Skip empty rows
    if (!remito_tercero && !remito_local && !desde && !hasta && cantidad === 0) {
      continue;
    }

    valid.push({
      data: {
        numero,
        fecha: fecha || new Date().toISOString().split('T')[0],
        obra_id: '', // Will be empty - user can set later
        material: tipo_material,
        cantidad: isNaN(cantidad) ? 0 : cantidad,
        unidad: ['TN', 'KG', 'M3', 'M2', 'U'].includes(unidad) ? unidad : 'M3',
        recibido_por: '',
        firmado: false,
        remito_tercero: remito_tercero || undefined,
        remito_local: remito_local || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        cantidad_viajes: isNaN(cantidad_viajes) ? 1 : cantidad_viajes,
        tipo_material: tipo_material || undefined,
        precio_total: isNaN(precio_total) ? 0 : precio_total,
        tipo_transporte: tipo_transporte || undefined,
        maquinaria_id: maquinaria_id || undefined,
      },
      patenteInput: patenteValue,
      matchMethod: patenteValue ? matchMethod : 'no_encontrada',
      row: i + 1,
    });
  }

  return { valid, errors, warnings };
}

const matchMethodConfig: Record<MatchMethod, { label: string; icon: React.ElementType; className: string }> = {
  codigo: { 
    label: 'Código', 
    icon: Hash, 
    className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
  },
  patente: { 
    label: 'Patente', 
    icon: CreditCard, 
    className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' 
  },
  no_encontrada: { 
    label: 'No encontrada', 
    icon: HelpCircle, 
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' 
  },
};

export function RemitosCSVImportDialog({ open, onOpenChange, onImport, maquinariasMap, patentesMap }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = [".csv", ".tsv", ".txt"];
    const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExtension) {
      toast.error("Por favor selecciona un archivo CSV o TSV");
      return;
    }

    setFile(selectedFile);
    const text = await selectedFile.text();
    const result = parseCSV(text, maquinariasMap, patentesMap);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parseResult.valid.map(row => row.data));
      toast.success(`${parseResult.valid.length} remitos importados correctamente`);
      handleClose();
    } catch (error) {
      toast.error("Error al importar remitos");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const headers = [
      "remito_tercero", "remito_local", "fecha", "proveedor", "desde", "hasta", "cliente",
      "cantidad_viajes", "unidad", "cantidad", "tipo_material", 
      "precio_total", "tipo_transporte", "patente"
    ].join(";");
    const example = [
      "00123", "REM-2026-001", "26/01/2026", "Proveedor SA", "Cantera", "Obra Centro", "Cliente SRL",
      "3", "TN", "45", "Tosca", "150000", "Calamina Sur", "ABC-123"
    ].join(";");
    const content = `${headers}\n${example}`;
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "remitos_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats for match methods
  const matchStats = parseResult?.valid.reduce((acc, row) => {
    if (row.patenteInput) {
      acc[row.matchMethod] = (acc[row.matchMethod] || 0) + 1;
    }
    return acc;
  }, {} as Record<MatchMethod, number>) || {};

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Importar Remitos</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV/TSV. La columna "patente" puede contener código o patente de maquinaria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Template Download */}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar plantilla
          </Button>

          {/* File Upload */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-foreground">
                <FileText className="w-5 h-5" />
                <span>{file.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Haz clic para seleccionar un archivo (CSV/TSV)
                </p>
              </div>
            )}
          </div>

          {/* Parse Results */}
          {parseResult && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Summary Stats */}
              <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/50">
                {parseResult.valid.length > 0 && (
                  <div className="flex items-center gap-2 text-base font-medium text-primary">
                    <CheckCircle className="w-5 h-5" />
                    {parseResult.valid.length} registros válidos
                  </div>
                )}
                {parseResult.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-base font-medium text-muted-foreground">
                    <AlertCircle className="w-5 h-5" />
                    {parseResult.errors.length} advertencias
                  </div>
                )}
              </div>

              {/* Validation Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                    ⚠️ {parseResult.warnings.length} valores no reconocidos (se importarán tal cual)
                  </p>
                  <div className="max-h-24 overflow-y-auto text-xs space-y-0.5">
                    {parseResult.warnings.slice(0, 15).map((w, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        Fila {w.row}: {w.field === 'tipo_material' ? 'Material' : 'Transporte'} "{w.value}" no está en la lista
                      </p>
                    ))}
                    {parseResult.warnings.length > 15 && (
                      <p className="text-muted-foreground">...y {parseResult.warnings.length - 15} más</p>
                    )}
                  </div>
                </div>
              )}

              {Object.keys(matchStats).length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {Object.entries(matchStats).map(([method, count]) => {
                    const config = matchMethodConfig[method as MatchMethod];
                    const Icon = config.icon;
                    return (
                      <Badge 
                        key={method} 
                        variant="outline" 
                        className={`px-3 py-1.5 text-sm font-medium ${config.className}`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {count as number} por {config.label.toLowerCase()}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Preview Table */}
              {parseResult.valid.length > 0 && (
                <div className="flex-1 overflow-hidden border rounded-lg bg-background">
                  <ScrollArea className="h-[280px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-foreground w-14">Fila</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Rem. Tercero</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Rem. Local</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground w-24">Fecha</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Desde → Hasta</th>
                          <th className="px-3 py-2 text-right font-semibold text-foreground w-16">Cant.</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Tipo</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Patente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {parseResult.valid.slice(0, 100).map((row, idx) => {
                          const config = matchMethodConfig[row.matchMethod];
                          const Icon = config.icon;
                          return (
                            <tr key={idx} className="hover:bg-muted/50 transition-colors">
                              <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.row}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.data.remito_tercero || '-'}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.data.remito_local || '-'}</td>
                              <td className="px-3 py-2 text-xs">{row.data.fecha}</td>
                              <td className="px-3 py-2 text-xs max-w-[150px] truncate">
                                {row.data.desde || '-'} → {row.data.hasta || '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs">
                                {row.data.cantidad} {row.data.unidad}
                              </td>
                              <td className="px-3 py-2 text-xs">{row.data.tipo_material || '-'}</td>
                              <td className="px-3 py-2">
                                {row.patenteInput ? (
                                  <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${config.className}`}>
                                    <Icon className="w-3 h-3 mr-1" />
                                    {row.patenteInput.substring(0, 10)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {parseResult.valid.length > 100 && (
                          <tr>
                            <td colSpan={8} className="p-2 text-center text-muted-foreground text-xs">
                              ...y {parseResult.valid.length - 100} filas más
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="max-h-20 overflow-y-auto text-xs space-y-1 bg-muted p-2 rounded">
                    {parseResult.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        Fila {err.row}: {err.message}
                      </p>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <p className="text-muted-foreground">
                        ...y {parseResult.errors.length - 10} advertencias más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!parseResult || parseResult.valid.length === 0 || isImporting}
            >
              {isImporting ? "Importando..." : `Importar ${parseResult?.valid.length || 0} registros`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
