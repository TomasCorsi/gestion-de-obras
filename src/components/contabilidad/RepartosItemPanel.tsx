import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCentros, useSubcentros } from "@/hooks/useCentrosCosto";
import { useSaveReparto, useDeleteReparto, type Reparto } from "@/hooks/useContab1c";
import { saldoItem } from "@/lib/contab1c";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const num = (s: string) => Number(String(s).replace(",", "."));

export function RepartosItemPanel({ itemId, neto, repartos, editable, fecha, obras, maquinas }: {
  itemId: string; neto: number; repartos: Reparto[]; editable: boolean; fecha: string;
  obras: { id: string; nombre: string }[]; maquinas: any[];
}) {
  const { data: centros = [] } = useCentros();
  const { data: subs = [] } = useSubcentros();
  const save = useSaveReparto();
  const del = useDeleteReparto();
  const [f, setF] = useState<{ sub: string; modo: "importe" | "porcentaje"; valor: string; obra: string; maq: string; nota: string }>({ sub: "", modo: "porcentaje", valor: "", obra: "", maq: "", nota: "" });

  const vigente = (s: any) => s.activo && fecha >= s.vigente_desde && (!s.vigente_hasta || fecha <= s.vigente_hasta);
  const subOpts = subs.filter(vigente).map((s) => {
    const c = centros.find((x) => x.id === s.centro_id);
    return { value: s.id, label: `${c?.codigo ?? ""} › ${s.codigo} · ${s.nombre}` };
  });
  const subSel = subs.find((s) => s.id === f.sub);
  const efectivos = repartos.map((r) => Number(r.importe_efectivo));
  const pendiente = saldoItem(neto, efectivos);
  const valor = num(f.valor);
  const valido = !!f.sub && valor > 0 && (f.modo === "importe" ? valor <= pendiente : valor <= 100);
  const nombreSub = (id: string) => subOpts.find((o) => o.value === id)?.label ?? subs.find((s) => s.id === id)?.codigo ?? "—";
  const nombreObra = (id: string | null) => (id ? obras.find((o) => o.id === id)?.nombre ?? "obra" : "");
  const nombreMaq = (id: string | null) => (id ? (maquinas.find((m) => m.id === id)?.codigo || maquinas.find((m) => m.id === id)?.nombre || "máquina") : "");

  const agregar = () => save.mutate(
    { item_id: itemId, subcentro_id: f.sub, modo: f.modo, valor, obra_id: subSel?.obra_id ? null : f.obra || null, maquinaria_id: subSel?.maquinaria_id ? null : f.maq || null, nota: f.nota },
    { onSuccess: () => setF({ ...f, sub: "", valor: "", obra: "", maq: "", nota: "" }) },
  );

  return (
    <div className="space-y-2" data-testid={`repartos-${itemId}`}>
      <div className="flex justify-between text-xs">
        <span className="font-semibold">Reparto por centro de costo</span>
        <span>Neto {fmt(neto)} · Imputado <b>{fmt(neto - pendiente)}</b> · Pendiente <b className={pendiente > 0 ? "text-destructive" : ""}>{fmt(pendiente)}</b></span>
      </div>
      {repartos.length === 0 && <p className="text-xs text-muted-foreground">Sin repartos.</p>}
      {repartos.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
          <span>
            {nombreSub(r.subcentro_id)}
            {r.obra_id && <> · {nombreObra(r.obra_id)} ({r.obra_atribucion === "economica" ? "económica" : "informativa"})</>}
            {r.maquinaria_id && <> · {nombreMaq(r.maquinaria_id)}</>}
            {r.nota && <> · {r.nota}</>}
          </span>
          <span className="flex items-center gap-2 tabular-nums">
            {r.modo === "porcentaje" && <span className="text-muted-foreground">{Number(r.porcentaje)}%</span>}
            <b>{fmt(r.importe_efectivo)}</b>
            {Number(r.ajuste_redondeo) !== 0 && <span className="text-muted-foreground">(redondeo {fmt(r.ajuste_redondeo)})</span>}
            {editable && (
              <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Quitar reparto" onClick={() => del.mutate(r.id)} disabled={del.isPending}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </span>
        </div>
      ))}
      {editable && (
        subOpts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay subcentros vigentes. Crealos en Contabilidad › Centros de costo.</p>
        ) : (
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4"><Combobox options={subOpts} value={f.sub} onValueChange={(v) => setF({ ...f, sub: v })} placeholder="Subcentro" searchPlaceholder="Buscar…" /></div>
            <div className="col-span-2">
              <Select value={f.modo} onValueChange={(v) => setF({ ...f, modo: v as any })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="porcentaje">Porcentaje</SelectItem><SelectItem value="importe">Importe</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Input aria-label="Valor del reparto" inputMode="decimal" placeholder={f.modo === "porcentaje" ? "%" : "$"} value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} /></div>
            <div className="col-span-2">
              {subSel?.obra_id ? <p className="text-[11px] text-muted-foreground">Obra del subcentro</p> : (
                <Combobox options={obras.map((o) => ({ value: o.id, label: o.nombre }))} value={f.obra} onValueChange={(v) => setF({ ...f, obra: v })} placeholder="Obra (opc.)" searchPlaceholder="Buscar…" />
              )}
            </div>
            <div className="col-span-2">
              {subSel?.maquinaria_id ? <p className="text-[11px] text-muted-foreground">Máquina del subcentro</p> : (
                <Combobox options={maquinas.map((m: any) => ({ value: m.id, label: m.codigo || m.nombre }))} value={f.maq} onValueChange={(v) => setF({ ...f, maq: v })} placeholder="Máquina (opc.)" searchPlaceholder="Buscar…" />
              )}
            </div>
            <div className="col-span-10"><Input placeholder="Nota (opcional)" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} /></div>
            <div className="col-span-2"><Button className="w-full" size="sm" onClick={agregar} disabled={!valido || save.isPending}>Agregar</Button></div>
            {f.modo === "importe" && valor > pendiente && <p className="col-span-12 text-xs text-destructive">El importe supera el pendiente ({fmt(pendiente)}).</p>}
          </div>
        )
      )}
    </div>
  );
}
