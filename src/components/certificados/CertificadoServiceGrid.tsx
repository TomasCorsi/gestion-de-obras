import { useMemo, useCallback, useRef, useEffect } from "react";
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
  type Column,
  type CellProps,
} from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { GridSelectCell } from "@/components/shared/GridSelectCell";
import { CATEGORIAS_CERTIFICADO, type CertificadoItemForm } from "@/hooks/useCertificados";

const UNIDADES = ["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"];

export interface ServiceGridRow {
  descripcion: string;
  categoria: string;
  etapa: string;
  unidad: string;
  cantidad: number | null;
  precio_unitario: number | null;
}

const categoriaOptions = CATEGORIAS_CERTIFICADO.map((c) => ({ value: c, label: c }));
const unidadOptions = UNIDADES.map((u) => ({ value: u, label: u }));

function SelectCategoriaComponent({ rowData, setRowData, focus }: CellProps<ServiceGridRow, string>) {
  return (
    <GridSelectCell
      value={rowData.categoria}
      onChange={(v) => setRowData({ ...rowData, categoria: v })}
      options={categoriaOptions}
      placeholder="Categoría..."
      focus={focus}
    />
  );
}

function SelectUnidadComponent({ rowData, setRowData, focus }: CellProps<ServiceGridRow, string>) {
  return (
    <GridSelectCell
      value={rowData.unidad}
      onChange={(v) => setRowData({ ...rowData, unidad: v })}
      options={unidadOptions}
      placeholder="Unidad..."
      focus={focus}
    />
  );
}

const selectCategoriaColumn = {
  component: SelectCategoriaComponent,
  deleteValue: ({ rowData }: { rowData: ServiceGridRow }) => ({ ...rowData, categoria: "General" }),
  copyValue: ({ rowData }: { rowData: ServiceGridRow }) => rowData.categoria,
  pasteValue: ({ rowData, value }: { rowData: ServiceGridRow; value: string }) => ({
    ...rowData,
    categoria: CATEGORIAS_CERTIFICADO.includes(value) ? value : rowData.categoria,
  }),
  keepFocus: true,
};

const selectUnidadColumn = {
  component: SelectUnidadComponent,
  deleteValue: ({ rowData }: { rowData: ServiceGridRow }) => ({ ...rowData, unidad: "" }),
  copyValue: ({ rowData }: { rowData: ServiceGridRow }) => rowData.unidad,
  pasteValue: ({ rowData, value }: { rowData: ServiceGridRow; value: string }) => ({
    ...rowData,
    unidad: UNIDADES.includes(value.toUpperCase()) ? value.toUpperCase() : rowData.unidad,
  }),
  keepFocus: true,
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

interface CertificadoServiceGridProps {
  items: CertificadoItemForm[];
  seccion: string | null; // "servicio" for mixto, null for pure servicio
  onItemsChange: (items: CertificadoItemForm[]) => void;
}

export function CertificadoServiceGrid({ items, seccion, onItemsChange }: CertificadoServiceGridProps) {
  // Convert CertificadoItemForm[] to grid rows
  const gridRows: ServiceGridRow[] = useMemo(
    () =>
      items.map((item) => ({
        descripcion: item.descripcion,
        categoria: item.categoria || "General",
        etapa: item.etapa || "",
        unidad: item.unidad,
        cantidad: item.cantidad || null,
        precio_unitario: item.precio_unitario || null,
      })),
    [items]
  );

  const columns: Column<ServiceGridRow>[] = useMemo(
    () => [
      { ...keyColumn("descripcion", textColumn), title: "Descripción", minWidth: 200, grow: 2 },
      { ...keyColumn("categoria", selectCategoriaColumn as any), title: "Categoría", minWidth: 160 },
      { ...keyColumn("etapa", textColumn), title: "Sub Categoría", minWidth: 130 },
      { ...keyColumn("unidad", selectUnidadColumn as any), title: "Unidad", minWidth: 100 },
      { ...keyColumn("cantidad", floatColumn), title: "Cantidad", minWidth: 100 },
      { ...keyColumn("precio_unitario", floatColumn), title: "P. Unitario", minWidth: 120 },
      {
        component: ({ rowData }: { rowData: ServiceGridRow }) => (
          <div className="w-full h-full flex items-center justify-end px-2 text-sm font-medium text-foreground">
            {formatCurrency((rowData.cantidad || 0) * (rowData.precio_unitario || 0))}
          </div>
        ),
        title: "Subtotal",
        minWidth: 120,
        disabled: true,
      } as Column<ServiceGridRow>,
    ],
    []
  );

  const createRow = useCallback(
    (): ServiceGridRow => ({
      descripcion: "",
      categoria: "General",
      etapa: "",
      unidad: "HR",
      cantidad: null,
      precio_unitario: null,
    }),
    []
  );

  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const handleChange = useCallback(
    (newRows: ServiceGridRow[]) => {
      const currentItems = itemsRef.current;
      const newItems: CertificadoItemForm[] = newRows.map((row, i) => {
        const existingItem = currentItems[i];
        const cantidad = row.cantidad || 0;
        const precio = row.precio_unitario || 0;
        return {
          concepto_id: existingItem?.concepto_id ?? null,
          descripcion: row.descripcion,
          unidad: row.unidad,
          cantidad,
          precio_unitario: precio,
          subtotal: cantidad * precio,
          categoria: row.categoria || "General",
          etapa: row.etapa || null,
          cantidad_total: existingItem?.cantidad_total ?? 0,
          seccion,
        };
      });
      onItemsChange(newItems);
    },
    [seccion, onItemsChange]
  );

  const totalSubtotal = items.reduce((s, i) => s + i.subtotal, 0);

  // Prevent Dialog from intercepting contextmenu events so the grid's native
  // right-click menu (insert / delete row) works correctly inside dialogs.
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="space-y-2">
      <div onContextMenu={handleContextMenu}>
        <DataSheetGrid
          value={gridRows}
          onChange={handleChange}
          columns={columns}
          createRow={createRow}
          height={Math.min(Math.max(gridRows.length * 36 + 80, 200), 500)}
          rowHeight={36}
          headerRowHeight={32}
          addRowsComponent={({ addRows }) => (
            <button
              type="button"
              className="text-xs text-primary hover:text-primary/80 px-3 py-1.5 transition-colors"
              onClick={() => addRows(1)}
            >
              + Agregar fila
            </button>
          )}
        />
      </div>
      <div className="flex justify-end text-sm font-semibold pr-2">
        Total: {formatCurrency(totalSubtotal)}
      </div>
    </div>
  );
}