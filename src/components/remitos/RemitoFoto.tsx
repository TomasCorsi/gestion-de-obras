import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const BUCKET = "remitos-fotos";

/** Abre la foto guardada (ruta del bucket privado o URL externa antigua). */
export async function abrirFotoRemito(path: string) {
  if (/^https?:\/\//.test(path)) { window.open(path, "_blank", "noopener"); return; }
  const win = window.open("", "_blank");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  if (error || !data) { win?.close(); toast.error("No se pudo abrir la foto"); return; }
  if (win) win.location.href = data.signedUrl; else window.open(data.signedUrl, "_blank", "noopener");
}

/** Campo "Adjuntar foto" del remito en papel (cámara del celular o archivo). */
export function RemitoFotoField({ value, onChange }: { value: string; onChange: (path: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const subir = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") return toast.error("Elegí una imagen o PDF");
    setSubiendo(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      onChange(path);
      toast.success("Foto adjuntada");
    } catch (e) {
      toast.error("No se pudo subir la foto: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubiendo(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Foto del remito en papel</Label>
      <input ref={ref} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" aria-label="Archivo de foto del remito" onChange={(e) => subir(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-9" disabled={subiendo} onClick={() => ref.current?.click()}>
          {subiendo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
          {value ? "Cambiar foto" : "Adjuntar foto"}
        </Button>
        {value && <>
          <Button type="button" variant="ghost" className="h-9" onClick={() => abrirFotoRemito(value)}>Ver foto</Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Quitar foto" onClick={() => onChange("")}><X className="h-4 w-4" /></Button>
        </>}
      </div>
    </div>
  );
}

/** Ícono de cámara para la grilla. */
export function FotoRemitoBoton({ path }: { path?: string | null }) {
  if (!path) return null;
  return <Button variant="ghost" size="icon" title="Ver foto del remito" aria-label="Ver foto del remito" onClick={() => abrirFotoRemito(path)}><Camera className="h-4 w-4 text-primary" /></Button>;
}
