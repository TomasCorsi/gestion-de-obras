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
  Clock,
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
import { CargaCombustible } from "@/types";
import { combustibleData as initialData, maquinariasData, personalData } from "@/data/mockData";
import { toast } from "sonner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Combustible() {
  const [cargas, setCargas] = useState<CargaCombustible[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCarga, setSelectedCarga] = useState<CargaCombustible | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const operadores = personalData.filter(p => (p.rol === "maquinista" || p.rol === "chofer") && p.activo);

  const [formData, setFormData] = useState<Partial<CargaCombustible>>({
    fecha: new Date().toISOString().split("T")[0],
    maquinariaId: "",
    maquinaria: "",
    litros: 0,
    precioLitro: 950,
    costoTotal: 0,
    horasMaquina: 0,
    estacion: "",
    operador: "",
    comprobante: "",
  });

  const filteredCargas = cargas.filter((c) =>
    c.maquinaria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.operador.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.estacion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      maquinariaId: "",
      maquinaria: "",
      litros: 0,
      precioLitro: 950,
      costoTotal: 0,
      horasMaquina: 0,
      estacion: "",
      operador: "",
      comprobante: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (carga: CargaCombustible) => {
    setIsEditing(true);
    setSelectedCarga(carga);
    setFormData(carga);
    setFormOpen(true);
  };

  const handleView = (carga: CargaCombustible) => {
    setSelectedCarga(carga);
    setDetailOpen(true);
  };

  const handleDelete = (carga: CargaCombustible) => {
    setSelectedCarga(carga);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCarga) {
      setCargas(cargas.filter((c) => c.id !== selectedCarga.id));
      toast.success("Registro eliminado correctamente");
    }
    setDeleteOpen(false);
  };

  const calculateTotal = (litros: number, precio: number) => litros * precio;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMaq = maquinariasData.find(m => m.id === formData.maquinariaId);
    const cargaData = {
      ...formData,
      maquinaria: selectedMaq?.nombre || "",
      costoTotal: calculateTotal(formData.litros || 0, formData.precioLitro || 0),
    };

    if (isEditing && selectedCarga) {
      setCargas(cargas.map((c) => c.id === selectedCarga.id ? { ...c, ...cargaData } : c));
      toast.success("Registro actualizado correctamente");
    } else {
      const newCarga: CargaCombustible = {
        ...cargaData,
        id: Date.now().toString(),
      } as CargaCombustible;
      setCargas([...cargas, newCarga]);
      toast.success("Carga registrada correctamente");
    }
    setFormOpen(false);
  };

  const totalLitros = cargas.reduce((sum, c) => sum + c.litros, 0);
  const totalCosto = cargas.reduce((sum, c) => sum + c.costoTotal, 0);

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
              <TableHead className="text-muted-foreground font-medium">Maquinaria</TableHead>
              <TableHead className="text-muted-foreground font-medium">Operador</TableHead>
              <TableHead className="text-muted-foreground font-medium">Litros</TableHead>
              <TableHead className="text-muted-foreground font-medium">Precio/L</TableHead>
              <TableHead className="text-muted-foreground font-medium">Total</TableHead>
              <TableHead className="text-muted-foreground font-medium">Horas Maq.</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estación</TableHead>
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
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{carga.maquinaria}</span>
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
                <TableCell className="font-mono text-muted-foreground">
                  {formatCurrency(carga.precioLitro)}
                </TableCell>
                <TableCell className="font-mono font-medium text-foreground">
                  {formatCurrency(carga.costoTotal)}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 font-mono text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {carga.horasMaquina.toLocaleString()} h
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{carga.estacion}</TableCell>
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
              <Label htmlFor="maquinariaId">Maquinaria *</Label>
              <Select
                value={formData.maquinariaId}
                onValueChange={(value) => setFormData({ ...formData, maquinariaId: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar maquinaria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {maquinariasData.map((m) => (
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
                    costoTotal: calculateTotal(litros, formData.precioLitro || 0),
                  });
                }}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precioLitro">Precio/Litro *</Label>
              <Input
                id="precioLitro"
                type="number"
                value={formData.precioLitro}
                onChange={(e) => {
                  const precio = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    precioLitro: precio,
                    costoTotal: calculateTotal(formData.litros || 0, precio),
                  });
                }}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costoTotal">Costo Total</Label>
              <Input
                id="costoTotal"
                value={formatCurrency(formData.costoTotal || 0)}
                className="bg-muted border-border font-mono"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horasMaquina">Horas Máquina *</Label>
              <Input
                id="horasMaquina"
                type="number"
                value={formData.horasMaquina}
                onChange={(e) => setFormData({ ...formData, horasMaquina: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante">Nº Comprobante</Label>
              <Input
                id="comprobante"
                value={formData.comprobante}
                onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {isEditing ? "Guardar Cambios" : "Registrar Carga"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={`Carga - ${selectedCarga?.fecha}`}
      >
        {selectedCarga && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Fecha" value={selectedCarga.fecha} />
              <DetailRow label="Maquinaria" value={selectedCarga.maquinaria} />
              <DetailRow label="Operador" value={selectedCarga.operador} />
              <DetailRow label="Horas Máquina" value={`${selectedCarga.horasMaquina.toLocaleString()} h`} />
            </DetailSection>
            <DetailSection title="Carga">
              <DetailRow label="Litros" value={`${selectedCarga.litros} L`} />
              <DetailRow label="Precio/Litro" value={formatCurrency(selectedCarga.precioLitro)} />
              <DetailRow label="Costo Total" value={<span className="font-bold text-primary">{formatCurrency(selectedCarga.costoTotal)}</span>} />
            </DetailSection>
            <DetailSection title="Estación">
              <DetailRow label="Estación" value={selectedCarga.estacion} />
              <DetailRow label="Comprobante" value={selectedCarga.comprobante || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        description={`Se eliminará el registro de carga del ${selectedCarga?.fecha}.`}
      />
    </MainLayout>
  );
}
