import { useCallback, useMemo, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Trash2, Plus } from "lucide-react";
import { CATEGORIAS_CERTIFICADO, type CertificadoItemForm, type CertificadoConcepto } from "@/hooks/useCertificados";

const UNIDADES = ["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const CUSTOM_VALUE = "__custom__";

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
  conceptos?: CertificadoConcepto[];
  onItemsChange: (items: CertificadoItemForm[]) => void;
}

export function CertificadoServiceGrid({ items, seccion, conceptos = [], onItemsChange }: CertificadoServiceGridProps) {
  const [customInputIdx, setCustomInputIdx] = useState<number | null>(null);

  const conceptoOptions: ComboboxOption[] = useMemo(() => {
    const activos = conceptos.filter((c) => c.activo);
    const opts: ComboboxOption[] = activos.map((c) => ({
      value: c.id,
      label: c.nombre,
      searchValue: `${c.nombre} ${c.categoria} ${c.etapa || ""}`,
    }));
    opts.push({ value: CUSTOM_VALUE, label: "✏️ Personalizado (texto libre)" });
    return opts;
  }, [conceptos]);

  const conceptoMap = useMemo(() => {
    const map = new Map<string, CertificadoConcepto>();
    conceptos.forEach((c) => map.set(c.id, c));
    return map;
  }, [conceptos]);

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

  const handleConceptoSelect = useCallback(
    (index: number, conceptoId: string) => {
      if (conceptoId === CUSTOM_VALUE) {
        setCustomInputIdx(index);
        // Clear concepto_id and let user type
        const updated = items.map((item, i) => {
          if (i !== index) return item;
          return { ...item, concepto_id: null, descripcion: "" };
        });
        onItemsChange(updated);
        return;
      }
      setCustomInputIdx(null);
      const c = conceptoMap.get(conceptoId);
      if (!c) return;
      const updated = items.map((item, i) => {
        if (i !== index) return item;
        const subtotal = (item.cantidad || 0) * c.precio_unitario;
        return {
          ...item,
          concepto_id: c.id,
          descripcion: c.nombre,
          unidad: c.unidad,
          precio_unitario: c.precio_unitario,
          categoria: c.categoria,
          etapa: c.etapa,
          cantidad_total: c.cantidad_total,
          subtotal,
        };
      });
      onItemsChange(updated);
    },
    [items, onItemsChange, conceptoMap]
  );

  const deleteRow = useCallback(
    (index: number) => {
      if (customInputIdx === index) setCustomInputIdx(null);
      onItemsChange(items.filter((_, i) => i !== index));
    },
    [items, onItemsChange, customInputIdx]
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
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Descripción</TableHead>
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
                  {customInputIdx === index ? (
                    <Input
                      value={item.descripcion}
                      onChange={(e) => updateField(index, "descripcion", e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Descripción libre..."
                      autoFocus
                    />
                  ) : (
                    <Combobox
                      options={conceptoOptions}
                      value={item.concepto_id || ""}
                      onValueChange={(v) => handleConceptoSelect(index, v)}
                      placeholder="Seleccionar concepto..."
                      searchPlaceholder="Buscar concepto..."
                      emptyText="No se encontraron conceptos."
                      className="h-8 text-xs"
                    />
                  )}
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
