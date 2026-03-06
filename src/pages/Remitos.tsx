import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Receipt,
  Loader2,
  Truck,
  DollarSign,
  Upload,
  Package,
} from "lucide-react";
import { FilterBar, FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { useUrlSearch } from "@/hooks/useUrlState";
import { useRemitos, RemitoForm } from "@/hooks/useRemitos";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useClientes } from "@/hooks/useClientes";
import { RemitosSimpleGrid } from "@/components/remitos/RemitosSimpleGrid";
import { RemitosCSVImportDialog } from "@/components/remitos/CSVImportDialog";
import { toast } from "sonner";

export default function Remitos() {
  const { remitos, loading, batchSave, fetchRemitos } = useRemitos();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();
  const { clientes } = useClientes();

  const [searchTerm, setSearchTerm] = useUrlSearch("");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
  });
  const [importOpen, setImportOpen] = useState(false);

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

  const filteredRemitos = useMemo(() => {
    const dateFiltered = filterByDateAndObra(
      remitos.map(r => ({ ...r, fecha: r.fecha, obra_id: r.obra_id })),
      filters
    );

    return dateFiltered.filter((r) =>
      (r.remito_tercero?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.remito_local?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      r.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tipo_material?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.tipo_transporte?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.proveedor?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.cliente?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );
  }, [remitos, filters, searchTerm]);

  const generateNumero = () => {
    const year = new Date().getFullYear();
    const count = remitos.length + 1;
    return `REM-${year}-${count.toString().padStart(4, "0")}`;
  };

  const handleGridSave = async (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
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

  // Stats calculations
  const totalRemitos = remitos.length;
  const totalViajes = remitos.reduce((sum, r) => sum + (r.cantidad_viajes || 1), 0);
  const totalCantidad = remitos.reduce((sum, r) => sum + r.cantidad, 0);
  const totalPrecio = remitos.reduce((sum, r) => sum + (r.precio_total || 0), 0);

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
        <FilterBar obras={obras} onFilterChange={setFilters} />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por remito, tipo o transporte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setImportOpen(true)}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Importar
        </Button>
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

      {/* Editable Grid */}
      <div className="card-industrial p-4">
        <RemitosSimpleGrid
          remitos={filteredRemitos}
          maquinarias={maquinarias}
          obras={obras}
          clientes={clientes}
          onSave={handleGridSave}
          generateNumero={generateNumero}
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
          // Force explicit refetch after bulk import to ensure grid updates
          setTimeout(() => fetchRemitos(), 500);
        }}
        maquinariasMap={maquinariasMap}
        patentesMap={patentesMap}
        obrasMap={obrasMap}
        clientesMap={clientesMap}
      />
    </MainLayout>
  );
}
