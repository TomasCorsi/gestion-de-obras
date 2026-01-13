import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { CargaCombustibleForm } from "@/hooks/useCombustible";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cargas: CargaCombustibleForm[]) => Promise<void>;
  obrasMap: Record<string, string>; // nombre -> id
  maquinariasMap: Record<string, string>; // codigo -> id
}

interface ParseResult {
  valid: CargaCombustibleForm[];
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

function parseCSV(
  text: string,
  obrasMap: Record<string, string>,
  maquinariasMap: Record<string, string>
): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "El archivo debe tener al menos una fila de encabezados y una de datos" }] };
  }

  const firstLine = lines[0];
  const separator = detectSeparator(firstLine);

  const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
  
  // Columnas requeridas
  const requiredColumns = ["fecha", "maquinaria", "litros", "precio_litro"];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    return { valid: [], errors: [{ row: 0, message: `Columnas faltantes: ${missingColumns.join(", ")}` }] };
  }

  const valid: CargaCombustibleForm[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    // Validar fecha
    const fecha = row.fecha;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      errors.push({ row: i + 1, message: `Fecha inválida: ${row.fecha}. Formato: YYYY-MM-DD` });
      continue;
    }

    // Buscar maquinaria por código
    const maquinariaCode = row.maquinaria?.trim();
    const maquinaria_id = maquinariaCode ? maquinariasMap[maquinariaCode] : undefined;
    if (!maquinaria_id) {
      errors.push({ row: i + 1, message: `Maquinaria no encontrada: ${maquinariaCode}` });
      continue;
    }

    // Buscar obra por nombre (opcional)
    const obraNombre = row.obra?.trim().toLowerCase();
    let obra_id = "";
    if (obraNombre) {
      obra_id = obrasMap[obraNombre] || "";
      if (!obra_id) {
        errors.push({ row: i + 1, message: `Obra no encontrada: ${row.obra}` });
        continue;
      }
    }

    // Validar litros
    const litros = parseFloat(row.litros);
    if (isNaN(litros) || litros <= 0) {
      errors.push({ row: i + 1, message: `Litros inválidos: ${row.litros}` });
      continue;
    }

    // Validar precio_litro
    const precio_litro = parseFloat(row.precio_litro);
    if (isNaN(precio_litro) || precio_litro <= 0) {
      errors.push({ row: i + 1, message: `Precio por litro inválido: ${row.precio_litro}` });
      continue;
    }

    const horas_maquina = row.horas_maquina ? parseFloat(row.horas_maquina) : 0;
    const costo_total = litros * precio_litro;

    valid.push({
      fecha,
      obra_id: obra_id || "",
      maquinaria_id,
      litros,
      precio_litro,
      costo_total,
      horas_maquina: isNaN(horas_maquina) ? 0 : horas_maquina,
      estacion: row.estacion || "",
      operador: row.operador || "",
      comprobante: row.comprobante || undefined,
    });
  }

  return { valid, errors };
}

export function CombustibleCSVImportDialog({ open, onOpenChange, onImport, obrasMap, maquinariasMap }: CSVImportDialogProps) {
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
    const result = parseCSV(text, obrasMap, maquinariasMap);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parseResult.valid);
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
    const headers = ["fecha", "obra", "maquinaria", "operador", "estacion", "litros", "precio_litro", "horas_maquina", "comprobante"].join(";");
    const example = ["2026-01-13", "Obra Centro", "102", "Juan Pérez", "YPF Trelew", "150", "950", "1500", "FC-001"].join(";");
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Cargas de Combustible</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV/TSV con las cargas a importar. La columna "maquinaria" debe contener el código de la máquina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="space-y-3">
              {parseResult.valid.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  {parseResult.valid.length} registros válidos para importar
                </div>
              )}

              {parseResult.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {parseResult.errors.length} errores encontrados
                  </div>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1 bg-muted p-2 rounded">
                    {parseResult.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        Fila {err.row}: {err.message}
                      </p>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <p className="text-muted-foreground">
                        ...y {parseResult.errors.length - 10} errores más
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
