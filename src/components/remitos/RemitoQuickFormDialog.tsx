import { useState, useEffect, useMemo } from "react";
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
import { useDirtyDialog } from "@/hooks/useDirtyDialog";
import { UnsavedChangesAlert } from "@/components/shared/UnsavedChangesAlert";
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-1 sm:col-span-2 md:col-span-3 pt-2 pb-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{children}</h4>
      <div className="border-b border-border mt-1" />
    </div>
  );
}

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

  function isObraExterna(numero: string | null): boolean {
    if (!numero) return false;
    const num = parseInt(numero, 10);
    return !isNaN(num) && num >= 300;
  }

  function getClienteForObra(obraNombre: string): string {
    const obra = obras.find(o => o.nombre === obraNombre);
    if (obra && isObraExterna(obra.numero)) {
      return obra.cliente?.nombre || "";
    }
    return "";
  }

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
      cliente_destino: "",
      cantidad_viajes: 1,
      cantidad_uni: 0,
      cantidad: 0,
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

  const isDirty = useMemo(() => {
    const initial = getInitialForm();
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form]);

  const { showAlert, setShowAlert, handleClose, handleDiscard, handleOpenChange, dirtyProps } =
    useDirtyDialog(onOpenChange, isDirty);

  const set = (field: string, value: any) =>
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-fill cliente when "desde" changes
      if (field === "desde") {
        next.cliente = getClienteForObra(value as string);
      }
      // Auto-fill cliente_destino when "hasta" changes
      if (field === "hasta") {
        next.cliente_destino = getClienteForObra(value as string);
      }

      // Auto-calc cantidad = cantidad_uni × cantidad_viajes
      if (field === "cantidad_uni" || field === "cantidad_viajes") {
        next.cantidad = (next.cantidad_uni || 0) * (next.cantidad_viajes || 0);
      }

      // Auto-calc precio_total
      const mode = next.precio_calc_mode;
      if (mode === "viajes") {
        next.precio_total = (next.cantidad_viajes || 0) * (next.precio_unitario || 0);
      } else {
        next.precio_total = (next.cantidad || 0) * (next.precio_unitario || 0);
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

  const handleSubmit = async () => {
    if (!form.fecha) return;
    setSaving(true);
    try {
      const cantidad = (form.cantidad_uni || 0) * (form.cantidad_viajes || 0);
      const remito: RemitoForm = {
        numero: generateNumero(),
        fecha: form.fecha,
        material: form.tipo_material || "-",
        cantidad,
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
        cliente_destino: form.cliente_destino || undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nuevo Remito</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* === DATOS GENERALES === */}
          <SectionTitle>Datos Generales</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Fecha</Label>
            <Input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Remito Tercero</Label>
            <Input value={form.remito_tercero} onChange={(e) => set("remito_tercero", e.target.value)} className="h-9 text-sm" placeholder="Nro..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Remito Local</Label>
            <Input value={form.remito_local} onChange={(e) => set("remito_local", e.target.value)} className="h-9 text-sm" placeholder="Nro..." />
          </div>

          {/* === LOGÍSTICA === */}
          <SectionTitle>Logística</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Desde (Obra)</Label>
            <Combobox options={obraOptions} value={form.desde} onValueChange={(v) => set("desde", v)} placeholder="Obra origen..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Hasta (Obra)</Label>
            <Combobox options={obraOptions} value={form.hasta} onValueChange={(v) => set("hasta", v)} placeholder="Obra destino..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cliente Origen</Label>
            <Input value={form.cliente} readOnly className="h-9 text-sm bg-muted" placeholder="Auto" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cliente Destino</Label>
            <Input value={form.cliente_destino} readOnly className="h-9 text-sm bg-muted" placeholder="Auto" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Tipo Material</Label>
            <Select value={form.tipo_material} onValueChange={(v) => set("tipo_material", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {TIPO_MATERIAL_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Tipo Transporte</Label>
            <Combobox
              options={TIPO_TRANSPORTE_OPTIONS.map((t) => ({ value: t, label: t }))}
              value={form.tipo_transporte}
              onValueChange={(v) => set("tipo_transporte", v)}
              placeholder="Transporte..."
            />
          </div>

          {/* === VEHÍCULO === */}
          <SectionTitle>Vehículo</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Maquinaria</Label>
            <Combobox options={maquinariaOptions} value={form.maquinaria_id} onValueChange={(v) => set("maquinaria_id", v)} placeholder="Maquinaria..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Patente Tercero</Label>
            <Input value={form.patente_tercero} onChange={(e) => set("patente_tercero", e.target.value)} className="h-9 text-sm" placeholder="Patente..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Proveedor</Label>
            <Input value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)} className="h-9 text-sm" placeholder="Proveedor..." />
          </div>

          {/* === CANTIDADES Y PRECIOS === */}
          <SectionTitle>Cantidades y Precios</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cant. Viajes</Label>
            <Input type="number" value={form.cantidad_viajes} onChange={(e) => set("cantidad_viajes", Number(e.target.value))} className="h-9 text-sm" min={0} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cant. Unitaria</Label>
            <Input type="number" value={form.cantidad_uni} onChange={(e) => set("cantidad_uni", Number(e.target.value))} className="h-9 text-sm" min={0} step="0.01" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Unidad</Label>
            <Select value={form.unidad} onValueChange={(v) => set("unidad", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDAD_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cantidad Total</Label>
            <Input type="number" value={form.cantidad} readOnly className="h-9 text-sm bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Modo Cálculo</Label>
            <Select value={form.precio_calc_mode} onValueChange={(v) => set("precio_calc_mode", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viajes">Viajes × Precio</SelectItem>
                <SelectItem value="cantidad">Cantidad × Precio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Precio Unitario</Label>
            <Input type="number" value={form.precio_unitario} onChange={(e) => set("precio_unitario", Number(e.target.value))} className="h-9 text-sm" min={0} step="0.01" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Precio Total</Label>
            <Input type="number" value={form.precio_total} readOnly className="h-9 text-sm bg-muted" />
          </div>
          <div />

          {/* === OBSERVACIONES === */}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-1.5">
            <Label className="text-xs truncate block">Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} className="text-sm h-16 resize-none" placeholder="Observaciones..." />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-card pt-2">
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
