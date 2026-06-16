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
import {
  buildPersonalIndex,
  extractTextFromPdf,
  matchEmpleadoLocal,
  matchEmpleadoByFilename,
  runWithConcurrency,
} from "@/utils/empleadoMatcher";

const TIPO_LABEL: Record<TipoDocumento, string> = {
  estudio_medico: "Estudio médico",
  recibo_sueldo: "Recibo de sueldo",
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const ACCEPT_BULK = "application/pdf,image/png,image/jpeg,image/webp,application/zip,application/x-zip-compressed,.zip,application/x-rar-compressed,application/vnd.rar,.rar";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_BYTES = 100 * 1024 * 1024; // PDF "fuente" antes de partir
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024; // 1 GB para ZIP/RAR

const isZip = (f: File) => /\.zip$/i.test(f.name) || f.type === "application/zip" || f.type === "application/x-zip-compressed";
const isRar = (f: File) => /\.rar$/i.test(f.name) || f.type === "application/x-rar-compressed" || f.type === "application/vnd.rar";
const isPdfName = (name: string) => /\.pdf$/i.test(name);
const isImageName = (name: string) => /\.(png|jpe?g|webp)$/i.test(name);
const isIgnorable = (path: string) => {
  const base = path.split("/").pop() || "";
  return path.includes("__MACOSX/") || base.startsWith(".");
};

async function extractZip(file: File): Promise<File[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const out: File[] = [];
  const entries = Object.values(zip.files).filter((e) => !e.dir && !isIgnorable(e.name) && (isPdfName(e.name) || isImageName(e.name)));
  for (const entry of entries) {
    const blob = await entry.async("blob");
    const type = isPdfName(entry.name) ? "application/pdf" : blob.type || "application/octet-stream";
    out.push(new File([blob], entry.name.replace(/\//g, " - "), { type }));
  }
  return out;
}

async function extractRar(file: File): Promise<File[]> {
  const mod: any = await import("libarchive.js");
  const Archive = mod.Archive || mod.default?.Archive || mod.default;
  try {
    Archive.init({
      workerUrl: (await import("libarchive.js/dist/worker-bundle.js?url")).default,
    });
  } catch {
    // init puede tirar si ya fue inicializado o el url no resuelve: probar sin opciones
    try { Archive.init(); } catch {}
  }
  const archive = await Archive.open(file);
  const filesObj = await archive.extractFiles();
  const out: File[] = [];
  const walk = async (obj: any, prefix: string) => {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const path = prefix ? `${prefix}/${key}` : key;
      if (val instanceof File) {
        if (isIgnorable(path)) continue;
        if (!isPdfName(key) && !isImageName(key)) continue;
        const type = isPdfName(key) ? "application/pdf" : val.type || "application/octet-stream";
        out.push(new File([val], path.replace(/\//g, " - "), { type }));
      } else if (val && typeof val === "object") {
        await walk(val, path);
      }
    }
  };
  await walk(filesObj, "");
  return out;
}

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
  const [masFiles, setMasFiles] = useState<File[]>([]); // archivos fuente (sin partir)
  const [pagesPerDoc, setPagesPerDoc] = useState<number>(2);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzePhase, setAnalyzePhase] = useState<"extract" | "local" | "ia" | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState<{ done: number; total: number } | null>(null);
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickMas = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => {
      const archive = isZip(f) || isRar(f);
      const limit = archive ? MAX_ARCHIVE_BYTES : MAX_SOURCE_BYTES;
      if (f.size > limit) {
        toast.error(`"${f.name}" supera ${archive ? "1 GB" : "100 MB"}`);
        return false;
      }
      return true;
    });
    setMasFiles(arr);
    setRows([]);
  };

  // Expande ZIP/RAR en los PDFs/imágenes internos. Resto pasa tal cual.
  const expandArchives = async (files: File[]): Promise<File[]> => {
    const out: File[] = [];
    const archives = files.filter((f) => isZip(f) || isRar(f));
    if (archives.length > 0) {
      setAnalyzePhase("extract");
      setAnalyzeProgress({ done: 0, total: archives.length });
    }
    let extractedCount = 0;
    for (const f of files) {
      if (isZip(f)) {
        try {
          const inner = await extractZip(f);
          if (inner.length === 0) toast.warning(`"${f.name}" no contenía PDFs`);
          out.push(...inner);
        } catch (e: any) {
          toast.error(`No se pudo abrir ZIP "${f.name}": ${e?.message || e}`);
        }
        extractedCount++;
        setAnalyzeProgress({ done: extractedCount, total: archives.length });
      } else if (isRar(f)) {
        try {
          const inner = await extractRar(f);
          if (inner.length === 0) toast.warning(`"${f.name}" no contenía PDFs`);
          out.push(...inner);
        } catch (e: any) {
          toast.error(`No se pudo abrir RAR "${f.name}": ${e?.message || e}`);
        }
        extractedCount++;
        setAnalyzeProgress({ done: extractedCount, total: archives.length });
      } else {
        out.push(f);
      }
    }
    return out;
  };



  // Particiona PDFs en chunks de N páginas. Imágenes pasan tal cual.
  const splitFiles = async (files: File[], pages: number): Promise<File[]> => {
    if (pages < 1) pages = 1;
    const { PDFDocument } = await import("pdf-lib");
    const out: File[] = [];
    for (const f of files) {
      if (!f.type.includes("pdf") || pages === 1) {
        // sin partir: validar tamaño individual
        if (f.size > MAX_BYTES) {
          toast.error(`"${f.name}" supera 10 MB`);
          continue;
        }
        out.push(f);
        continue;
      }
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const src = await PDFDocument.load(bytes);
        const total = src.getPageCount();
        const base = f.name.replace(/\.pdf$/i, "");
        for (let start = 0; start < total; start += pages) {
          const end = Math.min(start + pages, total);
          const sub = await PDFDocument.create();
          const copied = await sub.copyPages(src, Array.from({ length: end - start }, (_, k) => start + k));
          copied.forEach((p) => sub.addPage(p));
          const u8 = await sub.save();
          const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
          const chunk = new File([ab], `${base} (${start + 1}-${end}).pdf`, { type: "application/pdf" });
          if (chunk.size > MAX_BYTES) {
            toast.error(`Chunk "${chunk.name}" supera 10 MB`);
            continue;
          }
          out.push(chunk);
        }
      } catch (e: any) {
        // Si pdf-lib no puede partirlo, no lo descartamos: lo pasamos entero al pipeline
        // si entra dentro del límite individual, así matching local/IA igual puede procesarlo.
        if (f.size <= MAX_BYTES) {
          toast.warning(`No se pudo partir "${f.name}", se procesa entero`);
          out.push(f);
        } else {
          toast.error(`No se pudo partir "${f.name}" y supera 10 MB: ${e?.message || e}`);
        }
      }
    }
    return out;
  };

  const analyze = async () => {
    if (masFiles.length === 0) return;
    setAnalyzing(true);
    setAnalyzePhase(null);
    setAnalyzeProgress(null);
    try {
      const expanded = await expandArchives(masFiles);
      if (expanded.length === 0) {
        toast.error("No quedaron archivos para analizar");
        return;
      }
      const chunks = await splitFiles(expanded, pagesPerDoc);
      if (chunks.length === 0) {
        toast.error("No quedaron archivos para analizar");
        return;
      }
      if (chunks.length > 500) {
        toast.error(`Demasiados documentos (${chunks.length}). Subí en tandas más chicas.`);
        return;
      }

      const personalActivo = personal.filter((p) => p.activo);
      const personalIndex = buildPersonalIndex(personalActivo);

      // ---------- FASE 1: matching local con pdfjs ----------
      setAnalyzePhase("local");
      setAnalyzeProgress({ done: 0, total: chunks.length });

      const localResults = await runWithConcurrency(
        chunks,
        8,
        async (f) => {
          // Las imágenes no tienen texto extraíble: las marcamos para IA.
          if (!f.type.includes("pdf")) {
            return { needsAi: true, match: null as any };
          }
          try {
            const text = await extractTextFromPdf(f);
            const match = matchEmpleadoLocal(text, personalIndex);
            return {
              needsAi: match.confidence === "sin_match" && !match.detected,
              match,
            };
          } catch {
            return { needsAi: true, match: null as any };
          }
        },
        (done, total) => setAnalyzeProgress({ done, total })
      );

      const collected: MatchRow[] = chunks.map((f, i) => {
        const r = localResults[i];
        if (r && r.match) {
          return {
            file: f,
            detected: r.match.detected,
            personal_id: r.match.personal_id,
            confidence: r.match.confidence,
            selected: !!r.match.personal_id,
          };
        }
        return {
          file: f,
          detected: null,
          personal_id: null,
          confidence: "sin_match",
          selected: false,
        };
      });
      setRows([...collected]);

      // ---------- FASE 2: IA solo para los que no matchearon ----------
      const pendingIdx = collected
        .map((r, i) => (!r.personal_id ? i : -1))
        .filter((i) => i >= 0);

      if (pendingIdx.length > 0) {
        setAnalyzePhase("ia");
        setAnalyzeProgress({ done: 0, total: pendingIdx.length });

        const personalLite = personalActivo.map((p) => ({
          id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni,
        }));

        const BATCH = 5;
        const batches: number[][] = [];
        for (let i = 0; i < pendingIdx.length; i += BATCH) {
          batches.push(pendingIdx.slice(i, i + BATCH));
        }

        let aiDone = 0;
        await runWithConcurrency(
          batches,
          3,
          async (batchIdx) => {
            const slice = batchIdx.map((i) => collected[i].file);
            const payloadFiles = await Promise.all(
              slice.map(async (f) => ({ name: f.name, mime: f.type, data: await fileToDataUrl(f) }))
            );
            const { data, error } = await supabase.functions.invoke("match-empleado-documentos", {
              body: { files: payloadFiles, tipo: masTipo, personal: personalLite },
            });
            if (error) throw error;
            const results = (data?.results || []) as any[];
            results.forEach((r, k) => {
              const targetIdx = batchIdx[k];
              collected[targetIdx] = {
                ...collected[targetIdx],
                detected: r.detected ?? collected[targetIdx].detected,
                personal_id: r.personal_id,
                confidence: r.confidence,
                error: r.error,
                selected: !!r.personal_id,
              };
            });
            aiDone += batchIdx.length;
            setAnalyzeProgress({ done: aiDone, total: pendingIdx.length });
            setRows([...collected]);
          }
        );
      }

      const matched = collected.filter((r) => r.personal_id).length;
      toast.success(`Analizados ${collected.length} documentos · ${matched} con match`);
    } catch (e: any) {
      toast.error(e?.message || "Error al analizar");
    } finally {
      setAnalyzing(false);
      setAnalyzePhase(null);
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
              onValueChange={setFilterPersonal}
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
              <Combobox options={personalOptions} value={indPersonal} onValueChange={setIndPersonal} placeholder="Elegir empleado" />
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={masTipo}
                  onValueChange={(v: any) => {
                    setMasTipo(v);
                    setPagesPerDoc(v === "recibo_sueldo" ? 2 : 1);
                    setRows([]);
                  }}
                >
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
              <div>
                <Label className="text-xs">Páginas por documento</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={pagesPerDoc}
                  onChange={(e) => setPagesPerDoc(Math.max(1, Number(e.target.value) || 1))}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Si subís un PDF unificado, se parte cada N páginas.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Archivos (PDF unificado, varios sueltos, o ZIP/RAR con PDFs · máx 100 MB c/u)</Label>
              <Input ref={fileInputRef} type="file" accept={ACCEPT_BULK} multiple onChange={(e) => handlePickMas(e.target.files)} />
              {masFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {masFiles.length} archivo(s) fuente seleccionado(s){pagesPerDoc > 1 ? ` · se partirán cada ${pagesPerDoc} páginas` : ""}
                </p>
              )}
            </div>

            <Button onClick={analyze} disabled={masFiles.length === 0 || analyzing} className="w-full">
              {analyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" />
              {analyzing && analyzeProgress
                ? analyzePhase === "extract"
                  ? `Extrayendo comprimidos ${analyzeProgress.done}/${analyzeProgress.total}...`
                  : analyzePhase === "local"
                    ? `Leyendo PDFs localmente ${analyzeProgress.done}/${analyzeProgress.total}...`
                    : `Consultando IA ${analyzeProgress.done}/${analyzeProgress.total}...`
                : "Analizar y detectar empleado"}
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
                            onValueChange={(v) => setRows((prev) => prev.map((x, j) => j === i ? { ...x, personal_id: v, selected: !!v } : x))}
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
