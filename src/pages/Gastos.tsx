import { useState, useMemo, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Fuel,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Truck,
  User,
  DollarSign,
  Droplets,
  Upload,
  Download,
  HardHat,
  Receipt,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { FilterBar, FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { useCombustible, CargaCombustibleWithRelations, CargaCombustibleForm } from "@/hooks/useCombustible";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { usePersonal, RolPersonal } from "@/hooks/usePersonal";
import { useAsignacionesPersonal } from "@/hooks/useAsignacionesPersonal";
import { AsignacionesMaquinariaObra } from "@/components/maquinarias/AsignacionesMaquinariaObra";
import { AsignacionesPersonalObra } from "@/components/personal/AsignacionesPersonalObra";
import { CombustibleCSVImportDialog } from "@/components/combustible/CSVImportDialog";
import { CombustibleDataGrid } from "@/components/combustible/CombustibleDataGrid";
import { CombustibleRepartidorTab } from "@/components/gastos/CombustibleRepartidorTab";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const rolesConfig: Record<RolPersonal, { label: string; color: string }> = {
  capataz: { label: "Capataz", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  maquinista: { label: "Maquinista", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  chofer: { label: "Chofer", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  administrativo: { label: "Administrativo", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  ayudante: { label: "Ayudante", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  sereno: { label: "Sereno", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  mecanico: { label: "Mecánico", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  topografo: { label: "Topógrafo", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  repartidor_calecita: { label: "Repartidor Calecita", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Gastos() {
  const { cargas, loading: loadingCombustible, createCarga, updateCarga, deleteCarga, fetchCargas, batchSave } = useCombustible();
  const { gastos, loading: loadingOtros, createGasto, updateGasto, deleteGasto } = useOtrosGastos();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();
  const { personal } = usePersonal();
  const { asignaciones } = useAsignacionesPersonal();
  
  const [activeTab, setActiveTab] = useState("maquinarias");
  
  // Combustible state
  const [viewModeComb, setViewModeComb] = useState<"table" | "grid">("table");
  const [searchTermComb, setSearchTermComb] = useState("");
  const [filtersComb, setFiltersComb] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
    maquinariaId: undefined,
  });
  const [formOpenComb, setFormOpenComb] = useState(false);
  const [detailOpenComb, setDetailOpenComb] = useState(false);
  const [deleteOpenComb, setDeleteOpenComb] = useState(false);
  const [importOpenComb, setImportOpenComb] = useState(false);
  const [selectedCarga, setSelectedCarga] = useState<CargaCombustibleWithRelations | null>(null);
  const [isEditingComb, setIsEditingComb] = useState(false);
  const [isSubmittingComb, setIsSubmittingComb] = useState(false);
  
  // Otros Gastos state
  const [searchTermOtros, setSearchTermOtros] = useState("");
  const [filtersOtros, setFiltersOtros] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
  });
  const [formOpenOtros, setFormOpenOtros] = useState(false);
  const [detailOpenOtros, setDetailOpenOtros] = useState(false);
  const [deleteOpenOtros, setDeleteOpenOtros] = useState(false);
  const [selectedGasto, setSelectedGasto] = useState<OtroGastoWithRelations | null>(null);
  const [isEditingOtros, setIsEditingOtros] = useState(false);
  const [isSubmittingOtros, setIsSubmittingOtros] = useState(false);
  
  // Form data
  const [formDataComb, setFormDataComb] = useState<CargaCombustibleForm>({
    fecha: new Date().toISOString().split("T")[0],
    obra_id: "",
    maquinaria_id: "",
    litros: 0,
    precio_litro: 950,
    costo_total: 0,
    horas_maquina: 0,
    estacion: "",
    operador: "",
    comprobante: "",
  });
  
  const [formDataOtros, setFormDataOtros] = useState<OtroGastoForm>({
    fecha: new Date().toISOString().split("T")[0],
    obra_id: null,
    categoria: "varios",
    descripcion: "",
    monto: 0,
    comprobante: "",
    proveedor: "",
    observaciones: "",
  });

  const activeObras = obras.filter(o => o.estado !== "finalizada");
  const operadores = personal.filter(p => p.activo);

  // CSV Import maps
  const obrasMap = useMemo(() => {
    const map: Record<string, string> = {};
    obras.forEach(o => {
      map[o.nombre.toLowerCase()] = o.id;
    });
    return map;
  }, [obras]);

  const maquinariasMap = useMemo(() => {
    const map: Record<string, string> = {};
    maquinarias.forEach(m => {
      if (m.codigo) {
        map[m.codigo] = m.id;
      }
    });
    return map;
  }, [maquinarias]);

  // Mapa de patentes normalizadas para búsqueda flexible
  const patentesMap = useMemo(() => {
    const map: Record<string, string> = {};
    maquinarias.forEach(m => {
      if (m.patente) {
        // Guardar versión normalizada (sin espacios/guiones, mayúsculas)
        const normalized = m.patente.trim().toUpperCase().replace(/[-\s]/g, '');
        map[normalized] = m.id;
        // También guardar versión original en mayúsculas
        map[m.patente.trim().toUpperCase()] = m.id;
      }
    });
    return map;
  }, [maquinarias]);

  // Mapa de nombres de maquinaria para búsqueda por nombre
  const nombresMap = useMemo(() => {
    const map: Record<string, string> = {};
    maquinarias.forEach(m => {
      if (m.nombre) {
        map[m.nombre.trim().toLowerCase()] = m.id;
      }
    });
    return map;
  }, [maquinarias]);

  // Filter combustible
  const filteredCargas = useMemo(() => {
    const dateFiltered = filterByDateAndObra(
      cargas.map(c => ({ ...c, fecha: c.fecha, obra_id: c.obra_id, maquinaria_id: c.maquinaria_id })),
      filtersComb
    );
    
    return dateFiltered.filter((c) =>
      c.maquinaria?.nombre?.toLowerCase().includes(searchTermComb.toLowerCase()) ||
      c.operador?.toLowerCase().includes(searchTermComb.toLowerCase()) ||
      c.estacion?.toLowerCase().includes(searchTermComb.toLowerCase()) ||
      c.obra?.nombre?.toLowerCase().includes(searchTermComb.toLowerCase())
    );
  }, [cargas, filtersComb, searchTermComb]);

  // Filter otros gastos
  const filteredGastos = useMemo(() => {
    const dateFiltered = filterByDateAndObra(
      gastos.map(g => ({ ...g, fecha: g.fecha, obra_id: g.obra_id })),
      filtersOtros
    );
    
    return dateFiltered.filter((g) =>
      g.descripcion?.toLowerCase().includes(searchTermOtros.toLowerCase()) ||
      g.proveedor?.toLowerCase().includes(searchTermOtros.toLowerCase()) ||
      g.obra?.nombre?.toLowerCase().includes(searchTermOtros.toLowerCase())
    );
  }, [gastos, filtersOtros, searchTermOtros]);

  // Stats
  const totalLitros = filteredCargas.reduce((sum, c) => sum + c.litros, 0);
  const totalCostoComb = filteredCargas.reduce((sum, c) => sum + c.costo_total, 0);
  const totalCostoOtros = filteredGastos.reduce((sum, g) => sum + g.monto, 0);

  // Combustible handlers
  const handleNewComb = () => {
    setIsEditingComb(false);
    setFormDataComb({
      fecha: new Date().toISOString().split("T")[0],
      obra_id: "",
      maquinaria_id: "",
      litros: 0,
      precio_litro: 950,
      costo_total: 0,
      horas_maquina: 0,
      estacion: "",
      operador: "",
      comprobante: "",
    });
    setFormOpenComb(true);
  };

  const handleEditComb = (carga: CargaCombustibleWithRelations) => {
    setIsEditingComb(true);
    setSelectedCarga(carga);
    setFormDataComb({
      fecha: carga.fecha,
      obra_id: carga.obra_id,
      maquinaria_id: carga.maquinaria_id,
      litros: carga.litros,
      precio_litro: carga.precio_litro,
      costo_total: carga.costo_total,
      horas_maquina: carga.horas_maquina,
      estacion: carga.estacion,
      operador: carga.operador,
      comprobante: carga.comprobante || "",
    });
    setFormOpenComb(true);
  };

  const handleViewComb = (carga: CargaCombustibleWithRelations) => {
    setSelectedCarga(carga);
    setDetailOpenComb(true);
  };

  const handleDeleteComb = (carga: CargaCombustibleWithRelations) => {
    setSelectedCarga(carga);
    setDeleteOpenComb(true);
  };

  const confirmDeleteComb = async () => {
    if (selectedCarga) {
      await deleteCarga(selectedCarga.id);
    }
    setDeleteOpenComb(false);
  };

  const calculateTotal = (litros: number, precio: number) => litros * precio;

  const handleSubmitComb = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingComb(true);
    
    const cargaData = {
      fecha: formDataComb.fecha || null,
      obra_id: formDataComb.obra_id || null,
      maquinaria_id: formDataComb.maquinaria_id || null,
      litros: formDataComb.litros || 0,
      precio_litro: formDataComb.precio_litro || 0,
      costo_total: calculateTotal(formDataComb.litros || 0, formDataComb.precio_litro || 0),
      horas_maquina: formDataComb.horas_maquina || 0,
      estacion: formDataComb.estacion || null,
      operador: formDataComb.operador || null,
      comprobante: formDataComb.comprobante || null,
    };

    if (isEditingComb && selectedCarga) {
      await updateCarga(selectedCarga.id, cargaData);
    } else {
      await createCarga(cargaData);
    }
    
    setIsSubmittingComb(false);
    setFormOpenComb(false);
  };

  const handleCSVImport = async (cargasToImport: CargaCombustibleForm[]) => {
    for (const carga of cargasToImport) {
      await createCarga(carga);
    }
  };

  const handleExportExcelComb = () => {
    const exportData = filteredCargas.map((c) => ({
      Fecha: formatDate(c.fecha),
      Obra: c.obra?.nombre || "-",
      Maquinaria: c.maquinaria?.nombre || "-",
      Código: c.maquinaria?.codigo || "-",
      Operador: c.operador || "-",
      Litros: c.litros,
      "Precio/Litro": c.precio_litro,
      "Costo Total": c.costo_total,
      "Horas Máquina": c.horas_maquina || "-",
      Estación: c.estacion || "-",
      Comprobante: c.comprobante || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Combustible");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 12),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `combustible_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${exportData.length} registros exportados a Excel`);
  };

  const handleGridSaveComb = async (changes: {
    created: CargaCombustibleForm[];
    updated: { id: string; data: Partial<CargaCombustibleForm> }[];
    deleted: string[];
  }) => {
    try {
      const results = await batchSave(changes);
      
      if (results.errors === 0) {
        toast.success(`Guardados: ${results.created} nuevos, ${results.updated} actualizados, ${results.deleted} eliminados`);
      } else {
        toast.warning(`Guardados con ${results.errors} errores: ${results.created} nuevos, ${results.updated} actualizados, ${results.deleted} eliminados`);
      }
    } catch (error) {
      console.error("Error saving grid changes:", error);
      toast.error("Error al guardar los cambios");
    }
  };

  // Otros Gastos handlers
  const handleNewOtros = () => {
    setIsEditingOtros(false);
    setFormDataOtros({
      fecha: new Date().toISOString().split("T")[0],
      obra_id: null,
      categoria: "varios",
      descripcion: "",
      monto: 0,
      comprobante: "",
      proveedor: "",
      observaciones: "",
    });
    setFormOpenOtros(true);
  };

  const handleEditOtros = (gasto: OtroGastoWithRelations) => {
    setIsEditingOtros(true);
    setSelectedGasto(gasto);
    setFormDataOtros({
      fecha: gasto.fecha,
      obra_id: gasto.obra_id,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      comprobante: gasto.comprobante || "",
      proveedor: gasto.proveedor || "",
      observaciones: gasto.observaciones || "",
    });
    setFormOpenOtros(true);
  };

  const handleViewOtros = (gasto: OtroGastoWithRelations) => {
    setSelectedGasto(gasto);
    setDetailOpenOtros(true);
  };

  const handleDeleteOtros = (gasto: OtroGastoWithRelations) => {
    setSelectedGasto(gasto);
    setDeleteOpenOtros(true);
  };

  const confirmDeleteOtros = async () => {
    if (selectedGasto) {
      await deleteGasto(selectedGasto.id);
    }
    setDeleteOpenOtros(false);
  };

  const handleSubmitOtros = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOtros(true);
    
    const gastoData = {
      fecha: formDataOtros.fecha || null,
      obra_id: formDataOtros.obra_id || null,
      categoria: formDataOtros.categoria || "varios",
      descripcion: formDataOtros.descripcion || "",
      monto: formDataOtros.monto || 0,
      comprobante: formDataOtros.comprobante || null,
      proveedor: formDataOtros.proveedor || null,
      observaciones: formDataOtros.observaciones || null,
    };

    if (isEditingOtros && selectedGasto) {
      await updateGasto(selectedGasto.id, gastoData);
    } else {
      await createGasto(gastoData);
    }
    
    setIsSubmittingOtros(false);
    setFormOpenOtros(false);
  };

  const loading = loadingCombustible || loadingOtros;

  if (loading) {
    return (
      <MainLayout title="Gastos" subtitle="Control de gastos operativos">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  // Full screen grid mode for Combustible
  if (viewModeComb === "grid" && activeTab === "combustible") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Compact header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Combustible</h1>
            <div className="flex border border-border rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewModeComb("table")}
                className="rounded-none"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="rounded-none"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpenComb(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewModeComb("table")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Full screen grid */}
        <div className="flex-1 overflow-hidden p-4">
          <CombustibleDataGrid
            cargas={filteredCargas}
            obras={obras}
            maquinarias={maquinarias}
            operadores={operadores}
            onSave={handleGridSaveComb}
            fullScreen
          />
        </div>

        {/* Import Dialog */}
        <CombustibleCSVImportDialog
          open={importOpenComb}
          onOpenChange={setImportOpenComb}
          onImport={handleCSVImport}
          obrasMap={obrasMap}
          maquinariasMap={maquinariasMap}
          patentesMap={patentesMap}
          nombresMap={nombresMap}
        />
      </div>
    );
  }

  return (
    <MainLayout title="Gastos" subtitle="Control de gastos operativos">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="maquinarias" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Maquinarias
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <HardHat className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="combustible" className="flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            Combustible
          </TabsTrigger>
          <TabsTrigger value="repartidor" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Repartidor
          </TabsTrigger>
        </TabsList>

        {/* Tab: Maquinarias */}
        <TabsContent value="maquinarias">
          <AsignacionesMaquinariaObra />
        </TabsContent>

        {/* Tab: Personal */}
        <TabsContent value="personal">
          {/* Stats by Role - Disponibles */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            {Object.entries(rolesConfig).map(([key, config]) => {
              const totalActivo = personal.filter((p) => p.rol === key && p.activo).length;
              const asignados = asignaciones
                .filter((a) => a.rol === key)
                .reduce((sum, a) => sum + a.cantidad, 0);
              const disponibles = Math.max(0, totalActivo - asignados);
              return (
                <div key={key} className="card-industrial p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{disponibles}</p>
                  <Badge className={cn("status-badge text-[10px] mt-1", config.color)}>
                    {config.label}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {asignados > 0 ? `${asignados} asignados` : "disponibles"}
                  </p>
                </div>
              );
            })}
          </div>

          <AsignacionesPersonalObra />
        </TabsContent>

        {/* Tab: Combustible */}
        <TabsContent value="combustible">
          <div className="mb-4">
            <FilterBar obras={obras} maquinarias={maquinarias} onFilterChange={setFiltersComb} showMaquinariaFilter />
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por maquinaria, operador o estación..."
                value={searchTermComb}
                onChange={(e) => setSearchTermComb(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex border border-border rounded-md overflow-hidden">
                <Button
                  variant={viewModeComb === "table" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewModeComb("table")}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewModeComb === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewModeComb("grid")}
                  className="rounded-none"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleExportExcelComb}
                className="border-border"
              >
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => setImportOpenComb(true)}
                className="border-border"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button
                onClick={handleNewComb}
                className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar Carga
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{cargas.length}</p>
                <p className="text-sm text-muted-foreground">Cargas Registradas</p>
              </div>
              <Fuel className="w-8 h-8 text-primary" />
            </div>
            <div className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{totalLitros.toLocaleString()} L</p>
                <p className="text-sm text-muted-foreground">Litros Totales</p>
              </div>
              <Droplets className="w-8 h-8 text-primary" />
            </div>
            <div className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCostoComb)}</p>
                <p className="text-sm text-muted-foreground">Gasto Total</p>
              </div>
              <DollarSign className="w-8 h-8 text-warning" />
            </div>
            <div className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {cargas.length > 0 ? (totalLitros / cargas.length).toFixed(0) : 0} L
                </p>
                <p className="text-sm text-muted-foreground">Promedio/Carga</p>
              </div>
              <Fuel className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          {viewModeComb === "table" ? (
            <div className="card-industrial overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Maquinaria</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Operador</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Litros</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Total</TableHead>
                    <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCargas.map((carga, index) => (
                    <TableRow
                      key={carga.id}
                      className="border-border table-row-hover animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <span className="flex items-center gap-1 text-foreground">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(carga.fecha)}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {carga.obra?.nombre || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground">{carga.maquinaria?.nombre || "-"}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-3 h-3" />
                          {carga.operador}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 font-mono text-foreground">
                          <Droplets className="w-3 h-3 text-primary" />
                          {carga.litros} L
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-foreground">
                        {formatCurrency(carga.costo_total)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={() => handleViewComb(carga)} className="cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditComb(carga)} className="cursor-pointer">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteComb(carga)} className="text-destructive cursor-pointer">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <CombustibleDataGrid
              cargas={filteredCargas}
              obras={obras}
              maquinarias={maquinarias}
              operadores={operadores}
              onSave={handleGridSaveComb}
            />
          )}
        </TabsContent>

        {/* Tab: Repartidor Calecita */}
        <TabsContent value="repartidor">
          <CombustibleRepartidorTab />
        </TabsContent>

      </Tabs>

      {/* ===== COMBUSTIBLE DIALOGS ===== */}
      <FormDialog
        isDirty
        open={formOpenComb}
        onOpenChange={setFormOpenComb}
        title={isEditingComb ? "Editar Carga" : "Registrar Carga de Combustible"}
        size="lg"
      >
        <form onSubmit={handleSubmitComb} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formDataComb.fecha}
                onChange={(e) => setFormDataComb({ ...formDataComb, fecha: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra_id">Obra</Label>
              <Select
                value={formDataComb.obra_id || "none"}
                onValueChange={(value) => setFormDataComb({ ...formDataComb, obra_id: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {activeObras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maquinaria_id">Maquinaria</Label>
              <Combobox
                options={[
                  { value: "none", label: "Sin asignar" },
                  ...[...maquinarias]
                    .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
                    .map((m) => ({
                      value: m.id,
                      label: `${m.codigo} - ${m.tipo}`,
                    }))
                ]}
                value={formDataComb.maquinaria_id || "none"}
                onValueChange={(value) => setFormDataComb({ ...formDataComb, maquinaria_id: value === "none" ? "" : value })}
                placeholder="Seleccionar maquinaria"
                searchPlaceholder="Buscar por código..."
                emptyText="No se encontró maquinaria."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operador">Operador</Label>
              <Select
                value={formDataComb.operador || "none"}
                onValueChange={(value) => setFormDataComb({ ...formDataComb, operador: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar operador" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {operadores.map((o) => (
                    <SelectItem key={o.id} value={`${o.nombre} ${o.apellido}`}>
                      {o.nombre} {o.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estacion">Estación</Label>
              <Input
                id="estacion"
                value={formDataComb.estacion}
                onChange={(e) => setFormDataComb({ ...formDataComb, estacion: e.target.value })}
                placeholder="Ej: YPF Trelew"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="litros">Litros</Label>
              <Input
                id="litros"
                type="number"
                min="0"
                step="0.1"
                value={formDataComb.litros}
                onChange={(e) => setFormDataComb({ ...formDataComb, litros: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_litro">Precio/Litro</Label>
              <Input
                id="precio_litro"
                type="number"
                min="0"
                step="0.01"
                value={formDataComb.precio_litro}
                onChange={(e) => setFormDataComb({ ...formDataComb, precio_litro: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <div className="h-10 px-3 py-2 bg-muted border border-border rounded-md flex items-center font-mono">
                {formatCurrency(calculateTotal(formDataComb.litros || 0, formDataComb.precio_litro || 0))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_maquina">Horas Máquina</Label>
              <Input
                id="horas_maquina"
                type="number"
                min="0"
                step="0.1"
                value={formDataComb.horas_maquina}
                onChange={(e) => setFormDataComb({ ...formDataComb, horas_maquina: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante">Comprobante</Label>
              <Input
                id="comprobante"
                value={formDataComb.comprobante}
                onChange={(e) => setFormDataComb({ ...formDataComb, comprobante: e.target.value })}
                placeholder="Nº de factura/ticket"
                className="bg-muted border-border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpenComb(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmittingComb}>
              {isSubmittingComb ? "Guardando..." : isEditingComb ? "Actualizar" : "Registrar"}
            </Button>
          </div>
        </form>
      </FormDialog>

      <DetailDialog
        open={detailOpenComb}
        onOpenChange={setDetailOpenComb}
        title="Detalle de Carga"
      >
        {selectedCarga && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Fecha" value={formatDate(selectedCarga.fecha)} />
              <DetailRow label="Obra" value={selectedCarga.obra?.nombre || "-"} />
              <DetailRow label="Maquinaria" value={selectedCarga.maquinaria?.nombre || "-"} />
              <DetailRow label="Operador" value={selectedCarga.operador || "-"} />
              <DetailRow label="Estación" value={selectedCarga.estacion || "-"} />
            </DetailSection>
            <DetailSection title="Combustible">
              <DetailRow label="Litros" value={`${selectedCarga.litros} L`} />
              <DetailRow label="Precio/Litro" value={formatCurrency(selectedCarga.precio_litro)} />
              <DetailRow label="Total" value={formatCurrency(selectedCarga.costo_total)} />
              <DetailRow label="Horas Máquina" value={selectedCarga.horas_maquina.toString()} />
              <DetailRow label="Comprobante" value={selectedCarga.comprobante || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      <DeleteConfirmDialog
        open={deleteOpenComb}
        onOpenChange={setDeleteOpenComb}
        onConfirm={confirmDeleteComb}
        title="Eliminar Carga"
        description="¿Estás seguro de eliminar esta carga de combustible? Esta acción no se puede deshacer."
      />

      <CombustibleCSVImportDialog
        open={importOpenComb}
        onOpenChange={setImportOpenComb}
        onImport={handleCSVImport}
        obrasMap={obrasMap}
        maquinariasMap={maquinariasMap}
        patentesMap={patentesMap}
        nombresMap={nombresMap}
      />
    </MainLayout>
  );
}
