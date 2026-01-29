import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
  intColumn,
  isoDateColumn,
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
import { GridFilterToolbar, ColumnFilterHeader, useGridFilters, ColumnFilterConfig } from "@/components/shared/GridFilterToolbar";
import { formatDate } from "@/lib/utils";

// Type for react-datasheet-grid operations
interface Operation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  fromRowIndex: number;
  toRowIndex: number;
}

interface GridRow {
  id?: string;
  remito_tercero: string;
  remito_local: string;
  fecha: string | null;
  desde: string;
  hasta: string;
  cantidad_viajes: number | null;
  unidad: string;
  cantidad: number | null;
  tipo_material: string;
  precio_total: number | null;
  tipo_transporte: string;
  maquinaria_id: string;
  patente_tercero: string;
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
  const createdRowIds = useRef(new Set<string>()).current;
  const deletedRowIds = useRef(new Set<string>()).current;
  const updatedRowIds = useRef(new Set<string>()).current;
  
  const [, forceUpdate] = useState(0);

  const obrasOptions = useMemo(() => {
    const options = obras.map((o) => ({
      value: o.nombre,
      label: o.nombre,
    }));
    return [{ value: "", label: "Seleccionar..." }, ...options];
  }, [obras]);

  // Filter to only show vehicles (trucks, trailers, etc.)
  const vehiculoOptions = useMemo(() => {
    const vehicleTypes = ["camion", "batea", "acoplado", "carreton", "cisterna", "camioneta", "auto"];
    const filtered = maquinarias.filter((m) => m.patente && vehicleTypes.includes(m.tipo));
    const options = filtered.map((m) => {
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
        patente_tercero: r.patente_tercero || "",
        _isNew: false,
        _isModified: false,
        _isDeleted: false,
      })),
    [remitos]
  );

  const [data, setData] = useState<GridRow[]>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  // Filter configurations
  const filterConfigs: ColumnFilterConfig[] = useMemo(() => [
    { 
      column: "fecha", 
      title: "Fecha",
      getValue: (row: GridRow) => row.fecha ? formatDate(row.fecha) : ""
    },
    { column: "desde", title: "Desde" },
    { column: "hasta", title: "Hasta" },
    { column: "tipo_material", title: "Tipo Material" },
    { column: "tipo_transporte", title: "Transporte" },
  ], []);

  // Use grid filters hook
  const {
    globalSearch,
    setGlobalSearch,
    columnFilters,
    setColumnFilters,
    filteredData,
    activeFilterCount,
    getUniqueValues,
    toggleColumnFilter,
    clearColumnFilter,
    clearAllFilters,
  } = useGridFilters(
    data,
    filterConfigs,
    ["remito_tercero", "remito_local", "desde", "hasta", "tipo_material", "tipo_transporte"] as (keyof GridRow)[]
  );

  // Extend search to include patente
  const searchFilteredData = useMemo(() => {
    if (!globalSearch) return filteredData;
    
    const searchLower = globalSearch.toLowerCase();
    return filteredData.filter((row) => {
      if (row.remito_tercero?.toLowerCase().includes(searchLower)) return true;
      if (row.remito_local?.toLowerCase().includes(searchLower)) return true;
      if (row.desde?.toLowerCase().includes(searchLower)) return true;
      if (row.hasta?.toLowerCase().includes(searchLower)) return true;
      if (row.tipo_material?.toLowerCase().includes(searchLower)) return true;
      if (row.tipo_transporte?.toLowerCase().includes(searchLower)) return true;
      if (row.patente_tercero?.toLowerCase().includes(searchLower)) return true;
      
      // Check maquinaria patente
      const maq = maquinarias.find(m => m.id === row.maquinaria_id);
      if (maq?.patente?.toLowerCase().includes(searchLower)) return true;
      if (maq?.codigo?.toLowerCase().includes(searchLower)) return true;
      
      return false;
    });
  }, [filteredData, globalSearch, maquinarias]);

  useEffect(() => {
    setData(initialData);
    createdRowIds.clear();
    deletedRowIds.clear();
    updatedRowIds.clear();
  }, [initialData, createdRowIds, deletedRowIds, updatedRowIds]);

  const hasChanges = useMemo(() => {
    return createdRowIds.size > 0 || deletedRowIds.size > 0 || updatedRowIds.size > 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, createdRowIds.size, deletedRowIds.size, updatedRowIds.size]);

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
      { 
        ...keyColumn("fecha", isoDateColumn), 
        title: (
          <ColumnFilterHeader
            column="fecha"
            title="Fecha"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 140 
      },
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
        title: (
          <ColumnFilterHeader
            column="desde"
            title="Desde"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
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
        title: (
          <ColumnFilterHeader
            column="hasta"
            title="Hasta"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
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
        title: (
          <ColumnFilterHeader
            column="tipo_material"
            title="Tipo"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
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
        title: (
          <ColumnFilterHeader
            column="tipo_transporte"
            title="Transporte"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 110,
      },
      {
        ...keyColumn("maquinaria_id", {
          component: ({ rowData, setRowData, focus }: { rowData: GridRow; setRowData: (v: GridRow) => void; focus: boolean }) => {
            if (!rowData) return null;
            return (
              <GridSelectCell
                value={rowData.maquinaria_id}
                onChange={(v) => setRowData({ ...rowData, maquinaria_id: v })}
                options={vehiculoOptions}
                placeholder="Buscar vehículo..."
                focus={focus}
              />
            );
          },
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: GridRow }) => {
            if (!rowData) return "";
            const maq = maquinarias.find((m) => m.id === rowData.maquinaria_id);
            return maq?.patente || maq?.codigo || "";
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
        title: "Vehículo",
        minWidth: 130,
      },
      {
        ...keyColumn("patente_tercero", textColumn),
        title: "Patente Tercero",
        minWidth: 120,
      },
    ],
    [vehiculoOptions, maquinarias, obrasOptions, columnFilters, getUniqueValues, toggleColumnFilter, clearColumnFilter, setColumnFilters]
  );

  const handleChange = useCallback(
    (newData: GridRow[], operations: Operation[]) => {
      let processedData = [...newData];
      
      for (const operation of operations) {
        if (operation.type === 'DELETE') {
          const deletedRows = data.slice(operation.fromRowIndex, operation.toRowIndex);
          
          for (const row of deletedRows) {
            if (row.id && !row.id.startsWith('temp_')) {
              deletedRowIds.add(row.id);
              updatedRowIds.delete(row.id);
              
              const deletedRow = { ...row, _isDeleted: true };
              processedData.splice(operation.fromRowIndex, 0, deletedRow);
            } else if (row.id && row.id.startsWith('temp_')) {
              createdRowIds.delete(row.id);
            }
          }
        }
        
        if (operation.type === 'CREATE') {
          for (let i = operation.fromRowIndex; i < operation.toRowIndex; i++) {
            if (processedData[i] && !processedData[i].id) {
              const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              processedData[i] = { ...processedData[i], id: tempId, _isNew: true };
              createdRowIds.add(tempId);
            }
          }
        }
        
        if (operation.type === 'UPDATE') {
          for (let i = operation.fromRowIndex; i < operation.toRowIndex; i++) {
            const row = processedData[i];
            if (row && row.id && !row.id.startsWith('temp_') && !deletedRowIds.has(row.id)) {
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
                  row.maquinaria_id !== orig.maquinaria_id ||
                  row.patente_tercero !== orig.patente_tercero;
                
                if (isModified) {
                  updatedRowIds.add(row.id);
                } else {
                  updatedRowIds.delete(row.id);
                }
                processedData[i] = { ...row, _isModified: isModified };
              }
            }
          }
        }
      }
      
      setData(processedData);
      forceUpdate(n => n + 1);
    },
    [data, initialData, createdRowIds, deletedRowIds, updatedRowIds]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    createdRowIds.add(tempId);
    forceUpdate(n => n + 1);
    setData((prev) => [
      ...prev,
      {
        id: tempId,
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
        patente_tercero: "",
        _isNew: true,
        _isModified: false,
        _isDeleted: false,
      },
    ]);
  }, [createdRowIds]);

  const handleReset = useCallback(() => {
    setData(initialData);
    createdRowIds.clear();
    deletedRowIds.clear();
    updatedRowIds.clear();
    clearDraft();
    clearAllFilters();
    forceUpdate(n => n + 1);
  }, [initialData, clearDraft, clearAllFilters, createdRowIds, deletedRowIds, updatedRowIds]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const created = data
        .filter((row) => row.id && createdRowIds.has(row.id) && !row._isDeleted)
        .map((row) => ({
          numero: row.remito_local || generateNumero(),
          fecha: row.fecha,
          obra_id: "",
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
          patente_tercero: row.patente_tercero || null,
        }));

      const updated = data
        .filter((row) => row.id && updatedRowIds.has(row.id) && !row._isDeleted)
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
            patente_tercero: row.patente_tercero || null,
            material: row.tipo_material || "",
          },
        }));

      const deleted = Array.from(deletedRowIds);

      await onSave({ created, updated, deleted });
      
      const newData = data.filter(row => !row._isDeleted);
      setData(newData);
      createdRowIds.clear();
      deletedRowIds.clear();
      updatedRowIds.clear();
      clearDraft();
      forceUpdate(n => n + 1);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, clearDraft, generateNumero, createdRowIds, deletedRowIds, updatedRowIds]);

  const createRow = useCallback((): GridRow => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    createdRowIds.add(tempId);
    forceUpdate(n => n + 1);
    return {
      id: tempId,
      remito_tercero: "",
      remito_local: "",
      fecha: null,
      desde: "",
      hasta: "",
      cantidad_viajes: 1,
      unidad: "M3",
      cantidad: 18,
      tipo_material: "Tosca",
      precio_total: 0,
      tipo_transporte: "",
      maquinaria_id: "",
      patente_tercero: "",
      _isNew: true,
      _isModified: false,
      _isDeleted: false,
    };
  }, [createdRowIds]);

  const gridHeight = fullScreen ? window.innerHeight - 180 : 500;
  
  // Get the data to display (filtered if there are filters/search)
  const displayData = globalSearch || activeFilterCount > 0 ? searchFilteredData : data;

  return (
    <div className={fullScreen ? "flex flex-col h-full" : "space-y-4"}>
      {showRestorePrompt && (
        <DraftRestorePrompt
          timestamp={draftTimestamp}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
      )}
      <div className="flex items-center justify-between gap-2 mb-2">
        <GridFilterToolbar
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          data={data}
          filterConfigs={filterConfigs}
        >
          <Button onClick={handleAddRow} variant="outline" size="sm" className="h-8 border-border">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Agregar
          </Button>
          {hasChanges && (
            <Button onClick={handleReset} variant="ghost" size="sm" className="h-8 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Descartar
            </Button>
          )}
        </GridFilterToolbar>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="sm" className="h-8 bg-primary hover:bg-primary/90">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Guardar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        💡 Usá los iconos de filtro en cada columna para filtrar. Tab para navegar. Escribí para buscar en los selectores.
      </p>
      <div className={`remitos-grid-container rounded-lg overflow-hidden border border-border ${fullScreen ? "flex-1" : ""}`}>
        <DataSheetGrid
          key={`remitos-grid-${obrasOptions.length}-${vehiculoOptions.length}`}
          value={displayData}
          onChange={(newData, ops) => {
            // Map changes back to full data array when filtering is active
            if (globalSearch || activeFilterCount > 0) {
              const fullData = [...data];
              for (const op of ops) {
                if (op.type === 'UPDATE') {
                  for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
                    const filteredRow = newData[i];
                    const originalIndex = data.findIndex(r => r.id === filteredRow.id);
                    if (originalIndex !== -1) {
                      fullData[originalIndex] = filteredRow;
                    }
                  }
                }
              }
              handleChange(fullData, ops);
            } else {
              handleChange(newData, ops);
            }
          }}
          columns={columns}
          createRow={createRow}
          height={gridHeight}
          rowClassName={({ rowData }) => {
            if (rowData._isDeleted || (rowData.id && deletedRowIds.has(rowData.id))) return "row-deleted";
            if (rowData._isNew || (rowData.id && createdRowIds.has(rowData.id))) return "row-new";
            if (rowData._isModified || (rowData.id && updatedRowIds.has(rowData.id))) return "row-modified";
            return "";
          }}
        />
      </div>
    </div>
  );
}
