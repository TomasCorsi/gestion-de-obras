import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContabPlanCuentas } from "@/hooks/useContabilidad";

type Linea = { cuenta_id: string; descripcion: string; debe: string; haber: string };
const nueva = (): Linea => ({ cuenta_id: "", descripcion: "", debe: "", haber: "" });
const num = (s: string) => { const n = Number(String(s).replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(n);

export function AsientoManualDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: cuentas = [] } = useContabPlanCuentas();
  const opts = (cuentas as any[]).filter((c) => c.imputable && c.activa).map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` }));
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA"));
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("AJUSTE");
  const [lineas, setLineas] = useState<Linea[]>([nueva(), nueva()]);
  const set = (i: number, k: keyof Linea, v: string) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const debe = lineas.reduce((s, l) => s + num(l.debe), 0);
  const haber = lineas.reduce((s, l) => s + num(l.haber), 0);
  const validas = lineas.filter((l) => l.cuenta_id && (num(l.debe) > 0) !== (num(l.haber) > 0));
  const ok = descripcion.trim() && validas.length >= 2 && validas.length === lineas.length && debe > 0 && Math.abs(debe - haber) < 0.005;

  const crear = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("contab_crear_asiento_manual", {
        _fecha: fecha, _descripcion: descripcion, _tipo: tipo,
        _lineas: lineas.map((l) => ({ cuenta_id: l.cuenta_id, descripcion: l.descripcion, debe: num(l.debe), haber: num(l.haber) })),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contab_asientos"] }); toast.success("Asiento manual creado en borrador"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo asiento manual</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[160px_200px_1fr]">
          <div><Label>Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AJUSTE">Ajuste</SelectItem>
                <SelectItem value="RECLASIFICACION">Reclasificación</SelectItem>
                <SelectItem value="APERTURA">Apertura</SelectItem>
                <SelectItem value="CIERRE">Cierre</SelectItem>
                <SelectItem value="MANUAL">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Descripción</Label><Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
        </div>
        <div className="space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_120px_36px] items-center">
              <Combobox options={opts} value={l.cuenta_id} onValueChange={(v) => set(i, "cuenta_id", v)} placeholder="Cuenta" searchPlaceholder="Buscar cuenta..." />
              <Input placeholder="Detalle" value={l.descripcion} onChange={(e) => set(i, "descripcion", e.target.value)} />
              <Input placeholder="Debe" inputMode="decimal" value={l.debe} onChange={(e) => set(i, "debe", e.target.value)} />
              <Input placeholder="Haber" inputMode="decimal" value={l.haber} onChange={(e) => set(i, "haber", e.target.value)} />
              <Button size="icon" variant="ghost" disabled={lineas.length <= 2} onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setLineas((ls) => [...ls, nueva()])}><Plus className="w-4 h-4 mr-1" />Línea</Button>
        </div>
        <div className="flex justify-end gap-6 text-sm font-medium">
          <span>Debe {fmt(debe)}</span><span>Haber {fmt(haber)}</span>
          <span className={Math.abs(debe - haber) < 0.005 && debe > 0 ? "" : "text-destructive"}>Diferencia {fmt(debe - haber)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Cada línea lleva debe o haber (no ambos). Se guarda en borrador; luego se confirma desde el detalle del asiento.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!ok || crear.isPending} onClick={() => crear.mutate()}>Guardar borrador</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
