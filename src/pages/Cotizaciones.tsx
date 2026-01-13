import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Send,
  MoreVertical,
  Trash2,
  Eye,
  Edit,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { useCotizaciones, CotizacionWithRelations, CotizacionForm, CotizacionItemForm, EstadoCotizacion } from "@/hooks/useCotizaciones";
import { useObras } from "@/hooks/useObras";
import { cn } from "@/lib/utils";

const estadoConfig: Record<string, { label: string; icon: any; className: string }> = {
  borrador: { label: "Borrador", icon: FileText, className: "bg-muted/50 text-muted-foreground border-muted" },
  enviada: { label: "Enviada", icon: Send, className: "status-pending" },
  aprobada: { label: "Aprobada", icon: CheckCircle, className: "status-active" },
  rechazada: { label: "Rechazada", icon: XCircle, className: "status-error" },
  vencida: { label: "Vencida", icon: Clock, className: "status-inactive" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Cotizaciones() {
  const { cotizaciones, loading, createCotizacion, updateCotizacion, deleteCotizacion } = useCotizaciones();
  const { obras } = useObras();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCot, setSelectedCot] = useState<CotizacionWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CotizacionForm>({
    numero: "",
    obra_id: "",
    descripcion: "",
    fecha_creacion: new Date().toISOString().split("T")[0],
    fecha_vencimiento: "",
    responsable: "",
    subtotal: 0,
    iva: 0,
    total: 0,
    estado: "borrador",
    notas: "",
  });

  const [items, setItems] = useState<CotizacionItemForm[]>([
    { descripcion: "", cantidad: 1, unidad: "m³", precio_unitario: 0, subtotal: 0 }
  ]);

  const filteredCotizaciones = cotizaciones.filter((cot) => {
    const matchesSearch =
      cot.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cot.obra?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cot.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter === "todos" || cot.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const generateNumero = () => {
    const year = new Date().getFullYear();
    const count = cotizaciones.length + 1;
    return `COT-${year}-${count.toString().padStart(3, "0")}`;
  };

  const calculateTotals = (itemsList: CotizacionItemForm[]) => {
    const subtotal = itemsList.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const handleNew = () => {
    setIsEditing(false);
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 15);
    
    setFormData({
      numero: generateNumero(),
      obra_id: "",
      descripcion: "",
      fecha_creacion: new Date().toISOString().split("T")[0],
      fecha_vencimiento: vencimiento.toISOString().split("T")[0],
      responsable: "",
      subtotal: 0,
      iva: 0,
      total: 0,
      estado: "borrador",
      notas: "",
    });
    setItems([{ descripcion: "", cantidad: 1, unidad: "m³", precio_unitario: 0, subtotal: 0 }]);
    setFormOpen(true);
  };

  const handleEdit = (cot: CotizacionWithRelations) => {
    setIsEditing(true);
    setSelectedCot(cot);
    setFormData({
      numero: cot.numero,
      obra_id: cot.obra_id || "",
      descripcion: cot.descripcion,
      fecha_creacion: cot.fecha_creacion,
      fecha_vencimiento: cot.fecha_vencimiento,
      responsable: cot.responsable,
      subtotal: cot.subtotal,
      iva: cot.iva,
      total: cot.total,
      estado: cot.estado,
      notas: cot.notas || "",
    });
    setItems(cot.items?.map(i => ({
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      unidad: i.unidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal,
    })) || [{ descripcion: "", cantidad: 1, unidad: "m³", precio_unitario: 0, subtotal: 0 }]);
    setFormOpen(true);
  };

  const handleView = (cot: CotizacionWithRelations) => {
    setSelectedCot(cot);
    setDetailOpen(true);
  };

  const handleDelete = (cot: CotizacionWithRelations) => {
    setSelectedCot(cot);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCot) {
      await deleteCotizacion(selectedCot.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const totals = calculateTotals(items);
    const cotData = {
      ...formData,
      ...totals,
    };

    if (isEditing && selectedCot) {
      await updateCotizacion(selectedCot.id, cotData);
    } else {
      await createCotizacion(cotData, items);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const updateStatus = async (cot: CotizacionWithRelations, newStatus: EstadoCotizacion) => {
    await updateCotizacion(cot.id, { estado: newStatus });
  };

  const addItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, unidad: "m³", precio_unitario: 0, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      const totals = calculateTotals(newItems);
      setFormData({ ...formData, ...totals });
    }
  };

  const updateItem = (index: number, field: keyof CotizacionItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "cantidad" || field === "precio_unitario") {
      newItems[index].subtotal = newItems[index].cantidad * newItems[index].precio_unitario;
    }
    
    setItems(newItems);
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, ...totals });
  };

  if (loading) {
    return (
      <MainLayout title="Cotizaciones" subtitle="Presupuestos y propuestas comerciales">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Cotizaciones" subtitle="Presupuestos y propuestas comerciales">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, obra o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(estadoConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleNew}
            className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = cotizaciones.filter((c) => c.estado === key).length;
          const total = cotizaciones
            .filter((c) => c.estado === key)
            .reduce((sum, c) => sum + c.total, 0);
          return (
            <div key={key} className="card-industrial p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("status-badge", config.className)}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCotizaciones.map((cot, index) => {
          const config = estadoConfig[cot.estado];
          const Icon = config.icon;
          return (
            <Card
              key={cot.id}
              className="card-industrial animate-fade-in hover:border-primary/30 transition-all cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-primary">{cot.numero}</span>
                    <h3 className="font-semibold text-foreground mt-1">{cot.obra?.nombre || "Sin obra asignada"}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => handleView(cot)} className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(cot)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {cot.estado === "borrador" && (
                        <DropdownMenuItem onClick={() => updateStatus(cot, "enviada")} className="cursor-pointer">
                          <Send className="w-4 h-4 mr-2" />
                          Enviar
                        </DropdownMenuItem>
                      )}
                      {cot.estado === "enviada" && (
                        <>
                          <DropdownMenuItem onClick={() => updateStatus(cot, "aprobada")} className="cursor-pointer text-success">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(cot, "rechazada")} className="cursor-pointer text-destructive">
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(cot)} className="cursor-pointer text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {cot.descripcion}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn("status-badge", config.className)}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(cot.total)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Creación: {cot.fecha_creacion}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Vence: {cot.fecha_vencimiento}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border">
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {cot.responsable}
                  </span>
                  <span>{cot.items?.length || 0} ítems</span>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Cotización" : "Nueva Cotización"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="bg-muted border-border font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra_id">Obra (opcional)</Label>
              <Select
                value={formData.obra_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, obra_id: value === "none" ? undefined : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {obras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable *</Label>
              <Input
                id="responsable"
                value={formData.responsable}
                onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_creacion">Fecha Creación *</Label>
              <Input
                id="fecha_creacion"
                type="date"
                value={formData.fecha_creacion}
                onChange={(e) => setFormData({ ...formData, fecha_creacion: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento">Fecha Vencimiento *</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoCotizacion })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(estadoConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="bg-muted border-border"
                rows={2}
                required
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Ítems</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Ítem
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                    className="bg-muted border-border"
                    placeholder="Descripción del ítem"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">Cant.</Label>
                  <Input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) => updateItem(index, "cantidad", parseFloat(e.target.value) || 0)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">Unidad</Label>
                  <Select
                    value={item.unidad}
                    onValueChange={(value) => updateItem(index, "unidad", value)}
                  >
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="m³">m³</SelectItem>
                      <SelectItem value="tn">tn</SelectItem>
                      <SelectItem value="hr">hr</SelectItem>
                      <SelectItem value="gl">gl</SelectItem>
                      <SelectItem value="un">un</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">P. Unit.</Label>
                  <Input
                    type="number"
                    value={item.precio_unitario}
                    onChange={(e) => updateItem(index, "precio_unitario", parseFloat(e.target.value) || 0)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Subtotal</Label>
                  <Input
                    value={formatCurrency(item.subtotal)}
                    readOnly
                    className="bg-muted border-border font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">{formatCurrency(formData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (21%):</span>
                <span className="font-mono">{formatCurrency(formData.iva)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="font-mono text-primary">{formatCurrency(formData.total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="bg-muted border-border"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Cotización"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Cotización"
      >
        {selectedCot && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Número" value={selectedCot.numero} />
              <DetailRow label="Obra" value={selectedCot.obra?.nombre || "Sin asignar"} />
              <DetailRow label="Responsable" value={selectedCot.responsable} />
              <DetailRow label="Estado" value={estadoConfig[selectedCot.estado].label} />
            </DetailSection>
            <DetailSection title="Fechas">
              <DetailRow label="Fecha Creación" value={selectedCot.fecha_creacion} />
              <DetailRow label="Fecha Vencimiento" value={selectedCot.fecha_vencimiento} />
            </DetailSection>
            <DetailSection title="Descripción">
              <p className="text-sm text-muted-foreground">{selectedCot.descripcion}</p>
            </DetailSection>
            {selectedCot.items && selectedCot.items.length > 0 && (
              <DetailSection title="Ítems">
                <div className="space-y-2">
                  {selectedCot.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm border-b border-border pb-2">
                      <span>{item.descripcion}</span>
                      <span className="font-mono">{item.cantidad} {item.unidad} x {formatCurrency(item.precio_unitario)} = {formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}
            <DetailSection title="Totales">
              <DetailRow label="Subtotal" value={formatCurrency(selectedCot.subtotal)} />
              <DetailRow label="IVA (21%)" value={formatCurrency(selectedCot.iva)} />
              <DetailRow label="Total" value={formatCurrency(selectedCot.total)} />
            </DetailSection>
            {selectedCot.notas && (
              <DetailSection title="Notas">
                <p className="text-sm text-muted-foreground">{selectedCot.notas}</p>
              </DetailSection>
            )}
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Cotización"
        description={`¿Estás seguro de que deseas eliminar la cotización "${selectedCot?.numero}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
