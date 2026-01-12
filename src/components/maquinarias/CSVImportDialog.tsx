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
import { MaquinariaForm, TipoMaquinaria, EstadoMaquinaria } from "@/hooks/useMaquinarias";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (maquinarias: MaquinariaForm[]) => Promise<void>;
}

const tiposValidos: TipoMaquinaria[] = ["excavadora", "cargadora", "camion_articulado", "topadora", "rodillo", "retroexcavadora", "motoniveladora"];
const estadosValidos: EstadoMaquinaria[] = ["operativa", "mantenimiento", "inactiva", "en_uso"];

interface ParseResult {
  valid: MaquinariaForm[];
  errors: { row: number; message: string }[];
}

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "El archivo debe tener al menos una fila de encabezados y una de datos" }] };
  }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const requiredHeaders = ["codigo", "nombre", "tipo", "marca", "anio", "estado"];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    return { valid: [], errors: [{ row: 0, message: `Faltan columnas requeridas: ${missingHeaders.join(", ")}` }] };
  }

  const valid: MaquinariaForm[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    // Validaciones
    if (!row.codigo) {
      errors.push({ row: i + 1, message: "Código es requerido" });
      continue;
    }
    if (!row.nombre) {
      errors.push({ row: i + 1, message: "Nombre es requerido" });
      continue;
    }
    if (!row.tipo || !tiposValidos.includes(row.tipo as TipoMaquinaria)) {
      errors.push({ row: i + 1, message: `Tipo inválido: ${row.tipo}. Válidos: ${tiposValidos.join(", ")}` });
      continue;
    }
    if (!row.marca) {
      errors.push({ row: i + 1, message: "Marca es requerida" });
      continue;
    }
    const anio = parseInt(row.anio);
    if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
      errors.push({ row: i + 1, message: `Año inválido: ${row.anio}` });
      continue;
    }
    if (!row.estado || !estadosValidos.includes(row.estado as EstadoMaquinaria)) {
      errors.push({ row: i + 1, message: `Estado inválido: ${row.estado}. Válidos: ${estadosValidos.join(", ")}` });
      continue;
    }

    const horas = row.horas_acumuladas ? parseFloat(row.horas_acumuladas) : 0;

    valid.push({
      codigo: row.codigo,
      nombre: row.nombre,
      tipo: row.tipo as TipoMaquinaria,
      marca: row.marca,
      anio,
      patente: row.patente || undefined,
      estado: row.estado as EstadoMaquinaria,
      horas_acumuladas: isNaN(horas) ? 0 : horas,
    });
  }

  return { valid, errors };
}

export function CSVImportDialog({ open, onOpenChange, onImport }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Por favor selecciona un archivo CSV");
      return;
    }

    setFile(selectedFile);
    const text = await selectedFile.text();
    const result = parseCSV(text);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parseResult.valid);
      toast.success(`${parseResult.valid.length} maquinarias importadas correctamente`);
      handleClose();
    } catch (error) {
      toast.error("Error al importar maquinarias");
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
    const headers = "codigo,nombre,tipo,marca,anio,patente,estado,horas_acumuladas";
    const example = "EXC-001,Excavadora CAT 320,excavadora,Caterpillar,2020,ABC123,operativa,1500";
    const content = `${headers}\n${example}`;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maquinarias_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Maquinarias desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con las maquinarias a importar
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
            Descargar plantilla CSV
          </Button>

          {/* File Upload */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
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
                  Haz clic para seleccionar un archivo CSV
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
