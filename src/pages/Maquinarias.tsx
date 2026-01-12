import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Truck,
  MapPin,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Gauge,
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
import { useMaquinarias, MaquinariaDB, MaquinariaForm, TipoMaquinaria, EstadoMaquinaria } from "@/hooks/useMaquinarias";
import { usePersonal } from "@/hooks/usePersonal";
import { cn } from "@/lib/utils";

const tiposConfig: Record<TipoMaquinaria, string> = {
  excavadora: "Excavadora",
  cargadora: "Cargadora",
  camion_articulado: "Camión Articulado",
  topadora: "Topadora",
  rodillo: "Rodillo",
  retroexcavadora: "Retroexcavadora",
  motoniveladora: "Motoniveladora",
};

const estadoConfig: Record<EstadoMaquinaria, { label: string; icon: any; className: string }> = {
  operativa: { label: "Operativa", icon: CheckCircle, className: "status-active" },
  mantenimiento: { label: "Mantenimiento", icon: Wrench, className: "status-pending" },
  inactiva: { label: "Inactiva", icon: Clock, className: "status-inactive" },
  en_uso: { label: "En Uso", icon: Truck, className: "bg-primary/20 text-primary border-primary/30" },
};

export default function Maquinarias() {
  const { maquinarias, loading, createMaquinaria, updateMaquinaria, deleteMaquinaria } = useMaquinarias();
  const { personal } = usePersonal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMaquinaria, setSelectedMaquinaria] = useState<MaquinariaDB | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const operadores = personal.filter(p => p.rol === "maquinista" && p.activo);

  const [formData, setFormData] = useState<MaquinariaForm>({
    codigo: "",
    nombre: "",
    tipo: "excavadora",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    patente: "",
    estado: "operativa",
    ubicacion_actual: "Base Central",
    horas_acumuladas: 0,
    proximo_service: 500,
  });

  const filteredMaquinarias = maquinarias.filter((m) => {
    const matchesSearch =
      m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter === "todos" || m.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      codigo: "",
      nombre: "",
      tipo: "excavadora",
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      patente: "",
      estado: "operativa",
      ubicacion_actual: "Base Central",
      horas_acumuladas: 0,
      proximo_service: 500,
    });
    setFormOpen(true);
  };

  const handleEdit = (maq: MaquinariaDB) => {
    setIsEditing(true);
    setSelectedMaquinaria(maq);
    setFormData({
      codigo: maq.codigo,
      nombre: maq.nombre,
      tipo: maq.tipo,
      marca: maq.marca,
      modelo: maq.modelo,
      anio: maq.anio,
      patente: maq.patente || "",
      estado: maq.estado,
      ubicacion_actual: maq.ubicacion_actual,
      horas_acumuladas: maq.horas_acumuladas,
      proximo_service: maq.proximo_service,
      operador_asignado_id: maq.operador_asignado_id || undefined,
    });
    setFormOpen(true);
  };

  const handleView = (maq: MaquinariaDB) => {
    setSelectedMaquinaria(maq);
    setDetailOpen(true);
  };

  const handleDelete = (maq: MaquinariaDB) => {
    setSelectedMaquinaria(maq);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedMaquinaria) {
      await deleteMaquinaria(selectedMaquinaria.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isEditing && selectedMaquinaria) {
      await updateMaquinaria(selectedMaquinaria.id, formData);
    } else {
      await createMaquinaria(formData);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const getServiceProgress = (maq: MaquinariaDB) => {
    return Math.min((maq.horas_acumuladas / maq.proximo_service) * 100, 100);
  };

  const needsService = (maq: MaquinariaDB) => {
    return maq.horas_acumuladas >= maq.proximo_service * 0.9;
  };

  if (loading) {
    return (
      <MainLayout title="Maquinarias" subtitle="Control de equipos y flota">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Maquinarias" subtitle="Control de equipos y flota">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
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
            Nueva Maquinaria
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaquinarias.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchTerm || estadoFilter !== "todos" ? "No se encontraron maquinarias" : "No hay maquinarias registradas"}
          </div>
        ) : (
          filteredMaquinarias.map((maq, index) => {
            const config = estadoConfig[maq.estado];
            const Icon = config.icon;
            return (
              <Card
                key={maq.id}
                className="card-industrial animate-fade-in hover:border-primary/30 transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs font-mono text-primary">{maq.codigo}</span>
                        <h3 className="font-semibold text-foreground">{maq.nombre}</h3>
                        <p className="text-xs text-muted-foreground">{tiposConfig[maq.tipo]}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem onClick={() => handleView(maq)} className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(maq)} className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(maq)} className="text-destructive cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={cn("status-badge", config.className)}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {maq.marca} {maq.modelo}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {maq.ubicacion_actual}
                    </div>
                  </div>

                  {/* Service Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Horas: {maq.horas_acumuladas.toLocaleString()}
                      </span>
                      <span className={cn(
                        "font-medium",
                        needsService(maq) ? "text-warning" : "text-muted-foreground"
                      )}>
                        Service: {maq.proximo_service.toLocaleString()}h
                      </span>
                    </div>
                    <Progress
                      value={getServiceProgress(maq)}
                      className={cn(
                        "h-2",
                        needsService(maq) && "[&>div]:bg-warning"
                      )}
                    />
                  </div>

                  {needsService(maq) && (
                    <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-xs text-warning">Service próximo</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = maquinarias.filter((m) => m.estado === key).length;
          const Icon = config.icon;
          return (
            <div key={key} className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-sm text-muted-foreground">{config.label}</p>
              </div>
              <Icon className={cn("w-8 h-8", config.className.includes("primary") ? "text-primary" : "")} />
            </div>
          );
        })}
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Maquinaria" : "Nueva Maquinaria"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="EXC-001"
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoMaquinaria })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(tiposConfig).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoMaquinaria })}
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
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anio">Año *</Label>
              <Input
                id="anio"
                type="number"
                value={formData.anio}
                onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patente">Patente</Label>
              <Input
                id="patente"
                value={formData.patente}
                onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacion_actual">Ubicación Actual *</Label>
              <Input
                id="ubicacion_actual"
                value={formData.ubicacion_actual}
                onChange={(e) => setFormData({ ...formData, ubicacion_actual: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operador_asignado_id">Operador Asignado</Label>
              <Select
                value={formData.operador_asignado_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, operador_asignado_id: value === "none" ? undefined : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {operadores.map((op) => (
                    <SelectItem key={op.id} value={op.id}>{op.nombre} {op.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_acumuladas">Horas Acumuladas</Label>
              <Input
                id="horas_acumuladas"
                type="number"
                value={formData.horas_acumuladas}
                onChange={(e) => setFormData({ ...formData, horas_acumuladas: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proximo_service">Próximo Service (horas) *</Label>
              <Input
                id="proximo_service"
                type="number"
                value={formData.proximo_service}
                onChange={(e) => setFormData({ ...formData, proximo_service: parseFloat(e.target.value) || 500 })}
                className="bg-muted border-border"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Maquinaria"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedMaquinaria?.nombre || ""}
      >
        {selectedMaquinaria && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Código" value={selectedMaquinaria.codigo} />
              <DetailRow label="Nombre" value={selectedMaquinaria.nombre} />
              <DetailRow label="Tipo" value={tiposConfig[selectedMaquinaria.tipo]} />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", estadoConfig[selectedMaquinaria.estado].className)}>
                    {estadoConfig[selectedMaquinaria.estado].label}
                  </Badge>
                }
              />
            </DetailSection>
            <DetailSection title="Detalles">
              <DetailRow label="Marca" value={selectedMaquinaria.marca} />
              <DetailRow label="Modelo" value={selectedMaquinaria.modelo} />
              <DetailRow label="Año" value={selectedMaquinaria.anio.toString()} />
              <DetailRow label="Patente" value={selectedMaquinaria.patente || "-"} />
            </DetailSection>
            <DetailSection title="Operación">
              <DetailRow label="Ubicación" value={selectedMaquinaria.ubicacion_actual} />
              <DetailRow label="Horas Acumuladas" value={`${selectedMaquinaria.horas_acumuladas.toLocaleString()} h`} />
              <DetailRow label="Próximo Service" value={`${selectedMaquinaria.proximo_service.toLocaleString()} h`} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Maquinaria"
        description={`¿Estás seguro de que deseas eliminar "${selectedMaquinaria?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
