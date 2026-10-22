import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObras } from "@/hooks/useObras";
import { useProveedores } from "@/hooks/useProveedores";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { usePersonal } from "@/hooks/usePersonal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { ChevronsUpDown, Download, Loader2, Merge, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { formatearNombreMaterial, normalizarMaterial, totalRemitoMateriales } from "@/lib/materiales";

type Row = Record<string, any>;
interface Material { id: string; nombre: string; nombre_normalizado: string; unidad_default: string; activo: boolean }
interface Renglon { material_id: string; cantidad: string; unidad: string; precio_unitario: string }

const MOVIMIENTOS: Record<string, string> = {
  ingreso_proveedor: "Ingreso de proveedor",
  traslado_obra: "Traslado entre obras",
  salida: "Salida / Otro",
};
const UNIDADES = ["M3", "TN", "KG", "UN", "BOLSA", "ML", "M2", "LT", "BARRA", "ROLLO"];
const NONE = "__none__";
const sb = supabase as any;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const money = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
const emptyHead = () => ({ fecha: today(), numero_remito: "", movimiento: "ingreso_proveedor", proveedor_id: "", obra_origen_id: "", obra_destino_id: "", transporte: "proveedor", camion_id: "", chofer_id: "", cantidad_viajes: "", observaciones: "" });
const emptyRenglon = (): Renglon => ({ material_id: "", cantidad: "", unidad: "UN", precio_unitario: "" });

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

function useCatalogo() {
  return useQuery<Material[]>({
    queryKey: ["materiales_catalogo"],
    queryFn: async () => {
      const { data, error } = await sb.from("materiales_catalogo").select("id,nombre,nombre_normalizado,unidad_default,activo").order("nombre");
      if (error) throw error;
      return data || [];
    },
  });
}

function MaterialCombo({ value, catalogo, onPick, onCreate }: { value: string; catalogo: Material[]; onPick: (m: Material) => void; onCreate: (nombre: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sel = catalogo.find((m) => m.id === value);
  const nq = normalizarMaterial(q);
  const tokens = nq.split(" ").filter(Boolean);
  const matches = catalogo.filter((m) => m.activo && tokens.every((t) => m.nombre_normalizado.includes(t)));
  const exacto = catalogo.find((m) => m.nombre_normalizado === nq);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-between font-normal">
          <span className="truncate">{sel?.nombre || "Elegir material"}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Buscar (ej: hierro 8)" />
          <CommandList>
            <CommandEmpty>Sin coincidencias</CommandEmpty>
            {matches.length > 0 && (
              <CommandGroup heading={q && !exacto ? "¿Quisiste decir…?" : undefined}>
                {matches.slice(0, 50).map((m) => (
                  <CommandItem key={m.id} value={m.id} onSelect={() => { onPick(m); setOpen(false); setQ(""); }}>
                    {m.nombre} <span className="ml-auto text-xs text-muted-foreground">{m.unidad_default}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {nq && !exacto && (
              <CommandGroup>
                <CommandItem value="__crear" onSelect={async () => { await onCreate(formatearNombreMaterial(q)); setOpen(false); setQ(""); }}>
                  <Plus className="w-4 h-4 mr-1" /> Crear «{formatearNombreMaterial(q)}»
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CatalogoTab({ catalogo }: { catalogo: Material[] }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Material | null>(null);
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("UN");
  const [merge, setMerge] = useState<Material | null>(null);
  const [destino, setDestino] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["materiales_catalogo"] }); qc.invalidateQueries({ queryKey: ["remito_material_items"] }); };

  const guardar = async () => {
    if (!edit) return;
    const { error } = await sb.from("materiales_catalogo").update({ nombre: formatearNombreMaterial(nombre), unidad_default: unidad }).eq("id", edit.id);
    if (error) return toast.error(error.code === "23505" ? "Ya existe un material con ese nombre. Usá «Unificar»." : error.message);
    toast.success("Material actualizado"); setEdit(null); refresh();
  };
  const toggle = async (m: Material) => {
    const { error } = await sb.from("materiales_catalogo").update({ activo: !m.activo }).eq("id", m.id);
    if (error) toast.error(error.message); else refresh();
  };
  const unificar = async () => {
    if (!merge || !destino) return;
    const { error } = await sb.rpc("unificar_materiales", { _origen: merge.id, _destino: destino });
    if (error) return toast.error(error.message);
    toast.success("Materiales unificados"); setMerge(null); setDestino(""); refresh();
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Unidad</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {catalogo.map((m) => (
            <TableRow key={m.id} className={m.activo ? "" : "opacity-50"}>
              <TableCell>{m.nombre}</TableCell>
              <TableCell>{m.unidad_default}</TableCell>
              <TableCell><Button size="sm" variant="ghost" onClick={() => toggle(m)}>{m.activo ? "Activo" : "Inactivo"}</Button></TableCell>
              <TableCell className="whitespace-nowrap">
                <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEdit(m); setNombre(m.nombre); setUnidad(m.unidad_default); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" title="Unificar con otro" onClick={() => setMerge(m)}><Merge className="w-4 h-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {!catalogo.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground p-8">Todavía no hay materiales. Se crean al cargar un remito.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
            <Pick label="Unidad por defecto" value={unidad} onChange={(v) => setUnidad(v || "UN")} options={UNIDADES.map((u) => ({ value: u, label: u }))} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={guardar}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!merge} onOpenChange={(o) => !o && setMerge(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unificar «{merge?.nombre}»</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Todos los remitos que usan «{merge?.nombre}» pasarán al material que elijas, y «{merge?.nombre}» se elimina del catálogo.</p>
          <Pick label="Pasar a" value={destino} onChange={setDestino} options={catalogo.filter((m) => m.id !== merge?.id).map((m) => ({ value: m.id, label: m.nombre }))} />
          <DialogFooter><Button variant="outline" onClick={() => setMerge(null)}>Cancelar</Button><Button onClick={unificar} disabled={!destino}>Unificar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MaterialesRemitosPanel() {
  const { user, roles } = useAuth();
  const isAdmin = roles?.includes("admin");
  const qc = useQueryClient();
  const { obras } = useObras();
  const { proveedores } = useProveedores();
  const { maquinarias } = useMaquinarias();
  const { personal } = usePersonal();
  const { data: catalogo = [] } = useCatalogo();
  const [open, setOpen] = useState(false);
  const [head, setHead] = useState<Row>(emptyHead());
  const [renglones, setRenglones] = useState<Renglon[]>([emptyRenglon()]);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const { data: remitos = [], isLoading } = useQuery<Row[]>({
    queryKey: ["remitos_materiales"],
    queryFn: async () => {
      const { data, error } = await sb.from("remitos_materiales").select("*").order("fecha", { ascending: false }).limit(1000);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: items = [] } = useQuery<Row[]>({
    queryKey: ["remito_material_items"],
    queryFn: async () => {
      const all: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from("remito_material_items").select("*").order("orden").range(from, from + 999);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const matName = useMemo(() => Object.fromEntries(catalogo.map((m) => [m.id, m.nombre])), [catalogo]);
  const obraName = useMemo(() => Object.fromEntries((obras || []).map((o: any) => [o.id, o.nombre])), [obras]);
  const provName = useMemo(() => Object.fromEntries((proveedores || []).map((p: any) => [p.id, p.nombre])), [proveedores]);
  const maqName = useMemo(() => Object.fromEntries((maquinarias || []).map((m: any) => [m.id, [m.codigo, m.nombre].filter(Boolean).join(" - ")])), [maquinarias]);
  const choferName = useMemo(() => Object.fromEntries((personal || []).map((p: any) => [p.id, `${p.apellido || ""} ${p.nombre || ""}`.trim()])), [personal]);

  const filas = useMemo(() => {
    const byRemito: Record<string, Row[]> = {};
    items.forEach((i) => (byRemito[i.remito_id] ||= []).push(i));
    const out: { remito: Row; d: Record<string, string | number> }[] = [];
    remitos.forEach((r) => {
      const its = byRemito[r.id]?.length ? byRemito[r.id] : [{ material_id: null, cantidad: r.cantidad, unidad: r.unidad, precio_unitario: r.precio_unitario, _legacy: r.material }];
      its.forEach((i) => out.push({
        remito: r,
        d: {
          Fecha: formatDate(r.fecha),
          "N° Remito": r.numero_remito || "",
          Movimiento: MOVIMIENTOS[r.movimiento] || r.movimiento,
          Proveedor: provName[r.proveedor_id] || "",
          "Obra origen": obraName[r.obra_origen_id] || "",
          "Obra destino": obraName[r.obra_destino_id] || "",
          Transporte: r.transporte === "propio" ? `Propio – ${maqName[r.camion_id] || "camión"}${r.cantidad_viajes ? ` (${r.cantidad_viajes} viaje${r.cantidad_viajes > 1 ? "s" : ""})` : ""}` : "Proveedor",
          Chofer: choferName[r.chofer_id] || "",
          Material: matName[i.material_id] || i._legacy || "",
          Cantidad: Number(i.cantidad),
          Unidad: i.unidad,
          "Precio unit.": Number(i.precio_unitario),
          Importe: Number(i.cantidad) * Number(i.precio_unitario),
          Observaciones: r.observaciones || "",
        },
      }));
    });
    const q = normalizarMaterial(search);
    return out.filter(({ remito: r, d }) => {
      if (desde && r.fecha < desde) return false;
      if (hasta && r.fecha > hasta) return false;
      if (!q) return true;
      const txt = normalizarMaterial(Object.values(d).join(" "));
      return q.split(" ").every((t) => txt.includes(t));
    });
  }, [remitos, items, matName, obraName, provName, maqName, choferName, search, desde, hasta]);

  const total = filas.reduce((s, f) => s + Number(f.d.Importe), 0);
  const cols = ["Fecha", "N° Remito", "Movimiento", "Proveedor", "Obra origen", "Obra destino", "Transporte", "Chofer", "Material", "Cantidad", "Unidad", "Precio unit.", "Importe", "Observaciones"];
  const setH = (k: string, v: any) => setHead((f) => ({ ...f, [k]: v }));
  const setR = (idx: number, patch: Partial<Renglon>) => setRenglones((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const openNew = () => { setHead(emptyHead()); setRenglones([emptyRenglon()]); setEditId(null); setOpen(true); };
  const openEdit = (r: Row) => {
    const h = emptyHead() as Row;
    Object.keys(h).forEach((k) => (h[k] = r[k] == null ? "" : String(r[k])));
    const its = items.filter((i) => i.remito_id === r.id);
    setHead(h);
    setRenglones(its.length ? its.map((i) => ({ material_id: i.material_id, cantidad: String(i.cantidad), unidad: i.unidad, precio_unitario: String(i.precio_unitario) })) : [emptyRenglon()]);
    setEditId(r.id); setOpen(true);
  };

  const crearMaterial = async (idx: number, nombre: string) => {
    const unidad = renglones[idx]?.unidad || "UN";
    const { data, error } = await sb.from("materiales_catalogo").insert({ nombre, unidad_default: unidad, created_by: user?.id }).select("id,nombre,nombre_normalizado,unidad_default,activo").single();
    if (error) { toast.error(error.code === "23505" ? "Ese material ya existe en el catálogo" : error.message); return; }
    qc.setQueryData<Material[]>(["materiales_catalogo"], (old = []) => [...old, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setR(idx, { material_id: data.id });
    toast.success(`Material «${data.nombre}» creado`);
  };

  const save = async () => {
    if (!head.fecha) return toast.error("La fecha es obligatoria");
    const propio = head.transporte === "propio";
    if (propio && !head.camion_id) return toast.error("Elegí el camión propio que hizo el viaje");
    const validos = renglones.filter((r) => r.material_id || num(r.cantidad) > 0);
    if (!validos.length) return toast.error("Agregá al menos un material");
    if (validos.some((r) => !r.material_id)) return toast.error("Hay renglones sin material elegido");
    if (validos.some((r) => num(r.cantidad) <= 0)) return toast.error("Cada cantidad debe ser mayor a 0");
    const parsed = validos.map((r) => ({ ...r, cantidad: num(r.cantidad), precio_unitario: num(r.precio_unitario) }));
    const payload: Row = {};
    Object.entries(head).forEach(([k, v]) => (payload[k] = v === "" ? null : v));
    payload.movimiento = head.movimiento || "ingreso_proveedor";
    payload.transporte = propio ? "propio" : "proveedor";
    payload.cantidad_viajes = propio ? Math.max(1, parseInt(head.cantidad_viajes) || 1) : null;
    if (!propio) { payload.camion_id = null; payload.chofer_id = null; }
    payload.material = parsed.map((r) => matName[r.material_id]).join("; ").slice(0, 500);
    payload.cantidad = parsed.length === 1 ? parsed[0].cantidad : 0;
    payload.unidad = parsed.length === 1 ? parsed[0].unidad : "UN";
    payload.precio_unitario = parsed.length === 1 ? parsed[0].precio_unitario : 0;
    setSaving(true);
    try {
      let id = editId;
      if (id) {
        const { error } = await sb.from("remitos_materiales").update(payload).eq("id", id);
        if (error) throw error;
        const { error: e2 } = await sb.from("remito_material_items").delete().eq("remito_id", id);
        if (e2) throw e2;
      } else {
        const { data, error } = await sb.from("remitos_materiales").insert({ ...payload, created_by: user?.id }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const { error: e3 } = await sb.from("remito_material_items").insert(parsed.map((r, orden) => ({ remito_id: id, material_id: r.material_id, cantidad: r.cantidad, unidad: r.unidad, precio_unitario: r.precio_unitario, orden })));
      if (e3) throw e3;
      // Viaje vinculado del camión propio
      const { data: viajePrev } = await sb.from("remitos").select("id").eq("remito_material_id", id).maybeSingle();
      if (propio) {
        const origen = payload.movimiento === "ingreso_proveedor" ? provName[payload.proveedor_id] : obraName[payload.obra_origen_id];
        const viaje = {
          remito_material_id: id,
          numero: payload.numero_remito || `MAT-${String(id).slice(0, 8)}`,
          remito_tercero: payload.numero_remito,
          fecha: payload.fecha,
          obra_id: payload.obra_destino_id,
          maquinaria_id: payload.camion_id,
          tipo_transporte: "Calamina Sur",
          cantidad_viajes: payload.cantidad_viajes,
          desde: origen || null,
          hasta: obraName[payload.obra_destino_id] || null,
          proveedor: provName[payload.proveedor_id] || null,
          material: payload.material || "Materiales",
          tipo_material: "Retiro de material",
          cantidad: 0,
          unidad: "VIAJE",
          recibido_por: choferName[payload.chofer_id] || "",
          firmado: false,
          observaciones: `Retiro de material – remito de materiales ${payload.numero_remito || ""}`.trim(),
        };
        const { error: e4 } = viajePrev
          ? await sb.from("remitos").update(viaje).eq("id", viajePrev.id)
          : await sb.from("remitos").insert({ ...viaje, created_by: user?.id });
        if (e4) throw new Error("El material se guardó, pero no el viaje del camión: " + e4.message);
      } else if (viajePrev) {
        await sb.from("remitos").delete().eq("id", viajePrev.id);
      }
      toast.success(editId ? "Remito actualizado" : propio ? "Remito y viaje del camión cargados" : "Remito cargado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["remitos_materiales"] });
      qc.invalidateQueries({ queryKey: ["remito_material_items"] });
      qc.invalidateQueries({ queryKey: ["remitos"] });
    } catch (e: any) {
      toast.error("No se pudo guardar: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await sb.from("remitos_materiales").delete().eq("id", deleteId);
    if (error) toast.error("No se pudo eliminar");
    else { toast.success("Remito eliminado"); qc.invalidateQueries({ queryKey: ["remitos_materiales"] }); qc.invalidateQueries({ queryKey: ["remito_material_items"] }); }
    setDeleteId(null);
  };

  const exportar = () => {
    const ws = XLSX.utils.json_to_sheet(filas.map((f) => f.d));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Materiales");
    XLSX.writeFile(wb, `remitos_materiales_${today()}.xlsx`);
  };

  const obraOpts = (obras || []).map((o: any) => ({ value: o.id, label: o.nombre }));
  const camionOpts = (maquinarias || []).filter((m: any) => ["camion", "batea", "acoplado", "carreton"].includes(m.tipo) || m.id === head.camion_id).map((m: any) => ({ value: m.id, label: maqName[m.id] }));
  const choferOpts = (personal || []).filter((p: any) => p.rol === "chofer" || p.id === head.chofer_id).map((p: any) => ({ value: p.id, label: `${p.apellido || ""} ${p.nombre || ""}`.trim() }));
  const totalForm = totalRemitoMateriales(renglones.map((r) => ({ cantidad: num(r.cantidad), precio_unitario: num(r.precio_unitario) })));
  let prevId = "";

  const listado = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar (ej: hierro 8)" className="pl-8 h-9" />
        </div>
        <div className="space-y-1"><Label className="text-xs">Desde</Label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-40" /></div>
        <div className="space-y-1"><Label className="text-xs">Hasta</Label><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-40" /></div>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{filas.length} renglones · Total {money(total)}</span>
        <Button variant="outline" onClick={exportar} disabled={!filas.length}><Download className="w-4 h-4 mr-1" />Excel</Button>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nuevo remito</Button>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-auto">
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !filas.length ? (
          <p className="p-10 text-center text-muted-foreground">No hay remitos de materiales cargados.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>{cols.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}<TableHead /></TableRow></TableHeader>
            <TableBody>
              {filas.map(({ remito: r, d }, idx) => {
                const primero = r.id !== prevId;
                prevId = r.id;
                return (
                  <TableRow key={`${r.id}-${idx}`} className={primero ? "border-t-2 border-border" : ""}>
                    {cols.map((c) => (
                      <TableCell key={c} className="whitespace-nowrap">
                        {c === "Precio unit." || c === "Importe" ? money(Number(d[c])) : typeof d[c] === "number" ? Number(d[c]).toLocaleString("es-AR") : d[c]}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                      {primero && <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isAdmin ? (
        <Tabs defaultValue="remitos">
          <TabsList><TabsTrigger value="remitos">Remitos</TabsTrigger><TabsTrigger value="catalogo">Catálogo</TabsTrigger></TabsList>
          <TabsContent value="remitos">{listado}</TabsContent>
          <TabsContent value="catalogo"><CatalogoTab catalogo={catalogo} /></TabsContent>
        </Tabs>
      ) : listado}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Nuevo"} remito de materiales</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={head.fecha} onChange={(e) => setH("fecha", e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">N° Remito</Label><Input value={head.numero_remito} onChange={(e) => setH("numero_remito", e.target.value)} className="h-9" /></div>
            <Pick label="Movimiento" value={head.movimiento} onChange={(v) => setH("movimiento", v || "ingreso_proveedor")} options={Object.entries(MOVIMIENTOS).map(([value, label]) => ({ value, label }))} />
            {head.movimiento === "ingreso_proveedor" ? (
              <Pick label="Proveedor" value={head.proveedor_id} onChange={(v) => setH("proveedor_id", v)} options={(proveedores || []).map((p: any) => ({ value: p.id, label: p.nombre }))} />
            ) : (
              <Pick label="Obra origen" value={head.obra_origen_id} onChange={(v) => setH("obra_origen_id", v)} options={obraOpts} />
            )}
            <Pick label="Obra destino" value={head.obra_destino_id} onChange={(v) => setH("obra_destino_id", v)} options={obraOpts} />
            <Pick label="Transporte" value={head.transporte} onChange={(v) => setH("transporte", v || "proveedor")} options={[{ value: "proveedor", label: "Lo trae el proveedor" }, { value: "propio", label: "Camión propio" }]} />
            {head.transporte === "propio" && (
              <>
                <Pick label="Camión (interno)" value={head.camion_id} onChange={(v) => setH("camion_id", v)} options={camionOpts} />
                <Pick label="Chofer" value={head.chofer_id} onChange={(v) => setH("chofer_id", v)} options={choferOpts} />
                <div className="space-y-1.5"><Label className="text-xs">Cantidad de viajes</Label><Input inputMode="numeric" value={head.cantidad_viajes} onChange={(e) => setH("cantidad_viajes", e.target.value.replace(/\D/g, ""))} className="h-9" /></div>
              </>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-sm font-semibold">Materiales</Label>
            {renglones.map((r, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-2">
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-xs">Material</Label>
                  <MaterialCombo value={r.material_id} catalogo={catalogo} onPick={(m) => setR(idx, { material_id: m.id, unidad: m.unidad_default })} onCreate={(n) => crearMaterial(idx, n)} />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1"><Label className="text-xs">Cantidad</Label><Input inputMode="decimal" value={r.cantidad} onChange={(e) => setR(idx, { cantidad: e.target.value })} className="h-9" /></div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Unidad</Label>
                  <Select value={r.unidad} onValueChange={(v) => setR(idx, { unidad: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1"><Label className="text-xs">Precio unit.</Label><Input inputMode="decimal" value={r.precio_unitario} onChange={(e) => setR(idx, { precio_unitario: e.target.value })} placeholder="0" className="h-9" /></div>
                <div className="col-span-10 sm:col-span-1 text-sm pb-2 whitespace-nowrap">{money(num(r.cantidad) * num(r.precio_unitario))}</div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <Button size="icon" variant="ghost" disabled={renglones.length === 1} onClick={() => setRenglones((rs) => rs.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setRenglones((rs) => [...rs, emptyRenglon()])}><Plus className="w-4 h-4 mr-1" />Agregar material</Button>
              <span className="text-sm font-semibold">Total {money(totalForm)}</span>
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Observaciones</Label><Textarea value={head.observaciones} onChange={(e) => setH("observaciones", e.target.value)} rows={2} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={remove} title="¿Eliminar remito?" description="Se eliminan también todos sus materiales." />
    </>
  );
}
