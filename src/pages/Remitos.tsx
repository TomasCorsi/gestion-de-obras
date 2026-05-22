import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Receipt,
  Loader2,
  Truck,
  DollarSign,
  Upload,
  Package,
  Plus,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import { FilterBar, FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { useUrlSearch } from "@/hooks/useUrlState";
import { useRemitos, RemitoForm, RemitoWithRelations } from "@/hooks/useRemitos";
import { useRemitosCreators } from "@/hooks/useRemitosCreators";
import { useAuth } from "@/hooks/useAuth";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useClientes } from "@/hooks/useClientes";
import { useProveedores } from "@/hooks/useProveedores";
import { RemitosSimpleGrid } from "@/components/remitos/RemitosSimpleGrid";
import { RemitosCSVImportDialog } from "@/components/remitos/CSVImportDialog";
import { RemitoQuickFormDialog, RemitoEditData } from "@/components/remitos/RemitoQuickFormDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { LiquidacionClienteDialog } from "@/components/remitos/LiquidacionClienteDialog";
import { LiquidacionObraDialog } from "@/components/remitos/LiquidacionObraDialog";
import { AsignarPreciosMasivosDialog } from "@/components/remitos/AsignarPreciosMasivosDialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const SERGIO_USER_ID = "c92028bd-dd42-416d-8892-f00b5ef90f8f";
const FRANCO_USER_ID = "2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a";
const CALAMINASUR_USER_ID = "73236f17-0602-41aa-8959-ee14be48f477";

export default function Remitos() {
  const { user, role } = useAuth();
  const isSergio = user?.id === SERGIO_USER_ID;
  const isFranco = user?.id === FRANCO_USER_ID;
  const isCalaminasur = user?.id === CALAMINASUR_USER_ID;
  const isOwnOnly = isSergio || isFranco || isCalaminasur;
  const isAdminOrCapataz = role === "admin" || role === "capataz";
  const { remitos, loading, batchSave, fetchRemitos } = useRemitos();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();
  const { clientes } = useClientes();
  const { proveedores } = useProveedores();

  const [searchTerm, setSearchTerm] = useUrlSearch("");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
    maquinariaId: undefined,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRemito, setEditingRemito] = useState<RemitoEditData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("__all__");
  const [creadorFilter, setCreadorFilter] = useState<string>("__all__");
  const [liquidacionOpen, setLiquidacionOpen] = useState(false);
  const [liquidacionObraOpen, setLiquidacionObraOpen] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [preciosOpen, setPreciosOpen] = useState(false);

  // Distinct created_by ids in remitos
  const creadorIds = useMemo(
    () => [...new Set(remitos.map(r => (r as any).created_by).filter(Boolean) as string[])],
    [remitos]
  );
  const creadoresMap = useRemitosCreators(creadorIds, isAdminOrCapataz);

  // Unique tipo_material values for filter
  const tiposUnicos = useMemo(() => {
    return [...new Set(remitos.map(r => r.tipo_material).filter(Boolean) as string[])].sort();
  }, [remitos]);

  // Maps for import dialog
  const maquinariasMap = useMemo(() => {
    const map: Record<string, string> = {};
    maquinarias.forEach(m => {
      if (m.codigo) map[m.codigo] = m.id;
    });
    return map;
  }, [maquinarias]);

  const patentesMap = useMemo(() => {
    const map: Record<string, string> = {};
    maquinarias.forEach(m => {
      if (m.patente) {
        const normalized = m.patente.toUpperCase().replace(/[-\s]/g, '');
        map[m.patente.toUpperCase()] = m.id;
        map[normalized] = m.id;
      }
    });
    return map;
  }, [maquinarias]);

  const obrasMap = useMemo(() => {
    const map: Record<string, string> = {};
    obras.forEach(o => {
      map[o.nombre.toLowerCase().trim()] = o.nombre;
      if (o.numero) {
        map[o.numero.toLowerCase().trim()] = o.nombre;
      }
    });
    return map;
  }, [obras]);

  const clientesMap = useMemo(() => {
    const map: Record<string, string> = {};
    clientes.filter(c => c.activo).forEach(c => {
      map[c.nombre.toLowerCase().trim()] = c.nombre;
    });
    obras.forEach(o => {
      if (o.numero && o.cliente?.nombre) {
        map[o.numero.toLowerCase().trim()] = o.cliente.nombre;
      }
    });
    return map;
  }, [clientes, obras]);

  // Maquinarias lookup for search
  const maquinariasById = useMemo(() => {
    const map: Record<string, { codigo: string | null; patente: string | null }> = {};
    maquinarias.forEach(m => { map[m.id] = { codigo: m.codigo, patente: m.patente }; });
    return map;
  }, [maquinarias]);

  const filteredRemitos = useMemo(() => {
    // Use date filter only (not obra_id from filterByDateAndObra)
    let result = filterByDateAndObra(
      remitos.map(r => ({ ...r, fecha: r.fecha, obra_id: r.obra_id })),
      { ...filters, obraId: undefined }
    );

    // Filter by obra: match selected obra name against desde/hasta
    if (filters.obraId) {
      const obraSeleccionada = obras.find(o => o.id === filters.obraId);
      if (obraSeleccionada) {
        const obraNombre = obraSeleccionada.nombre;
        result = result.filter(r => r.desde === obraNombre || r.hasta === obraNombre);
      }
    }

    // Filter by tipo_material
    if (tipoFilter && tipoFilter !== "__all__") {
      result = result.filter(r => r.tipo_material === tipoFilter);
    }

    // Filter by creator (admin/capataz only)
    if (creadorFilter && creadorFilter !== "__all__") {
      result = result.filter(r => (r as any).created_by === creadorFilter);
    }

    if (!searchTerm) return result;

    const term = searchTerm.toLowerCase();
    return result.filter((r) => {
      if (
        (r.remito_tercero?.toLowerCase() || "").includes(term) ||
        (r.remito_local?.toLowerCase() || "").includes(term) ||
        r.numero.toLowerCase().includes(term) ||
        (r.tipo_material?.toLowerCase() || "").includes(term) ||
        (r.tipo_transporte?.toLowerCase() || "").includes(term) ||
        (r.proveedor?.toLowerCase() || "").includes(term) ||
        (r.cliente?.toLowerCase() || "").includes(term) ||
        ((r as any).cliente_destino?.toLowerCase() || "").includes(term) ||
        (r.desde?.toLowerCase() || "").includes(term) ||
        (r.hasta?.toLowerCase() || "").includes(term)
      ) return true;

      if (r.maquinaria_id) {
        const maq = maquinariasById[r.maquinaria_id];
        if (maq) {
          if (maq.codigo?.toLowerCase().includes(term)) return true;
          if (maq.patente?.toLowerCase().includes(term)) return true;
        }
      }

      return false;
    });
  }, [remitos, filters, searchTerm, maquinariasById, tipoFilter, creadorFilter, obras]);

  const generateNumero = () => {
    const year = new Date().getFullYear();
    const count = remitos.length + 1;
    return `REM-${year}-${count.toString().padStart(4, "0")}`;
  };

  const handleEdit = (r: RemitoWithRelations) => {
    setEditingRemito({
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
      cliente_destino: (r as any).cliente_destino || "",
      cantidad_viajes: r.cantidad_viajes || 1,
      cantidad_uni: r.cantidad_uni ?? null,
      cantidad: r.cantidad || 0,
      unidad: r.unidad || "M3",
      precio_unitario: r.precio_unitario ?? null,
      precio_total: r.precio_total || 0,
      precio_calc_mode: r.precio_calc_mode || "viajes",
      proveedor: r.proveedor || "",
      observaciones: r.observaciones || "",
      forma_pago: (r as any).forma_pago || "",
      cliente_cantera: (r as any).cliente_cantera || "",
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await batchSave({ created: [], updated: [], deleted: [deleteId] });
      toast.success("Remito eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
    setDeleteId(null);
  };

  const handleFormSubmit = async (remito: RemitoForm & { id?: string }) => {
    const { id, ...data } = remito;
    if (id) {
      const results = await batchSave({ created: [], updated: [{ id, data }], deleted: [] });
      if (results.errors > 0) throw new Error("Error al actualizar");
      toast.success("Remito actualizado");
    } else {
      const results = await batchSave({ created: [data as RemitoForm], updated: [], deleted: [] });
      if (results.errors > 0) throw new Error("Error al crear");
      toast.success("Remito creado exitosamente");
    }
    setEditingRemito(null);
  };

  const getClienteForObra = (obraNombre: string | null | undefined) => {
    if (!obraNombre) return "";
    const obra = obras.find(o => o.nombre === obraNombre);
    if (!obra) return "";
    const num = parseInt(obra.numero || "0", 10);
    if (num >= 300 && obra.cliente?.nombre) return obra.cliente.nombre;
    return "";
  };

  const handleRecalcularClientes = async () => {
    setRecalculando(true);
    try {
      const updates: { id: string; data: Partial<RemitoForm> }[] = [];

      for (const remito of remitos) {
        const nuevoCliente = getClienteForObra(remito.desde);
        const nuevoDestino = getClienteForObra(remito.hasta);

        const clienteChanged = (nuevoCliente || "") !== (remito.cliente || "");
        const destinoChanged = (nuevoDestino || "") !== (remito.cliente_destino || "");

        if (clienteChanged || destinoChanged) {
          updates.push({
            id: remito.id,
            data: {
              cliente: nuevoCliente || "",
              cliente_destino: nuevoDestino || "",
            },
          });
        }
      }

      if (updates.length === 0) {
        toast.info("Todos los clientes ya están correctos");
      } else {
        const results = await batchSave({ created: [], updated: updates, deleted: [] });
        toast.success(`${updates.length} remitos actualizados (${results.errors} errores)`);
      }
    } catch (error) {
      console.error("Error recalculando:", error);
      toast.error("Error al recalcular clientes");
    } finally {
      setRecalculando(false);
    }
  };

  const exportarExcel = () => {
    if (filteredRemitos.length === 0) {
      toast.error("No hay remitos para exportar");
      return;
    }

    const workbook = XLSX.utils.book_new();

    const getMaquinariaLabel = (maqId: string | null) => {
      if (!maqId) return "-";
      const m = maquinarias.find(m => m.id === maqId);
      return m ? [m.codigo, m.patente].filter(Boolean).join(" - ") : "-";
    };

    const data = filteredRemitos.map(r => ({
      "Fecha": r.fecha ? format(parseISO(r.fecha), "dd/MM/yyyy") : "",
      "Rem. Tercero": r.remito_tercero || "",
      "Rem. Local": r.remito_local || "",
      "Desde": r.desde || "",
      "Hasta": r.hasta || "",
      "Tipo Material": r.tipo_material || "",
      "Tipo Transporte": r.tipo_transporte || "",
      "Maquinaria": getMaquinariaLabel(r.maquinaria_id),
      "Pat. Tercero": r.patente_tercero || "",
      "Cliente Origen": r.cliente || "",
      "Cliente Destino": r.cliente_destino || "",
      "Cliente Cantera": (r as any).cliente_cantera || "",
      "Cant. Viajes": r.cantidad_viajes || 1,
      "Cant. Unitaria": r.cantidad_uni || "",
      "Cantidad Total": r.cantidad || 0,
      "Unidad": r.unidad || "",
      "Precio Unitario": r.precio_unitario || "",
      "Precio Total": r.precio_total || 0,
      "Proveedor": r.proveedor || "",
      "Observaciones": r.observaciones || "",
      ...(isAdminOrCapataz ? { "Cargado por": (r as any).created_by ? (creadoresMap[(r as any).created_by] || "") : "" } : {}),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String((row as any)[key] || "").length).slice(0, 50)) + 2,
    }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, ws, "Remitos");
    const fileName = `Remitos_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel exportado correctamente");
  };

  // Stats calculations
  const totalRemitos = filteredRemitos.length;
  const totalViajes = filteredRemitos.reduce((sum, r) => sum + (r.cantidad_viajes || 1), 0);
  const totalCantidad = filteredRemitos.reduce((sum, r) => sum + r.cantidad, 0);
  const totalPrecio = filteredRemitos.reduce((sum, r) => sum + (r.precio_total || 0), 0);

  if (loading) {
    return (
      <MainLayout title="Remitos" subtitle="Gestión de remitos y entregas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Remitos" subtitle="Gestión de remitos y entregas">
      {/* Filter Bar */}
      <div className="mb-4">
        <FilterBar
          obras={obras}
          maquinarias={maquinarias}
          showMaquinariaFilter
          onFilterChange={setFilters}
        />
      </div>

      {/* Tipo Material Filter */}
      <div className="flex flex-wrap gap-4 mb-4">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[200px] bg-card">
            <SelectValue placeholder="Tipo material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los tipos</SelectItem>
            {tiposUnicos.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdminOrCapataz && (
          <Select value={creadorFilter} onValueChange={setCreadorFilter}>
            <SelectTrigger className="w-[220px] bg-card">
              <SelectValue placeholder="Cargado por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los usuarios</SelectItem>
              {creadorIds.map((uid) => (
                <SelectItem key={uid} value={uid}>
                  {creadoresMap[uid] || `Usuario ${uid.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por remito, tipo, transporte, código o patente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Button
          onClick={() => { setEditingRemito(null); setFormOpen(true); }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </Button>
        <Button
          variant="outline"
          onClick={exportarExcel}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </Button>
        {!isOwnOnly && (
          <>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button
              variant="outline"
              onClick={() => setLiquidacionOpen(true)}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Liquidar
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreciosOpen(true)}
              className="gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Asignar Precios
            </Button>
            <Button
              variant="outline"
              onClick={handleRecalcularClientes}
              disabled={recalculando}
              className="gap-2"
            >
              {recalculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Recalcular Clientes
            </Button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalRemitos}</p>
            <p className="text-sm text-muted-foreground">Total Remitos</p>
          </div>
          <Receipt className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalViajes}</p>
            <p className="text-sm text-muted-foreground">Total Viajes</p>
          </div>
          <Truck className="w-8 h-8 text-success" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {totalCantidad.toLocaleString("es-AR")}
            </p>
            <p className="text-sm text-muted-foreground">Cantidad Total</p>
          </div>
          <Package className="w-8 h-8 text-warning" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              ${totalPrecio.toLocaleString("es-AR")}
            </p>
            <p className="text-sm text-muted-foreground">Precio Total</p>
          </div>
          <DollarSign className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>

      {/* Read-only Grid */}
      <div className="card-industrial p-4">
        <RemitosSimpleGrid
          remitos={filteredRemitos}
          maquinarias={maquinarias}
          obras={obras}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
          creadoresMap={isAdminOrCapataz ? creadoresMap : undefined}
          showClienteCantera={isFranco || isAdminOrCapataz}
          hideExtrasForFranco={isFranco}
        />
      </div>

      {/* CSV Import Dialog */}
      <RemitosCSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (remitosToImport) => {
          const results = await batchSave({ created: remitosToImport, updated: [], deleted: [] });
          if (results.errors > 0) {
            throw new Error(`${results.errors} errores durante la importación`);
          }
          setTimeout(() => fetchRemitos(), 500);
        }}
        maquinariasMap={maquinariasMap}
        patentesMap={patentesMap}
        obrasMap={obrasMap}
        clientesMap={clientesMap}
      />

      {/* Quick Form Dialog */}
      <RemitoQuickFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRemito(null);
        }}
        obras={obras}
        maquinarias={maquinarias}
        clientes={clientes}
        proveedores={proveedores}
        generateNumero={generateNumero}
        onSubmit={handleFormSubmit}
        editingRemito={editingRemito}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="¿Eliminar remito?"
        description="Esta acción no se puede deshacer. Se eliminará permanentemente este remito."
      />

      {/* Liquidacion Dialog */}
      <LiquidacionClienteDialog
        open={liquidacionOpen}
        onOpenChange={setLiquidacionOpen}
        remitos={filteredRemitos}
      />

      {/* Asignar Precios Masivos Dialog */}
      <AsignarPreciosMasivosDialog
        open={preciosOpen}
        onOpenChange={setPreciosOpen}
        remitos={filteredRemitos}
        batchSave={batchSave}
      />
    </MainLayout>
  );
}
