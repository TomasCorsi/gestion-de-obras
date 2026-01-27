import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Wrench,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
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
import { FilterBar, FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { useMantenimientos, MantenimientoWithRelations, MantenimientoForm, TipoMantenimiento, EstadoMantenimiento } from "@/hooks/useMantenimientos";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useObras } from "@/hooks/useObras";
import { cn, formatDate } from "@/lib/utils";

const tipoConfig: Record<string, { label: string; className: string }> = {
  preventivo: { label: "Preventivo", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  correctivo: { label: "Correctivo", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  emergencia: { label: "Emergencia", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const estadoConfig: Record<string, { label: string; icon: any; className: string }> = {
  programado: { label: "Programado", icon: Calendar, className: "status-pending" },
  en_proceso: { label: "En Proceso", icon: Play, className: "bg-primary/20 text-primary border-primary/30" },
  completado: { label: "Completado", icon: CheckCircle, className: "status-active" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MantenimientoPage() {
  const { mantenimientos, loading, createMantenimiento, updateMantenimiento, deleteMantenimiento } = useMantenimientos();
  const { maquinarias } = useMaquinarias();
  const { obras } = useObras();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMant, setSelectedMant] = useState<MantenimientoWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<MantenimientoForm>({
    fecha: new Date().toISOString().split("T")[0],
    maquinaria_id: "",
    tipo: "preventivo",
    descripcion: "",
    repuestos: "",
    costo_repuestos: 0,
    costo_mano_obra: 0,
    costo_total: 0,
    horas_maquina: 0,
    tecnico: "",
    estado: "programado",
    proximo_mantenimiento: "",
    observaciones: "",
  });

  const filteredMantenimientos = useMemo(() => {
    // Apply date filters first (mantenimientos don't have obra_id, so we only filter by date)
    const dateFiltered = mantenimientos.filter((m) => {
      if (filters.fechaDesde || filters.fechaHasta) {
        const itemDate = new Date(m.fecha);
        if (filters.fechaDesde && itemDate < filters.fechaDesde) return false;
        if (filters.fechaHasta && itemDate > filters.fechaHasta) return false;
      }
      return true;
    });
    
    // Then apply search and status filters
    return dateFiltered.filter((m) => {
      const matchesSearch =
        m.maquinaria?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = estadoFilter === "todos" || m.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [mantenimientos, filters, searchTerm, estadoFilter]);

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      maquinaria_id: "",
      tipo: "preventivo",
      descripcion: "",
      repuestos: "",
      costo_repuestos: 0,
      costo_mano_obra: 0,
      costo_total: 0,
      horas_maquina: 0,
      tecnico: "",
      estado: "programado",
      proximo_mantenimiento: "",
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (mant: MantenimientoWithRelations) => {
    setIsEditing(true);
    setSelectedMant(mant);
    setFormData({
      fecha: mant.fecha,
      maquinaria_id: mant.maquinaria_id,
      tipo: mant.tipo,
      descripcion: mant.descripcion,
      repuestos: mant.repuestos || "",
      costo_repuestos: mant.costo_repuestos,
      costo_mano_obra: mant.costo_mano_obra,
      costo_total: mant.costo_total,
      horas_maquina: mant.horas_maquina,
      tecnico: mant.tecnico,
      estado: mant.estado,
      proximo_mantenimiento: mant.proximo_mantenimiento || "",
      observaciones: mant.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleView = (mant: MantenimientoWithRelations) => {
    setSelectedMant(mant);
    setDetailOpen(true);
  };

  const handleDelete = (mant: MantenimientoWithRelations) => {
    setSelectedMant(mant);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedMant) {
      await deleteMantenimiento(selectedMant.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const mantData = {
      ...formData,
      costo_total: formData.costo_repuestos + formData.costo_mano_obra,
      proximo_mantenimiento: formData.proximo_mantenimiento || undefined,
    };

    if (isEditing && selectedMant) {
      await updateMantenimiento(selectedMant.id, mantData);
    } else {
      await createMantenimiento(mantData);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const updateStatus = async (mant: MantenimientoWithRelations, newStatus: EstadoMantenimiento) => {
    await updateMantenimiento(mant.id, { estado: newStatus });
  };

  if (loading) {
    return (
      <MainLayout title="Mantenimiento" subtitle="Gestión de mantenimiento de equipos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Mantenimiento" subtitle="Gestión de mantenimiento de equipos">
      {/* Filter Bar */}
      <div className="mb-4">
        <FilterBar obras={obras} onFilterChange={setFilters} showObraFilter={false} />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por maquinaria o descripción..."
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
            Nuevo Mantenimiento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{mantenimientos.length}</p>
            <p className="text-sm text-muted-foreground">Total Registros</p>
          </div>
          <Wrench className="w-8 h-8 text-primary" />
        </div>
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = mantenimientos.filter((m) => m.estado === key).length;
          const Icon = config.icon;
          return (
            <div key={key} className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-sm text-muted-foreground">{config.label}</p>
              </div>
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMantenimientos.map((mant, index) => {
          const estadoCfg = estadoConfig[mant.estado];
          const tipoCfg = tipoConfig[mant.tipo];
          const EstadoIcon = estadoCfg.icon;
          return (
            <Card
              key={mant.id}
              className="card-industrial animate-fade-in hover:border-primary/30 transition-all"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{mant.maquinaria?.nombre || "-"}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(mant.fecha)}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => handleView(mant)} className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      {mant.estado === "programado" && (
                        <DropdownMenuItem onClick={() => updateStatus(mant, "en_proceso")} className="cursor-pointer text-primary">
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar
                        </DropdownMenuItem>
                      )}
                      {mant.estado === "en_proceso" && (
                        <DropdownMenuItem onClick={() => updateStatus(mant, "completado")} className="cursor-pointer text-success">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEdit(mant)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(mant)} className="text-destructive cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn("status-badge", tipoCfg.className)}>
                    {tipoCfg.label}
                  </Badge>
                  <Badge className={cn("status-badge", estadoCfg.className)}>
                    <EstadoIcon className="w-3 h-3 mr-1" />
                    {estadoCfg.label}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {mant.descripcion}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {mant.horas_maquina.toLocaleString()} h
                  </span>
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-primary" />
                    {formatCurrency(mant.costo_total)}
                  </span>
                </div>

                {mant.estado === "programado" && (
                  <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs text-warning">Pendiente de ejecución</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maquinaria_id">Maquinaria *</Label>
              <Select
                value={formData.maquinaria_id}
                onValueChange={(value) => setFormData({ ...formData, maquinaria_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {maquinarias.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoMantenimiento })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(tipoConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoMantenimiento })}
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
            <div className="space-y-2">
              <Label htmlFor="horas_maquina">Horas Máquina *</Label>
              <Input
                id="horas_maquina"
                type="number"
                value={formData.horas_maquina}
                onChange={(e) => setFormData({ ...formData, horas_maquina: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tecnico">Técnico/Taller *</Label>
              <Input
                id="tecnico"
                value={formData.tecnico}
                onChange={(e) => setFormData({ ...formData, tecnico: e.target.value })}
                className="bg-muted border-border"
                required
              />
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
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="repuestos">Repuestos Utilizados</Label>
              <Textarea
                id="repuestos"
                value={formData.repuestos}
                onChange={(e) => setFormData({ ...formData, repuestos: e.target.value })}
                className="bg-muted border-border"
                rows={2}
                placeholder="Lista de repuestos utilizados..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo_repuestos">Costo Repuestos</Label>
              <Input
                id="costo_repuestos"
                type="number"
                value={formData.costo_repuestos}
                onChange={(e) => setFormData({ ...formData, costo_repuestos: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo_mano_obra">Costo Mano Obra</Label>
              <Input
                id="costo_mano_obra"
                type="number"
                value={formData.costo_mano_obra}
                onChange={(e) => setFormData({ ...formData, costo_mano_obra: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo_total">Costo Total</Label>
              <Input
                id="costo_total"
                value={formatCurrency(formData.costo_repuestos + formData.costo_mano_obra)}
                className="bg-muted border-border font-mono"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proximo_mantenimiento">Próximo Mantenimiento</Label>
              <Input
                id="proximo_mantenimiento"
                type="date"
                value={formData.proximo_mantenimiento}
                onChange={(e) => setFormData({ ...formData, proximo_mantenimiento: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="bg-muted border-border"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Registrar Mantenimiento"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Mantenimiento"
      >
        {selectedMant && (
          <>
            <DetailSection title="Información General">
              <DetailRow label="Fecha" value={formatDate(selectedMant.fecha)} />
              <DetailRow label="Maquinaria" value={selectedMant.maquinaria?.nombre} />
              <DetailRow
                label="Tipo"
                value={<Badge className={cn("status-badge", tipoConfig[selectedMant.tipo]?.className)}>{tipoConfig[selectedMant.tipo]?.label}</Badge>}
              />
              <DetailRow
                label="Estado"
                value={<Badge className={cn("status-badge", estadoConfig[selectedMant.estado]?.className)}>{estadoConfig[selectedMant.estado]?.label}</Badge>}
              />
            </DetailSection>
            <DetailSection title="Trabajo Realizado">
              <DetailRow label="Descripción" value={selectedMant.descripcion} />
              <DetailRow label="Técnico" value={selectedMant.tecnico} />
              <DetailRow label="Horas Máquina" value={`${selectedMant.horas_maquina} h`} />
              {selectedMant.repuestos && <DetailRow label="Repuestos" value={selectedMant.repuestos} />}
            </DetailSection>
            <DetailSection title="Costos">
              <DetailRow label="Repuestos" value={formatCurrency(selectedMant.costo_repuestos)} />
              <DetailRow label="Mano de Obra" value={formatCurrency(selectedMant.costo_mano_obra)} />
              <DetailRow label="Total" value={formatCurrency(selectedMant.costo_total)} />
            </DetailSection>
            {selectedMant.proximo_mantenimiento && (
              <DetailSection title="Próximo Mantenimiento">
                <DetailRow label="Fecha" value={selectedMant.proximo_mantenimiento} />
              </DetailSection>
            )}
            {selectedMant.observaciones && (
              <DetailSection title="Observaciones">
                <p className="text-muted-foreground">{selectedMant.observaciones}</p>
              </DetailSection>
            )}
          </>
        )}
      </DetailDialog>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Mantenimiento"
        description={`¿Estás seguro de eliminar este registro de mantenimiento? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
