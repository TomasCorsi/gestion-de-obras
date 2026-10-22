import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useClientes } from "@/hooks/useClientes";
import { useUrlState } from "@/hooks/useUrlState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Check, ChevronsUpDown, Download, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { importeMaquinaLinea, MaquinaLineaInput, nuevaMaquinaLinea, prepararMaquinaLineas, validarMaquinaLineas } from "@/lib/remitos-maquinas";
import type { Tables } from "@/integrations/supabase/types";

type Receipt = Tables<"remitos_maquinas"> & { remito_maquina_items: Tables<"remito_maquina_items">[] };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const emptyHeader = () => ({ fecha: today(), numero_remito: "", obra_id: "", cliente_id: "", observaciones: "" });
const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
type Option = { value: string; label: string };

function Lookup({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="space-y-1.5 min-w-0">
    <Label className="text-xs">{label}</Label>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-label={label} aria-expanded={open} className="h-9 w-full justify-between font-normal min-w-0">
        <span className="truncate">{options.find(o => o.value === value)?.label || "Seleccionar"}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0" />
      </Button></PopoverTrigger>
      <PopoverContent className="w-[min(360px,85vw)] p-0" align="start">
        <Command><CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} /><CommandList><CommandEmpty>Sin resultados</CommandEmpty><CommandGroup>
          <CommandItem value="Sin seleccionar" onSelect={() => { onChange(""); setOpen(false); }}>— Sin seleccionar —</CommandItem>
          {options.map(o => <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => { onChange(o.value); setOpen(false); }}>
            <Check className={`mr-2 h-4 w-4 ${value === o.value ? "opacity-100" : "opacity-0"}`} />{o.label}
          </CommandItem>)}
        </CommandGroup></CommandList></Command>
      </PopoverContent>
    </Popover>
  </div>;
}

function receiptLines(r: Receipt): MaquinaLineaInput[] {
  const source = r.remito_maquina_items.length ? [...r.remito_maquina_items].sort((a, b) => a.orden - b.orden) : [r];
  return source.map(i => ({ maquinaria_id: i.maquinaria_id || "", unidad: i.unidad, cantidad: String(i.cantidad), precio_unitario: String(i.precio_unitario), operador: i.operador || "", observaciones: "remito_id" in i ? i.observaciones || "" : "" }));
}

export function MaquinasRemitosPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();
  const { clientes } = useClientes();
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState(emptyHeader);
  const [lineas, setLineas] = useState<MaquinaLineaInput[]>([nuevaMaquinaLinea()]);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useUrlState<string>({ key: "maq_q", defaultValue: "" });
  const [desde, setDesde] = useUrlState<string>({ key: "maq_desde", defaultValue: "" });
  const [hasta, setHasta] = useUrlState<string>({ key: "maq_hasta", defaultValue: "" });
  const draftKey = user ? `remito_maquinas_draft_${user.id}` : null;
  useEffect(() => {
    if (!open || !draftKey || editId) return;
    const persist = () => { try { localStorage.setItem(draftKey, JSON.stringify({ header, lineas })); } catch { /* Storage unavailable */ } };
    const timer = setTimeout(persist, 400);
    window.addEventListener("pagehide", persist);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", persist); };
  }, [open, draftKey, editId, header, lineas]);

  const { data: receipts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["remitos_maquinas", user?.id], enabled: !!user,
    queryFn: async () => {
      const all: Receipt[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("remitos_maquinas").select("*, remito_maquina_items(*)").order("fecha", { ascending: false }).order("id").range(offset, offset + 999);
        if (error) throw error;
        all.push(...data);
        if (data.length < 1000) return all;
      }
    },
  });
  const maqOptions = useMemo(() => maquinarias.map(m => ({ value: m.id, label: [m.codigo, m.nombre, m.patente].filter(Boolean).join(" - ") })), [maquinarias]);
  const obraOptions = obras.map(o => ({ value: o.id, label: o.nombre }));
  const clienteOptions = clientes.map(c => ({ value: c.id, label: c.nombre }));
  const labelOf = (options: Option[], id: string | null) => options.find(o => o.value === id)?.label || "";
  const display = (r: Receipt, l: MaquinaLineaInput, index: number) => ({
    Fecha: formatDate(r.fecha), "N° Remito": r.numero_remito || "", Renglón: index + 1,
    Obra: labelOf(obraOptions, r.obra_id), Cliente: labelOf(clienteOptions, r.cliente_id),
    Máquina: labelOf(maqOptions, l.maquinaria_id), Cantidad: Number(l.cantidad), Unidad: l.unidad === "DIA" ? "Días" : "Horas",
    "Precio unit.": Number(l.precio_unitario), Importe: importeMaquinaLinea(l), Operador: l.operador,
    "Nota máquina": l.observaciones, Observaciones: r.observaciones || "",
  });
  const filtered = receipts.filter(r => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta) && (!search.trim() || receiptLines(r).some((l, i) => Object.values(display(r, l, i)).join(" ").toLowerCase().includes(search.trim().toLowerCase()))));
  const total = filtered.reduce((sum, r) => sum + receiptLines(r).reduce((s, l) => s + importeMaquinaLinea(l), 0), 0);
  const cols = ["Fecha", "N° Remito", "Renglón", "Obra", "Cliente", "Máquina", "Cantidad", "Unidad", "Precio unit.", "Importe", "Operador", "Nota máquina", "Observaciones"] as const;
  const setLine = (index: number, patch: Partial<MaquinaLineaInput>) => setLineas(prev => prev.map((l, i) => i === index ? { ...l, ...patch } : l));
  const openNew = () => {
    let h = emptyHeader(), ls = [nuevaMaquinaLinea()];
    try {
      const saved = draftKey ? localStorage.getItem(draftKey) : null;
      if (saved) { const d = JSON.parse(saved); if (d.header && Array.isArray(d.lineas) && d.lineas.length) { h = d.header; ls = d.lineas; } }
    } catch { /* Ignore invalid drafts */ }
    setHeader(h); setLineas(ls); setEditId(null); setOpen(true);
  };
  const openEdit = (r: Receipt) => {
    setHeader({ fecha: r.fecha, numero_remito: r.numero_remito || "", obra_id: r.obra_id || "", cliente_id: r.cliente_id || "", observaciones: r.observaciones || "" });
    setLineas(receiptLines(r)); setEditId(r.id); setOpen(true);
  };
  const save = async () => {
    if (saving || !user) return;
    if (!header.fecha) return toast.error("La fecha es obligatoria");
    const invalid = validarMaquinaLineas(lineas);
    if (invalid) return toast.error(invalid);
    setSaving(true);
    try {
      const { error } = await supabase.rpc("guardar_remito_maquinas", { p_cabecera: header, p_items: prepararMaquinaLineas(lineas), p_id: editId || undefined });
      if (error) throw error;
      setOpen(false);
      if (!editId && draftKey) { try { localStorage.removeItem(draftKey); } catch { /* Storage unavailable */ } }
      await qc.invalidateQueries({ queryKey: ["remitos_maquinas"] });
      toast.success(editId ? "Remito actualizado" : "Remito cargado");
    } catch (e) { toast.error("No se pudo guardar: " + (e instanceof Error ? e.message : String((e as { message?: string }).message || e))); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      const { error, data } = await supabase.from("remitos_maquinas").delete().eq("id", deleteId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No se pudo eliminar el remito");
      await qc.invalidateQueries({ queryKey: ["remitos_maquinas"] }); setDeleteId(null); toast.success("Remito eliminado");
    } catch { toast.error("No se pudo eliminar el remito"); } finally { setDeleting(false); }
  };
  const exportar = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(filtered.flatMap(r => receiptLines(r).map((l, i) => display(r, l, i))));
    ws["!cols"] = cols.map(c => ({ wch: c === "Máquina" || c === "Obra" ? 32 : 20 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Máquinas"); XLSX.writeFile(wb, `remitos_maquinas_${today()}.xlsx`);
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative w-64 max-w-full"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar remitos de máquinas" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-9" /></div>
      <div className="space-y-1"><Label htmlFor="maq-desde" className="text-xs">Desde</Label><Input id="maq-desde" type="date" value={desde} onChange={e => setDesde(e.target.value)} className="h-9 w-40" /></div>
      <div className="space-y-1"><Label htmlFor="maq-hasta" className="text-xs">Hasta</Label><Input id="maq-hasta" type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="h-9 w-40" /></div>
      <div className="flex-1" /><span className="text-sm text-muted-foreground">{filtered.length} remitos · Total {money(total)}</span>
      <Button variant="outline" onClick={exportar} disabled={!filtered.length || isError}><Download className="w-4 h-4 mr-1" />Excel</Button>
      <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nuevo remito</Button>
    </div>
    <div className="border border-border overflow-auto rounded-md">
      {isLoading ? <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : isError ? <div className="p-10 text-center space-y-3"><p>No se pudieron cargar los remitos.</p><Button variant="outline" onClick={() => refetch()}>Reintentar</Button></div> : !filtered.length ? <p className="p-10 text-center text-muted-foreground">No hay remitos de máquinas.</p> : <Table>
        <TableHeader><TableRow>{cols.map(c => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}<TableHead>Acciones</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.flatMap(r => receiptLines(r).map((l, i) => {
          const d = display(r, l, i);
          return <TableRow key={`${r.id}-${i}`} className={i === 0 ? "border-t-2 border-border" : "bg-muted/30"}>
            {cols.map(c => <TableCell key={c} className="whitespace-nowrap">{c === "Precio unit." || c === "Importe" ? money(Number(d[c])) : typeof d[c] === "number" ? Number(d[c]).toLocaleString("es-AR") : d[c]}</TableCell>)}
            <TableCell className="whitespace-nowrap"><Button variant="ghost" size="icon" aria-label={`Editar remito ${r.numero_remito || "sin número"}, renglón ${i + 1}`} title="Editar remito completo" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>{i === 0 && <Button variant="ghost" size="icon" aria-label={`Eliminar remito ${r.numero_remito || "sin número"}`} title="Eliminar remito completo" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</TableCell>
          </TableRow>;
        }))}</TableBody>
      </Table>}
    </div>
    <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader><DialogTitle>{editId ? "Editar" : "Nuevo"} remito de máquinas</DialogTitle></DialogHeader>
        <fieldset disabled={saving} className="space-y-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5"><Label htmlFor="maq-fecha" className="text-xs">Fecha</Label><Input id="maq-fecha" type="date" value={header.fecha} onChange={e => setHeader(h => ({ ...h, fecha: e.target.value }))} className="h-9" /></div>
            <div className="space-y-1.5"><Label htmlFor="maq-numero" className="text-xs">N° Remito</Label><Input id="maq-numero" value={header.numero_remito} onChange={e => setHeader(h => ({ ...h, numero_remito: e.target.value }))} className="h-9" /></div>
            <Lookup label="Obra" value={header.obra_id} options={obraOptions} onChange={obra_id => setHeader(h => ({ ...h, obra_id }))} />
            <Lookup label="Cliente" value={header.cliente_id} options={clienteOptions} onChange={cliente_id => setHeader(h => ({ ...h, cliente_id }))} />
          </div>
          <div className="flex justify-between items-center gap-2"><h3 className="font-semibold">Máquinas · {lineas.length}</h3><Button variant="outline" onClick={() => setLineas(ls => [...ls, nuevaMaquinaLinea()])}><Plus className="mr-1 h-4 w-4" />Agregar máquina</Button></div>
          <div className="divide-y divide-border">{lineas.map((l, i) => <div key={i} className="py-4 space-y-3" data-machine-line={i}>
            <div className="flex justify-between items-center"><span className="text-xs font-medium text-muted-foreground">Máquina {i + 1}</span><Button variant="ghost" size="icon" aria-label={`Quitar máquina ${i + 1}`} title="Quitar máquina" disabled={lineas.length === 1} onClick={() => setLineas(ls => ls.filter((_, index) => index !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="col-span-2"><Lookup label={`Máquina ${i + 1}`} value={l.maquinaria_id} options={maqOptions} onChange={maquinaria_id => setLine(i, { maquinaria_id })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Se cobra por</Label><Select value={l.unidad} onValueChange={unidad => setLine(i, { unidad })}><SelectTrigger className="h-9" aria-label={`Unidad máquina ${i + 1}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DIA">Días</SelectItem><SelectItem value="HORA">Horas</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor={`cantidad-${i}`} className="text-xs">Cantidad</Label><Input id={`cantidad-${i}`} aria-label={`Cantidad máquina ${i + 1}`} inputMode="decimal" value={l.cantidad} onChange={e => setLine(i, { cantidad: e.target.value })} className="h-9" /></div>
              <div className="space-y-1.5"><Label htmlFor={`precio-${i}`} className="text-xs">Precio unitario</Label><Input id={`precio-${i}`} aria-label={`Precio máquina ${i + 1}`} inputMode="decimal" value={l.precio_unitario} onChange={e => setLine(i, { precio_unitario: e.target.value })} placeholder="0" className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Importe</Label><div className="h-9 flex items-center text-sm font-semibold whitespace-nowrap overflow-x-auto">{money(importeMaquinaLinea(l))}</div></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor={`operador-${i}`} className="text-xs">Operador</Label><Input id={`operador-${i}`} value={l.operador} onChange={e => setLine(i, { operador: e.target.value })} className="h-9" /></div><div className="space-y-1.5"><Label htmlFor={`nota-${i}`} className="text-xs">Nota máquina</Label><Input id={`nota-${i}`} value={l.observaciones} onChange={e => setLine(i, { observaciones: e.target.value })} className="h-9" /></div></div>
          </div>)}</div>
          <div className="space-y-1.5"><Label htmlFor="maq-observaciones" className="text-xs">Observaciones del remito</Label><Textarea id="maq-observaciones" value={header.observaciones} onChange={e => setHeader(h => ({ ...h, observaciones: e.target.value }))} rows={2} /></div>
        </fieldset>
        <DialogFooter className="items-center gap-3"><span className="sm:mr-auto font-semibold">Total {money(lineas.reduce((s, l) => s + importeMaquinaLinea(l), 0))}</span><Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={saving} onClick={save}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <DeleteConfirmDialog open={!!deleteId} onOpenChange={v => { if (!v && !deleting) setDeleteId(null); }} onConfirm={remove} title="¿Eliminar remito?" description="Se eliminarán todos sus renglones de máquinas. Esta acción no se puede deshacer." />
  </div>;
}