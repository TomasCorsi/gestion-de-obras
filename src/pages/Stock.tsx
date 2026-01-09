import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DetailRow } from "@/components/shared/DetailRow";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Package, Plus, Search, Eye, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { stockData as initialStock, movimientosStockData as initialMovimientos, obrasData, personalData } from "@/data/mockData";
import { ItemStock, MovimientoStock } from "@/types";
import { toast } from "sonner";

const categoriaLabels: Record<string, string> = {
  material: "Material",
  repuesto: "Repuesto",
  herramienta: "Herramienta",
  consumible: "Consumible",
};

const tipoMovimientoLabels: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
};

export default function Stock() {
  const [items, setItems] = useState<ItemStock[]>(initialStock);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>(initialMovimientos);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [stockBajoFilter, setStockBajoFilter] = useState(false);
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMovFormOpen, setIsMovFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemStock | null>(null);
  const [formData, setFormData] = useState<Partial<ItemStock>>({});
  const [movFormData, setMovFormData] = useState<Partial<MovimientoStock>>({});

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFilter === "all" || item.categoria === categoriaFilter;
    const matchesStockBajo = !stockBajoFilter || item.stockActual < item.stockMinimo;
    return matchesSearch && matchesCategoria && matchesStockBajo;
  });

  // Filtered movements
  const filteredMovimientos = movimientos.filter((mov) =>
    mov.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.motivo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalItems = items.length;
  const itemsBajoStock = items.filter(i => i.stockActual < i.stockMinimo).length;
  const valorInventario = items.reduce((acc, i) => acc + (i.stockActual * i.precioUnitario), 0);

  // Item CRUD
  const handleNewItem = () => {
    setSelectedItem(null);
    setFormData({
      codigo: "",
      nombre: "",
      categoria: "material",
      unidad: "",
      stockActual: 0,
      stockMinimo: 0,
      ubicacion: "",
      precioUnitario: 0,
      activo: true,
    });
    setIsFormOpen(true);
  };

  const handleEditItem = (item: ItemStock) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setIsFormOpen(true);
  };

  const handleViewItem = (item: ItemStock) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleDeleteItem = (item: ItemStock) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleSubmitItem = () => {
    if (selectedItem) {
      setItems(items.map(i => i.id === selectedItem.id ? { ...i, ...formData } as ItemStock : i));
      toast.success("Item actualizado correctamente");
    } else {
      const newItem: ItemStock = {
        ...formData,
        id: String(Date.now()),
      } as ItemStock;
      setItems([...items, newItem]);
      toast.success("Item creado correctamente");
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedItem) {
      setItems(items.filter(i => i.id !== selectedItem.id));
      toast.success("Item eliminado correctamente");
    }
    setIsDeleteOpen(false);
  };

  // Movimiento CRUD
  const handleNewMovimiento = () => {
    setMovFormData({
      fecha: new Date().toISOString().split("T")[0],
      itemId: "",
      item: "",
      tipo: "entrada",
      cantidad: 0,
      obraId: "",
      obra: "",
      motivo: "",
      responsableId: "",
      responsable: "",
    });
    setIsMovFormOpen(true);
  };

  const handleSubmitMovimiento = () => {
    const item = items.find(i => i.id === movFormData.itemId);
    if (!item) return;

    const cantidad = movFormData.cantidad || 0;
    const stockAnterior = item.stockActual;
    let stockNuevo = stockAnterior;

    if (movFormData.tipo === "entrada") {
      stockNuevo = stockAnterior + cantidad;
    } else if (movFormData.tipo === "salida") {
      if (cantidad > stockAnterior) {
        toast.error("Stock insuficiente");
        return;
      }
      stockNuevo = stockAnterior - cantidad;
    } else {
      stockNuevo = cantidad; // ajuste
    }

    const newMov: MovimientoStock = {
      ...movFormData,
      id: String(Date.now()),
      item: item.nombre,
      stockAnterior,
      stockNuevo,
      obra: movFormData.obraId ? obrasData.find(o => o.id === movFormData.obraId)?.nombre : undefined,
      responsable: personalData.find(p => p.id === movFormData.responsableId)?.nombre + " " + personalData.find(p => p.id === movFormData.responsableId)?.apellido || "",
    } as MovimientoStock;

    setMovimientos([newMov, ...movimientos]);
    setItems(items.map(i => i.id === item.id ? { ...i, stockActual: stockNuevo } : i));
    toast.success("Movimiento registrado correctamente");
    setIsMovFormOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-7 h-7 text-primary" />
              Stock e Inventario
            </h1>
            <p className="text-muted-foreground">Gestión de materiales, repuestos y herramientas</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold text-foreground">{totalItems}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Items Bajo Stock</div>
            <div className="text-2xl font-bold text-destructive flex items-center gap-2">
              {itemsBajoStock}
              {itemsBajoStock > 0 && <AlertTriangle className="w-5 h-5" />}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Valor Inventario</div>
            <div className="text-2xl font-bold text-foreground">
              ${valorInventario.toLocaleString("es-AR")}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inventario" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          </TabsList>

          {/* Inventario Tab */}
          <TabsContent value="inventario" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="repuesto">Repuesto</SelectItem>
                    <SelectItem value="herramienta">Herramienta</SelectItem>
                    <SelectItem value="consumible">Consumible</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={stockBajoFilter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStockBajoFilter(!stockBajoFilter)}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Stock Bajo
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleNewMovimiento} variant="outline">
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Registrar Movimiento
                </Button>
                <Button onClick={handleNewItem} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Item
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Precio Unit.</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoriaLabels[item.categoria]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={item.stockActual < item.stockMinimo ? "text-destructive font-semibold" : ""}>
                            {item.stockActual} {item.unidad}
                          </span>
                          {item.stockActual < item.stockMinimo && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.ubicacion}</TableCell>
                      <TableCell>${item.precioUnitario.toLocaleString("es-AR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewItem(item)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Movimientos Tab */}
          <TabsContent value="movimientos" className="space-y-4">
            <div className="flex gap-4 items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar movimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleNewMovimiento} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Movimiento
              </Button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Stock Anterior</TableHead>
                    <TableHead>Stock Nuevo</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Responsable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimientos.map((mov) => (
                    <TableRow key={mov.id} className="border-border">
                      <TableCell>{mov.fecha}</TableCell>
                      <TableCell className="font-medium">{mov.item}</TableCell>
                      <TableCell>
                        <Badge
                          variant={mov.tipo === "entrada" ? "default" : mov.tipo === "salida" ? "destructive" : "secondary"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {mov.tipo === "entrada" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                          {tipoMovimientoLabels[mov.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.cantidad}</TableCell>
                      <TableCell>{mov.stockAnterior}</TableCell>
                      <TableCell>{mov.stockNuevo}</TableCell>
                      <TableCell>{mov.obra || "-"}</TableCell>
                      <TableCell>{mov.responsable}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Item Form Dialog */}
        <FormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title={selectedItem ? "Editar Item" : "Nuevo Item"}
          onSubmit={handleSubmitItem}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.codigo || ""}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="MAT-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.nombre || ""}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del item"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v as ItemStock["categoria"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="repuesto">Repuesto</SelectItem>
                  <SelectItem value="herramienta">Herramienta</SelectItem>
                  <SelectItem value="consumible">Consumible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input
                value={formData.unidad || ""}
                onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                placeholder="m³, unidad, litro..."
              />
            </div>
            <div className="space-y-2">
              <Label>Stock Actual</Label>
              <Input
                type="number"
                value={formData.stockActual || 0}
                onChange={(e) => setFormData({ ...formData, stockActual: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Stock Mínimo</Label>
              <Input
                type="number"
                value={formData.stockMinimo || 0}
                onChange={(e) => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input
                value={formData.ubicacion || ""}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                placeholder="Depósito, Base Central..."
              />
            </div>
            <div className="space-y-2">
              <Label>Precio Unitario</Label>
              <Input
                type="number"
                value={formData.precioUnitario || 0}
                onChange={(e) => setFormData({ ...formData, precioUnitario: Number(e.target.value) })}
              />
            </div>
          </div>
        </FormDialog>

        {/* Movimiento Form Dialog */}
        <FormDialog
          open={isMovFormOpen}
          onOpenChange={setIsMovFormOpen}
          title="Registrar Movimiento"
          onSubmit={handleSubmitMovimiento}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={movFormData.fecha || ""}
                onChange={(e) => setMovFormData({ ...movFormData, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={movFormData.tipo}
                onValueChange={(v) => setMovFormData({ ...movFormData, tipo: v as MovimientoStock["tipo"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Item</Label>
              <Select
                value={movFormData.itemId}
                onValueChange={(v) => setMovFormData({ ...movFormData, itemId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar item" /></SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.codigo} - {item.nombre} (Stock: {item.stockActual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={movFormData.cantidad || 0}
                onChange={(e) => setMovFormData({ ...movFormData, cantidad: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select
                value={movFormData.responsableId}
                onValueChange={(v) => setMovFormData({ ...movFormData, responsableId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {personalData.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {movFormData.tipo === "salida" && (
              <div className="space-y-2 col-span-2">
                <Label>Obra (opcional)</Label>
                <Select
                  value={movFormData.obraId || "none"}
                  onValueChange={(v) => setMovFormData({ ...movFormData, obraId: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin obra asociada</SelectItem>
                    {obrasData.filter(o => o.estado === "activa").map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 col-span-2">
              <Label>Motivo</Label>
              <Input
                value={movFormData.motivo || ""}
                onChange={(e) => setMovFormData({ ...movFormData, motivo: e.target.value })}
                placeholder="Motivo del movimiento..."
              />
            </div>
          </div>
        </FormDialog>

        {/* Detail Dialog */}
        <DetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title="Detalle del Item"
        >
          {selectedItem && (
            <div className="space-y-3">
              <DetailRow label="Código" value={selectedItem.codigo} />
              <DetailRow label="Nombre" value={selectedItem.nombre} />
              <DetailRow label="Categoría" value={categoriaLabels[selectedItem.categoria]} />
              <DetailRow label="Unidad" value={selectedItem.unidad} />
              <DetailRow label="Stock Actual" value={`${selectedItem.stockActual} ${selectedItem.unidad}`} />
              <DetailRow label="Stock Mínimo" value={`${selectedItem.stockMinimo} ${selectedItem.unidad}`} />
              <DetailRow label="Ubicación" value={selectedItem.ubicacion} />
              <DetailRow label="Precio Unitario" value={`$${selectedItem.precioUnitario.toLocaleString("es-AR")}`} />
              <DetailRow label="Valor Total" value={`$${(selectedItem.stockActual * selectedItem.precioUnitario).toLocaleString("es-AR")}`} />
            </div>
          )}
        </DetailDialog>

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onConfirm={handleConfirmDelete}
          title="Eliminar Item"
          description={`¿Está seguro de eliminar "${selectedItem?.nombre}"? Esta acción no se puede deshacer.`}
        />
      </div>
    </MainLayout>
  );
}