import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
} from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { Button } from "@/components/ui/button";
import { Save, Plus, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CargaCombustibleForm, CargaCombustibleWithRelations } from "@/hooks/useCombustible";
import { ObraWithRelations } from "@/hooks/useObras";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import { GridSelectCell } from "@/components/shared/GridSelectCell";
import { useGridDraftPersistence } from "@/hooks/useGridDraftPersistence";
import { DraftRestorePrompt } from "@/components/shared/DraftRestorePrompt";

interface GridRow {
  id?: string;
  fecha: string;
  obra_id: string;
  maquinaria_id: string;
  operador: string;
  litros: number | null;
  precio_litro: number | null;
  costo_total: number | null;
  horas_maquina: number | null;
  estacion: string;
  comprobante: string;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}

interface CombustibleDataGridProps {
  cargas: CargaCombustibleWithRelations[];
  obras: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  operadores: { id: string; nombre: string; apellido: string }[];
  onSave: (changes: {
    created: CargaCombustibleForm[];
    updated: { id: string; data: Partial<CargaCombustibleForm> }[];
    deleted: string[];
  }) => Promise<void>;
}

const STORAGE_KEY = "combustible-grid-draft";

export function CombustibleDataGrid({
  cargas,
  obras,
  maquinarias,
  operadores,
  onSave,
}: CombustibleDataGridProps) {
  const activeObras = useMemo(
    () => obras.filter((o) => o.estado !== "finalizada"),
    [obras]
  );

  const sortedMaquinarias = useMemo(
    () => [...maquinarias].sort((a, b) => 
      (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true })
    ),
    [maquinarias]
  );

  const obraOptions = useMemo(
    () => [
      { value: "", label: "Sin asignar" },
      ...activeObras.map((o) => ({ value: o.id, label: o.nombre })),
    ],
    [activeObras]
  );

  const maquinariaOptions = useMemo(
    () => [
      { value: "", label: "Sin asignar" },
      ...sortedMaquinarias.map((m) => ({
        value: m.id,
        label: `${m.codigo || ""} - ${m.tipo}`.trim(),
      })),
    ],
    [sortedMaquinarias]
  );

  const operadorOptions = useMemo(
    () => [
      { value: "", label: "Sin asignar" },
      ...operadores.map((o) => ({
        value: `${o.nombre} ${o.apellido}`.trim(),
        label: `${o.nombre} ${o.apellido}`.trim(),
      })),
    ],
    [operadores]
  );

  const initialData = useMemo(
    () =>
      cargas.map((c) => ({
        id: c.id,
        fecha: c.fecha,
        obra_id: c.obra_id || "",
        maquinaria_id: c.maquinaria_id || "",
        operador: c.operador || "",
        litros: c.litros,
        precio_litro: c.precio_litro,
        costo_total: c.costo_total,
        horas_maquina: c.horas_maquina,
        estacion: c.estacion || "",
        comprobante: c.comprobante || "",
        _isNew: false,
        _isModified: false,
        _isDeleted: false,
      })),
    [cargas]
  );

  const [data, setData] = useState<GridRow[]>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const hasChanges = useMemo(() => {
    return data.some((row) => row._isNew || row._isModified || row._isDeleted);
  }, [data]);

  // Draft persistence
  const {
    showRestorePrompt,
    draftTimestamp,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useGridDraftPersistence({
    storageKey: STORAGE_KEY,
    data,
    setData,
    hasChanges,
    isNewRow: (row) => !!row._isNew,
    isModifiedRow: (row) => !!row._isModified,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = useMemo(
    () => [
      { ...keyColumn("fecha", textColumn), title: "Fecha", minWidth: 110 },
      { ...keyColumn("comprobante", textColumn), title: "Comprobante", minWidth: 120 },
      {
        ...keyColumn("obra_id", {
          component: ({ rowData, setRowData }: { rowData: string; setRowData: (v: string) => void }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={obraOptions}
              placeholder="Sin asignar"
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => activeObras.find((o) => o.id === rowData)?.nombre || "",
          pasteValue: ({ value }: { value: string }) => activeObras.find((o) => o.nombre.toLowerCase() === value.toLowerCase())?.id || "",
        }),
        title: "Obra",
        minWidth: 180,
      },
      {
        ...keyColumn("maquinaria_id", {
          component: ({ rowData, setRowData }: { rowData: string; setRowData: (v: string) => void }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={maquinariaOptions}
              placeholder="Sin asignar"
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => {
            const m = maquinarias.find((m) => m.id === rowData);
            return m ? `${m.codigo} - ${m.tipo}` : "";
          },
          pasteValue: ({ value }: { value: string }) => {
            const code = value.split("-")[0]?.trim();
            return maquinarias.find((m) => m.codigo === code)?.id || "";
          },
        }),
        title: "Maquinaria",
        minWidth: 180,
      },
      {
        ...keyColumn("operador", {
          component: ({ rowData, setRowData }: { rowData: string; setRowData: (v: string) => void }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={operadorOptions}
              placeholder="Sin asignar"
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
        }),
        title: "Operador",
        minWidth: 160,
      },
      { ...keyColumn("litros", floatColumn), title: "Litros", minWidth: 90 },
      { ...keyColumn("precio_litro", floatColumn), title: "$/Litro", minWidth: 100 },
      { 
        ...keyColumn("costo_total", floatColumn), 
        title: "Total", 
        minWidth: 110,
        disabled: true,
      },
      { ...keyColumn("horas_maquina", floatColumn), title: "Hs Máq", minWidth: 90 },
      { ...keyColumn("estacion", textColumn), title: "Estación", minWidth: 140 },
    ],
    [activeObras, maquinarias, obraOptions, maquinariaOptions, operadorOptions]
  );

  const handleChange = useCallback(
    (newData: GridRow[]) => {
      const updatedData = newData.map((row) => {
        // Auto-calculate costo_total
        const litros = row.litros || 0;
        const precio = row.precio_litro || 0;
        const calculatedTotal = litros * precio;
        
        if (row._isNew) {
          return { ...row, costo_total: calculatedTotal };
        }
        
        const orig = initialData.find((r) => r.id === row.id);
        if (orig) {
          const isModified = 
            row.fecha !== orig.fecha || 
            row.obra_id !== orig.obra_id || 
            row.maquinaria_id !== orig.maquinaria_id || 
            row.operador !== orig.operador ||
            row.litros !== orig.litros || 
            row.precio_litro !== orig.precio_litro || 
            row.horas_maquina !== orig.horas_maquina ||
            row.estacion !== orig.estacion ||
            row.comprobante !== orig.comprobante;
          return { ...row, costo_total: calculatedTotal, _isModified: isModified };
        }
        return { ...row, costo_total: calculatedTotal };
      });
      setData(updatedData);
    },
    [initialData]
  );

  const createRow = useCallback((): GridRow => ({
    fecha: new Date().toISOString().split("T")[0],
    obra_id: "",
    maquinaria_id: "",
    operador: "",
    litros: null,
    precio_litro: 950,
    costo_total: null,
    horas_maquina: null,
    estacion: "",
    comprobante: "",
    _isNew: true,
    _isModified: false,
    _isDeleted: false,
  }), []);

  const handleAddRow = useCallback(() => {
    setData((prev) => [...prev, createRow()]);
  }, [createRow]);

  const handleReset = useCallback(() => {
    setData(initialData);
    clearDraft();
  }, [initialData, clearDraft]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const created = data
        .filter((row) => row._isNew && !row._isDeleted)
        .map((row) => ({
          fecha: row.fecha || undefined,
          obra_id: row.obra_id || undefined,
          maquinaria_id: row.maquinaria_id || undefined,
          operador: row.operador || undefined,
          litros: row.litros || 0,
          precio_litro: row.precio_litro || 0,
          costo_total: (row.litros || 0) * (row.precio_litro || 0),
          horas_maquina: row.horas_maquina || 0,
          estacion: row.estacion || undefined,
          comprobante: row.comprobante || undefined,
        }));
      
      const updated = data
        .filter((row) => row._isModified && !row._isNew && row.id)
        .map((row) => ({
          id: row.id!,
          data: {
            fecha: row.fecha || undefined,
            obra_id: row.obra_id || undefined,
            maquinaria_id: row.maquinaria_id || undefined,
            operador: row.operador || undefined,
            litros: row.litros,
            precio_litro: row.precio_litro,
            costo_total: (row.litros || 0) * (row.precio_litro || 0),
            horas_maquina: row.horas_maquina,
            estacion: row.estacion || undefined,
            comprobante: row.comprobante || undefined,
          },
        }));
      
      const deleted = data
        .filter((row) => row._isDeleted && row.id)
        .map((row) => row.id!);
      
      await onSave({ created, updated, deleted });
      clearDraft();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, clearDraft]);

  return (
    <div className="space-y-4">
      {showRestorePrompt && (
        <DraftRestorePrompt
          timestamp={draftTimestamp}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleAddRow} variant="outline" size="sm" className="border-border">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Fila
          </Button>
          {hasChanges && (
            <Button onClick={handleReset} variant="ghost" size="sm" className="text-muted-foreground">
              <RotateCcw className="w-4 h-4 mr-2" />
              Descartar
            </Button>
          )}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving} 
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        💡 Podés copiar y pegar desde Excel. Usá Tab para navegar entre celdas. El total se calcula automáticamente.
      </p>
      <div className="combustible-grid-container rounded-lg overflow-hidden border border-border">
        <DataSheetGrid
          value={data}
          onChange={handleChange}
          columns={columns}
          createRow={createRow}
          height={500}
          rowClassName={({ rowData }) =>
            rowData._isDeleted
              ? "row-deleted"
              : rowData._isNew
              ? "row-new"
              : rowData._isModified
              ? "row-modified"
              : ""
          }
        />
      </div>
    </div>
  );
}
