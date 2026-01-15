import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Calendar,
  User,
} from "lucide-react";
import { useVacaciones, VacacionDB, VacacionForm, EstadoVacacion } from "@/hooks/useVacaciones";
import { usePersonal, PersonalDB } from "@/hooks/usePersonal";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

const estadoConfig: Record<EstadoVacacion, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente: { 
    label: "Pendiente", 
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: <Clock className="w-3 h-3" />
  },
  aprobada: { 
    label: "Aprobada", 
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: <CheckCircle className="w-3 h-3" />
  },
  rechazada: { 
    label: "Rechazada", 
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <XCircle className="w-3 h-3" />
  },
};

const motivoConfig: Record<string, string> = {
  vacaciones: "Vacaciones",
  licencia_medica: "Licencia Médica",
  permiso_personal: "Permiso Personal",
  otro: "Otro",
};

export function VacacionesTab() {
  const { vacaciones, loading, createVacacion, updateVacacion, deleteVacacion, aprobarVacacion, rechazarVacacion } = useVacaciones();
  const { personal } = usePersonal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedVacacion, setSelectedVacacion] = useState<VacacionDB | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<VacacionForm>({
    personal_id: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: new Date().toISOString().split("T")[0],
    dias_totales: 1,
    motivo: "vacaciones",
    observaciones: "",
  });

  const personalActivo = personal.filter((p) => p.activo);

  const filteredVacaciones = vacaciones.filter((v) => {
    const nombreEmpleado = `${v.personal?.nombre || ""} ${v.personal?.apellido || ""}`.toLowerCase();
    const matchesSearch = nombreEmpleado.includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter === "todos" || v.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  // Stats
  const pendientes = vacaciones.filter((v) => v.estado === "pendiente").length;
  const aprobadas = vacaciones.filter((v) => v.estado === "aprobada").length;
  const rechazadas = vacaciones.filter((v) => v.estado === "rechazada").length;

  const calculateDays = (inicio: string, fin: string) => {
    try {
      const startDate = parseISO(inicio);
      const endDate = parseISO(fin);
      return Math.max(1, differenceInDays(endDate, startDate) + 1);
    } catch {
      return 1;
    }
  };

  const handleDateChange = (field: "fecha_inicio" | "fecha_fin", value: string) => {
    const newFormData = { ...formData, [field]: value };
    newFormData.dias_totales = calculateDays(
      field === "fecha_inicio" ? value : formData.fecha_inicio,
      field === "fecha_fin" ? value : formData.fecha_fin
    );
    setFormData(newFormData);
  };

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      personal_id: "",
      fecha_inicio: new Date().toISOString().split("T")[0],
      fecha_fin: new Date().toISOString().split("T")[0],
      dias_totales: 1,
      motivo: "vacaciones",
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (vacacion: VacacionDB) => {
    setIsEditing(true);
    setSelectedVacacion(vacacion);
    setFormData({
      personal_id: vacacion.personal_id,
      fecha_inicio: vacacion.fecha_inicio,
      fecha_fin: vacacion.fecha_fin,
      dias_totales: vacacion.dias_totales,
      motivo: vacacion.motivo,
      observaciones: vacacion.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleView = (vacacion: VacacionDB) => {
    setSelectedVacacion(vacacion);
    setDetailOpen(true);
  };

  const handleDelete = (vacacion: VacacionDB) => {
    setSelectedVacacion(vacacion);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedVacacion) {
      await deleteVacacion(selectedVacacion.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isEditing && selectedVacacion) {
      await updateVacacion(selectedVacacion.id, formData);
    } else {
      await createVacacion(formData);
    }

    setIsSubmitting(false);
    setFormOpen(false);
  };

  const handleAprobar = async (vacacion: VacacionDB) => {
    await aprobarVacacion(vacacion.id);
  };

  const handleRechazar = async (vacacion: VacacionDB) => {
    await rechazarVacacion(vacacion.id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empleado..."
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
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-industrial p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <p className="text-2xl font-bold text-foreground">{pendientes}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Pendientes</p>
        </div>
        <div className="card-industrial p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-2xl font-bold text-foreground">{aprobadas}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Aprobadas</p>
        </div>
        <div className="card-industrial p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <p className="text-2xl font-bold text-foreground">{rechazadas}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Rechazadas</p>
        </div>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Empleado</TableHead>
              <TableHead className="text-muted-foreground font-medium">Desde</TableHead>
              <TableHead className="text-muted-foreground font-medium">Hasta</TableHead>
              <TableHead className="text-muted-foreground font-medium">Días</TableHead>
              <TableHead className="text-muted-foreground font-medium">Motivo</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVacaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm || estadoFilter !== "todos" ? "No se encontraron vacaciones" : "No hay solicitudes de vacaciones"}
                </TableCell>
              </TableRow>
            ) : (
              filteredVacaciones.map((vacacion, index) => (
                <TableRow
                  key={vacacion.id}
                  className="border-border table-row-hover animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">
                        {vacacion.personal?.nombre || ""} {vacacion.personal?.apellido || ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {vacacion.fecha_inicio}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {vacacion.fecha_fin}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{vacacion.dias_totales}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {motivoConfig[vacacion.motivo] || vacacion.motivo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("status-badge flex items-center gap-1 w-fit", estadoConfig[vacacion.estado]?.color)}>
                      {estadoConfig[vacacion.estado]?.icon}
                      {estadoConfig[vacacion.estado]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem
                          onClick={() => handleView(vacacion)}
                          className="text-foreground cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        {vacacion.estado === "pendiente" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleAprobar(vacacion)}
                              className="text-green-400 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprobar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRechazar(vacacion)}
                              className="text-red-400 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Rechazar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(vacacion)}
                              className="text-foreground cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(vacacion)}
                          className="text-destructive cursor-pointer"
                        >
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

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Vacaciones" : "Nueva Solicitud de Vacaciones"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personal_id">Empleado *</Label>
            <Select
              value={formData.personal_id}
              onValueChange={(value) => setFormData({ ...formData, personal_id: value })}
            >
              <SelectTrigger className="bg-muted border-border">
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {personalActivo.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} {p.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => handleDateChange("fecha_inicio", e.target.value)}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin *</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => handleDateChange("fecha_fin", e.target.value)}
                className="bg-muted border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Días Totales</Label>
              <div className="flex items-center h-10 px-3 bg-muted border border-border rounded-md">
                <span className="text-foreground font-medium">{formData.dias_totales}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Select
                value={formData.motivo}
                onValueChange={(value) => setFormData({ ...formData, motivo: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(motivoConfig).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
              className="bg-muted border-border"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90" 
              disabled={isSubmitting || !formData.personal_id}
            >
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Solicitud"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Vacaciones"
      >
        {selectedVacacion && (
          <div className="space-y-4">
            <DetailSection title="Empleado">
              <DetailRow 
                label="Nombre" 
                value={`${selectedVacacion.personal?.nombre || ""} ${selectedVacacion.personal?.apellido || ""}`} 
              />
            </DetailSection>
            <DetailSection title="Período">
              <DetailRow label="Fecha Inicio" value={selectedVacacion.fecha_inicio} />
              <DetailRow label="Fecha Fin" value={selectedVacacion.fecha_fin} />
              <DetailRow label="Días Totales" value={selectedVacacion.dias_totales.toString()} />
            </DetailSection>
            <DetailSection title="Solicitud">
              <DetailRow label="Motivo" value={motivoConfig[selectedVacacion.motivo] || selectedVacacion.motivo} />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge flex items-center gap-1 w-fit", estadoConfig[selectedVacacion.estado]?.color)}>
                    {estadoConfig[selectedVacacion.estado]?.icon}
                    {estadoConfig[selectedVacacion.estado]?.label}
                  </Badge>
                }
              />
              {selectedVacacion.fecha_aprobacion && (
                <DetailRow label="Fecha Aprobación" value={selectedVacacion.fecha_aprobacion} />
              )}
              <DetailRow label="Observaciones" value={selectedVacacion.observaciones || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Vacaciones"
        description={`¿Estás seguro de que deseas eliminar esta solicitud de vacaciones? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
