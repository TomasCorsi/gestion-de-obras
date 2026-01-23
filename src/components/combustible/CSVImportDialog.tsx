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
import { CargaCombustibleForm } from "@/hooks/useCombustible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cargas: CargaCombustibleForm[]) => Promise<void>;
  obrasMap: Record<string, string>; // nombre -> id
  maquinariasMap: Record<string, string>; // codigo -> id
  patentesMap: Record<string, string>; // patente normalizada -> id
  nombresMap: Record<string, string>; // nombre normalizado -> id
}

type MatchMethod = 'codigo' | 'patente' | 'nombre' | 'no_encontrada';

interface ParsedRow {
  data: CargaCombustibleForm;
  maquinariaInput: string;
  matchMethod: MatchMethod;
  row: number;
}

interface ParseResult {
  valid: ParsedRow[];
  errors: { row: number; message: string }[];
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
  patentesMap: Record<string, string>,
  nombresMap: Record<string, string>
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
  
  // 6. Búsqueda por nombre (exacta y parcial)
  if (nombresMap[lowerTrimmed]) {
    return { id: nombresMap[lowerTrimmed], method: 'nombre' };
  }
  
  // 7. Búsqueda parcial por nombre (el input está contenido en el nombre o viceversa)
  for (const [nombre, id] of Object.entries(nombresMap)) {
    if (nombre.includes(lowerTrimmed) || lowerTrimmed.includes(nombre)) {
      return { id, method: 'nombre' };
    }
  }
  
  return { id: undefined, method: 'no_encontrada' };
}

function findObraId(
  value: string,
  obrasMap: Record<string, string>
): string | undefined {
  if (!value) return undefined;
  
  const trimmed = value.trim().toLowerCase();
  
  // Direct match
  if (obrasMap[trimmed]) {
    return obrasMap[trimmed];
  }
  
  // Partial match (obra name contains the search value)
  for (const [nombre, id] of Object.entries(obrasMap)) {
    if (nombre.includes(trimmed) || trimmed.includes(nombre)) {
      return id;
    }
  }
  
  return undefined;
}

function parseCSV(
  text: string,
  obrasMap: Record<string, string>,
  maquinariasMap: Record<string, string>,
  patentesMap: Record<string, string>,
  nombresMap: Record<string, string>
): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "El archivo debe tener al menos una fila de encabezados y una de datos" }] };
  }

  const firstLine = lines[0];
  const separator = detectSeparator(firstLine);

  const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  // Map possible column names
  const columnAliases: Record<string, string[]> = {
    fecha: ['fecha', 'date'],
    maquinaria: ['maquinaria', 'maquinaria_id', 'maquina', 'machine', 'equipo', 'patente', 'dominio', 'unidad', 'nombre'],
    obra: ['obra', 'obra_id', 'proyecto', 'project'],
    litros: ['litros', 'liters', 'cantidad'],
    precio_litro: ['precio_litro', 'precio', 'price', 'precio_por_litro'],
    horas_maquina: ['horas_maquina', 'horas', 'hours'],
    estacion: ['estacion', 'station', 'estación'],
    operador: ['operador', 'operator', 'chofer', 'driver'],
    comprobante: ['comprobante', 'factura', 'receipt', 'invoice'],
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

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim().replace(/['"]/g, ''));
    
    const getValue = (key: string): string => {
      const idx = colIndex[key];
      return idx !== undefined ? values[idx] || "" : "";
    };

    // Parse fecha (optional now)
    const fechaRaw = getValue('fecha');
    const fecha = fechaRaw ? parseDate(fechaRaw) : null;

    // Buscar maquinaria por código, patente o nombre
    const maquinariaValue = getValue('maquinaria');
    const { id: maquinaria_id, method: matchMethod } = maquinariaValue 
      ? findMaquinariaId(maquinariaValue, maquinariasMap, patentesMap, nombresMap) 
      : { id: undefined, method: 'no_encontrada' as MatchMethod };
    
    // Log warning but don't skip if machinery not found
    if (maquinariaValue && !maquinaria_id) {
      errors.push({ row: i + 1, message: `Maquinaria no encontrada: ${maquinariaValue}` });
    }

    // Buscar obra (optional)
    const obraValue = getValue('obra');
    const obra_id = obraValue ? findObraId(obraValue, obrasMap) : undefined;
    
    if (obraValue && !obra_id) {
      errors.push({ row: i + 1, message: `Obra no encontrada: ${obraValue}` });
    }

    // Parse litros (optional, default 0)
    const litrosRaw = getValue('litros');
    const litros = litrosRaw ? parseFloat(litrosRaw.replace(',', '.')) : 0;

    // Parse precio_litro (optional, default 0)
    const precioRaw = getValue('precio_litro');
    const precio_litro = precioRaw ? parseFloat(precioRaw.replace(',', '.')) : 0;

    const horasRaw = getValue('horas_maquina');
    const horas_maquina = horasRaw ? parseFloat(horasRaw.replace(',', '.')) : 0;
    
    const costo_total = litros * precio_litro;

    // Only skip completely empty rows
    if (!fecha && !maquinaria_id && !obra_id && litros === 0 && precio_litro === 0) {
      continue;
    }

    valid.push({
      data: {
        fecha: fecha || undefined,
        obra_id: obra_id || undefined,
        maquinaria_id: maquinaria_id || undefined,
        litros: isNaN(litros) ? 0 : litros,
        precio_litro: isNaN(precio_litro) ? 0 : precio_litro,
        costo_total: isNaN(costo_total) ? 0 : costo_total,
        horas_maquina: isNaN(horas_maquina) ? 0 : horas_maquina,
        estacion: getValue('estacion') || undefined,
        operador: getValue('operador') || undefined,
        comprobante: getValue('comprobante') || undefined,
      },
      maquinariaInput: maquinariaValue,
      matchMethod: maquinariaValue ? matchMethod : 'no_encontrada',
      row: i + 1,
    });
  }

  return { valid, errors };
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
  nombre: { 
    label: 'Nombre', 
    icon: Type, 
    className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' 
  },
  no_encontrada: { 
    label: 'No encontrada', 
    icon: HelpCircle, 
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' 
  },
};

export function CombustibleCSVImportDialog({ open, onOpenChange, onImport, obrasMap, maquinariasMap, patentesMap, nombresMap }: CSVImportDialogProps) {
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
    const result = parseCSV(text, obrasMap, maquinariasMap, patentesMap, nombresMap);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parseResult.valid.map(row => row.data));
      toast.success(`${parseResult.valid.length} cargas de combustible importadas correctamente`);
      handleClose();
    } catch (error) {
      toast.error("Error al importar cargas de combustible");
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
    const headers = ["fecha", "obra", "maquinaria_o_patente", "operador", "estacion", "litros", "precio_litro", "horas_maquina", "comprobante"].join(";");
    const example = ["2026-01-13", "Obra Centro", "102 o ABC123 o Regador", "Juan Pérez", "YPF Trelew", "150", "950", "1500", "FC-001"].join(";");
    const content = `${headers}\n${example}`;
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "combustible_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats for match methods
  const matchStats = parseResult?.valid.reduce((acc, row) => {
    acc[row.matchMethod] = (acc[row.matchMethod] || 0) + 1;
    return acc;
  }, {} as Record<MatchMethod, number>) || {};

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Cargas de Combustible</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV/TSV. La columna "maquinaria" puede contener código, patente o nombre.
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
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              {/* Summary Stats */}
              <div className="flex flex-wrap gap-2">
                {parseResult.valid.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    {parseResult.valid.length} registros válidos
                  </div>
                )}
                {parseResult.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {parseResult.errors.length} advertencias
                  </div>
                )}
              </div>

              {/* Match Method Stats */}
              {parseResult.valid.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(matchStats).map(([method, count]) => {
                    const config = matchMethodConfig[method as MatchMethod];
                    const Icon = config.icon;
                    return (
                      <Badge key={method} variant="outline" className={config.className}>
                        <Icon className="w-3 h-3 mr-1" />
                        {count as number} por {config.label.toLowerCase()}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Preview Table */}
              {parseResult.valid.length > 0 && (
                <div className="flex-1 overflow-hidden border rounded-md">
                  <ScrollArea className="h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left font-medium">Fila</th>
                          <th className="p-2 text-left font-medium">Fecha</th>
                          <th className="p-2 text-left font-medium">Maquinaria</th>
                          <th className="p-2 text-left font-medium">Coincidencia</th>
                          <th className="p-2 text-right font-medium">Litros</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {parseResult.valid.slice(0, 50).map((row, idx) => {
                          const config = matchMethodConfig[row.matchMethod];
                          const Icon = config.icon;
                          return (
                            <tr key={idx} className="hover:bg-muted/50">
                              <td className="p-2 text-muted-foreground">{row.row}</td>
                              <td className="p-2">{row.data.fecha || '-'}</td>
                              <td className="p-2 max-w-[120px] truncate" title={row.maquinariaInput}>
                                {row.maquinariaInput || '-'}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline" className={`text-[10px] ${config.className}`}>
                                  <Icon className="w-2.5 h-2.5 mr-1" />
                                  {config.label}
                                </Badge>
                              </td>
                              <td className="p-2 text-right">{row.data.litros}</td>
                            </tr>
                          );
                        })}
                        {parseResult.valid.length > 50 && (
                          <tr>
                            <td colSpan={5} className="p-2 text-center text-muted-foreground">
                              ...y {parseResult.valid.length - 50} filas más
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
                  <div className="max-h-24 overflow-y-auto text-xs space-y-1 bg-muted p-2 rounded">
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
