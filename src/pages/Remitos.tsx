import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  Loader2,
  TableIcon,
  Grid3X3,
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
import { useRemitos, RemitoWithRelations, RemitoForm } from "@/hooks/useRemitos";
import { useObras } from "@/hooks/useObras";
import { useViajes } from "@/hooks/useViajes";
import { RemitosDataGrid } from "@/components/remitos/RemitosDataGrid";
import { toast } from "sonner";

export default function Remitos() {
  const { remitos, loading, createRemito, updateRemito, deleteRemito } = useRemitos();
  const { obras } = useObras();
  const { viajes } = useViajes();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRemito, setSelectedRemito] = useState<RemitoWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<RemitoForm>({
    numero: "",
    viaje_id: "",
    fecha: new Date().toISOString().split("T")[0],
    obra_id: "",
    material: "",
    cantidad: 0,
    unidad: "m³",
    recibido_por: "",
    firmado: false,
    observaciones: "",
  });

  const filteredRemitos = useMemo(() => {
    // Apply date and obra filters first
    const dateFiltered = filterByDateAndObra(
      remitos.map(r => ({ ...r, fecha: r.fecha, obra_id: r.obra_id })),
      filters
    );
    
    // Then apply search filter
    return dateFiltered.filter((r) =>
      r.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.obra?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [remitos, filters, searchTerm]);

  const generateNumero = () => {
    const year = new Date().getFullYear();
    const count = remitos.length + 1;
    return `REM-${year}-${count.toString().padStart(4, "0")}`;
  };

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      numero: generateNumero(),
      viaje_id: "",
      fecha: new Date().toISOString().split("T")[0],
      obra_id: "",
      material: "Tosca",
      cantidad: 18,
      unidad: "m³",
      recibido_por: "",
      firmado: false,
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (remito: RemitoWithRelations) => {
    setIsEditing(true);
    setSelectedRemito(remito);
    setFormData({
      numero: remito.numero,
      viaje_id: remito.viaje_id || "",
      fecha: remito.fecha,
      obra_id: remito.obra_id,
      material: remito.material,
      cantidad: remito.cantidad,
      unidad: remito.unidad,
      recibido_por: remito.recibido_por,
      firmado: remito.firmado,
      observaciones: remito.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleView = (remito: RemitoWithRelations) => {
    setSelectedRemito(remito);
    setDetailOpen(true);
  };

  const handleDelete = (remito: RemitoWithRelations) => {
    setSelectedRemito(remito);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedRemito) {
      await deleteRemito(selectedRemito.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const dataToSend = {
      ...formData,
      viaje_id: formData.viaje_id || undefined,
    };
    
    if (isEditing && selectedRemito) {
      await updateRemito(selectedRemito.id, dataToSend);
    } else {
      await createRemito(dataToSend);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const toggleFirmado = async (remito: RemitoWithRelations) => {
    await updateRemito(remito.id, { firmado: !remito.firmado });
  };

  const handleGridSave = async (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
    deleted: string[];
  }) => {
    let success = true;
    
    // Create new remitos
    for (const remito of changes.created) {
      const result = await createRemito(remito);
      if (!result) success = false;
    }
    
    // Update existing remitos
    for (const { id, data } of changes.updated) {
      const result = await updateRemito(id, data);
      if (!result) success = false;
    }
    
    // Delete remitos
    for (const id of changes.deleted) {
      const result = await deleteRemito(id);
      if (!result) success = false;
    }
    
    if (success && (changes.created.length || changes.updated.length || changes.deleted.length)) {
      toast.success(`Guardados: ${changes.created.length} nuevos, ${changes.updated.length} actualizados, ${changes.deleted.length} eliminados`);
    }
  };

  const activeObras = obras.filter(o => o.estado !== "finalizada");

  if (loading) {
    return (
      <MainLayout title="Remitos" subtitle="Gestión de remitos y entregas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Remitos" subtitle="Gestión de remitos y entregas">
      {/* Filter Bar */}
      <div className="mb-4">
        <FilterBar obras={obras} onFilterChange={setFilters} />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número u obra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
            disabled={viewMode === "grid"}
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "table" | "grid")}
          className="border border-border rounded-md"
        >
          <ToggleGroupItem value="table" aria-label="Vista tabla" className="px-3">
            <TableIcon className="w-4 h-4 mr-2" />
            Tabla
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Vista grilla" className="px-3">
            <Grid3X3 className="w-4 h-4 mr-2" />
            Grilla
          </ToggleGroupItem>
        </ToggleGroup>
        {viewMode === "table" && (
          <Button
            onClick={handleNew}
            className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Remito
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      {/* Content based on view mode */}
      {viewMode === "grid" ? (
        <RemitosDataGrid
          remitos={filteredRemitos}
          obras={obras}
          onSave={handleGridSave}
          generateNumero={generateNumero}
        />
      ) : (
        <div className="card-industrial overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Número</TableHead>
                <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
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
                  <TableCell className="text-foreground">{remito.obra?.nombre || "-"}</TableCell>
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
                    {remito.recibido_por ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-3 h-3" />
                        {remito.recibido_por}
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
      )}

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
              <Label htmlFor="obra_id">Obra *</Label>
              <Select
                value={formData.obra_id}
                onValueChange={(value) => setFormData({ ...formData, obra_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {activeObras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="viaje_id">Viaje (opcional)</Label>
              <Select
                value={formData.viaje_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, viaje_id: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Vincular a viaje" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {viajes.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.fecha} - {v.origen} → {v.destino}
                    </SelectItem>
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
              <Label htmlFor="recibido_por">Recibido por *</Label>
              <Input
                id="recibido_por"
                value={formData.recibido_por}
                onChange={(e) => setFormData({ ...formData, recibido_por: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2 flex items-center pt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="firmado"
                  checked={formData.firmado}
                  onCheckedChange={(checked) => setFormData({ ...formData, firmado: checked })}
                />
                <Label htmlFor="firmado">Firmado</Label>
              </div>
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
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Remito"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Remito"
      >
        {selectedRemito && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Número" value={selectedRemito.numero} />
              <DetailRow label="Fecha" value={selectedRemito.fecha} />
              <DetailRow label="Obra" value={selectedRemito.obra?.nombre || "-"} />
            </DetailSection>
            <DetailSection title="Entrega">
              <DetailRow label="Material" value={selectedRemito.material} />
              <DetailRow label="Cantidad" value={`${selectedRemito.cantidad} ${selectedRemito.unidad}`} />
              <DetailRow label="Recibido por" value={selectedRemito.recibido_por} />
              <DetailRow label="Firmado" value={selectedRemito.firmado ? "Sí" : "No"} />
            </DetailSection>
            {selectedRemito.viaje && (
              <DetailSection title="Viaje Vinculado">
                <DetailRow label="Ruta" value={`${selectedRemito.viaje.origen} → ${selectedRemito.viaje.destino}`} />
              </DetailSection>
            )}
            {selectedRemito.observaciones && (
              <DetailSection title="Observaciones">
                <p className="text-sm text-muted-foreground">{selectedRemito.observaciones}</p>
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
        title="Eliminar Remito"
        description={`¿Estás seguro de que deseas eliminar el remito "${selectedRemito?.numero}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
