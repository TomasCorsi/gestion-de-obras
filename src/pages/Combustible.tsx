import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Fuel,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Truck,
  User,
  DollarSign,
  Droplets,
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
import { useCombustible, CargaCombustibleWithRelations, CargaCombustibleForm } from "@/hooks/useCombustible";
import { useClientes } from "@/hooks/useClientes";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { usePersonal } from "@/hooks/usePersonal";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Combustible() {
  const { cargas, loading, createCarga, updateCarga, deleteCarga } = useCombustible();
  const { clientes } = useClientes();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();
  const { personal } = usePersonal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCarga, setSelectedCarga] = useState<CargaCombustibleWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const operadores = personal.filter(p => (p.rol === "maquinista" || p.rol === "chofer") && p.activo);

  const [formData, setFormData] = useState<CargaCombustibleForm>({
    fecha: new Date().toISOString().split("T")[0],
    cliente_id: "",
    obra_id: "",
    maquinaria_id: "",
    litros: 0,
    precio_litro: 950,
    costo_total: 0,
    horas_maquina: 0,
    estacion: "",
    operador: "",
    comprobante: "",
  });

  // Filter obras by selected cliente
  const filteredObras = formData.cliente_id 
    ? obras.filter(o => o.cliente_id === formData.cliente_id && o.estado !== "finalizada")
    : obras.filter(o => o.estado !== "finalizada");

  const filteredCargas = cargas.filter((c) =>
    c.maquinaria?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.operador.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.estacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.obra?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      cliente_id: "",
      obra_id: "",
      maquinaria_id: "",
      litros: 0,
      precio_litro: 950,
      costo_total: 0,
      horas_maquina: 0,
      estacion: "",
      operador: "",
      comprobante: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (carga: CargaCombustibleWithRelations) => {
    setIsEditing(true);
    setSelectedCarga(carga);
    setFormData({
      fecha: carga.fecha,
      cliente_id: carga.cliente_id,
      obra_id: carga.obra_id,
      maquinaria_id: carga.maquinaria_id,
      litros: carga.litros,
      precio_litro: carga.precio_litro,
      costo_total: carga.costo_total,
      horas_maquina: carga.horas_maquina,
      estacion: carga.estacion,
      operador: carga.operador,
      comprobante: carga.comprobante || "",
    });
    setFormOpen(true);
  };

  const handleView = (carga: CargaCombustibleWithRelations) => {
    setSelectedCarga(carga);
    setDetailOpen(true);
  };

  const handleDelete = (carga: CargaCombustibleWithRelations) => {
    setSelectedCarga(carga);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCarga) {
      await deleteCarga(selectedCarga.id);
    }
    setDeleteOpen(false);
  };

  const calculateTotal = (litros: number, precio: number) => litros * precio;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const cargaData = {
      ...formData,
      costo_total: calculateTotal(formData.litros, formData.precio_litro),
    };

    if (isEditing && selectedCarga) {
      await updateCarga(selectedCarga.id, cargaData);
    } else {
      await createCarga(cargaData);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const totalLitros = cargas.reduce((sum, c) => sum + c.litros, 0);
  const totalCosto = cargas.reduce((sum, c) => sum + c.costo_total, 0);

  if (loading) {
    return (
      <MainLayout title="Combustible" subtitle="Control de cargas de combustible">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Combustible" subtitle="Control de cargas de combustible">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por maquinaria, operador o estación..."
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
          Registrar Carga
        </Button>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
              <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium">Maquinaria</TableHead>
              <TableHead className="text-muted-foreground font-medium">Operador</TableHead>
              <TableHead className="text-muted-foreground font-medium">Litros</TableHead>
              <TableHead className="text-muted-foreground font-medium">Total</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCargas.map((carga, index) => (
              <TableRow
                key={carga.id}
                className="border-border table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell>
                  <span className="flex items-center gap-1 text-foreground">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {carga.fecha}
                  </span>
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {carga.cliente?.nombre || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {carga.obra?.nombre || "-"}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{carga.maquinaria?.nombre || "-"}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <User className="w-3 h-3" />
                    {carga.operador}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 font-mono text-foreground">
                    <Droplets className="w-3 h-3 text-primary" />
                    {carga.litros} L
                  </span>
                </TableCell>
                <TableCell className="font-mono font-medium text-foreground">
                  {formatCurrency(carga.costo_total)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => handleView(carga)} className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(carga)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(carga)} className="text-destructive cursor-pointer">
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
            <p className="text-2xl font-bold text-foreground">{cargas.length}</p>
            <p className="text-sm text-muted-foreground">Cargas Registradas</p>
          </div>
          <Fuel className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalLitros.toLocaleString()} L</p>
            <p className="text-sm text-muted-foreground">Litros Totales</p>
          </div>
          <Droplets className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCosto)}</p>
            <p className="text-sm text-muted-foreground">Gasto Total</p>
          </div>
          <DollarSign className="w-8 h-8 text-warning" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {cargas.length > 0 ? (totalLitros / cargas.length).toFixed(0) : 0} L
            </p>
            <p className="text-sm text-muted-foreground">Promedio/Carga</p>
          </div>
          <Fuel className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Carga" : "Registrar Carga de Combustible"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="cliente_id">Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value, obra_id: "" })}
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
              <Label htmlFor="obra_id">Obra *</Label>
              <Select
                value={formData.obra_id}
                onValueChange={(value) => setFormData({ ...formData, obra_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {filteredObras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nombre} ({o.codigo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maquinaria_id">Maquinaria *</Label>
              <Select
                value={formData.maquinaria_id}
                onValueChange={(value) => setFormData({ ...formData, maquinaria_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar maquinaria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {maquinarias.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre} ({m.codigo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="operador">Operador *</Label>
              <Select
                value={formData.operador}
                onValueChange={(value) => setFormData({ ...formData, operador: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar operador" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {operadores.map((o) => (
                    <SelectItem key={o.id} value={`${o.nombre} ${o.apellido}`}>
                      {o.nombre} {o.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estacion">Estación *</Label>
              <Input
                id="estacion"
                value={formData.estacion}
                onChange={(e) => setFormData({ ...formData, estacion: e.target.value })}
                placeholder="Ej: YPF Trelew"
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="litros">Litros *</Label>
              <Input
                id="litros"
                type="number"
                value={formData.litros}
                onChange={(e) => {
                  const litros = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    litros,
                    costo_total: calculateTotal(litros, formData.precio_litro),
                  });
                }}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_litro">Precio/Litro *</Label>
              <Input
                id="precio_litro"
                type="number"
                value={formData.precio_litro}
                onChange={(e) => {
                  const precio = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    precio_litro: precio,
                    costo_total: calculateTotal(formData.litros, precio),
                  });
                }}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo_total">Costo Total</Label>
              <Input
                id="costo_total"
                value={formatCurrency(formData.costo_total)}
                className="bg-muted border-border font-mono"
                disabled
              />
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
              <Label htmlFor="comprobante">Comprobante</Label>
              <Input
                id="comprobante"
                value={formData.comprobante}
                onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                placeholder="Número de factura o ticket"
                className="bg-muted border-border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Registrar Carga"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Carga"
      >
        {selectedCarga && (
          <>
            <DetailSection title="Información General">
              <DetailRow label="Fecha" value={selectedCarga.fecha} />
              <DetailRow label="Cliente" value={selectedCarga.cliente?.nombre} />
              <DetailRow label="Obra" value={selectedCarga.obra?.nombre} />
              <DetailRow label="Estación" value={selectedCarga.estacion} />
            </DetailSection>
            <DetailSection title="Maquinaria">
              <DetailRow label="Equipo" value={selectedCarga.maquinaria?.nombre} />
              <DetailRow label="Código" value={selectedCarga.maquinaria?.codigo} />
              <DetailRow label="Operador" value={selectedCarga.operador} />
              <DetailRow label="Horas Máquina" value={`${selectedCarga.horas_maquina} h`} />
            </DetailSection>
            <DetailSection title="Combustible">
              <DetailRow label="Litros" value={`${selectedCarga.litros} L`} />
              <DetailRow label="Precio/Litro" value={formatCurrency(selectedCarga.precio_litro)} />
              <DetailRow label="Costo Total" value={formatCurrency(selectedCarga.costo_total)} />
            </DetailSection>
            {selectedCarga.comprobante && (
              <DetailSection title="Comprobante">
                <DetailRow label="Número" value={selectedCarga.comprobante} />
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
        title="Eliminar Registro"
        description={`¿Estás seguro de eliminar este registro de carga? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}
