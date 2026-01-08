import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Search,
  Receipt,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Package,
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
import { Remito } from "@/types";
import { remitosData as initialData, viajesData, obrasData, clientesData } from "@/data/mockData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Remitos() {
  const [remitos, setRemitos] = useState<Remito[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRemito, setSelectedRemito] = useState<Remito | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<Remito>>({
    numero: "",
    viajeId: "",
    fecha: new Date().toISOString().split("T")[0],
    cliente: "",
    obra: "",
    material: "",
    cantidad: 0,
    unidad: "m³",
    recibidoPor: "",
    firmado: false,
    observaciones: "",
  });

  const filteredRemitos = remitos.filter((r) =>
    r.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.obra.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateNumero = () => {
    const year = new Date().getFullYear();
    const count = remitos.length + 1;
    return `REM-${year}-${count.toString().padStart(4, "0")}`;
  };

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      numero: generateNumero(),
      viajeId: "",
      fecha: new Date().toISOString().split("T")[0],
      cliente: "",
      obra: "",
      material: "Tosca",
      cantidad: 18,
      unidad: "m³",
      recibidoPor: "",
      firmado: false,
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (remito: Remito) => {
    setIsEditing(true);
    setSelectedRemito(remito);
    setFormData(remito);
    setFormOpen(true);
  };

  const handleView = (remito: Remito) => {
    setSelectedRemito(remito);
    setDetailOpen(true);
  };

  const handleDelete = (remito: Remito) => {
    setSelectedRemito(remito);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRemito) {
      setRemitos(remitos.filter((r) => r.id !== selectedRemito.id));
      toast.success("Remito eliminado correctamente");
    }
    setDeleteOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedRemito) {
      setRemitos(remitos.map((r) => r.id === selectedRemito.id ? { ...r, ...formData } : r));
      toast.success("Remito actualizado correctamente");
    } else {
      const newRemito: Remito = {
        ...formData,
        id: Date.now().toString(),
      } as Remito;
      setRemitos([...remitos, newRemito]);
      toast.success("Remito creado correctamente");
    }
    setFormOpen(false);
  };

  const toggleFirmado = (remito: Remito) => {
    setRemitos(remitos.map((r) =>
      r.id === remito.id ? { ...r, firmado: !r.firmado } : r
    ));
    toast.success(remito.firmado ? "Remito desmarcado" : "Remito marcado como firmado");
  };

  return (
    <MainLayout title="Remitos" subtitle="Gestión de remitos y entregas">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente u obra..."
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
          Nuevo Remito
        </Button>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Número</TableHead>
              <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
              <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium">Material</TableHead>
              <TableHead className="text-muted-foreground font-medium">Cantidad</TableHead>
              <TableHead className="text-muted-foreground font-medium">Recibió</TableHead>
              <TableHead className="text-muted-foreground font-medium">Firmado</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRemitos.map((remito, index) => (
              <TableRow
                key={remito.id}
                className="border-border table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell>
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-mono text-primary">{remito.numero}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {remito.fecha}
                  </span>
                </TableCell>
                <TableCell className="text-foreground">{remito.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{remito.obra}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Package className="w-3 h-3" />
                    {remito.material}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-foreground">
                  {remito.cantidad} {remito.unidad}
                </TableCell>
                <TableCell>
                  {remito.recibidoPor ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="w-3 h-3" />
                      {remito.recibidoPor}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFirmado(remito)}
                    className="p-0 h-auto"
                  >
                    {remito.firmado ? (
                      <Badge className="status-badge status-active cursor-pointer">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Firmado
                      </Badge>
                    ) : (
                      <Badge className="status-badge status-pending cursor-pointer">
                        <XCircle className="w-3 h-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => handleView(remito)} className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(remito)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(remito)} className="text-destructive cursor-pointer">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{remitos.length}</p>
            <p className="text-sm text-muted-foreground">Total Remitos</p>
          </div>
          <Receipt className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {remitos.filter((r) => r.firmado).length}
            </p>
            <p className="text-sm text-muted-foreground">Firmados</p>
          </div>
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {remitos.filter((r) => !r.firmado).length}
            </p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </div>
          <XCircle className="w-8 h-8 text-warning" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {remitos.reduce((sum, r) => sum + r.cantidad, 0)} m³
            </p>
            <p className="text-sm text-muted-foreground">Volumen Total</p>
          </div>
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Remito" : "Nuevo Remito"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="cliente">Cliente *</Label>
              <Select
                value={formData.cliente}
                onValueChange={(value) => setFormData({ ...formData, cliente: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {clientesData.map((c) => (
                    <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra">Obra *</Label>
              <Select
                value={formData.obra}
                onValueChange={(value) => setFormData({ ...formData, obra: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {obrasData.map((o) => (
                    <SelectItem key={o.id} value={o.nombre}>{o.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Input
                id="material"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <div className="flex gap-2">
                <Input
                  id="cantidad"
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })}
                  className="bg-muted border-border"
                  required
                />
                <Select
                  value={formData.unidad}
                  onValueChange={(value) => setFormData({ ...formData, unidad: value })}
                >
                  <SelectTrigger className="w-24 bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="m³">m³</SelectItem>
                    <SelectItem value="tn">tn</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recibidoPor">Recibido Por</Label>
              <Input
                id="recibidoPor"
                value={formData.recibidoPor}
                onChange={(e) => setFormData({ ...formData, recibidoPor: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="firmado"
                checked={formData.firmado}
                onCheckedChange={(checked) => setFormData({ ...formData, firmado: checked })}
              />
              <Label htmlFor="firmado">Remito Firmado</Label>
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
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {isEditing ? "Guardar Cambios" : "Crear Remito"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={`Remito ${selectedRemito?.numero}`}
      >
        {selectedRemito && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Número" value={<span className="font-mono text-primary">{selectedRemito.numero}</span>} />
              <DetailRow label="Fecha" value={selectedRemito.fecha} />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", selectedRemito.firmado ? "status-active" : "status-pending")}>
                    {selectedRemito.firmado ? "Firmado" : "Pendiente"}
                  </Badge>
                }
              />
            </DetailSection>
            <DetailSection title="Destino">
              <DetailRow label="Cliente" value={selectedRemito.cliente} />
              <DetailRow label="Obra" value={selectedRemito.obra} />
              <DetailRow label="Recibido Por" value={selectedRemito.recibidoPor || "-"} />
            </DetailSection>
            <DetailSection title="Carga">
              <DetailRow label="Material" value={selectedRemito.material} />
              <DetailRow label="Cantidad" value={`${selectedRemito.cantidad} ${selectedRemito.unidad}`} />
            </DetailSection>
            {selectedRemito.observaciones && (
              <DetailSection title="Observaciones">
                <p className="text-sm text-muted-foreground">{selectedRemito.observaciones}</p>
              </DetailSection>
            )}
          </div>
        )}
      </DetailDialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        description={`Se eliminará el remito "${selectedRemito?.numero}".`}
      />
    </MainLayout>
  );
}
