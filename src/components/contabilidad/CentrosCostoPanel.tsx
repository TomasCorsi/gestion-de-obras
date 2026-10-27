import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCentros, useSubcentros, useSugeridos, useSaveCentro, useSaveSubcentro, useDeleteSubcentro,
  type CentroCosto, type SubcentroCosto, type TipoCentro, type Sugerido,
} from "@/hooks/useCentrosCosto";

const TIPOS: { v: TipoCentro; l: string }[] = [
  { v: "obras", l: "Obras" }, { v: "maquinarias", l: "Maquinarias" }, { v: "taller", l: "Taller" },
  { v: "administracion", l: "Administración" }, { v: "deposito", l: "Depósito / Stock" },
  { v: "generales", l: "Gastos generales" }, { v: "otro", l: "Otro" },
];
const fmtDate = (s?: string | null) => { if (!s) return "—"; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const codigoDe = (t: string) => t.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "SC";

export function CentrosCostoPanel() {
  const { data: centros = [] } = useCentros();
  const { data: subs = [] } = useSubcentros();
  const [sel, setSel] = useState<string | null>(null);
  const [editC, setEditC] = useState<Partial<CentroCosto> | null>(null);
  const [editS, setEditS] = useState<Partial<SubcentroCosto> | null>(null);
  const [verSug, setVerSug] = useState(false);
  const del = useDeleteSubcentro();
  const centro = centros.find((c) => c.id === sel) ?? centros[0];
  const subsCentro = subs.filter((s) => s.centro_id === centro?.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Centros de costo</CardTitle>
          <Button size="sm" onClick={() => setEditC({ tipo: "otro", activo: true, orden: centros.length + 1 })}><Plus className="w-4 h-4 mr-1" />Nuevo</Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {centros.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)}
              className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${centro?.id === c.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}>
              <span><span className="font-mono text-xs text-muted-foreground mr-2">{c.codigo}</span>{c.nombre}</span>
              <span className="flex items-center gap-2">
                {!c.activo && <Badge variant="outline">Inactivo</Badge>}
                <Badge variant="secondary">{subs.filter((s) => s.centro_id === c.id).length}</Badge>
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      {centro && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">{centro.codigo} · {centro.nombre}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {TIPOS.find((t) => t.v === centro.tipo)?.l} · vigente desde {fmtDate(centro.vigente_desde)} hasta {fmtDate(centro.vigente_hasta)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditC(centro)}><Pencil className="w-4 h-4 mr-1" />Editar centro</Button>
              {(centro.tipo === "obras" || centro.tipo === "maquinarias" || centro.tipo === "taller") && (
                <Button size="sm" variant="outline" onClick={() => setVerSug(true)}><Sparkles className="w-4 h-4 mr-1" />Sugeridos</Button>
              )}
              <Button size="sm" onClick={() => setEditS({ centro_id: centro.id, activo: true })}><Plus className="w-4 h-4 mr-1" />Subcentro</Button>
            </div>
          </CardHeader>
          <CardContent>
            {subsCentro.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin subcentros. Se crean a medida que se necesitan{centro.tipo === "obras" || centro.tipo === "maquinarias" ? " (usá «Sugeridos» para elegir una obra o máquina)" : ""}.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left"><tr>
                  <th className="px-2 py-1">Código</th><th className="px-2 py-1">Nombre</th><th className="px-2 py-1">Vínculo</th>
                  <th className="px-2 py-1">Vigencia</th><th className="px-2 py-1">Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {subsCentro.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-2 py-1 font-mono text-xs">{s.codigo}</td>
                      <td className="px-2 py-1">{s.nombre}</td>
                      <td className="px-2 py-1 text-xs">{s.obra_id ? "Obra" : s.maquinaria_id ? "Máquina" : "—"}</td>
                      <td className="px-2 py-1 text-xs">{fmtDate(s.vigente_desde)} – {fmtDate(s.vigente_hasta)}</td>
                      <td className="px-2 py-1">{s.activo ? <Badge>Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</td>
                      <td className="px-2 py-1 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => setEditS(s)} aria-label="Editar"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Eliminar"
                          onClick={() => { if (confirm("¿Eliminar subcentro? Si tiene movimientos no se podrá: desactivalo.")) del.mutate(s.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {editC && <CentroDialog value={editC} onClose={() => setEditC(null)} />}
      {editS && <SubcentroDialog value={editS} onClose={() => setEditS(null)} />}
      {verSug && centro && <SugeridosDialog centro={centro} onClose={() => setVerSug(false)} />}
    </div>
  );
}

function VigenciaActivo({ f, set }: { f: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <div><Label>Vigente desde</Label><Input type="date" value={f.vigente_desde ?? ""} onChange={(e) => set("vigente_desde", e.target.value)} /></div>
      <div><Label>Vigente hasta</Label><Input type="date" value={f.vigente_hasta ?? ""} onChange={(e) => set("vigente_hasta", e.target.value)} /></div>
      <div className="col-span-2 flex items-center gap-2"><Switch checked={f.activo ?? true} onCheckedChange={(v) => set("activo", v)} /><Label>Activo</Label></div>
    </>
  );
}

function CentroDialog({ value, onClose }: { value: Partial<CentroCosto>; onClose: () => void }) {
  const [f, setF] = useState<any>(value);
  const save = useSaveCentro();
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const ok = /^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(f.codigo ?? "") && (f.nombre ?? "").trim();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar centro" : "Nuevo centro"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Código</Label><Input value={f.codigo ?? ""} onChange={(e) => set("codigo", e.target.value.toUpperCase())} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Nombre</Label><Input value={f.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} /></div>
          <VigenciaActivo f={f} set={set} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!ok || save.isPending} onClick={() => save.mutate(f, { onSuccess: onClose })}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubcentroDialog({ value, onClose }: { value: Partial<SubcentroCosto>; onClose: () => void }) {
  const [f, setF] = useState<any>(value);
  const save = useSaveSubcentro();
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const ok = /^[A-Z0-9][A-Z0-9._-]{0,29}$/.test(f.codigo ?? "") && (f.nombre ?? "").trim();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar subcentro" : "Nuevo subcentro"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Código</Label><Input value={f.codigo ?? ""} onChange={(e) => set("codigo", e.target.value.toUpperCase())} /></div>
          <div><Label>Nombre</Label><Input value={f.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} /></div>
          <VigenciaActivo f={f} set={set} />
          {(f.obra_id || f.maquinaria_id) && <p className="col-span-2 text-xs text-muted-foreground">Vinculado a {f.obra_id ? "una obra" : "una máquina"}. El vínculo no se puede cambiar si ya tiene movimientos.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!ok || save.isPending} onClick={() => save.mutate(f, { onSuccess: onClose })}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SugeridosDialog({ centro, onClose }: { centro: CentroCosto; onClose: () => void }) {
  const { data = [], isLoading } = useSugeridos();
  const save = useSaveSubcentro();
  const [q, setQ] = useState("");
  const origen = centro.tipo === "obras" ? "obra" : "maquina";
  const lista = useMemo(() => data.filter((s) => s.origen === origen && s.nombre.toLowerCase().includes(q.toLowerCase())), [data, origen, q]);
  const crear = (s: Sugerido) => save.mutate({
    centro_id: centro.id, codigo: codigoDe(`${centro.codigo}-${s.nombre.split(" ")[0]}`).slice(0, 30), nombre: s.nombre, activo: true,
    obra_id: s.origen === "obra" ? s.ref_id : null, maquinaria_id: s.origen === "maquina" ? s.ref_id : null,
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{origen === "obra" ? "Obras" : "Máquinas"} sin subcentro</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Nada se crea solo: elegí cuáles necesitás. El código propuesto se puede editar después.</p>
        <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        {isLoading ? <p className="text-sm">Cargando…</p> : (
          <div className="divide-y rounded-md border">
            {lista.slice(0, 200).map((s) => (
              <div key={s.ref_id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{s.nombre} {s.estado && <span className="text-xs text-muted-foreground">· {s.estado}</span>}</span>
                <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => crear(s)}>Crear subcentro</Button>
              </div>
            ))}
            {lista.length === 0 && <p className="p-3 text-sm text-muted-foreground">No hay pendientes.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
