import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { RemitoWithRelations } from "@/hooks/useRemitos";
import type { RemitoItem } from "@/hooks/useRemitoItems";
import { fetchRenglonesOtros, renglonesViajes } from "@/lib/remitosOtros";
import { enRango } from "@/lib/remitosResumen";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  remitos: RemitoWithRelations[];
  itemsMap: Record<string, RemitoItem[]>;
  historicoCompleto: boolean;
}

export function ExportRemitosDialog({ open, onOpenChange, remitos, itemsMap, historicoCompleto }: Props) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busy, setBusy] = useState(false);
  const exportar = async () => {
    setBusy(true);
    try {
      const [{ exportarRemitosCompleto }, otros] = await Promise.all([import("@/utils/exportRemitosCompleto"), fetchRenglonesOtros()]);
      const rows = [...renglonesViajes(remitos, itemsMap), ...otros].filter((r) => enRango(r.fecha, desde, hasta));
      if (!rows.length) { toast.error("No hay remitos en ese período"); return; }
      await exportarRemitosCompleto(rows, desde, hasta);
      toast.success("Excel exportado");
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo exportar: " + (e instanceof Error ? e.message : String(e)));
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Exportar remitos a Excel</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Un archivo con una hoja de resumen general y una hoja por tipo: Viajes, Materiales y Máquinas.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="exp-desde" className="text-xs">Desde</Label><Input id="exp-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="exp-hasta" className="text-xs">Hasta</Label><Input id="exp-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        </div>
        {!historicoCompleto && <p className="text-xs text-muted-foreground">Los viajes incluyen solo los últimos 90 días cargados en pantalla. Para fechas anteriores, tocá «Cargar histórico» en Viajes antes de exportar.</p>}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={busy} onClick={exportar}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Exportar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
