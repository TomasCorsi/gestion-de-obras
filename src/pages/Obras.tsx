import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Building2,
  MapPin,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
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
import { useObras, ObraWithRelations, ObraForm, EstadoObra } from "@/hooks/useObras";
import { useClientes } from "@/hooks/useClientes";
import { usePersonal } from "@/hooks/usePersonal";
import { cn } from "@/lib/utils";

const estadoConfig: Record<EstadoObra, { label: string; className: string }> = {
  activa: { label: "Activa", className: "status-active" },
  pendiente: { label: "Pendiente", className: "status-pending" },
  finalizada: { label: "Finalizada", className: "status-inactive" },
  pausada: { label: "Pausada", className: "status-error" },
};

export default function Obras() {
  const { obras, loading, createObra, updateObra, deleteObra } = useObras();
  const { clientes } = useClientes();
  const { personal } = usePersonal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedObra, setSelectedObra] = useState<ObraWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ObraForm>({
    codigo: "",
    nombre: "",
    cliente_id: "",
    ubicacion: "",
    descripcion: "",
    estado: "pendiente",
    fecha_inicio: new Date().toISOString().split("T")[0],
    progreso: 0,
  });

  const responsables = personal.filter(p => 
    (p.rol === "capataz" || p.rol === "supervisor" || p.rol === "administrador") && p.activo
  );

  const filteredObras = obras.filter((obra) => {
    const matchesSearch =
      obra.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (obra.cliente?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter === "todos" || obra.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const generateCodigo = () => {
    const year = new Date().getFullYear();
    const num = (obras.length + 1).toString().padStart(3, "0");
    return `OBR-${year}-${num}`;
  };

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      codigo: generateCodigo(),
      nombre: "",
      cliente_id: "",
      ubicacion: "",
      descripcion: "",
      estado: "pendiente",
      fecha_inicio: new Date().toISOString().split("T")[0],
      progreso: 0,
    });
    setFormOpen(true);
  };

  const handleEdit = (obra: ObraWithRelations) => {
    setIsEditing(true);
    setSelectedObra(obra);
    setFormData({
      codigo: obra.codigo,
      nombre: obra.nombre,
      cliente_id: obra.cliente_id,
      ubicacion: obra.ubicacion,
      descripcion: obra.descripcion,
      estado: obra.estado,
      fecha_inicio: obra.fecha_inicio,
      fecha_fin_estimada: obra.fecha_fin_estimada || undefined,
      progreso: obra.progreso,
      responsable_id: obra.responsable_id || undefined,
      presupuesto: obra.presupuesto || undefined,
    });
    setFormOpen(true);
  };

  const handleView = (obra: ObraWithRelations) => {
    setSelectedObra(obra);
    setDetailOpen(true);
  };

  const handleDelete = (obra: ObraWithRelations) => {
    setSelectedObra(obra);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedObra) {
      await deleteObra(selectedObra.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isEditing && selectedObra) {
      await updateObra(selectedObra.id, formData);
    } else {
      await createObra(formData);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  if (loading) {
    return (
      <MainLayout title="Obras" subtitle="Gestión de proyectos y obras">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Obras" subtitle="Gestión de proyectos y obras">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cliente o código..."
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
              <SelectItem value="activa">Activas</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="pausada">Pausadas</SelectItem>
              <SelectItem value="finalizada">Finalizadas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Obra
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Código</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-muted-foreground font-medium">Ubicación</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium">Progreso</TableHead>
              <TableHead className="text-muted-foreground font-medium">Responsable</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredObras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || estadoFilter !== "todos" ? "No se encontraron obras" : "No hay obras registradas"}
                </TableCell>
              </TableRow>
            ) : (
              filteredObras.map((obra, index) => (
                <TableRow
                  key={obra.id}
                  className="border-border table-row-hover animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell className="font-mono text-sm text-primary">{obra.codigo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{obra.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{obra.cliente?.nombre || "-"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {obra.ubicacion}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("status-badge", estadoConfig[obra.estado].className)}>
                      {estadoConfig[obra.estado].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            obra.progreso === 100 ? "bg-success" : "bg-primary"
                          )}
                          style={{ width: `${obra.progreso}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">{obra.progreso}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {obra.responsable ? `${obra.responsable.nombre} ${obra.responsable.apellido}` : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem onClick={() => handleView(obra)} className="text-foreground cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(obra)} className="text-foreground cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(obra)} className="text-destructive cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = obras.filter((o) => o.estado === key).length;
          return (
            <div key={key} className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-sm text-muted-foreground">{config.label}</p>
              </div>
              <Badge className={cn("status-badge", config.className)}>{key}</Badge>
            </div>
          );
        })}
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Obra" : "Nueva Obra"}
        description={isEditing ? "Modifica los datos de la obra" : "Ingresa los datos de la nueva obra"}
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
                className="bg-muted border-border font-mono"
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
              <Label htmlFor="cliente_id">Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {clientes.filter(c => c.activo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsable_id">Responsable</Label>
              <Select
                value={formData.responsable_id || ""}
                onValueChange={(value) => setFormData({ ...formData, responsable_id: value || undefined })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar responsable" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {responsables.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre} {p.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="ubicacion">Ubicación *</Label>
              <Input
                id="ubicacion"
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="md:col-span-2 space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoObra })}
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
              <Label htmlFor="progreso">Progreso (%)</Label>
              <Input
                id="progreso"
                type="number"
                min="0"
                max="100"
                value={formData.progreso}
                onChange={(e) => setFormData({ ...formData, progreso: parseInt(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin_estimada">Fecha Fin Estimada</Label>
              <Input
                id="fecha_fin_estimada"
                type="date"
                value={formData.fecha_fin_estimada || ""}
                onChange={(e) => setFormData({ ...formData, fecha_fin_estimada: e.target.value || undefined })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="presupuesto">Presupuesto</Label>
              <Input
                id="presupuesto"
                type="number"
                value={formData.presupuesto || ""}
                onChange={(e) => setFormData({ ...formData, presupuesto: parseFloat(e.target.value) || undefined })}
                className="bg-muted border-border"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Obra"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedObra?.nombre || ""}
      >
        {selectedObra && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Código" value={selectedObra.codigo} />
              <DetailRow label="Nombre" value={selectedObra.nombre} />
              <DetailRow label="Cliente" value={selectedObra.cliente?.nombre || "-"} />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", estadoConfig[selectedObra.estado].className)}>
                    {estadoConfig[selectedObra.estado].label}
                  </Badge>
                }
              />
              <DetailRow label="Progreso" value={`${selectedObra.progreso}%`} />
            </DetailSection>
            <DetailSection title="Ubicación y Fechas">
              <DetailRow label="Ubicación" value={selectedObra.ubicacion} />
              <DetailRow label="Fecha Inicio" value={selectedObra.fecha_inicio} />
              <DetailRow label="Fecha Fin Estimada" value={selectedObra.fecha_fin_estimada || "-"} />
              <DetailRow label="Fecha Fin Real" value={selectedObra.fecha_fin_real || "-"} />
            </DetailSection>
            <DetailSection title="Responsable y Presupuesto">
              <DetailRow 
                label="Responsable" 
                value={selectedObra.responsable ? `${selectedObra.responsable.nombre} ${selectedObra.responsable.apellido}` : "-"} 
              />
              <DetailRow 
                label="Presupuesto" 
                value={selectedObra.presupuesto ? `$${selectedObra.presupuesto.toLocaleString("es-AR")}` : "-"} 
              />
            </DetailSection>
            <DetailSection title="Descripción">
              <p className="text-sm text-muted-foreground">{selectedObra.descripcion}</p>
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Obra"
        description={`¿Estás seguro de que deseas eliminar la obra "${selectedObra?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
