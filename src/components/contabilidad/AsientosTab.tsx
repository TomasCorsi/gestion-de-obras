import { useMemo, useState } from "react";
import { ChevronRight, BookOpen, CheckCircle2, Undo2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContabAsientos, useContabAsientoLineas } from "@/hooks/useContabilidad";
import { useConfirmarAsiento, useDescartarAsiento, useRevertirAsiento } from "@/hooks/useContabPeriodos";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fmtDate = (s: string) => { const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };

const ESTADOS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "default" },
  revertido: { label: "Revertido", variant: "destructive" },
};

export function AsientosTab() {
  const { data = [] } = useContabAsientos();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const lista = useMemo(() => filtro === "todos" ? data : data.filter((a: any) => (a.estado ?? "borrador") === filtro), [data, filtro]);
  const abierto = data.find((a) => a.id === openId) as any;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["todos", "borrador", "confirmado", "revertido"].map((f) => (
          <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : ESTADOS[f].label} ({f === "todos" ? data.length : data.filter((a: any) => (a.estado ?? "borrador") === f).length})
          </Button>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 w-20">N° ejerc.</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Debe</th>
                  <th className="px-3 py-2 text-right">Haber</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    <BookOpen className="inline w-4 h-4 mr-2" />No hay asientos
                  </td></tr>
                )}
                {lista.map((a: any) => {
                  const e = ESTADOS[a.estado ?? "borrador"];
                  return (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">{a.numero_ejercicio ?? "—"}</td>
                      <td className="px-3 py-2">{fmtDate(a.fecha)}</td>
                      <td className="px-3 py-2">{a.descripcion}</td>
                      <td className="px-3 py-2 text-xs">{a.origen ?? "—"}</td>
                      <td className="px-3 py-2"><Badge variant={e.variant}>{e.label}</Badge></td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(a.total_debe)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(a.total_haber)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="icon" variant="ghost" onClick={() => setOpenId(a.id)}><ChevronRight className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {abierto && <AsientoDetalle asiento={abierto} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function AsientoDetalle({ asiento, onClose }: { asiento: any; onClose: () => void }) {
  const { data: lineas = [] } = useContabAsientoLineas(asiento.id);
  const confirmar = useConfirmarAsiento();
  const revertir = useRevertirAsiento();
  const descartar = useDescartarAsiento();
  const [revOpen, setRevOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA"));
  const estado = asiento.estado ?? "borrador";
  const debe = lineas.reduce((s, l) => s + Number(l.debe || 0), 0);
  const haber = lineas.reduce((s, l) => s + Number(l.haber || 0), 0);
  const cuadra = debe > 0 && Math.abs(debe - haber) < 0.005;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Asiento {asiento.numero_ejercicio ? `N° ${asiento.numero_ejercicio}` : "(borrador)"} · {fmtDate(asiento.fecha)}
            <Badge variant={ESTADOS[estado].variant}>{ESTADOS[estado].label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{asiento.descripcion}{asiento.motivo ? ` — Motivo: ${asiento.motivo}` : ""}</p>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-1">Cuenta</th><th className="px-2 py-1">Descripción</th><th className="px-2 py-1">Obra</th>
              <th className="px-2 py-1">Máquina</th><th className="px-2 py-1 text-right">Debe</th><th className="px-2 py-1 text-right">Haber</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-2 py-1 text-xs">{l.cuenta ? `${l.cuenta.codigo} · ${l.cuenta.nombre}` : "—"}</td>
                <td className="px-2 py-1">{l.descripcion}</td>
                <td className="px-2 py-1 text-xs">{l.obra?.nombre ?? "—"}</td>
                <td className="px-2 py-1 text-xs">{l.maquinaria ? (l.maquinaria.codigo || l.maquinaria.nombre) : "—"}</td>
                <td className="px-2 py-1 text-right tabular-nums">{l.debe > 0 ? fmt(l.debe) : ""}</td>
                <td className="px-2 py-1 text-right tabular-nums">{l.haber > 0 ? fmt(l.haber) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 font-semibold">
            <tr><td colSpan={4} className="px-2 py-1">{cuadra ? "Cuadra" : <span className="text-destructive">No cuadra</span>}</td>
              <td className="px-2 py-1 text-right tabular-nums">{fmt(debe)}</td><td className="px-2 py-1 text-right tabular-nums">{fmt(haber)}</td></tr>
          </tfoot>
        </table>

        {revOpen && (
          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_180px]">
            <div><Label>Motivo de la reversa (obligatorio)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
            <div><Label>Fecha del contraasiento</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          </div>
        )}

        <DialogFooter>
          {estado === "borrador" && (
            <Button variant="outline" disabled={descartar.isPending}
              onClick={() => { if (confirm("¿Descartar este borrador? El comprobante o pago queda libre para corregirlo y volver a generar el asiento.")) descartar.mutate({ _asiento_id: asiento.id }, { onSuccess: onClose }); }}>
              Descartar borrador
            </Button>
          )}
          {estado === "borrador" && (
            <Button disabled={!cuadra || confirmar.isPending} onClick={() => confirmar.mutate({ _asiento_id: asiento.id }, { onSuccess: onClose })}>
              <CheckCircle2 className="w-4 h-4 mr-1" />Confirmar
            </Button>
          )}
          {estado === "confirmado" && !revOpen && (
            <Button variant="destructive" onClick={() => setRevOpen(true)}><Undo2 className="w-4 h-4 mr-1" />Revertir</Button>
          )}
          {estado === "confirmado" && revOpen && (
            <Button variant="destructive" disabled={!motivo.trim() || revertir.isPending}
              onClick={() => revertir.mutate({ _asiento_id: asiento.id, _motivo: motivo, _fecha: fecha }, { onSuccess: onClose })}>
              Generar contraasiento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
