import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload, FileText, Files, Trash2, Loader2, CheckCircle2, AlertTriangle, Download, FileSignature,
} from "lucide-react";
import { usePersonal } from "@/hooks/usePersonal";
import { useEmpleadoDocumentos, type TipoDocumento, type EmpleadoDocumento } from "@/hooks/useEmpleadoDocumentos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const TIPO_LABEL: Record<TipoDocumento, string> = {
  estudio_medico: "Estudio médico",
  recibo_sueldo: "Recibo de sueldo",
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

interface MatchRow {
  file: File;
  detected: any;
  personal_id: string | null;
  confidence: "alta" | "media" | "baja" | "sin_match";
  error?: string;
  selected: boolean;
}

export function DocumentosEmpleadoTab() {
  const { personal } = usePersonal();
  const [filterTipo, setFilterTipo] = useState<"all" | TipoDocumento>("all");
  const [filterPersonal, setFilterPersonal] = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<"all" | "pendiente" | "visto" | "firmado">("all");

  const { documentos, isLoading, uploadOne, isUploading, remove, getDownloadUrl } =
    useEmpleadoDocumentos({
      personalId: filterPersonal || undefined,
      tipo: filterTipo === "all" ? undefined : filterTipo,
    });

  const personalOptions = useMemo(
    () =>
      personal
        .filter((p) => p.activo)
        .map((p) => ({
          value: p.id,
          label: `${p.apellido || ""} ${p.nombre || ""}`.trim(),
          searchValue: `${p.apellido || ""} ${p.nombre || ""} ${p.dni || ""} ${p.legajo || ""}`,
        })),
    [personal]
  );

  const filtered = useMemo(() => {
    return documentos.filter((d) => {
      if (filterEstado === "pendiente" && d.visto_at) return false;
      if (filterEstado === "visto" && (!d.visto_at || (d.tipo === "recibo_sueldo" && d.firmado_at))) return false;
      if (filterEstado === "firmado" && !d.firmado_at) return false;
      return true;
    });
  }, [documentos, filterEstado]);

  // ---------- Subir individual ----------
  const [openInd, setOpenInd] = useState(false);
  const [indPersonal, setIndPersonal] = useState("");
  const [indTipo, setIndTipo] = useState<TipoDocumento>("recibo_sueldo");
  const [indTitulo, setIndTitulo] = useState("");
  const [indPeriodo, setIndPeriodo] = useState("");
  const [indFile, setIndFile] = useState<File | null>(null);

  const handleIndividual = async () => {
    if (!indPersonal || !indFile || !indTitulo) {
      toast.error("Completá empleado, título y archivo");
      return;
    }
    if (indFile.size > MAX_BYTES) {
      toast.error("Archivo supera 10 MB");
      return;
    }
    await uploadOne({
      personal_id: indPersonal,
      tipo: indTipo,
      titulo: indTitulo,
      periodo: indPeriodo,
      file: indFile,
    });
    setOpenInd(false);
    setIndPersonal(""); setIndTitulo(""); setIndPeriodo(""); setIndFile(null);
  };

  // ---------- Carga masiva ----------
  const [openMas, setOpenMas] = useState(false);
  const [masTipo, setMasTipo] = useState<TipoDocumento>("recibo_sueldo");
  const [masPeriodo, setMasPeriodo] = useState("");
  const [masFiles, setMasFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickMas = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" supera 10 MB`);
        return false;
      }
      return true;
    });
    if (arr.length > 50) {
      toast.error("Máximo 50 archivos por lote");
      return;
    }
    setMasFiles(arr);
    setRows([]);
  };

  const analyze = async () => {
    if (masFiles.length === 0) return;
    setAnalyzing(true);
    try {
      const payloadFiles = await Promise.all(
        masFiles.map(async (f) => ({
          name: f.name,
          mime: f.type,
          data: await fileToDataUrl(f),
        }))
      );
      const personalLite = personal
        .filter((p) => p.activo)
        .map((p) => ({ id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni }));

      const { data, error } = await supabase.functions.invoke("match-empleado-documentos", {
        body: { files: payloadFiles, tipo: masTipo, personal: personalLite },
      });
      if (error) throw error;

      const results = (data?.results || []) as any[];
      const next: MatchRow[] = results.map((r, i) => ({
        file: masFiles[i],
        detected: r.detected,
        personal_id: r.personal_id,
        confidence: r.confidence,
        error: r.error,
        selected: !!r.personal_id,
      }));
      setRows(next);
      toast.success(`Analizados ${next.length} archivos`);
    } catch (e: any) {
      toast.error(e?.message || "Error al analizar");
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmBulk = async () => {
    const ok = rows.filter((r) => r.selected && r.personal_id);
    if (ok.length === 0) {
      toast.error("No hay filas asignadas para subir");
      return;
    }
    setSavingBulk(true);
    let ko = 0;
    for (const r of ok) {
      try {
        const titulo = masPeriodo
          ? `${TIPO_LABEL[masTipo]} - ${masPeriodo}`
          : TIPO_LABEL[masTipo];
        await uploadOne({
          personal_id: r.personal_id!,
          tipo: masTipo,
          titulo,
          periodo: masPeriodo,
          file: r.file,
        });
      } catch {
        ko++;
      }
    }
    setSavingBulk(false);
    if (ko === 0) {
      toast.success(`Subidos ${ok.length} documentos`);
    } else {
      toast.warning(`Subidos ${ok.length - ko} / ${ok.length}. ${ko} con error.`);
    }
    setOpenMas(false);
    setMasFiles([]); setRows([]); setMasPeriodo("");
  };

  const [toDelete, setToDelete] = useState<EmpleadoDocumento | null>(null);

  const handleDownload = async (doc: EmpleadoDocumento) => {
    try {
      const url = await getDownloadUrl(doc);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Error al obtener archivo");
    }
  };

  const estadoBadge = (d: EmpleadoDocumento) => {
    if (d.tipo === "recibo_sueldo" && d.firmado_at) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><FileSignature className="w-3 h-3 mr-1" />Firmado</Badge>;
    }
    if (d.visto_at) {
      return <Badge variant="outline" className="text-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Visto</Badge>;
    }
    return <Badge variant="outline" className="text-amber-500">Pendiente</Badge>;
  };

  const confBadge = (c: MatchRow["confidence"]) => {
    const map: Record<MatchRow["confidence"], string> = {
      alta: "bg-green-500/20 text-green-500 border-green-500/30",
      media: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      baja: "bg-amber-500/20 text-amber-500 border-amber-500/30",
      sin_match: "bg-red-500/20 text-red-500 border-red-500/30",
    };
    return <Badge variant="outline" className={map[c]}>{c.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Empleado</Label>
            <Combobox
              options={[{ value: "", label: "Todos" }, ...personalOptions]}
              value={filterPersonal}
              onChange={setFilterPersonal}
              placeholder="Todos"
            />
          </div>
          <div className="w-44">
            <Label className="text-xs">Tipo</Label>
            <Select value={filterTipo} onValueChange={(v: any) => setFilterTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="estudio_medico">Estudio médico</SelectItem>
                <SelectItem value="recibo_sueldo">Recibo de sueldo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Label className="text-xs">Estado</Label>
            <Select value={filterEstado} onValueChange={(v: any) => setFilterEstado(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="visto">Visto</SelectItem>
                <SelectItem value="firmado">Firmado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenInd(true)}>
            <Upload className="w-4 h-4 mr-2" /> Subir individual
          </Button>
          <Button onClick={() => setOpenMas(true)}>
            <Files className="w-4 h-4 mr-2" /> Carga masiva
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Subido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin documentos</TableCell></TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.personal ? `${d.personal.apellido} ${d.personal.nombre}` : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{TIPO_LABEL[d.tipo]}</Badge></TableCell>
                  <TableCell className="max-w-[240px] truncate">{d.titulo}</TableCell>
                  <TableCell>{d.periodo || "—"}</TableCell>
                  <TableCell>{formatDate(d.created_at)}</TableCell>
                  <TableCell>{estadoBadge(d)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => handleDownload(d)}><Download className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(d)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Subir individual */}
      <Dialog open={openInd} onOpenChange={setOpenInd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Subir documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Empleado</Label>
              <Combobox options={personalOptions} value={indPersonal} onChange={setIndPersonal} placeholder="Elegir empleado" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={indTipo} onValueChange={(v: any) => setIndTipo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recibo_sueldo">Recibo de sueldo</SelectItem>
                  <SelectItem value="estudio_medico">Estudio médico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={indTitulo} onChange={(e) => setIndTitulo(e.target.value)} placeholder="Ej: Recibo Junio 2026" />
            </div>
            <div>
              <Label className="text-xs">Período (opcional)</Label>
              <Input value={indPeriodo} onChange={(e) => setIndPeriodo(e.target.value)} placeholder="Ej: Junio 2026" />
            </div>
            <div>
              <Label className="text-xs">Archivo (PDF/imagen, máx 10 MB)</Label>
              <Input type="file" accept={ACCEPT} onChange={(e) => setIndFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInd(false)}>Cancelar</Button>
            <Button onClick={handleIndividual} disabled={isUploading}>
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carga masiva */}
      <Dialog open={openMas} onOpenChange={setOpenMas}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Carga masiva con auto-asignación</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={masTipo} onValueChange={(v: any) => { setMasTipo(v); setRows([]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recibo_sueldo">Recibo de sueldo</SelectItem>
                    <SelectItem value="estudio_medico">Estudio médico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Período (opcional)</Label>
                <Input value={masPeriodo} onChange={(e) => setMasPeriodo(e.target.value)} placeholder="Ej: Junio 2026" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Archivos (máx 50, 10 MB c/u)</Label>
              <Input ref={fileInputRef} type="file" accept={ACCEPT} multiple onChange={(e) => handlePickMas(e.target.files)} />
              {masFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{masFiles.length} archivos seleccionados</p>
              )}
            </div>

            <Button onClick={analyze} disabled={masFiles.length === 0 || analyzing} className="w-full">
              {analyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" />
              Analizar con IA y detectar empleado
            </Button>

            {rows.length > 0 && (
              <div className="border border-border rounded-lg max-h-[40vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Detectado</TableHead>
                      <TableHead>Empleado asignado</TableHead>
                      <TableHead>Confianza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <input type="checkbox" checked={r.selected} onChange={(e) =>
                            setRows((prev) => prev.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))
                          } />
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">{r.file.name}</TableCell>
                        <TableCell className="text-xs">
                          {r.error ? <span className="text-destructive"><AlertTriangle className="w-3 h-3 inline" /> {r.error}</span> :
                            r.detected ? (
                              <div>
                                {r.detected.apellido} {r.detected.nombre}
                                {r.detected.dni && <div className="text-muted-foreground">DNI: {r.detected.dni}</div>}
                              </div>
                            ) : "—"}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <Combobox
                            options={personalOptions}
                            value={r.personal_id || ""}
                            onChange={(v) => setRows((prev) => prev.map((x, j) => j === i ? { ...x, personal_id: v, selected: !!v } : x))}
                            placeholder="Asignar..."
                          />
                        </TableCell>
                        <TableCell>{confBadge(r.confidence)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMas(false)}>Cancelar</Button>
            <Button onClick={confirmBulk} disabled={rows.length === 0 || savingBulk}>
              {savingBulk && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar y subir ({rows.filter(r => r.selected && r.personal_id).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) remove(toDelete); setToDelete(null); }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
