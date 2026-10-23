import { useEffect, useState } from "react";
import { Lock, LockOpen, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCerrarPeriodo, useCrearEjercicio, useEjercicios, usePeriodos, useReabrirPeriodo } from "@/hooks/useContabPeriodos";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmtDate = (s: string) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };

export function PeriodosTab() {
  const { data: ejercicios = [], isLoading } = useEjercicios();
  const [sel, setSel] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  useEffect(() => { if (!sel && ejercicios[0]) setSel(ejercicios[0].id); }, [ejercicios, sel]);
  const { data: periodos = [] } = usePeriodos(sel);
  const cerrar = useCerrarPeriodo();
  const [reabrir, setReabrir] = useState<string | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Ejercicios</CardTitle>
          <Button size="sm" onClick={() => setNuevo(true)}><Plus className="w-4 h-4 mr-1" />Nuevo</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!isLoading && ejercicios.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay ejercicios. Creá el primero para poder confirmar asientos.</p>
          )}
          {ejercicios.map((e) => (
            <button key={e.id} onClick={() => setSel(e.id)}
              className={`w-full text-left rounded-md border p-2 text-sm transition-colors ${sel === e.id ? "border-primary bg-primary/10" : "hover:bg-muted/40"}`}>
              <div className="font-medium">{e.nombre}</div>
              <div className="text-xs text-muted-foreground">{fmtDate(e.fecha_desde)} – {fmtDate(e.fecha_hasta)} · {e.ultimo_numero} asientos</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Períodos mensuales</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="px-3 py-2">Mes</th><th className="px-3 py-2">Desde</th><th className="px-3 py-2">Hasta</th><th className="px-3 py-2">Estado</th><th></th></tr>
            </thead>
            <tbody>
              {periodos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{MESES[p.mes - 1]} {p.anio}</td>
                  <td className="px-3 py-2">{fmtDate(p.fecha_desde)}</td>
                  <td className="px-3 py-2">{fmtDate(p.fecha_hasta)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={p.estado === "abierto" ? "secondary" : "destructive"}>{p.estado === "abierto" ? "Abierto" : "Cerrado"}</Badge>
                    {p.motivo_reapertura && <span className="ml-2 text-xs text-muted-foreground" title={p.motivo_reapertura}>reabierto</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.estado === "abierto" ? (
                      <Button size="sm" variant="outline" disabled={cerrar.isPending}
                        onClick={() => { if (confirm(`¿Cerrar ${MESES[p.mes - 1]} ${p.anio}? No se podrán confirmar más asientos en ese mes.`)) cerrar.mutate({ _periodo_id: p.id }); }}>
                        <Lock className="w-3 h-3 mr-1" />Cerrar
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setReabrir(p.id)}><LockOpen className="w-3 h-3 mr-1" />Reabrir</Button>
                    )}
                  </td>
                </tr>
              ))}
              {sel && periodos.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin períodos</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {nuevo && <NuevoEjercicioDialog onClose={() => setNuevo(false)} />}
      {reabrir && <ReabrirDialog periodoId={reabrir} onClose={() => setReabrir(null)} />}
    </div>
  );
}

function NuevoEjercicioDialog({ onClose }: { onClose: () => void }) {
  const y = new Date().getFullYear();
  const [nombre, setNombre] = useState(`Ejercicio ${y}`);
  const [desde, setDesde] = useState(`${y}-01-01`);
  const [hasta, setHasta] = useState(`${y}-12-31`);
  const crear = useCrearEjercicio();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo ejercicio contable</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desde</Label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Se crean automáticamente los períodos de cada mes.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={crear.isPending || !nombre.trim()}
            onClick={() => crear.mutate({ _nombre: nombre, _desde: desde, _hasta: hasta }, { onSuccess: onClose })}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReabrirDialog({ periodoId, onClose }: { periodoId: string; onClose: () => void }) {
  const [motivo, setMotivo] = useState("");
  const m = useReabrirPeriodo();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reabrir período</DialogTitle></DialogHeader>
        <div><Label>Motivo (obligatorio)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
        <p className="text-xs text-muted-foreground">Solo un administrador puede reabrir. Queda registrado quién y por qué.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={m.isPending || !motivo.trim()} onClick={() => m.mutate({ _periodo_id: periodoId, _motivo: motivo }, { onSuccess: onClose })}>Reabrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
