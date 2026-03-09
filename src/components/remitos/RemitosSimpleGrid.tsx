import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Trash2, Plus, Save, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { RemitoForm, RemitoWithRelations } from "@/hooks/useRemitos";
import { ObraWithRelations } from "@/hooks/useObras";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import { ClienteDB } from "@/hooks/useClientes";

interface LocalRow {
  _localId: string;
  _isNew: boolean;
  _isModified: boolean;
  id?: string;
  fecha: string;
  remito_tercero: string;
  remito_local: string;
  desde: string;
  hasta: string;
  tipo_material: string;
  tipo_transporte: string;
  maquinaria_id: string;
  patente_tercero: string;
  cliente: string;
  cantidad_viajes: number;
  cantidad_uni: number | null;
  cantidad: number;
  precio_unitario: number | null;
  precio_total: number;
  observaciones: string;
  unidad: string;
  proveedor: string;
}

const TIPO_MATERIAL_OPTIONS = [
  "Residuos", "Desmonte", "Cascote", "Escombro", "Tierra", "Piedra",
  "Movimiento interno", "Tosca", "Cemento", "Hormigon", "Traslado",
  "Cubiertas", "Frezado", "Cobertura de residuos", "Arena", "Hormigon H30",
  "Tierra negra", "Relleno", "Piedra 30/50", "Materiales varios",
  "Raices", "Traslado interno", "Barro",
];

const TIPO_TRANSPORTE_OPTIONS = [
  "Calamina Sur", "Geo hermanos", "Diaz Neiva", "japones", "Cato", "Tatu",
  "Patan", "Hormicret", "Lamacol", "Britcom", "Ramon romero gomez", "Duraez",
];

const UNIDAD_OPTIONS = ["TN", "KG", "M3", "M2", "U"];

interface RemitosSimpleGridProps {
  remitos: RemitoWithRelations[];
  obras: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  clientes: ClienteDB[];
  onSave: (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
    deleted: string[];
  }) => Promise<void>;
  generateNumero: () => string;
}

let localIdCounter = 0;
const nextLocalId = () => `local-${++localIdCounter}-${Date.now()}`;

function remitoToLocal(r: RemitoWithRelations): LocalRow {
  return {
    _localId: r.id,
    _isNew: false,
    _isModified: false,
    id: r.id,
    fecha: r.fecha,
    remito_tercero: r.remito_tercero || "",
    remito_local: r.remito_local || r.numero || "",
    desde: r.desde || "",
    hasta: r.hasta || "",
    tipo_material: r.tipo_material || r.material || "",
    tipo_transporte: r.tipo_transporte || "",
    maquinaria_id: r.maquinaria_id || "",
    patente_tercero: r.patente_tercero || "",
    cliente: r.cliente || "",
    cantidad_viajes: r.cantidad_viajes || 1,
    cantidad_uni: r.cantidad_uni ?? null,
    cantidad: r.cantidad,
    precio_unitario: r.precio_unitario ?? null,
    precio_total: r.precio_total || 0,
    observaciones: r.observaciones || "",
    unidad: r.unidad || "M3",
    proveedor: r.proveedor || "",
  };
}

function createEmptyRow(numero: string): LocalRow {
  return {
    _localId: nextLocalId(),
    _isNew: true,
    _isModified: false,
    fecha: new Date().toISOString().split("T")[0],
    remito_tercero: "",
    remito_local: "",
    desde: "",
    hasta: "",
    tipo_material: "",
    tipo_transporte: "",
    maquinaria_id: "",
    patente_tercero: "",
    cliente: "",
    cantidad_viajes: 0,
    cantidad_uni: null,
    cantidad: 0,
    precio_unitario: null,
    precio_total: 0,
    observaciones: "",
    unidad: "M3",
    proveedor: "",
  };
}

export function RemitosSimpleGrid({
  remitos,
  obras,
  maquinarias,
  clientes,
  onSave,
  generateNumero,
}: RemitosSimpleGridProps) {
  const [rows, setRows] = useState<LocalRow[]>(() =>
    remitos.map(remitoToLocal)
  );
  const [isSaving, setIsSaving] = useState(false);
  const deletedIds = useRef<Set<string>>(new Set());
  const prevRemitosRef = useRef(remitos);

  // Smart merge: sync DB changes without losing local edits
  useEffect(() => {
    if (remitos === prevRemitosRef.current) return;
    prevRemitosRef.current = remitos;

    setRows((prev) => {
      const prevDbCount = prev.filter((r) => !r._isNew).length;
      const newDbCount = remitos.length;
      const bulkThreshold = 5;

      // Detect bulk import: many new rows arrived at once → full reset
      if (newDbCount - prevDbCount >= bulkThreshold) {
        toast.info(`${newDbCount - prevDbCount} remitos nuevos cargados`);
        return remitos.map(remitoToLocal);
      }

      // Identify rows the user is actively editing
      const modifiedLocalIds = new Set(
        prev.filter((r) => r._isModified || r._isNew).map((r) => r._localId)
      );

      // If no edits, just replace everything
      if (modifiedLocalIds.size === 0) {
        return remitos.map(remitoToLocal);
      }

      // Keep user-edited/new rows untouched
      const userEditing = prev.filter((r) => modifiedLocalIds.has(r._localId));

      // Build updated rows from DB, excluding ones being edited
      const editingDbIds = new Set(
        userEditing.filter((r) => r.id).map((r) => r.id)
      );
      const fromDB = remitos
        .filter((r) => !editingDbIds.has(r.id))
        .map(remitoToLocal);

      const merged = [...fromDB, ...userEditing];

      // Only show toast if row count actually changed (new external data)
      if (merged.length !== prev.length) {
        const diff = newDbCount - prevDbCount;
        if (diff > 0) {
          toast.info(`${diff} remito${diff > 1 ? "s" : ""} nuevo${diff > 1 ? "s" : ""} cargado${diff > 1 ? "s" : ""}`);
        }
      }

      return merged;
    });
  }, [remitos]);

  const obrasOptions: ComboboxOption[] = useMemo(() => {
    return obras.map((o) => ({
      value: o.nombre,
      label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
      searchValue: `${o.numero || ""} ${o.nombre}`,
    }));
  }, [obras]);

  const vehiculoOptions: ComboboxOption[] = useMemo(() => {
    const vehicleTypes: Array<MaquinariaWithRelations["tipo"]> = [
      "camion", "batea", "acoplado", "carreton", "cisterna", "camioneta", "auto",
    ];
    return maquinarias
      .filter((m) => vehicleTypes.includes(m.tipo))
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
      .map((m) => ({
        value: m.id,
        label: [m.codigo || "", m.tipo, m.patente || ""].filter(Boolean).join(" - "),
        searchValue: `${m.codigo || ""} ${m.tipo} ${m.patente || ""}`,
      }));
  }, [maquinarias]);

  const clienteOptions: ComboboxOption[] = useMemo(() => {
    return obras.map((o) => ({
      value: o.nombre,
      label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
    }));
  }, [obras]);

  const updateRow = useCallback(
    (localId: string, field: keyof LocalRow, value: string | number | null) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row._localId !== localId) return row;
          const updated = { ...row, [field]: value, _isModified: true };
          // Auto-calculate precio_total
          const viajes = updated.cantidad_viajes || 1;
          const cantUni = updated.cantidad_uni ?? 0;
          const pUnit = updated.precio_unitario ?? 0;
          updated.cantidad = viajes * cantUni;
          updated.precio_total = viajes * pUnit;
          return updated;
        })
      );
    },
    []
  );

  const addRow = useCallback(() => {
    const numero = generateNumero();
    setRows((prev) => [createEmptyRow(numero), ...prev]);
  }, [generateNumero]);

  const duplicateRow = useCallback(
    (localId: string) => {
      setRows((prev) => {
        const source = prev.find((r) => r._localId === localId);
        if (!source) return prev;
        const idx = prev.indexOf(source);
        const dup: LocalRow = {
          ...source,
          _localId: nextLocalId(),
          _isNew: true,
          _isModified: false,
          id: undefined,
          remito_local: generateNumero(),
        };
        const next = [...prev];
        next.splice(idx, 0, dup);
        return next;
      });
    },
    [generateNumero]
  );

  const deleteRow = useCallback((localId: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r._localId === localId);
      if (row?.id) {
        deletedIds.current.add(row.id);
      }
      return prev.filter((r) => r._localId !== localId);
    });
  }, []);

  const hasChanges = useMemo(() => {
    return (
      deletedIds.current.size > 0 ||
      rows.some((r) => r._isNew || r._isModified)
    );
  }, [rows]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const created: RemitoForm[] = [];
      const updated: { id: string; data: Partial<RemitoForm> }[] = [];

      for (const row of rows) {
        const formData: RemitoForm = {
          numero: row.remito_local || generateNumero(),
          fecha: row.fecha,
          material: row.tipo_material || "Tosca",
          cantidad: row.cantidad,
          unidad: row.unidad,
          recibido_por: "",
          firmado: false,
          remito_tercero: row.remito_tercero || undefined,
          remito_local: row.remito_local || undefined,
          desde: row.desde || undefined,
          hasta: row.hasta || undefined,
          tipo_material: row.tipo_material || undefined,
          tipo_transporte: row.tipo_transporte || undefined,
          maquinaria_id: row.maquinaria_id || undefined,
          patente_tercero: row.patente_tercero || undefined,
          cliente: row.cliente || undefined,
          cantidad_viajes: row.cantidad_viajes,
          cantidad_uni: row.cantidad_uni,
          precio_unitario: row.precio_unitario,
          precio_total: row.precio_total,
          proveedor: row.proveedor || undefined,
          observaciones: row.observaciones || undefined,
        };

        if (row._isNew) {
          created.push(formData);
        } else if (row._isModified && row.id) {
          updated.push({ id: row.id, data: formData });
        }
      }

      await onSave({
        created,
        updated,
        deleted: Array.from(deletedIds.current),
      });
      deletedIds.current.clear();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPrecio = rows.reduce((s, r) => s + (r.precio_total || 0), 0);
  const totalViajes = rows.reduce((s, r) => s + (r.cantidad_viajes || 0), 0);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            className="text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar fila
          </Button>
          <span className="text-xs text-muted-foreground">
            {rows.length} remitos · {totalViajes} viajes · $
            {totalPrecio.toLocaleString("es-AR")}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="h-8 text-xs"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1" />
          )}
          Guardar
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs min-w-[110px] sticky left-0 bg-muted/50 z-10">Fecha</TableHead>
              <TableHead className="text-xs min-w-[100px]">Rem. Tercero</TableHead>
              <TableHead className="text-xs min-w-[100px]">Rem. Local</TableHead>
              <TableHead className="text-xs min-w-[160px]">Desde</TableHead>
              <TableHead className="text-xs min-w-[160px]">Hasta</TableHead>
              <TableHead className="text-xs min-w-[120px]">Tipo</TableHead>
              <TableHead className="text-xs min-w-[120px]">Transporte</TableHead>
              <TableHead className="text-xs min-w-[160px]">Vehículo</TableHead>
              <TableHead className="text-xs min-w-[100px]">Pat. Tercero</TableHead>
              <TableHead className="text-xs min-w-[140px]">Cliente</TableHead>
              <TableHead className="text-xs min-w-[65px] text-right">Viajes</TableHead>
              <TableHead className="text-xs min-w-[80px] text-right">C. Uni.</TableHead>
              <TableHead className="text-xs min-w-[80px] text-right">C. Total</TableHead>
              <TableHead className="text-xs min-w-[80px] text-right">P. Unit.</TableHead>
              <TableHead className="text-xs min-w-[90px] text-right">P. Total</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row._localId}
                className={
                  row._isNew
                    ? "bg-green-500/5"
                    : row._isModified
                    ? "bg-yellow-500/5"
                    : ""
                }
              >
                <TableCell className="p-1 sticky left-0 bg-background z-10">
                  <Input
                    type="date"
                    value={row.fecha}
                    onChange={(e) =>
                      updateRow(row._localId, "fecha", e.target.value)
                    }
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    value={row.remito_tercero}
                    onChange={(e) =>
                      updateRow(row._localId, "remito_tercero", e.target.value)
                    }
                    className="h-7 text-xs"
                    placeholder="Rem..."
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    value={row.remito_local}
                    onChange={(e) =>
                      updateRow(row._localId, "remito_local", e.target.value)
                    }
                    className="h-7 text-xs"
                    placeholder="Local..."
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Combobox
                    options={obrasOptions}
                    value={row.desde}
                    onValueChange={(v) =>
                      updateRow(row._localId, "desde", v)
                    }
                    placeholder="Desde..."
                    searchPlaceholder="Buscar obra..."
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Combobox
                    options={obrasOptions}
                    value={row.hasta}
                    onValueChange={(v) =>
                      updateRow(row._localId, "hasta", v)
                    }
                    placeholder="Hasta..."
                    searchPlaceholder="Buscar obra..."
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={row.tipo_material || "_empty"}
                    onValueChange={(v) =>
                      updateRow(row._localId, "tipo_material", v === "_empty" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">Seleccionar...</SelectItem>
                      {TIPO_MATERIAL_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={row.tipo_transporte || "_empty"}
                    onValueChange={(v) =>
                      updateRow(row._localId, "tipo_transporte", v === "_empty" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Transporte..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">Seleccionar...</SelectItem>
                      {TIPO_TRANSPORTE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <Combobox
                    options={vehiculoOptions}
                    value={row.maquinaria_id}
                    onValueChange={(v) =>
                      updateRow(row._localId, "maquinaria_id", v)
                    }
                    placeholder="Vehículo..."
                    searchPlaceholder="Buscar vehículo..."
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    value={row.patente_tercero}
                    onChange={(e) =>
                      updateRow(
                        row._localId,
                        "patente_tercero",
                        e.target.value
                      )
                    }
                    className="h-7 text-xs"
                    placeholder="Patente..."
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Combobox
                    options={clienteOptions}
                    value={row.cliente}
                    onValueChange={(v) =>
                      updateRow(row._localId, "cliente", v)
                    }
                    placeholder="Cliente..."
                    searchPlaceholder="Buscar cliente..."
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    value={row.cantidad_viajes || ""}
                    onChange={(e) =>
                      updateRow(
                        row._localId,
                        "cantidad_viajes",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="h-7 text-xs text-right"
                    min={0}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    value={row.cantidad_uni ?? ""}
                    onChange={(e) =>
                      updateRow(
                        row._localId,
                        "cantidad_uni",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="h-7 text-xs text-right"
                    min={0}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <div className="h-7 flex items-center justify-end text-xs text-muted-foreground px-2 bg-muted/30 rounded-md">
                    {(row.cantidad || 0).toLocaleString("es-AR")}
                  </div>
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    value={row.precio_unitario ?? ""}
                    onChange={(e) =>
                      updateRow(
                        row._localId,
                        "precio_unitario",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="h-7 text-xs text-right"
                    min={0}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <div className="h-7 flex items-center justify-end text-xs font-medium px-2 bg-muted/30 rounded-md">
                    ${(row.precio_total || 0).toLocaleString("es-AR")}
                  </div>
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => duplicateRow(row._localId)}
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteRow(row._localId)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={16}
                  className="text-center text-muted-foreground text-xs py-8"
                >
                  Sin remitos. Hacé clic en "Agregar fila" para comenzar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
