import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Maquinaria } from "@/types";
import { maquinariasData as initialData } from "@/data/mockData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const tiposConfig: Record<string, string> = {
  excavadora: "Excavadora",
  cargadora: "Cargadora",
  camion_articulado: "Camión Articulado",
  topadora: "Topadora",
  rodillo: "Rodillo",
  retroexcavadora: "Retroexcavadora",
  motoniveladora: "Motoniveladora",
};

const estadoConfig: Record<string, { label: string; icon: any; className: string }> = {
  operativa: { label: "Operativa", icon: CheckCircle, className: "status-active" },
  mantenimiento: { label: "Mantenimiento", icon: Wrench, className: "status-pending" },
  inactiva: { label: "Inactiva", icon: Clock, className: "status-inactive" },
  en_uso: { label: "En Uso", icon: Truck, className: "bg-primary/20 text-primary border-primary/30" },
};

export default function Maquinarias() {
  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMaquinaria, setSelectedMaquinaria] = useState<Maquinaria | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<Maquinaria>>({
    codigo: "",
    nombre: "",
    tipo: "excavadora",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    patente: "",
    estado: "operativa",
    ubicacionActual: "",
    horasAcumuladas: 0,
    proximoService: 500,
    operadorAsignado: "",
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
      ubicacionActual: "Base Central",
      horasAcumuladas: 0,
      proximoService: 500,
      operadorAsignado: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (maq: Maquinaria) => {
    setIsEditing(true);
    setSelectedMaquinaria(maq);
    setFormData(maq);
    setFormOpen(true);
  };

  const handleView = (maq: Maquinaria) => {
    setSelectedMaquinaria(maq);
    setDetailOpen(true);
  };

  const handleDelete = (maq: Maquinaria) => {
    setSelectedMaquinaria(maq);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedMaquinaria) {
      setMaquinarias(maquinarias.filter((m) => m.id !== selectedMaquinaria.id));
      toast.success("Maquinaria eliminada correctamente");
    }
    setDeleteOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedMaquinaria) {
      setMaquinarias(
        maquinarias.map((m) =>
          m.id === selectedMaquinaria.id ? { ...m, ...formData } : m
        )
      );
      toast.success("Maquinaria actualizada correctamente");
    } else {
      const newMaq: Maquinaria = {
        ...formData,
        id: Date.now().toString(),
      } as Maquinaria;
      setMaquinarias([...maquinarias, newMaq]);
      toast.success("Maquinaria creada correctamente");
    }
    setFormOpen(false);
  };

  const getServiceProgress = (maq: Maquinaria) => {
    return Math.min((maq.horasAcumuladas / maq.proximoService) * 100, 100);
  };

  const needsService = (maq: Maquinaria) => {
    return maq.horasAcumuladas >= maq.proximoService * 0.9;
  };

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
        {filteredMaquinarias.map((maq, index) => {
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
                    {maq.ubicacionActual}
                  </div>
                  {maq.operadorAsignado && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="w-4 h-4" />
                      {maq.operadorAsignado}
                    </div>
                  )}
                </div>

                {/* Service Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Horas: {maq.horasAcumuladas.toLocaleString()}
                    </span>
                    <span className={cn(
                      "font-medium",
                      needsService(maq) ? "text-warning" : "text-muted-foreground"
                    )}>
                      Service: {maq.proximoService.toLocaleString()}h
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
        })}
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
                onValueChange={(value) => setFormData({ ...formData, tipo: value as Maquinaria["tipo"] })}
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
                onValueChange={(value) => setFormData({ ...formData, estado: value as Maquinaria["estado"] })}
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
              <Label htmlFor="ubicacionActual">Ubicación Actual *</Label>
              <Input
                id="ubicacionActual"
                value={formData.ubicacionActual}
                onChange={(e) => setFormData({ ...formData, ubicacionActual: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operadorAsignado">Operador Asignado</Label>
              <Input
                id="operadorAsignado"
                value={formData.operadorAsignado}
                onChange={(e) => setFormData({ ...formData, operadorAsignado: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horasAcumuladas">Horas Acumuladas</Label>
              <Input
                id="horasAcumuladas"
                type="number"
                value={formData.horasAcumuladas}
                onChange={(e) => setFormData({ ...formData, horasAcumuladas: parseInt(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proximoService">Próximo Service (horas)</Label>
              <Input
                id="proximoService"
                type="number"
                value={formData.proximoService}
                onChange={(e) => setFormData({ ...formData, proximoService: parseInt(e.target.value) || 500 })}
                className="bg-muted border-border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {isEditing ? "Guardar Cambios" : "Crear Maquinaria"}
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
            <DetailSection title="Identificación">
              <DetailRow label="Código" value={<span className="font-mono text-primary">{selectedMaquinaria.codigo}</span>} />
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
            <DetailSection title="Especificaciones">
              <DetailRow label="Marca" value={selectedMaquinaria.marca} />
              <DetailRow label="Modelo" value={selectedMaquinaria.modelo} />
              <DetailRow label="Año" value={selectedMaquinaria.anio} />
              <DetailRow label="Patente" value={selectedMaquinaria.patente || "-"} />
            </DetailSection>
            <DetailSection title="Operación">
              <DetailRow label="Ubicación Actual" value={selectedMaquinaria.ubicacionActual} />
              <DetailRow label="Operador Asignado" value={selectedMaquinaria.operadorAsignado || "-"} />
              <DetailRow label="Horas Acumuladas" value={`${selectedMaquinaria.horasAcumuladas.toLocaleString()} h`} />
              <DetailRow label="Próximo Service" value={`${selectedMaquinaria.proximoService.toLocaleString()} h`} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        description={`Se eliminará la maquinaria "${selectedMaquinaria?.nombre}".`}
      />
    </MainLayout>
  );
}
