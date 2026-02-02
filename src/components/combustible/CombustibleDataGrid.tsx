import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
  isoDateColumn,
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
  fecha: string | null;
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
  fullScreen?: boolean;
}

const STORAGE_KEY = "combustible-grid-draft";

export function CombustibleDataGrid({
  cargas,
  obras,
  maquinarias,
  operadores,
  onSave,
  fullScreen = false,
}: CombustibleDataGridProps) {
  const gridHeight = fullScreen ? window.innerHeight - 250 : 500;
  
  const createdRowIds = useRef(new Set<string>()).current;
  const deletedRowIds = useRef(new Set<string>()).current;
  const updatedRowIds = useRef(new Set<string>()).current;
  
  const [, forceUpdate] = useState(0);
  
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
        label: [m.codigo || "", m.tipo, m.patente || ""].filter(Boolean).join(" - "),
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
  
  // Snapshot system: freeze filtered data during editing to prevent row jumping
  const [isEditing, setIsEditing] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<GridRow[] | null>(null);

  // Filter configurations for ALL columns
  const filterConfigs: ColumnFilterConfig[] = useMemo(() => [
    { 
      column: "fecha", 
      title: "Fecha",
      getValue: (row: GridRow) => row.fecha ? formatDate(row.fecha) : ""
    },
    { column: "comprobante", title: "Comprobante" },
    { 
      column: "obra_id", 
      title: "Obra",
      getValue: (row: GridRow) => {
        const obra = activeObras.find(o => o.id === row.obra_id);
        return obra?.nombre || "";
      }
    },
    { 
      column: "maquinaria_id", 
      title: "Maquinaria",
      getValue: (row: GridRow) => {
        const maq = maquinarias.find(m => m.id === row.maquinaria_id);
        return maq ? `${maq.codigo || ""} - ${maq.tipo}` : "";
      }
    },
    { column: "operador", title: "Operador" },
    { 
      column: "litros", 
      title: "Litros",
      getValue: (row: GridRow) => row.litros?.toString() || ""
    },
    { 
      column: "precio_litro", 
      title: "$/Litro",
      getValue: (row: GridRow) => row.precio_litro?.toString() || ""
    },
    { 
      column: "costo_total", 
      title: "Total",
      getValue: (row: GridRow) => row.costo_total?.toString() || ""
    },
    { 
      column: "horas_maquina", 
      title: "Hs Máq",
      getValue: (row: GridRow) => row.horas_maquina?.toString() || ""
    },
    { column: "estacion", title: "Estación" },
  ], [activeObras, maquinarias]);

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
    ["comprobante", "operador", "estacion"] as (keyof GridRow)[]
  );

  // Extend search to include obra and maquinaria names
  const searchFilteredData = useMemo(() => {
    if (!globalSearch) return filteredData;
    
    const searchLower = globalSearch.toLowerCase();
    return filteredData.filter((row) => {
      // Check direct fields
      if (row.comprobante?.toLowerCase().includes(searchLower)) return true;
      if (row.operador?.toLowerCase().includes(searchLower)) return true;
      if (row.estacion?.toLowerCase().includes(searchLower)) return true;
      
      // Check obra name
      const obra = activeObras.find(o => o.id === row.obra_id);
      if (obra?.nombre.toLowerCase().includes(searchLower)) return true;
      
      // Check maquinaria
      const maq = maquinarias.find(m => m.id === row.maquinaria_id);
      if (maq) {
        if (maq.codigo?.toLowerCase().includes(searchLower)) return true;
        if (maq.tipo?.toLowerCase().includes(searchLower)) return true;
        if (maq.patente?.toLowerCase().includes(searchLower)) return true;
      }
      
      return false;
    });
  }, [filteredData, globalSearch, activeObras, maquinarias]);

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
        ...keyColumn("comprobante", textColumn), 
        title: (
          <ColumnFilterHeader
            column="comprobante"
            title="Comprobante"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 120 
      },
      {
        ...keyColumn("obra_id", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={obraOptions}
              placeholder="Sin asignar"
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => activeObras.find((o) => o.id === rowData)?.nombre || "",
          pasteValue: ({ value }: { value: string }) => activeObras.find((o) => o.nombre.toLowerCase() === value.toLowerCase())?.id || "",
        }),
        title: (
          <ColumnFilterHeader
            column="obra_id"
            title="Obra"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 180,
      },
      {
        ...keyColumn("maquinaria_id", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={maquinariaOptions}
              placeholder="Sin asignar"
              focus={focus}
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
        title: (
          <ColumnFilterHeader
            column="maquinaria_id"
            title="Maquinaria"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 180,
      },
      {
        ...keyColumn("operador", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={operadorOptions}
              placeholder="Sin asignar"
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
        }),
        title: (
          <ColumnFilterHeader
            column="operador"
            title="Operador"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 160,
      },
      { 
        ...keyColumn("litros", floatColumn), 
        title: (
          <ColumnFilterHeader
            column="litros"
            title="Litros"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 90 
      },
      { 
        ...keyColumn("precio_litro", floatColumn), 
        title: (
          <ColumnFilterHeader
            column="precio_litro"
            title="$/Litro"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 100 
      },
      { 
        ...keyColumn("costo_total", floatColumn), 
        title: (
          <ColumnFilterHeader
            column="costo_total"
            title="Total"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 110,
        disabled: true,
      },
      { 
        ...keyColumn("horas_maquina", floatColumn), 
        title: (
          <ColumnFilterHeader
            column="horas_maquina"
            title="Hs Máq"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 90 
      },
      { 
        ...keyColumn("estacion", textColumn), 
        title: (
          <ColumnFilterHeader
            column="estacion"
            title="Estación"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 140 
      },
    ],
    [activeObras, maquinarias, obraOptions, maquinariaOptions, operadorOptions, columnFilters, getUniqueValues, toggleColumnFilter, clearColumnFilter, setColumnFilters]
  );

  const handleChange = useCallback(
    (newData: GridRow[], operations: Operation[]) => {
      let processedData = [...newData];
      
      for (const operation of operations) {
        if (operation.type === 'DELETE') {
          // For delete, we need to find the actual rows by ID since indices may not match
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
                  row.fecha !== orig.fecha || 
                  row.obra_id !== orig.obra_id || 
                  row.maquinaria_id !== orig.maquinaria_id || 
                  row.operador !== orig.operador ||
                  row.litros !== orig.litros || 
                  row.precio_litro !== orig.precio_litro || 
                  row.horas_maquina !== orig.horas_maquina ||
                  row.estacion !== orig.estacion ||
                  row.comprobante !== orig.comprobante;
                
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
      
      // Auto-calculate costo_total for all rows
      processedData = processedData.map((row) => {
        const litros = row.litros || 0;
        const precio = row.precio_litro || 0;
        const calculatedTotal = litros * precio;
        return { ...row, costo_total: calculatedTotal };
      });
      
      setData(processedData);
      forceUpdate(n => n + 1);
    },
    [data, initialData, createdRowIds, deletedRowIds, updatedRowIds]
  );

  const createRow = useCallback((): GridRow => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    createdRowIds.add(tempId);
    forceUpdate(n => n + 1);
    return {
      id: tempId,
      fecha: null,
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
    };
  }, [createdRowIds]);

  const handleAddRow = useCallback(() => {
    setData((prev) => [...prev, createRow()]);
  }, [createRow]);

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
        .filter((row) => row.id && updatedRowIds.has(row.id) && !row._isDeleted)
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
  }, [data, onSave, clearDraft, createdRowIds, deletedRowIds, updatedRowIds]);

  // Callback when cell becomes active - capture snapshot
  const handleActiveCellChange = useCallback(({ cell }: { cell: { col: number; row: number } | null }) => {
    if (cell && !isEditing && (globalSearch || activeFilterCount > 0)) {
      setIsEditing(true);
      setEditingSnapshot(searchFilteredData);
    }
  }, [isEditing, globalSearch, activeFilterCount, searchFilteredData]);

  // Callback when grid loses focus - release snapshot
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setEditingSnapshot(null);
  }, []);

  // Get the data to display (filtered if there are filters/search)
  // During editing with filters, use snapshot but with updated values
  const displayData = useMemo(() => {
    if (!globalSearch && activeFilterCount === 0) {
      return data;
    }
    
    if (isEditing && editingSnapshot) {
      // Update values in snapshot with current data values
      return editingSnapshot.map(snapRow => {
        const currentRow = data.find(r => r.id === snapRow.id);
        return currentRow || snapRow;
      });
    }
    
    return searchFilteredData;
  }, [data, globalSearch, activeFilterCount, isEditing, editingSnapshot, searchFilteredData]);

  return (
    <div className={`flex flex-col ${fullScreen ? 'h-full' : 'space-y-4'}`}>
      {showRestorePrompt && (
        <DraftRestorePrompt
          timestamp={draftTimestamp}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
      )}
      <div className={`flex items-center justify-between gap-2 ${fullScreen ? 'px-0 pb-2' : ''}`}>
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
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving} 
          size="sm"
          className="h-8 bg-primary hover:bg-primary/90"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Guardar
        </Button>
      </div>
      {!fullScreen && (
        <p className="text-xs text-muted-foreground">
          💡 Usá los iconos de filtro en cada columna para filtrar. Tab para navegar. El total se calcula automáticamente.
        </p>
      )}
      <div className={`combustible-grid-container rounded-lg overflow-hidden border border-border ${fullScreen ? 'flex-1' : ''}`}>
        <DataSheetGrid
          value={displayData}
          onChange={(newData, ops) => {
            // Map changes back to full data array when filtering is active
            if (globalSearch || activeFilterCount > 0) {
              const fullData = [...data];
              const transformedOps: Operation[] = [];
              
              for (const op of ops) {
                if (op.type === 'UPDATE') {
                  for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
                    const filteredRow = newData[i];
                    const originalIndex = data.findIndex(r => r.id === filteredRow.id);
                    if (originalIndex !== -1) {
                      fullData[originalIndex] = filteredRow;
                      // Create transformed operation with correct index in full array
                      transformedOps.push({
                        type: 'UPDATE',
                        fromRowIndex: originalIndex,
                        toRowIndex: originalIndex + 1,
                      });
                    }
                  }
                } else {
                  // For CREATE/DELETE, just pass through (these shouldn't happen while filtering)
                  transformedOps.push(op);
                }
              }
              handleChange(fullData, transformedOps);
            } else {
              handleChange(newData, ops);
            }
          }}
          columns={columns}
          createRow={createRow}
          height={gridHeight}
          onActiveCellChange={handleActiveCellChange}
          onBlur={handleBlur}
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
