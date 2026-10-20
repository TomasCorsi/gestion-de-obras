import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObras } from "@/hooks/useObras";
import { useProveedores } from "@/hooks/useProveedores";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useClientes } from "@/hooks/useClientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Download, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Tipo = "materiales" | "maquinas";
type Row = Record<string, any>;

const MOVIMIENTOS: Record<string, string> = {
  ingreso_proveedor: "Ingreso de proveedor",
  traslado_obra: "Traslado entre obras",
  salida: "Salida / Otro",
};
const NONE = "__none__";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const money = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

function emptyForm(tipo: Tipo): Row {
  return tipo === "materiales"
    ? { fecha: today(), numero_remito: "", movimiento: "ingreso_proveedor", proveedor_id: "", obra_origen_id: "", obra_destino_id: "", material: "", cantidad: "", unidad: "M3", precio_unitario: "", observaciones: "" }
    : { fecha: today(), numero_remito: "", obra_id: "", maquinaria_id: "", cliente_id: "", unidad: "DIA", cantidad: "1", precio_unitario: "", operador: "", observaciones: "" };
}

function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Sin seleccionar —</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RemitosTipoPanel({ tipo }: { tipo: Tipo }) {
  const table = tipo === "materiales" ? "remitos_materiales" : "remitos_maquinas";
  const { user } = useAuth();
  const qc = useQueryClient();
  const { obras } = useObras();
  const { proveedores } = useProveedores();
  const { maquinarias } = useMaquinarias();
  const { clientes } = useClientes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(emptyForm(tipo));
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(table).select("*").order("fecha", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Row[];
    },
  });

  const obraName = useMemo(() => Object.fromEntries((obras || []).map((o: any) => [o.id, o.nombre])), [obras]);
  const provName = useMemo(() => Object.fromEntries((proveedores || []).map((p: any) => [p.id, p.nombre])), [proveedores]);
  const cliName = useMemo(() => Object.fromEntries((clientes || []).map((c: any) => [c.id, c.nombre])), [clientes]);
  const maqName = useMemo(
    () => Object.fromEntries((maquinarias || []).map((m: any) => [m.id, [m.codigo, m.nombre].filter(Boolean).join(" - ")])),
    [maquinarias]
  );

  const display = (r: Row): Record<string, string | number> =>
    tipo === "materiales"
      ? {
          Fecha: formatDate(r.fecha),
          "N° Remito": r.numero_remito || "",
          Movimiento: MOVIMIENTOS[r.movimiento] || r.movimiento,
          Proveedor: provName[r.proveedor_id] || "",
          "Obra origen": obraName[r.obra_origen_id] || "",
          "Obra destino": obraName[r.obra_destino_id] || "",
          Material: r.material,
          Cantidad: Number(r.cantidad),
          Unidad: r.unidad,
          "Precio unit.": Number(r.precio_unitario),
          Importe: Number(r.cantidad) * Number(r.precio_unitario),
          Observaciones: r.observaciones || "",
        }
      : {
          Fecha: formatDate(r.fecha),
          "N° Remito": r.numero_remito || "",
          Obra: obraName[r.obra_id] || "",
          Máquina: maqName[r.maquinaria_id] || "",
          Cliente: cliName[r.cliente_id] || "",
          Cantidad: Number(r.cantidad),
          Unidad: r.unidad === "DIA" ? "Día(s)" : "Hora(s)",
          Operador: r.operador || "",
          "Precio unit.": Number(r.precio_unitario),
          Importe: Number(r.cantidad) * Number(r.precio_unitario),
          Observaciones: r.observaciones || "",
        };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (desde && r.fecha < desde) return false;
      if (hasta && r.fecha > hasta) return false;
      if (!q) return true;
      return Object.values(display(r)).join(" ").toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, desde, hasta, obraName, provName, maqName, cliName]);

  const total = filtered.reduce((s, r) => s + Number(r.cantidad) * Number(r.precio_unitario), 0);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(emptyForm(tipo)); setEditId(null); setOpen(true); };
  const openEdit = (r: Row) => {
    const f = emptyForm(tipo);
    Object.keys(f).forEach((k) => (f[k] = r[k] == null ? "" : String(r[k])));
    setForm(f); setEditId(r.id); setOpen(true);
  };

  const save = async () => {
    if (!form.fecha) return toast.error("La fecha es obligatoria");
    if (tipo === "materiales" && !form.material.trim()) return toast.error("Indicá el material");
    if (tipo === "maquinas" && !form.maquinaria_id) return toast.error("Seleccioná la máquina");
    if (num(form.cantidad) <= 0) return toast.error("La cantidad debe ser mayor a 0");
    const payload: Row = {};
    Object.entries(form).forEach(([k, v]) => {
      payload[k] = ["cantidad", "precio_unitario"].includes(k) ? num(v) : v === "" ? null : v;
    });
    setSaving(true);
    try {
      const q = editId
        ? (supabase as any).from(table).update(payload).eq("id", editId)
        : (supabase as any).from(table).insert({ ...payload, created_by: user?.id });
      const { error } = await q;
      if (error) throw error;
      toast.success(editId ? "Remito actualizado" : "Remito cargado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: [table] });
    } catch (e: any) {
      toast.error("No se pudo guardar: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from(table).delete().eq("id", deleteId);
    if (error) toast.error("No se pudo eliminar"); else { toast.success("Remito eliminado"); qc.invalidateQueries({ queryKey: [table] }); }
    setDeleteId(null);
  };

  const exportar = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(display));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo === "materiales" ? "Materiales" : "Maquinas");
    XLSX.writeFile(wb, `remitos_${tipo}_${today()}.xlsx`);
  };

  const obraOpts = (obras || []).map((o: any) => ({ value: o.id, label: o.nombre }));
  const cols = Object.keys(display({}));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-9" />
        </div>
        <div className="space-y-1"><Label className="text-xs">Desde</Label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-40" /></div>
        <div className="space-y-1"><Label className="text-xs">Hasta</Label><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-40" /></div>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{filtered.length} remitos · Total {money(total)}</span>
        <Button variant="outline" onClick={exportar} disabled={!filtered.length}><Download className="w-4 h-4 mr-1" />Excel</Button>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nuevo remito</Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-auto">
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !filtered.length ? (
          <p className="p-10 text-center text-muted-foreground">No hay remitos de {tipo === "materiales" ? "materiales" : "máquinas"} cargados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>{cols.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}<TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const d = display(r);
                return (
                  <TableRow key={r.id}>
                    {cols.map((c) => (
                      <TableCell key={c} className="whitespace-nowrap">
                        {c === "Precio unit." || c === "Importe" ? money(Number(d[c])) : typeof d[c] === "number" ? Number(d[c]).toLocaleString("es-AR") : d[c]}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Nuevo"} remito de {tipo === "materiales" ? "materiales" : "máquinas"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">N° Remito</Label><Input value={form.numero_remito} onChange={(e) => set("numero_remito", e.target.value)} className="h-9" /></div>
            {tipo === "materiales" ? (
              <>
                <Pick label="Movimiento" value={form.movimiento} onChange={(v) => set("movimiento", v || "ingreso_proveedor")} options={Object.entries(MOVIMIENTOS).map(([value, label]) => ({ value, label }))} />
                {form.movimiento === "ingreso_proveedor" ? (
                  <Pick label="Proveedor" value={form.proveedor_id} onChange={(v) => set("proveedor_id", v)} options={(proveedores || []).map((p: any) => ({ value: p.id, label: p.nombre }))} />
                ) : (
                  <Pick label="Obra origen" value={form.obra_origen_id} onChange={(v) => set("obra_origen_id", v)} options={obraOpts} />
                )}
                <Pick label="Obra destino" value={form.obra_destino_id} onChange={(v) => set("obra_destino_id", v)} options={obraOpts} />
                <div className="space-y-1.5"><Label className="text-xs">Material</Label><Input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Ej: Cemento, Caños, Tosca" className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Cantidad</Label><Input inputMode="decimal" value={form.cantidad} onChange={(e) => set("cantidad", e.target.value)} className="h-9" /></div>
                <Pick label="Unidad" value={form.unidad} onChange={(v) => set("unidad", v || "UN")} options={["M3", "TN", "KG", "UN", "BOLSA", "ML", "LT"].map((u) => ({ value: u, label: u }))} />
              </>
            ) : (
              <>
                <Pick label="Máquina" value={form.maquinaria_id} onChange={(v) => set("maquinaria_id", v)} options={(maquinarias || []).map((m: any) => ({ value: m.id, label: maqName[m.id] }))} />
                <Pick label="Obra" value={form.obra_id} onChange={(v) => set("obra_id", v)} options={obraOpts} />
                <Pick label="Cliente" value={form.cliente_id} onChange={(v) => set("cliente_id", v)} options={(clientes || []).map((c: any) => ({ value: c.id, label: c.nombre }))} />
                <Pick label="Se cobra por" value={form.unidad} onChange={(v) => set("unidad", v || "DIA")} options={[{ value: "DIA", label: "Días" }, { value: "HORA", label: "Horas" }]} />
                <div className="space-y-1.5">
                  <Label className="text-xs">Cantidad de {form.unidad === "DIA" ? "días (ej: 0,5 = medio día)" : "horas"}</Label>
                  <Input inputMode="decimal" value={form.cantidad} onChange={(e) => set("cantidad", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Operador</Label><Input value={form.operador} onChange={(e) => set("operador", e.target.value)} className="h-9" /></div>
              </>
            )}
            <div className="space-y-1.5"><Label className="text-xs">Precio unitario</Label><Input inputMode="decimal" value={form.precio_unitario} onChange={(e) => set("precio_unitario", e.target.value)} placeholder="0" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Importe</Label><Input readOnly value={money(num(form.cantidad) * num(form.precio_unitario))} className="h-9 bg-muted" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Observaciones</Label><Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={remove} title="¿Eliminar remito?" description="Esta acción no se puede deshacer." />
    </div>
  );
}
