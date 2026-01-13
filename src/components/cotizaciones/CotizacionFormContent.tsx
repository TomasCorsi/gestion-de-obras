import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight, FolderPlus } from "lucide-react";
import {
  CotizacionForm,
  CotizacionCategoriaForm,
  CotizacionItemForm,
  EstadoCotizacion,
  UNIDADES,
  calcularM3,
  calcularTotalItem,
} from "@/hooks/useCotizaciones";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const estadoConfig: Record<string, { label: string }> = {
  borrador: { label: "Borrador" },
  enviada: { label: "Enviada" },
  aprobada: { label: "Aprobada" },
  rechazada: { label: "Rechazada" },
  vencida: { label: "Vencida" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

interface CotizacionFormContentProps {
  formData: CotizacionForm;
  setFormData: (data: CotizacionForm) => void;
  categorias: CotizacionCategoriaForm[];
  setCategorias: (cats: CotizacionCategoriaForm[]) => void;
  items: CotizacionItemForm[];
  setItems: (items: CotizacionItemForm[]) => void;
  obras: { id: string; nombre: string }[];
  isEditing: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function CotizacionFormContent({
  formData,
  setFormData,
  categorias,
  setCategorias,
  items,
  setItems,
  obras,
  isEditing,
  isSubmitting,
  onSubmit,
  onCancel,
}: CotizacionFormContentProps) {
  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({});

  // Calculate totals whenever items change
  const calculateTotals = (itemsList: CotizacionItemForm[]) => {
    const subtotal = itemsList.reduce((sum, item) => sum + (item.total || 0), 0);
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  // Add a new category
  const addCategoria = () => {
    const newNumero = categorias.length + 1;
    setCategorias([
      ...categorias,
      { numero: newNumero, nombre: "", orden: newNumero - 1 },
    ]);
    setOpenCategories({ ...openCategories, [categorias.length]: true });
  };

  // Remove a category and its items
  const removeCategoria = (index: number) => {
    const newCategorias = categorias.filter((_, i) => i !== index);
    // Re-number categories
    const renumberedCats = newCategorias.map((cat, i) => ({
      ...cat,
      numero: i + 1,
      orden: i,
    }));
    setCategorias(renumberedCats);
    
    // Remove items belonging to this category and update remaining items
    const newItems = items
      .filter(item => item.categoria_index !== index)
      .map(item => ({
        ...item,
        categoria_index: item.categoria_index !== undefined && item.categoria_index > index 
          ? item.categoria_index - 1 
          : item.categoria_index,
        numero: item.categoria_index !== undefined && item.categoria_index > index
          ? `${(item.categoria_index || 0)}.${items.filter(i => i.categoria_index === item.categoria_index).indexOf(item) + 1}`
          : item.numero,
      }));
    setItems(newItems);
    
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, ...totals });
  };

  // Update category
  const updateCategoria = (index: number, field: keyof CotizacionCategoriaForm, value: any) => {
    const newCategorias = [...categorias];
    newCategorias[index] = { ...newCategorias[index], [field]: value };
    setCategorias(newCategorias);
  };

  // Add item to a category
  const addItem = (categoriaIndex: number) => {
    const categoryItems = items.filter(i => i.categoria_index === categoriaIndex);
    const newItemNumber = `${categorias[categoriaIndex].numero}.${categoryItems.length + 1}`;
    
    const newItem: CotizacionItemForm = {
      categoria_index: categoriaIndex,
      numero: newItemNumber,
      descripcion: "",
      unidad: "m³",
      cantidad: 0,
      cantidad_m2: 0,
      altura_promedio: 0,
      cantidad_m3: 0,
      precio_unitario: 0,
      subtotal: 0,
      total: 0,
    };
    
    setItems([...items, newItem]);
  };

  // Remove item
  const removeItem = (itemIndex: number) => {
    const newItems = items.filter((_, i) => i !== itemIndex);
    
    // Re-number items within their categories
    const renumberedItems = newItems.map((item, i) => {
      if (item.categoria_index !== undefined) {
        const categoryItems = newItems.filter(it => it.categoria_index === item.categoria_index);
        const indexInCategory = categoryItems.indexOf(item);
        return {
          ...item,
          numero: `${categorias[item.categoria_index]?.numero || 0}.${indexInCategory + 1}`,
        };
      }
      return item;
    });
    
    setItems(renumberedItems);
    const totals = calculateTotals(renumberedItems);
    setFormData({ ...formData, ...totals });
  };

  // Update item
  const updateItem = (itemIndex: number, field: keyof CotizacionItemForm, value: any) => {
    const newItems = [...items];
    newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
    
    // Recalculate M3 if M2 or height changes
    if (field === "cantidad_m2" || field === "altura_promedio") {
      newItems[itemIndex].cantidad_m3 = calcularM3(
        newItems[itemIndex].cantidad_m2,
        newItems[itemIndex].altura_promedio
      );
      // Also update cantidad for compatibility
      newItems[itemIndex].cantidad = newItems[itemIndex].cantidad_m3;
    }
    
    // Recalculate total
    if (["cantidad", "cantidad_m2", "altura_promedio", "cantidad_m3", "precio_unitario", "unidad"].includes(field)) {
      newItems[itemIndex].total = calcularTotalItem(newItems[itemIndex]);
      newItems[itemIndex].subtotal = newItems[itemIndex].total;
    }
    
    setItems(newItems);
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, ...totals });
  };

  // Get items for a specific category
  const getItemsForCategory = (categoriaIndex: number) => {
    return items
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter(item => item.categoria_index === categoriaIndex);
  };

  const toggleCategory = (index: number) => {
    setOpenCategories({ ...openCategories, [index]: !openCategories[index] });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* General Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Label htmlFor="obra_id">Obra (opcional)</Label>
          <Select
            value={formData.obra_id || "none"}
            onValueChange={(value) => setFormData({ ...formData, obra_id: value === "none" ? undefined : value })}
          >
            <SelectTrigger className="bg-muted border-border">
              <SelectValue placeholder="Seleccionar obra" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="none">Sin asignar</SelectItem>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsable">Responsable *</Label>
          <Input
            id="responsable"
            value={formData.responsable}
            onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
            className="bg-muted border-border"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_creacion">Fecha Creación *</Label>
          <Input
            id="fecha_creacion"
            type="date"
            value={formData.fecha_creacion}
            onChange={(e) => setFormData({ ...formData, fecha_creacion: e.target.value })}
            className="bg-muted border-border"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_vencimiento">Fecha Vencimiento *</Label>
          <Input
            id="fecha_vencimiento"
            type="date"
            value={formData.fecha_vencimiento}
            onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
            className="bg-muted border-border"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select
            value={formData.estado}
            onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoCotizacion })}
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
        <div className="md:col-span-3 space-y-2">
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
      </div>

      {/* Categories and Items Section */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Rubros e Ítems</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCategoria}>
            <FolderPlus className="w-4 h-4 mr-1" />
            Agregar Rubro
          </Button>
        </div>

        {categorias.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No hay rubros. Agrega uno para comenzar.
          </p>
        ) : (
          <div className="space-y-4">
            {categorias.map((categoria, catIndex) => (
              <Collapsible
                key={catIndex}
                open={openCategories[catIndex] !== false}
                onOpenChange={() => toggleCategory(catIndex)}
              >
                <div className="border border-border rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-primary/10 p-3 flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                        {openCategories[catIndex] !== false ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        <span className="font-bold text-primary mr-2">{categoria.numero}.</span>
                      </Button>
                    </CollapsibleTrigger>
                    <Input
                      value={categoria.nombre}
                      onChange={(e) => updateCategoria(catIndex, "nombre", e.target.value)}
                      placeholder="Nombre del rubro (ej: Movimiento de Suelo)"
                      className="flex-1 bg-background border-border mx-2 font-semibold uppercase"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCategoria(catIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Category Items */}
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground border-b border-border pb-2">
                        <div className="col-span-1">Núm.</div>
                        <div className="col-span-3">Descripción</div>
                        <div className="col-span-1">Unidad</div>
                        <div className="col-span-1 text-right">M2</div>
                        <div className="col-span-1 text-right">Altura</div>
                        <div className="col-span-1 text-right">M3</div>
                        <div className="col-span-2 text-right">P. Unit.</div>
                        <div className="col-span-1 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Items */}
                      {getItemsForCategory(catIndex).map((item) => (
                        <div key={item.originalIndex} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-1">
                            <Input
                              value={item.numero}
                              onChange={(e) => updateItem(item.originalIndex, "numero", e.target.value)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              value={item.descripcion}
                              onChange={(e) => updateItem(item.originalIndex, "descripcion", e.target.value)}
                              placeholder="Descripción"
                              className="bg-muted border-border text-sm p-2 h-8"
                            />
                          </div>
                          <div className="col-span-1">
                            <Select
                              value={item.unidad}
                              onValueChange={(value) => updateItem(item.originalIndex, "unidad", value)}
                            >
                              <SelectTrigger className="bg-muted border-border h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                {UNIDADES.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.cantidad_m2 || ""}
                              onChange={(e) => updateItem(item.originalIndex, "cantidad_m2", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.altura_promedio || ""}
                              onChange={(e) => updateItem(item.originalIndex, "altura_promedio", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.cantidad_m3 || item.cantidad || ""}
                              onChange={(e) => updateItem(item.originalIndex, "cantidad_m3", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.precio_unitario || ""}
                              onChange={(e) => updateItem(item.originalIndex, "precio_unitario", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              value={formatCurrency(item.total || 0)}
                              readOnly
                              className="bg-muted/50 border-border text-xs font-mono p-1 h-8 text-right"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.originalIndex)}
                              className="text-destructive h-8 w-8"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Add Item Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem(catIndex)}
                        className="w-full border-dashed"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar Ítem
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-mono">{formatCurrency(formData.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA (21%):</span>
            <span className="font-mono">{formatCurrency(formData.iva)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="font-mono text-primary">{formatCurrency(formData.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notas">Notas adicionales</Label>
        <Textarea
          id="notas"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          className="bg-muted border-border"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
          {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Cotización"}
        </Button>
      </div>
    </form>
  );
}
