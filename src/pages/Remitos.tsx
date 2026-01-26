import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Plus,
  Search,
  Receipt,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileText,
  Package,
  Loader2,
  TableIcon,
  Grid3X3,
  Truck,
  DollarSign,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { FilterBar, FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { useRemitos, RemitoWithRelations, RemitoForm } from "@/hooks/useRemitos";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { RemitosDataGrid } from "@/components/remitos/RemitosDataGrid";
import { RemitosCSVImportDialog } from "@/components/remitos/CSVImportDialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Options for selectors
const unidadOptions = ["TN", "KG", "M3", "M2", "U"];
const tipoMaterialOptions = [
  "Residuos", "Desmonte", "Cascote", "Escombro", "Tierra", "Piedra",
  "Movimiento interno", "Tosca", "Cemento", "Hormigon", "Traslado", "Cubiertas", "Frezado"
];
const tipoTransporteOptions = [
  "Calamina Sur", "Geo hermanos", "Diaz Neiva", "japones", "Cato", "Tatu", "Patan"
];

export default function Remitos() {
  const { remitos, loading, createRemito, updateRemito, deleteRemito, batchSave } = useRemitos();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRemito, setSelectedRemito] = useState<RemitoWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Maps for import dialog
  const maquinariasMap = useMemo(() => {
    const map: Record<string, string> = {};
    maquinarias.forEach(m => {
      if (m.codigo) map[m.codigo] = m.id;
    });
    return map;
  }, [maquinarias]);

  const patentesMap = useMemo(() => {
    const map: Record<string, string> = {};
    maquinarias.forEach(m => {
      if (m.patente) {
        const normalized = m.patente.toUpperCase().replace(/[-\s]/g, '');
        map[m.patente.toUpperCase()] = m.id;
        map[normalized] = m.id;
      }
    });
    return map;
  }, [maquinarias]);

  const [formData, setFormData] = useState<RemitoForm>({
    numero: "",
    fecha: new Date().toISOString().split("T")[0],
    obra_id: "",
    material: "",
    cantidad: 0,
    unidad: "M3",
    recibido_por: "",
    firmado: false,
    remito_tercero: "",
    remito_local: "",
    desde: "",
    hasta: "",
    cantidad_viajes: 1,
    tipo_material: "",
    precio_total: 0,
    tipo_transporte: "",
    maquinaria_id: "",
  });

  const filteredRemitos = useMemo(() => {
    const dateFiltered = filterByDateAndObra(
      remitos.map(r => ({ ...r, fecha: r.fecha, obra_id: r.obra_id })),
      filters
    );
    
    return dateFiltered.filter((r) =>
      (r.remito_tercero?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.remito_local?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      r.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tipo_material?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.tipo_transporte?.toLowerCase() || "").includes(searchTerm.toLowerCase())
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
      fecha: new Date().toISOString().split("T")[0],
      obra_id: "",
      material: "Tosca",
      cantidad: 18,
      unidad: "M3",
      recibido_por: "",
      firmado: false,
      remito_tercero: "",
      remito_local: generateNumero(),
      desde: "",
      hasta: "",
      cantidad_viajes: 1,
      tipo_material: "Tosca",
      precio_total: 0,
      tipo_transporte: "",
      maquinaria_id: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (remito: RemitoWithRelations) => {
    setIsEditing(true);
    setSelectedRemito(remito);
    setFormData({
      numero: remito.numero,
      fecha: remito.fecha,
      obra_id: remito.obra_id,
      material: remito.material,
      cantidad: remito.cantidad,
      unidad: remito.unidad,
      recibido_por: remito.recibido_por,
      firmado: remito.firmado,
      remito_tercero: remito.remito_tercero || "",
      remito_local: remito.remito_local || remito.numero,
      desde: remito.desde || "",
      hasta: remito.hasta || "",
      cantidad_viajes: remito.cantidad_viajes || 1,
      tipo_material: remito.tipo_material || remito.material,
      precio_total: remito.precio_total || 0,
      tipo_transporte: remito.tipo_transporte || "",
      maquinaria_id: remito.maquinaria_id || "",
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
      material: formData.tipo_material || formData.material,
      maquinaria_id: formData.maquinaria_id || undefined,
    };
    
    if (isEditing && selectedRemito) {
      await updateRemito(selectedRemito.id, dataToSend);
    } else {
      await createRemito(dataToSend);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const handleGridSave = async (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
    deleted: string[];
  }) => {
    try {
      const results = await batchSave(changes);
      
      if (results.errors === 0) {
        toast.success(`Guardados: ${results.created} nuevos, ${results.updated} actualizados, ${results.deleted} eliminados`);
      } else {
        toast.warning(`Guardados con ${results.errors} errores: ${results.created} nuevos, ${results.updated} actualizados, ${results.deleted} eliminados`);
      }
    } catch (error) {
      console.error("Error saving grid changes:", error);
      toast.error("Error al guardar los cambios");
    }
  };

  // Stats calculations
  const totalRemitos = remitos.length;
  const totalViajes = remitos.reduce((sum, r) => sum + (r.cantidad_viajes || 1), 0);
  const totalCantidad = remitos.reduce((sum, r) => sum + r.cantidad, 0);
  const totalPrecio = remitos.reduce((sum, r) => sum + (r.precio_total || 0), 0);

  // Maquinarias with patente for selectors
  const maquinariasConPatente = maquinarias.filter((m) => m.patente);

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
            placeholder="Buscar por remito, tipo o transporte..."
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
        <Button
          variant="outline"
          onClick={() => setImportOpen(true)}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Importar
        </Button>
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
            <p className="text-2xl font-bold text-foreground">{totalRemitos}</p>
            <p className="text-sm text-muted-foreground">Total Remitos</p>
          </div>
          <Receipt className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalViajes}</p>
            <p className="text-sm text-muted-foreground">Total Viajes</p>
          </div>
          <Truck className="w-8 h-8 text-success" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {totalCantidad.toLocaleString("es-AR")}
            </p>
            <p className="text-sm text-muted-foreground">Cantidad Total</p>
          </div>
          <Package className="w-8 h-8 text-warning" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              ${totalPrecio.toLocaleString("es-AR")}
            </p>
            <p className="text-sm text-muted-foreground">Precio Total</p>
          </div>
          <DollarSign className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "grid" ? (
        <RemitosDataGrid
          remitos={filteredRemitos}
          maquinarias={maquinarias}
          onSave={handleGridSave}
          generateNumero={generateNumero}
        />
      ) : (
        <div className="card-industrial overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Rem. Tercero</TableHead>
                <TableHead className="text-muted-foreground font-medium">Rem. Local</TableHead>
                <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
                <TableHead className="text-muted-foreground font-medium">Desde</TableHead>
                <TableHead className="text-muted-foreground font-medium">Hasta</TableHead>
                <TableHead className="text-muted-foreground font-medium">Viajes</TableHead>
                <TableHead className="text-muted-foreground font-medium">Cant.</TableHead>
                <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
                <TableHead className="text-muted-foreground font-medium">Precio</TableHead>
                <TableHead className="text-muted-foreground font-medium">Transporte</TableHead>
                <TableHead className="text-muted-foreground font-medium">Patente</TableHead>
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
                  <TableCell className="font-mono text-muted-foreground">
                    {remito.remito_tercero || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-mono text-primary">{remito.remito_local || remito.numero}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{remito.fecha}</TableCell>
                  <TableCell className="text-foreground">{remito.desde || "-"}</TableCell>
                  <TableCell className="text-foreground">{remito.hasta || "-"}</TableCell>
                  <TableCell className="font-mono text-foreground">{remito.cantidad_viajes || 1}</TableCell>
                  <TableCell className="font-mono text-foreground">
                    {remito.cantidad} {remito.unidad}
                  </TableCell>
                  <TableCell className="text-foreground">{remito.tipo_material || remito.material}</TableCell>
                  <TableCell className="font-mono text-foreground">
                    ${(remito.precio_total || 0).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-foreground">{remito.tipo_transporte || "-"}</TableCell>
                  <TableCell className="font-mono text-foreground">
                    {remito.maquinaria?.patente || "-"}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="remito_tercero">Remito Tercero</Label>
              <Input
                id="remito_tercero"
                value={formData.remito_tercero}
                onChange={(e) => setFormData({ ...formData, remito_tercero: e.target.value })}
                className="bg-muted border-border"
                placeholder="Número externo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remito_local">Remito Local *</Label>
              <Input
                id="remito_local"
                value={formData.remito_local}
                onChange={(e) => setFormData({ ...formData, remito_local: e.target.value, numero: e.target.value })}
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
              <Label htmlFor="desde">Desde</Label>
              <Input
                id="desde"
                value={formData.desde}
                onChange={(e) => setFormData({ ...formData, desde: e.target.value })}
                className="bg-muted border-border"
                placeholder="Origen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hasta">Hasta</Label>
              <Input
                id="hasta"
                value={formData.hasta}
                onChange={(e) => setFormData({ ...formData, hasta: e.target.value })}
                className="bg-muted border-border"
                placeholder="Destino"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad_viajes">Cantidad de Viajes</Label>
              <Input
                id="cantidad_viajes"
                type="number"
                value={formData.cantidad_viajes}
                onChange={(e) => setFormData({ ...formData, cantidad_viajes: parseInt(e.target.value) || 1 })}
                className="bg-muted border-border"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad *</Label>
              <Select
                value={formData.unidad}
                onValueChange={(value) => setFormData({ ...formData, unidad: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {unidadOptions.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_material">Tipo (Material) *</Label>
              <Select
                value={formData.tipo_material}
                onValueChange={(value) => setFormData({ ...formData, tipo_material: value, material: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {tipoMaterialOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_total">Precio Total</Label>
              <Input
                id="precio_total"
                type="number"
                value={formData.precio_total}
                onChange={(e) => setFormData({ ...formData, precio_total: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_transporte">Tipo Transporte</Label>
              <Select
                value={formData.tipo_transporte || "none"}
                onValueChange={(value) => setFormData({ ...formData, tipo_transporte: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {tipoTransporteOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maquinaria_id">Patente</Label>
              <Select
                value={formData.maquinaria_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, maquinaria_id: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {maquinariasConPatente.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.codigo} - {m.patente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <DetailRow label="Remito Tercero" value={selectedRemito.remito_tercero || "-"} />
              <DetailRow label="Remito Local" value={selectedRemito.remito_local || selectedRemito.numero} />
              <DetailRow label="Fecha" value={selectedRemito.fecha} />
            </DetailSection>
            <DetailSection title="Ruta">
              <DetailRow label="Desde" value={selectedRemito.desde || "-"} />
              <DetailRow label="Hasta" value={selectedRemito.hasta || "-"} />
              <DetailRow label="Cantidad de Viajes" value={String(selectedRemito.cantidad_viajes || 1)} />
            </DetailSection>
            <DetailSection title="Carga">
              <DetailRow label="Tipo Material" value={selectedRemito.tipo_material || selectedRemito.material} />
              <DetailRow label="Cantidad" value={`${selectedRemito.cantidad} ${selectedRemito.unidad}`} />
              <DetailRow label="Precio Total" value={`$${(selectedRemito.precio_total || 0).toLocaleString("es-AR")}`} />
            </DetailSection>
            <DetailSection title="Transporte">
              <DetailRow label="Tipo Transporte" value={selectedRemito.tipo_transporte || "-"} />
              <DetailRow label="Patente" value={selectedRemito.maquinaria?.patente || "-"} />
              <DetailRow label="Código Maquinaria" value={selectedRemito.maquinaria?.codigo || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Remito"
        description={`¿Estás seguro de que deseas eliminar el remito "${selectedRemito?.remito_local || selectedRemito?.numero}"? Esta acción no se puede deshacer.`}
      />

      {/* CSV Import Dialog */}
      <RemitosCSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (remitosToImport) => {
          const results = await batchSave({ created: remitosToImport, updated: [], deleted: [] });
          if (results.errors > 0) {
            throw new Error(`${results.errors} errores durante la importación`);
          }
        }}
        maquinariasMap={maquinariasMap}
        patentesMap={patentesMap}
      />
    </MainLayout>
  );
}
