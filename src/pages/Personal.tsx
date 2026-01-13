import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  Plus,
  Search,
  Phone,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  User,
  Filter,
  CreditCard,
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
import { usePersonal, PersonalDB, PersonalForm, RolPersonal } from "@/hooks/usePersonal";
import { cn } from "@/lib/utils";

const rolesConfig: Record<RolPersonal, { label: string; color: string }> = {
  capataz: { label: "Capataz", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  maquinista: { label: "Maquinista", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  chofer: { label: "Chofer", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  administrativo: { label: "Administrativo", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  ayudante: { label: "Ayudante", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  sereno: { label: "Sereno", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export default function Personal() {
  const { personal, loading, createPersonal, updatePersonal, deletePersonal } = usePersonal();
  const [searchTerm, setSearchTerm] = useState("");
  const [rolFilter, setRolFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonalDB | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<PersonalForm>({
    nombre: "",
    apellido: "",
    dni: "",
    rol: "chofer",
    email: "",
    telefono: "",
    fecha_ingreso: new Date().toISOString().split("T")[0],
    activo: true,
    licencia: "",
    vencimiento_licencia: "",
  });

  const filteredPersonal = personal.filter((p) => {
    const matchesSearch =
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.dni.includes(searchTerm);
    const matchesRol = rolFilter === "todos" || p.rol === rolFilter;
    return matchesSearch && matchesRol;
  });

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      nombre: "",
      apellido: "",
      dni: "",
      rol: "chofer",
      email: "",
      telefono: "",
      fecha_ingreso: new Date().toISOString().split("T")[0],
      activo: true,
      licencia: "",
      vencimiento_licencia: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (persona: PersonalDB) => {
    setIsEditing(true);
    setSelectedPersona(persona);
    setFormData({
      nombre: persona.nombre,
      apellido: persona.apellido,
      dni: persona.dni,
      rol: persona.rol,
      email: persona.email || "",
      telefono: persona.telefono,
      fecha_ingreso: persona.fecha_ingreso,
      activo: persona.activo,
      licencia: persona.licencia || "",
      vencimiento_licencia: persona.vencimiento_licencia || "",
    });
    setFormOpen(true);
  };

  const handleView = (persona: PersonalDB) => {
    setSelectedPersona(persona);
    setDetailOpen(true);
  };

  const handleDelete = (persona: PersonalDB) => {
    setSelectedPersona(persona);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedPersona) {
      await deletePersonal(selectedPersona.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isEditing && selectedPersona) {
      await updatePersonal(selectedPersona.id, formData);
    } else {
      await createPersonal(formData);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  if (loading) {
    return (
      <MainLayout title="Personal" subtitle="Gestión de empleados y roles">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Personal" subtitle="Gestión de empleados y roles">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={rolFilter} onValueChange={setRolFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(rolesConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleNew}
            className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Personal
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Nombre</TableHead>
              <TableHead className="text-muted-foreground font-medium">DNI</TableHead>
              <TableHead className="text-muted-foreground font-medium">Rol</TableHead>
              <TableHead className="text-muted-foreground font-medium">Teléfono</TableHead>
              <TableHead className="text-muted-foreground font-medium">Ingreso</TableHead>
              <TableHead className="text-muted-foreground font-medium">Licencia</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPersonal.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || rolFilter !== "todos" ? "No se encontró personal" : "No hay personal registrado"}
                </TableCell>
              </TableRow>
            ) : (
              filteredPersonal.map((persona, index) => (
                <TableRow
                  key={persona.id}
                  className="border-border table-row-hover animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">
                        {persona.nombre} {persona.apellido}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {persona.dni}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("status-badge", rolesConfig[persona.rol]?.color)}>
                      {rolesConfig[persona.rol]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {persona.telefono}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {persona.fecha_ingreso}
                    </span>
                  </TableCell>
                  <TableCell>
                    {persona.licencia ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CreditCard className="w-3 h-3" />
                        {persona.licencia}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "status-badge",
                        persona.activo ? "status-active" : "status-inactive"
                      )}
                    >
                      {persona.activo ? "Activo" : "Inactivo"}
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
                          onClick={() => handleView(persona)}
                          className="text-foreground cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(persona)}
                          className="text-foreground cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(persona)}
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

      {/* Stats by Role */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
        {Object.entries(rolesConfig).map(([key, config]) => {
          const count = personal.filter((p) => p.rol === key && p.activo).length;
          return (
            <div key={key} className="card-industrial p-3 text-center">
              <p className="text-xl font-bold text-foreground">{count}</p>
              <Badge className={cn("status-badge text-[10px] mt-1", config.color)}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Personal" : "Nuevo Personal"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol *</Label>
              <Select
                value={formData.rol}
                onValueChange={(value) => setFormData({ ...formData, rol: value as RolPersonal })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(rolesConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_ingreso">Fecha de Ingreso *</Label>
              <Input
                id="fecha_ingreso"
                type="date"
                value={formData.fecha_ingreso}
                onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licencia">Tipo de Licencia</Label>
              <Input
                id="licencia"
                value={formData.licencia}
                onChange={(e) => setFormData({ ...formData, licencia: e.target.value })}
                placeholder="Ej: B2, E1"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vencimiento_licencia">Vencimiento Licencia</Label>
              <Input
                id="vencimiento_licencia"
                type="date"
                value={formData.vencimiento_licencia}
                onChange={(e) => setFormData({ ...formData, vencimiento_licencia: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <Label htmlFor="activo">Empleado Activo</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Personal"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedPersona ? `${selectedPersona.nombre} ${selectedPersona.apellido}` : ""}
      >
        {selectedPersona && (
          <div className="space-y-4">
            <DetailSection title="Información Personal">
              <DetailRow label="Nombre Completo" value={`${selectedPersona.nombre} ${selectedPersona.apellido}`} />
              <DetailRow label="DNI" value={selectedPersona.dni} />
              <DetailRow
                label="Rol"
                value={
                  <Badge className={cn("status-badge", rolesConfig[selectedPersona.rol]?.color)}>
                    {rolesConfig[selectedPersona.rol]?.label}
                  </Badge>
                }
              />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", selectedPersona.activo ? "status-active" : "status-inactive")}>
                    {selectedPersona.activo ? "Activo" : "Inactivo"}
                  </Badge>
                }
              />
            </DetailSection>
            <DetailSection title="Contacto">
              <DetailRow label="Teléfono" value={selectedPersona.telefono} />
              <DetailRow label="Email" value={selectedPersona.email || "-"} />
            </DetailSection>
            <DetailSection title="Empleo">
              <DetailRow label="Fecha de Ingreso" value={selectedPersona.fecha_ingreso} />
              <DetailRow label="Licencia" value={selectedPersona.licencia || "-"} />
              <DetailRow label="Vencimiento Licencia" value={selectedPersona.vencimiento_licencia || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Personal"
        description={`¿Estás seguro de que deseas eliminar a "${selectedPersona?.nombre} ${selectedPersona?.apellido}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
