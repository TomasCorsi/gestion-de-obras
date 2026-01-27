import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
  intColumn,
} from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { Button } from "@/components/ui/button";
import { Save, Plus, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RemitoForm, RemitoWithRelations } from "@/hooks/useRemitos";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import { ObraWithRelations } from "@/hooks/useObras";
import { GridSelectCell } from "@/components/shared/GridSelectCell";
import { useGridDraftPersistence } from "@/hooks/useGridDraftPersistence";
import { DraftRestorePrompt } from "@/components/shared/DraftRestorePrompt";

interface GridRow {
  id?: string;
  remito_tercero: string;
  remito_local: string;
  fecha: string;
  desde: string;
  hasta: string;
  cantidad_viajes: number | null;
  unidad: string;
  cantidad: number | null;
  tipo_material: string;
  precio_total: number | null;
  tipo_transporte: string;
  maquinaria_id: string;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}

interface RemitosDataGridProps {
  remitos: RemitoWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  obras: ObraWithRelations[];
  onSave: (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
    deleted: string[];
  }) => Promise<void>;
  generateNumero: () => string;
  fullScreen?: boolean;
}

const STORAGE_KEY = "remitos-grid-draft";

// Static options
const unidadOptions = [
  { value: "TN", label: "TN" },
  { value: "KG", label: "KG" },
  { value: "M3", label: "M3" },
  { value: "M2", label: "M2" },
  { value: "U", label: "U" },
];

const tipoMaterialOptions = [
  { value: "", label: "Seleccionar..." },
  { value: "Residuos", label: "Residuos" },
  { value: "Desmonte", label: "Desmonte" },
  { value: "Cascote", label: "Cascote" },
  { value: "Escombro", label: "Escombro" },
  { value: "Tierra", label: "Tierra" },
  { value: "Piedra", label: "Piedra" },
  { value: "Movimiento interno", label: "Mov. interno" },
  { value: "Tosca", label: "Tosca" },
  { value: "Cemento", label: "Cemento" },
  { value: "Hormigon", label: "Hormigon" },
  { value: "Traslado", label: "Traslado" },
  { value: "Cubiertas", label: "Cubiertas" },
  { value: "Frezado", label: "Frezado" },
];

const tipoTransporteOptions = [
  { value: "", label: "Seleccionar..." },
  { value: "Calamina Sur", label: "Calamina Sur" },
  { value: "Geo hermanos", label: "Geo hermanos" },
  { value: "Diaz Neiva", label: "Diaz Neiva" },
  { value: "japones", label: "Japonés" },
  { value: "Cato", label: "Cato" },
  { value: "Tatu", label: "Tatu" },
  { value: "Patan", label: "Patan" },
];

export function RemitosDataGrid({
  remitos,
  maquinarias,
  obras,
  onSave,
  generateNumero,
  fullScreen = false,
}: RemitosDataGridProps) {
  // Obras options with searchable values
  const obrasOptions = useMemo(() => {
    const options = obras.map((o) => ({
      value: o.nombre,
      label: o.nombre,
    }));
    return [{ value: "", label: "Seleccionar..." }, ...options];
  }, [obras]);

  // Maquinaria options with searchable values
  const maquinariaOptions = useMemo(() => {
    const options = maquinarias
      .filter((m) => m.patente)
      .map((m) => {
        const label = `${m.codigo || ""} - ${m.patente || ""}`.trim();
        const searchValue = `${m.codigo || ""} ${m.patente || ""} ${m.tipo || ""}`.toLowerCase();
        return { value: m.id, label, searchValue };
      });
    return [{ value: "", label: "Seleccionar...", searchValue: "" }, ...options];
  }, [maquinarias]);

  const initialData = useMemo(
    () =>
      remitos.map((r) => ({
        id: r.id,
        remito_tercero: r.remito_tercero || "",
        remito_local: r.remito_local || r.numero || "",
        fecha: r.fecha,
        desde: r.desde || "",
        hasta: r.hasta || "",
        cantidad_viajes: r.cantidad_viajes || 1,
        unidad: r.unidad || "M3",
        cantidad: r.cantidad,
        tipo_material: r.tipo_material || r.material || "",
        precio_total: r.precio_total || 0,
        tipo_transporte: r.tipo_transporte || "",
        maquinaria_id: r.maquinaria_id || "",
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
      { ...keyColumn("remito_tercero", textColumn), title: "Rem. Tercero", minWidth: 110 },
      { ...keyColumn("remito_local", textColumn), title: "Rem. Local", minWidth: 110 },
      { ...keyColumn("fecha", textColumn), title: "Fecha", minWidth: 100 },
      {
        ...keyColumn("desde", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={obrasOptions}
              placeholder="Desde..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
        }),
        title: "Desde",
        minWidth: 130,
      },
      {
        ...keyColumn("hasta", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={obrasOptions}
              placeholder="Hasta..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
        }),
        title: "Hasta",
        minWidth: 130,
      },
      { ...keyColumn("cantidad_viajes", intColumn), title: "Viajes", minWidth: 70 },
      {
        ...keyColumn("unidad", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={unidadOptions}
              placeholder="M3"
              focus={focus}
            />
          ),
          deleteValue: () => "M3",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => {
            const upper = value.toUpperCase();
            return ["TN", "KG", "M3", "M2", "U"].includes(upper) ? upper : "M3";
          },
        }),
        title: "Unidad",
        minWidth: 70,
      },
      { ...keyColumn("cantidad", floatColumn), title: "Cantidad", minWidth: 80 },
      {
        ...keyColumn("tipo_material", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={tipoMaterialOptions}
              placeholder="Tipo..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => {
            const found = tipoMaterialOptions.find(
              (o) => o.value.toLowerCase() === value.toLowerCase() || o.label.toLowerCase() === value.toLowerCase()
            );
            return found?.value || value;
          },
        }),
        title: "Tipo",
        minWidth: 110,
      },
      { ...keyColumn("precio_total", floatColumn), title: "Precio Total", minWidth: 100 },
      {
        ...keyColumn("tipo_transporte", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={tipoTransporteOptions}
              placeholder="Transporte..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => {
            const found = tipoTransporteOptions.find(
              (o) => o.value.toLowerCase() === value.toLowerCase() || o.label.toLowerCase() === value.toLowerCase()
            );
            return found?.value || value;
          },
        }),
        title: "Transporte",
        minWidth: 110,
      },
      {
        ...keyColumn("maquinaria_id", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={maquinariaOptions}
              placeholder="Patente..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => {
            const maq = maquinarias.find((m) => m.id === rowData);
            return maq?.patente || "";
          },
          pasteValue: ({ value }: { value: string }) => {
            const normalized = value.replace(/[-\s]/g, "").toLowerCase();
            const found = maquinarias.find(
              (m) =>
                m.patente?.replace(/[-\s]/g, "").toLowerCase() === normalized ||
                m.codigo?.toLowerCase() === value.toLowerCase()
            );
            return found?.id || "";
          },
        }),
        title: "Patente",
        minWidth: 120,
      },
    ],
    [maquinariaOptions, maquinarias, obrasOptions]
  );

  const handleChange = useCallback(
    (newData: GridRow[]) => {
      const updatedData = newData.map((row) => {
        if (row._isNew) return row;
        const orig = initialData.find((r) => r.id === row.id);
        if (orig) {
          const isModified =
            row.remito_tercero !== orig.remito_tercero ||
            row.remito_local !== orig.remito_local ||
            row.fecha !== orig.fecha ||
            row.desde !== orig.desde ||
            row.hasta !== orig.hasta ||
            row.cantidad_viajes !== orig.cantidad_viajes ||
            row.unidad !== orig.unidad ||
            row.cantidad !== orig.cantidad ||
            row.tipo_material !== orig.tipo_material ||
            row.precio_total !== orig.precio_total ||
            row.tipo_transporte !== orig.tipo_transporte ||
            row.maquinaria_id !== orig.maquinaria_id;
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
        remito_tercero: "",
        remito_local: "",
        fecha: new Date().toISOString().split("T")[0],
        desde: "",
        hasta: "",
        cantidad_viajes: 1,
        unidad: "M3",
        cantidad: 18,
        tipo_material: "Tosca",
        precio_total: 0,
        tipo_transporte: "",
        maquinaria_id: "",
        _isNew: true,
        _isModified: false,
        _isDeleted: false,
      },
    ]);
  }, []);

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
          numero: row.remito_local || generateNumero(),
          fecha: row.fecha,
          obra_id: "", // Required field - will need to be handled
          material: row.tipo_material || "",
          cantidad: row.cantidad || 0,
          unidad: row.unidad,
          recibido_por: "",
          firmado: false,
          remito_tercero: row.remito_tercero || null,
          remito_local: row.remito_local || null,
          desde: row.desde || null,
          hasta: row.hasta || null,
          cantidad_viajes: row.cantidad_viajes || 1,
          tipo_material: row.tipo_material || null,
          precio_total: row.precio_total || 0,
          tipo_transporte: row.tipo_transporte || null,
          maquinaria_id: row.maquinaria_id || null,
        }));

      const updated = data
        .filter((row) => row._isModified && !row._isNew && row.id)
        .map((row) => ({
          id: row.id!,
          data: {
            remito_tercero: row.remito_tercero || null,
            remito_local: row.remito_local || null,
            fecha: row.fecha,
            desde: row.desde || null,
            hasta: row.hasta || null,
            cantidad_viajes: row.cantidad_viajes || 1,
            unidad: row.unidad,
            cantidad: row.cantidad || 0,
            tipo_material: row.tipo_material || null,
            precio_total: row.precio_total || 0,
            tipo_transporte: row.tipo_transporte || null,
            maquinaria_id: row.maquinaria_id || null,
            material: row.tipo_material || "",
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
  }, [data, onSave, clearDraft, generateNumero]);

  const createRow = useCallback(
    (): GridRow => ({
      remito_tercero: "",
      remito_local: "",
      fecha: new Date().toISOString().split("T")[0],
      desde: "",
      hasta: "",
      cantidad_viajes: 1,
      unidad: "M3",
      cantidad: 18,
      tipo_material: "Tosca",
      precio_total: 0,
      tipo_transporte: "",
      maquinaria_id: "",
      _isNew: true,
      _isModified: false,
      _isDeleted: false,
    }),
    []
  );

  // Calculate dynamic height for fullscreen mode
  const gridHeight = fullScreen ? window.innerHeight - 180 : 500;

  return (
    <div className={fullScreen ? "flex flex-col h-full" : "space-y-4"}>
      {showRestorePrompt && (
        <DraftRestorePrompt
          timestamp={draftTimestamp}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
      )}
      <div className="flex items-center justify-between mb-2">
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
      <p className="text-xs text-muted-foreground mb-2">
        💡 Podés copiar y pegar desde Excel. Usá Tab para navegar entre celdas. Escribí para buscar en los selectores.
      </p>
      <div className={`remitos-grid-container rounded-lg overflow-hidden border border-border ${fullScreen ? "flex-1" : ""}`}>
        <DataSheetGrid
          key={`remitos-grid-${obrasOptions.length}-${maquinariaOptions.length}`}
          value={data}
          onChange={handleChange}
          columns={columns}
          createRow={createRow}
          height={gridHeight}
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
