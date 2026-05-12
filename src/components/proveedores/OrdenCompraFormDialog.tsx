import { useEffect, useMemo, useState } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  OrdenCompraForm,
  OrdenCompraItemForm,
  OrdenCompraWithRelations,
  EstadoOrdenCompra,
} from "@/hooks/useOrdenesCompra";
import { useProveedores } from "@/hooks/useProveedores";
import { useObras } from "@/hooks/useObras";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (form: OrdenCompraForm) => Promise<void>;
  editing?: OrdenCompraWithRelations | null;
}

const emptyItem = (): OrdenCompraItemForm => ({
  descripcion: "",
  unidad: "un",
  cantidad: 1,
  precio_unitario: 0,
  subtotal: 0,
  orden: 0,
});

const emptyForm = (): OrdenCompraForm => ({
  fecha: format(new Date(), "yyyy-MM-dd"),
  proveedor_id: "",
  obra_id: "",
  estado: "borrador",
  incluir_iva: true,
  condiciones_pago: "",
  fecha_entrega_estimada: "",
  observaciones: "",
  items: [emptyItem()],
});

export function OrdenCompraFormDialog({ open, onOpenChange, onSubmit, editing }: Props) {
  const { proveedores } = useProveedores();
  const { obras } = useObras();
  const [form, setForm] = useState<OrdenCompraForm>(emptyForm());

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          fecha: editing.fecha,
          proveedor_id: editing.proveedor_id || "",
          obra_id: editing.obra_id || "",
          estado: editing.estado,
          incluir_iva: editing.incluir_iva,
          condiciones_pago: editing.condiciones_pago || "",
          fecha_entrega_estimada: editing.fecha_entrega_estimada || "",
          observaciones: editing.observaciones || "",
          items: (editing.items || [])
            .slice()
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            .map((it, idx) => ({
              id: it.id,
              descripcion: it.descripcion,
              unidad: it.unidad,
              cantidad: Number(it.cantidad),
              precio_unitario: Number(it.precio_unitario),
              subtotal: Number(it.subtotal),
              orden: idx,
            })),
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [open, editing]);

  const proveedorOptions = useMemo(
    () => proveedores.filter((p) => p.activo).map((p) => ({ value: p.id, label: p.nombre })),
    [proveedores]
  );
  const obraOptions = useMemo(
    () => [{ value: "", label: "— Sin obra —" }, ...obras.map((o) => ({ value: o.id, label: `${o.numero ? `${o.numero} - ` : ""}${o.nombre}` }))],
    [obras]
  );

  const totales = useMemo(() => {
    const subtotal = form.items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);
    const iva = form.incluir_iva ? subtotal * 0.21 : 0;
    return { subtotal, iva, total: subtotal + iva };
  }, [form.items, form.incluir_iva]);

  const updateItem = (idx: number, patch: Partial<OrdenCompraItemForm>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        next.subtotal = (Number(next.cantidad) || 0) * (Number(next.precio_unitario) || 0);
        return next;
      }),
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem(), orden: f.items.length }] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.proveedor_id) return;
    if (form.items.length === 0 || form.items.every((it) => !it.descripcion.trim())) return;
    const cleanedItems = form.items.filter((it) => it.descripcion.trim());
    await onSubmit({ ...form, items: cleanedItems });
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Editar Orden ${editing.numero}` : "Nueva Orden de Compra"}
      onSubmit={handleSubmit}
      submitLabel={editing ? "Guardar" : "Crear"}
      size="2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Proveedor *</Label>
            <Combobox
              options={proveedorOptions}
              value={form.proveedor_id}
              onValueChange={(v) => setForm({ ...form, proveedor_id: v })}
              placeholder="Seleccionar proveedor..."
            />
          </div>
          <div>
            <Label>Obra destino</Label>
            <Combobox
              options={obraOptions}
              value={form.obra_id || ""}
              onValueChange={(v) => setForm({ ...form, obra_id: v })}
              placeholder="Sin obra"
            />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoOrdenCompra })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="emitida">Emitida</SelectItem>
                <SelectItem value="recibida">Recibida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha entrega estimada</Label>
            <Input
              type="date"
              value={form.fecha_entrega_estimada || ""}
              onChange={(e) => setForm({ ...form, fecha_entrega_estimada: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <Switch
              id="incluir-iva"
              checked={form.incluir_iva}
              onCheckedChange={(v) => setForm({ ...form, incluir_iva: v })}
            />
            <Label htmlFor="incluir-iva">Incluye IVA 21%</Label>
          </div>
        </div>

        {/* Items */}
        <div className="border border-border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Materiales / Ítems</h3>
            <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1">
              <Plus className="w-4 h-4" /> Agregar ítem
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
            <div className="col-span-5">Descripción</div>
            <div className="col-span-1">Unidad</div>
            <div className="col-span-2 text-right">Cantidad</div>
            <div className="col-span-2 text-right">P. Unitario</div>
            <div className="col-span-1 text-right">Subtotal</div>
            <div className="col-span-1"></div>
          </div>

          {form.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-5"
                placeholder="Material o descripción"
                value={it.descripcion}
                onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
              />
              <Input
                className="col-span-1"
                value={it.unidad}
                onChange={(e) => updateItem(idx, { unidad: e.target.value })}
              />
              <Input
                className="col-span-2 text-right"
                type="number"
                step="0.01"
                value={it.cantidad}
                onChange={(e) => updateItem(idx, { cantidad: parseFloat(e.target.value) || 0 })}
              />
              <Input
                className="col-span-2 text-right"
                type="number"
                step="0.01"
                value={it.precio_unitario}
                onChange={(e) => updateItem(idx, { precio_unitario: parseFloat(e.target.value) || 0 })}
              />
              <div className="col-span-1 text-right text-sm font-medium">
                {((it.cantidad || 0) * (it.precio_unitario || 0)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="col-span-1"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="flex justify-end">
          <div className="w-full md:w-72 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{totales.subtotal.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</span>
            </div>
            {form.incluir_iva && (
              <div className="flex justify-between">
                <span>IVA 21%:</span>
                <span>{totales.iva.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-border pt-1">
              <span>Total:</span>
              <span className="text-primary">{totales.total.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Condiciones de pago</Label>
            <Textarea
              rows={2}
              value={form.condiciones_pago || ""}
              onChange={(e) => setForm({ ...form, condiciones_pago: e.target.value })}
              placeholder="Ej: 50% anticipo, 50% contra entrega"
            />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea
              rows={2}
              value={form.observaciones || ""}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
