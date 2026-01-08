import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Building,
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
import { Cliente } from "@/types";
import { clientesData as initialData } from "@/data/mockData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<Cliente>>({
    nombre: "",
    razonSocial: "",
    cuit: "",
    email: "",
    telefono: "",
    direccion: "",
    localidad: "",
    provincia: "",
    contactoPrincipal: "",
    notas: "",
    activo: true,
  });

  const filteredClientes = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cuit.includes(searchTerm) ||
      c.contactoPrincipal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      nombre: "",
      razonSocial: "",
      cuit: "",
      email: "",
      telefono: "",
      direccion: "",
      localidad: "",
      provincia: "",
      contactoPrincipal: "",
      notas: "",
      activo: true,
    });
    setFormOpen(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setIsEditing(true);
    setSelectedCliente(cliente);
    setFormData(cliente);
    setFormOpen(true);
  };

  const handleView = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDetailOpen(true);
  };

  const handleDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCliente) {
      setClientes(clientes.filter((c) => c.id !== selectedCliente.id));
      toast.success("Cliente eliminado correctamente");
    }
    setDeleteOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedCliente) {
      setClientes(
        clientes.map((c) =>
          c.id === selectedCliente.id ? { ...c, ...formData } : c
        )
      );
      toast.success("Cliente actualizado correctamente");
    } else {
      const newCliente: Cliente = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString().split("T")[0],
      } as Cliente;
      setClientes([...clientes, newCliente]);
      toast.success("Cliente creado correctamente");
    }
    setFormOpen(false);
  };

  return (
    <MainLayout title="Clientes" subtitle="Gestión de clientes y contactos">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, CUIT o contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Button
          onClick={handleNew}
          className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-muted-foreground font-medium">CUIT</TableHead>
              <TableHead className="text-muted-foreground font-medium">Contacto</TableHead>
              <TableHead className="text-muted-foreground font-medium">Teléfono</TableHead>
              <TableHead className="text-muted-foreground font-medium">Localidad</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.map((cliente, index) => (
              <TableRow
                key={cliente.id}
                className="border-border table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Building className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{cliente.nombre}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {cliente.cuit}
                </TableCell>
                <TableCell className="text-foreground">{cliente.contactoPrincipal}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {cliente.telefono}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {cliente.localidad}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "status-badge",
                      cliente.activo ? "status-active" : "status-inactive"
                    )}
                  >
                    {cliente.activo ? "Activo" : "Inactivo"}
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
                        onClick={() => handleView(cliente)}
                        className="text-foreground cursor-pointer"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEdit(cliente)}
                        className="text-foreground cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(cliente)}
                        className="text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
            <p className="text-sm text-muted-foreground">Total Clientes</p>
          </div>
          <Users className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clientes.filter((c) => c.activo).length}
            </p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </div>
          <Badge className="status-badge status-active">Activo</Badge>
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clientes.filter((c) => !c.activo).length}
            </p>
            <p className="text-sm text-muted-foreground">Inactivos</p>
          </div>
          <Badge className="status-badge status-inactive">Inactivo</Badge>
        </div>
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Cliente" : "Nuevo Cliente"}
        description={isEditing ? "Modifica los datos del cliente" : "Ingresa los datos del nuevo cliente"}
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
              <Label htmlFor="razonSocial">Razón Social</Label>
              <Input
                id="razonSocial"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT *</Label>
              <Input
                id="cuit"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                placeholder="30-12345678-9"
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactoPrincipal">Contacto Principal *</Label>
              <Input
                id="contactoPrincipal"
                value={formData.contactoPrincipal}
                onChange={(e) => setFormData({ ...formData, contactoPrincipal: e.target.value })}
                className="bg-muted border-border"
                required
              />
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
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localidad">Localidad *</Label>
              <Input
                id="localidad"
                value={formData.localidad}
                onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provincia">Provincia *</Label>
              <Input
                id="provincia"
                value={formData.provincia}
                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="bg-muted border-border"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <Label htmlFor="activo">Cliente Activo</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {isEditing ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedCliente?.nombre || ""}
      >
        {selectedCliente && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Nombre" value={selectedCliente.nombre} />
              <DetailRow label="Razón Social" value={selectedCliente.razonSocial || "-"} />
              <DetailRow label="CUIT" value={selectedCliente.cuit} />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", selectedCliente.activo ? "status-active" : "status-inactive")}>
                    {selectedCliente.activo ? "Activo" : "Inactivo"}
                  </Badge>
                }
              />
            </DetailSection>
            <DetailSection title="Contacto">
              <DetailRow label="Contacto Principal" value={selectedCliente.contactoPrincipal} />
              <DetailRow
                label="Email"
                value={
                  selectedCliente.email ? (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedCliente.email}
                    </span>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailRow
                label="Teléfono"
                value={
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedCliente.telefono}
                  </span>
                }
              />
            </DetailSection>
            <DetailSection title="Ubicación">
              <DetailRow label="Dirección" value={selectedCliente.direccion || "-"} />
              <DetailRow label="Localidad" value={selectedCliente.localidad} />
              <DetailRow label="Provincia" value={selectedCliente.provincia} />
            </DetailSection>
            {selectedCliente.notas && (
              <DetailSection title="Notas">
                <p className="text-sm text-muted-foreground">{selectedCliente.notas}</p>
              </DetailSection>
            )}
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        description={`Se eliminará el cliente "${selectedCliente?.nombre}". Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
