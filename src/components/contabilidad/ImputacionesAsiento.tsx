import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCentros, useSubcentros, useImputacionesAsiento, useAddImputacion, useDeleteImputacion } from "@/hooks/useCentrosCosto";
import { useObras } from "@/hooks/useObras";
import { saldoSinImputar, excedeLinea } from "@/lib/analitica";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));

export function ImputacionesAsiento({ lineas, editable }: { lineas: any[]; editable: boolean }) {
  const ids = useMemo(() => lineas.map((l) => l.id), [lineas]);
  const { data: imps = [] } = useImputacionesAsiento(ids);
  const { data: centros = [] } = useCentros();
  const { data: subs = [] } = useSubcentros();
  const { data: obras = [] } = useObras() as any;
  const add = useAddImputacion();
  const del = useDeleteImputacion();
  const [form, setForm] = useState<Record<string, any>>({});

  const subOpts = subs.filter((s) => s.activo).map((s) => {
    const c = centros.find((x) => x.id === s.centro_id);
    return { value: s.id, label: `${c?.codigo ?? ""} › ${s.codigo} · ${s.nombre}` };
  });
  const obraOpts = (obras as any[]).map((o) => ({ value: o.id, label: o.nombre }));

  if (lineas.length === 0) return null;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-semibold">Imputación analítica (centros de costo)</p>
      {lineas.map((l) => {
        const importe = Number(l.debe || 0) + Number(l.haber || 0);
        const propias = imps.filter((i) => i.linea_id === l.id);
        const originales = propias.filter((i) => i.tipo_movimiento === "original").map((i) => Number(i.importe));
        const saldo = saldoSinImputar(importe, originales);
        const f = form[l.id] ?? { naturaleza: "gasto", atribucion: "informativa" };
        const set = (k: string, v: any) => setForm((x) => ({ ...x, [l.id]: { ...f, [k]: v } }));
        const sub = subs.find((s) => s.id === f.subcentro_id);
        const permiteObra = sub && !sub.obra_id;
        const importeNuevo = Number(String(f.importe ?? "").replace(",", "."));
        const valido = f.subcentro_id && importeNuevo > 0 && !excedeLinea(importe, originales, importeNuevo);
        return (
          <div key={l.id} className="rounded border p-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-xs">{l.orden}. {l.cuenta ? `${l.cuenta.codigo} · ${l.cuenta.nombre}` : "—"} — {fmt(importe)}</span>
              <span className="text-xs">Sin imputar: <b>{fmt(saldo)}</b></span>
            </div>
            {propias.map((i) => (
              <div key={i.id} className="mt-1 flex items-center justify-between gap-2 text-xs">
                <span>
                  {i.tipo_movimiento === "reversa" && <Badge variant="outline" className="mr-1">Reversa</Badge>}
                  {i.centro_codigo_snap} › {i.subcentro_codigo_snap} · {i.subcentro_nombre_snap}
                  {i.obra_id && <> · obra ({i.obra_atribucion === "economica" ? "económica" : "informativa"})</>}
                  {" · "}{i.naturaleza}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  {fmt(Number(i.importe) * i.signo)}
                  {editable && i.tipo_movimiento === "original" && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Quitar" onClick={() => del.mutate(i.id)}><Trash2 className="w-3 h-3" /></Button>
                  )}
                </span>
              </div>
            ))}
            {editable && saldo > 0 && (
              <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_110px_120px_auto]">
                <Combobox options={subOpts} value={f.subcentro_id ?? ""} onValueChange={(v) => set("subcentro_id", v)} placeholder="Subcentro" searchPlaceholder="Buscar subcentro…" />
                <Select value={f.naturaleza} onValueChange={(v) => set("naturaleza", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gasto">Gasto</SelectItem><SelectItem value="ingreso">Ingreso</SelectItem></SelectContent>
                </Select>
                <Input inputMode="decimal" placeholder={String(saldo)} value={f.importe ?? ""} onChange={(e) => set("importe", e.target.value)} />
                <Button size="sm" disabled={!valido || add.isPending} onClick={() => add.mutate({
                  linea_id: l.id, subcentro_id: f.subcentro_id, naturaleza: f.naturaleza, importe: importeNuevo,
                  obra_id: permiteObra ? f.obra_id : null, obra_atribucion: f.atribucion,
                }, { onSuccess: () => setForm((x) => ({ ...x, [l.id]: undefined })) })}>
                  <Plus className="w-4 h-4" />
                </Button>
                {permiteObra && (
                  <div className="sm:col-span-4 grid gap-2 sm:grid-cols-[2fr_1fr]">
                    <Combobox options={obraOpts} value={f.obra_id ?? ""} onValueChange={(v) => set("obra_id", v)} placeholder="Obra relacionada (opcional)" searchPlaceholder="Buscar obra…" />
                    <Select value={f.atribucion} onValueChange={(v) => set("atribucion", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informativa">Solo referencia</SelectItem>
                        <SelectItem value="economica">Suma al resultado de la obra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
