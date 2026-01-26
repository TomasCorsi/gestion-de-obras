import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
  checkboxColumn,
} from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { Button } from "@/components/ui/button";
import { Save, Plus, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RemitoForm, RemitoWithRelations } from "@/hooks/useRemitos";
import { ObraWithRelations } from "@/hooks/useObras";
import { GridSelectCell } from "@/components/shared/GridSelectCell";
import { useGridDraftPersistence } from "@/hooks/useGridDraftPersistence";
import { DraftRestorePrompt } from "@/components/shared/DraftRestorePrompt";

interface GridRow {
  id?: string;
  numero: string;
  fecha: string;
  obra_id: string;
  material: string;
  cantidad: number | null;
  unidad: string;
  recibido_por: string;
  firmado: boolean;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}

interface RemitosDataGridProps {
  remitos: RemitoWithRelations[];
  obras: ObraWithRelations[];
  onSave: (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
    deleted: string[];
  }) => Promise<void>;
  generateNumero: () => string;
}

const STORAGE_KEY = "remitos-grid-draft";

export function RemitosDataGrid({
  remitos,
  obras,
  onSave,
  generateNumero,
}: RemitosDataGridProps) {
  const activeObras = useMemo(
    () => obras.filter((o) => o.estado !== "finalizada"),
    [obras]
  );

  const obraOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...activeObras.map((o) => ({ value: o.id, label: o.nombre })),
    ],
    [activeObras]
  );

  const unidadOptions = useMemo(
    () => [
      { value: "m³", label: "m³" },
      { value: "tn", label: "tn" },
      { value: "kg", label: "kg" },
    ],
    []
  );

  const initialData = useMemo(
    () =>
      remitos.map((r) => ({
        id: r.id,
        numero: r.numero,
        fecha: r.fecha,
        obra_id: r.obra_id,
        material: r.material,
        cantidad: r.cantidad,
        unidad: r.unidad,
        recibido_por: r.recibido_por,
        firmado: r.firmado,
        _isNew: false,
        _isModified: false,
        _isDeleted: false,
      })),
    [remitos]
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
      { ...keyColumn("numero", textColumn), title: "Número", minWidth: 140 },
      { ...keyColumn("fecha", textColumn), title: "Fecha", minWidth: 120 },
      {
        ...keyColumn("obra_id", {
          component: ({ rowData, setRowData }: { rowData: string; setRowData: (v: string) => void }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={obraOptions}
              placeholder="Seleccionar..."
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => activeObras.find((o) => o.id === rowData)?.nombre || "",
          pasteValue: ({ value }: { value: string }) => activeObras.find((o) => o.nombre.toLowerCase() === value.toLowerCase())?.id || "",
        }),
        title: "Obra",
        minWidth: 200,
      },
      { ...keyColumn("material", textColumn), title: "Material", minWidth: 150 },
      { ...keyColumn("cantidad", floatColumn), title: "Cantidad", minWidth: 100 },
      {
        ...keyColumn("unidad", {
          component: ({ rowData, setRowData }: { rowData: string; setRowData: (v: string) => void }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={unidadOptions}
              placeholder="m³"
            />
          ),
          deleteValue: () => "m³",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => (["m³", "tn", "kg"].includes(value) ? value : "m³"),
        }),
        title: "Unidad",
        minWidth: 80,
      },
      { ...keyColumn("recibido_por", textColumn), title: "Recibido por", minWidth: 150 },
      { ...keyColumn("firmado", checkboxColumn), title: "Firmado", minWidth: 80 },
    ],
    [activeObras, obraOptions, unidadOptions]
  );

  const handleChange = useCallback(
    (newData: GridRow[]) => {
      const updatedData = newData.map((row) => {
        if (row._isNew) return row;
        const orig = initialData.find((r) => r.id === row.id);
        if (orig) {
          const isModified =
            row.numero !== orig.numero ||
            row.fecha !== orig.fecha ||
            row.obra_id !== orig.obra_id ||
            row.material !== orig.material ||
            row.cantidad !== orig.cantidad ||
            row.unidad !== orig.unidad ||
            row.recibido_por !== orig.recibido_por ||
            row.firmado !== orig.firmado;
          return { ...row, _isModified: isModified };
        }
        return row;
      });
      setData(updatedData);
    },
    [initialData]
  );

  const handleAddRow = useCallback(() => {
    setData((prev) => [
      ...prev,
      {
        numero: generateNumero(),
        fecha: new Date().toISOString().split("T")[0],
        obra_id: "",
        material: "Tosca",
        cantidad: 18,
        unidad: "m³",
        recibido_por: "",
        firmado: false,
        _isNew: true,
        _isModified: false,
        _isDeleted: false,
      },
    ]);
  }, [generateNumero]);

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
          numero: row.numero,
          fecha: row.fecha,
          obra_id: row.obra_id,
          material: row.material,
          cantidad: row.cantidad || 0,
          unidad: row.unidad,
          recibido_por: row.recibido_por,
          firmado: row.firmado,
        }));

      const updated = data
        .filter((row) => row._isModified && !row._isNew && row.id)
        .map((row) => ({
          id: row.id!,
          data: {
            numero: row.numero,
            fecha: row.fecha,
            obra_id: row.obra_id,
            material: row.material,
            cantidad: row.cantidad,
            unidad: row.unidad,
            recibido_por: row.recibido_por,
            firmado: row.firmado,
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

  const createRow = useCallback(
    (): GridRow => ({
      numero: generateNumero(),
      fecha: new Date().toISOString().split("T")[0],
      obra_id: "",
      material: "Tosca",
      cantidad: 18,
      unidad: "m³",
      recibido_por: "",
      firmado: false,
      _isNew: true,
      _isModified: false,
      _isDeleted: false,
    }),
    [generateNumero]
  );

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
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="bg-primary hover:bg-primary/90">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        💡 Podés copiar y pegar desde Excel. Usá Tab para navegar entre celdas. Escribí para buscar en los selectores.
      </p>
      <div className="remitos-grid-container rounded-lg overflow-hidden border border-border">
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
