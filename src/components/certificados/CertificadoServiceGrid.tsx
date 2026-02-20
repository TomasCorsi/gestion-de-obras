import { useCallback } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { CATEGORIAS_CERTIFICADO, type CertificadoItemForm } from "@/hooks/useCertificados";

const UNIDADES = ["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export interface ServiceGridRow {
  descripcion: string;
  categoria: string;
  etapa: string;
  unidad: string;
  cantidad: number | null;
  precio_unitario: number | null;
}

interface CertificadoServiceGridProps {
  items: CertificadoItemForm[];
  seccion: string | null;
  onItemsChange: (items: CertificadoItemForm[]) => void;
}

export function CertificadoServiceGrid({ items, seccion, onItemsChange }: CertificadoServiceGridProps) {
  const updateField = useCallback(
    (index: number, field: string, value: string | number) => {
      const updated = items.map((item, i) => {
        if (i !== index) return item;
        const newItem = { ...item, [field]: value };
        if (field === "cantidad" || field === "precio_unitario") {
          newItem.subtotal = (newItem.cantidad || 0) * (newItem.precio_unitario || 0);
        }
        return newItem;
      });
      onItemsChange(updated);
    },
    [items, onItemsChange]
  );

  const deleteRow = useCallback(
    (index: number) => {
      onItemsChange(items.filter((_, i) => i !== index));
    },
    [items, onItemsChange]
  );

  const addRow = useCallback(() => {
    const newItem: CertificadoItemForm = {
      concepto_id: null,
      descripcion: "",
      unidad: "HR",
      cantidad: 0,
      precio_unitario: 0,
      subtotal: 0,
      categoria: "General",
      etapa: null,
      cantidad_total: 0,
      seccion,
    };
    onItemsChange([...items, newItem]);
  }, [items, seccion, onItemsChange]);

  const totalSubtotal = items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="space-y-2">
      <div className="border rounded-md overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Descripción</TableHead>
              <TableHead className="min-w-[130px]">Categoría</TableHead>
              <TableHead className="min-w-[110px]">Sub Categoría</TableHead>
              <TableHead className="min-w-[90px]">Unidad</TableHead>
              <TableHead className="min-w-[90px]">Cantidad</TableHead>
              <TableHead className="min-w-[100px]">P. Unitario</TableHead>
              <TableHead className="min-w-[100px] text-right">Subtotal</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="p-1">
                  <Input
                    value={item.descripcion}
                    onChange={(e) => updateField(index, "descripcion", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Descripción..."
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={item.categoria || "General"}
                    onValueChange={(v) => updateField(index, "categoria", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_CERTIFICADO.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    value={item.etapa || ""}
                    onChange={(e) => updateField(index, "etapa", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Sub cat..."
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={item.unidad}
                    onValueChange={(v) => updateField(index, "unidad", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    value={item.cantidad || ""}
                    onChange={(e) => updateField(index, "cantidad", parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                    min={0}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    value={item.precio_unitario || ""}
                    onChange={(e) => updateField(index, "precio_unitario", parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                    min={0}
                  />
                </TableCell>
                <TableCell className="p-1 text-right text-xs font-medium">
                  {formatCurrency(item.subtotal)}
                </TableCell>
                <TableCell className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteRow(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-4">
                  Sin ítems. Agregá una fila para comenzar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar fila
        </Button>
        <div className="text-sm font-semibold pr-2">
          Total: {formatCurrency(totalSubtotal)}
        </div>
      </div>
    </div>
  );
}
