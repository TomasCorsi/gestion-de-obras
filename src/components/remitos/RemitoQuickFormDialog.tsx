import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { RemitoForm } from "@/hooks/useRemitos";
import { ObraWithRelations } from "@/hooks/useObras";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import { ClienteDB } from "@/hooks/useClientes";

const TIPO_MATERIAL_OPTIONS = [
  "Residuos", "Desmonte", "Cascote", "Escombro", "Tierra", "Piedra",
  "Movimiento interno", "Tosca", "Cemento", "Hormigon", "Traslado",
  "Cubiertas", "Frezado", "Cobertura de residuos", "Arena", "Hormigon H30",
  "Tierra negra", "Relleno", "Piedra 30/50", "Materiales varios",
  "Raices", "Traslado interno", "Barro",
];

const TIPO_TRANSPORTE_OPTIONS = [
  "Calamina Sur", "Geo hermanos", "Diaz Neiva", "japones", "Cato", "Tatu",
  "Patan", "Hormicret", "Lamacol", "Britcom", "Ramon romero gomez", "Duraez",
];

const UNIDAD_OPTIONS = ["TN", "KG", "M3", "M2", "U"];

interface RemitoQuickFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obras: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  clientes: ClienteDB[];
  generateNumero: () => string;
  onSubmit: (remito: RemitoForm) => Promise<void>;
}

const today = () => new Date().toISOString().split("T")[0];

export function RemitoQuickFormDialog({
  open,
  onOpenChange,
  obras,
  maquinarias,
  clientes,
  generateNumero,
  onSubmit,
}: RemitoQuickFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => getInitialForm());

  function getInitialForm() {
    return {
      fecha: today(),
      remito_tercero: "",
      remito_local: "",
      desde: "",
      hasta: "",
      tipo_material: "",
      tipo_transporte: "",
      maquinaria_id: "",
      patente_tercero: "",
      cliente: "",
      cantidad_viajes: 1,
      cantidad: 0,
      cantidad_uni: 0,
      unidad: "TN",
      precio_unitario: 0,
      precio_total: 0,
      precio_calc_mode: "viajes",
      proveedor: "",
      observaciones: "",
    };
  }

  useEffect(() => {
    if (open) setForm(getInitialForm());
  }, [open]);

  const set = (field: string, value: any) =>
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-calc precio_total
      if (["cantidad_viajes", "cantidad", "precio_unitario", "precio_calc_mode"].includes(field) || field === field) {
        const mode = next.precio_calc_mode;
        if (mode === "viajes") {
          next.precio_total = (next.cantidad_viajes || 0) * (next.precio_unitario || 0);
        } else {
          next.precio_total = (next.cantidad || 0) * (next.precio_unitario || 0);
        }
      }
      return next;
    });

  const obraOptions: ComboboxOption[] = obras.map((o) => ({
    value: o.nombre,
    label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
  }));

  const maquinariaOptions: ComboboxOption[] = maquinarias.map((m) => ({
    value: m.id,
    label: m.codigo || m.patente || m.id.slice(0, 8),
  }));

  const clienteOptions: ComboboxOption[] = clientes
    .filter((c) => c.activo)
    .map((c) => ({ value: c.nombre, label: c.nombre }));

  const handleSubmit = async () => {
    if (!form.fecha) return;
    setSaving(true);
    try {
      const remito: RemitoForm = {
        numero: generateNumero(),
        fecha: form.fecha,
        material: form.tipo_material || "-",
        cantidad: form.cantidad,
        unidad: form.unidad,
        recibido_por: "-",
        firmado: false,
        remito_tercero: form.remito_tercero || undefined,
        remito_local: form.remito_local || undefined,
        desde: form.desde || undefined,
        hasta: form.hasta || undefined,
        tipo_material: form.tipo_material || undefined,
        tipo_transporte: form.tipo_transporte || undefined,
        maquinaria_id: form.maquinaria_id || undefined,
        patente_tercero: form.patente_tercero || undefined,
        cliente: form.cliente || undefined,
        cantidad_viajes: form.cantidad_viajes,
        cantidad_uni: form.cantidad_uni || null,
        precio_unitario: form.precio_unitario || null,
        precio_total: form.precio_total,
        precio_calc_mode: form.precio_calc_mode,
        proveedor: form.proveedor || undefined,
        observaciones: form.observaciones || undefined,
      };
      await onSubmit(remito);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nuevo Remito</DialogTitle>
        </DialogHeader>

        <d1 sm:grid-cols-2 md:grid-cols-3 gap-2 md: className="grid grid-cols-3 gap-3">
          {/* Row 1 */}
          <div className="space-y-1">
            <Label className="text-xs">Fecha</Label>
            <Input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Remito Tercero</Label>
            <Input value={form.remito_tercero} onChange={(e) => set("remito_tercero", e.target.value)} className="h-8 text-sm" placeholder="Nro..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Remito Local</Label>
            <Input value={form.remito_local} onChange={(e) => set("remito_local", e.target.value)} className="h-8 text-sm" placeholder="Nro..." />
          </div>

          {/* Row 2 */}
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Combobox options={obraOptions} value={form.desde} onValueChange={(v) => set("desde", v)} placeholder="Obra origen..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Combobox options={obraOptions} value={form.hasta} onValueChange={(v) => set("hasta", v)} placeholder="Obra destino..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cliente</Label>
            <Combobox options={clienteOptions} value={form.cliente} onValueChange={(v) => set("cliente", v)} placeholder="Cliente..." />
          </div>

          {/* Row 3 */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo Material</Label>
            <Select value={form.tipo_material} onValueChange={(v) => set("tipo_material", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {TIPO_MATERIAL_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo Transporte</Label>
            <Combobox
              options={TIPO_TRANSPORTE_OPTIONS.map((t) => ({ value: t, label: t }))}
              value={form.tipo_transporte}
              onValueChange={(v) => set("tipo_transporte", v)}
              placeholder="Transporte..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Maquinaria</Label>
            <Combobox options={maquinariaOptions} value={form.maquinaria_id} onValueChange={(v) => set("maquinaria_id", v)} placeholder="Maquinaria..." />
          </div>

          {/* Row 4 */}
          <div className="space-y-1">
            <Label className="text-xs">Patente Tercero</Label>
            <Input value={form.patente_tercero} onChange={(e) => set("patente_tercero", e.target.value)} className="h-8 text-sm" placeholder="Patente..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Proveedor</Label>
            <Input value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)} className="h-8 text-sm" placeholder="Proveedor..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unidad</Label>
            <Select value={form.unidad} onValueChange={(v) => set("unidad", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDAD_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 5 - Precios */}
          <div className="space-y-1">
            <Label className="text-xs">Cant. Viajes</Label>
            <Input type="number" value={form.cantidad_viajes} onChange={(e) => set("cantidad_viajes", Number(e.target.value))} className="h-8 text-sm" min={0} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cantidad</Label>
            <Input type="number" value={form.cantidad} onChange={(e) => set("cantidad", Number(e.target.value))} className="h-8 text-sm" min={0} step="0.01" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Modo Cálculo</Label>
            <Select value={form.precio_calc_mode} onValueChange={(v) => set("precio_calc_mode", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viajes">Viajes × Precio</SelectItem>
                <SelectItem value="cantidad">Cantidad × Precio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 6 */}
          <div className="space-y-1">
            <Label className="text-xs">Precio Unitario</Label>
            <Input type="number" value={form.precio_unitario} onChange={(e) => set("precio_unitario", Number(e.target.value))} className="h-8 text-sm" min={0} step="0.01" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Precio Total</Label>
            <Input type="number" value={form.precio_total} readOnly className="h-8 text-sm bg-muted" />
          </div>
          <div />

          {/* Row 7 - Observaciones full width */}
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} className="text-sm h-16 resize-none" placeholder="Observaciones..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
