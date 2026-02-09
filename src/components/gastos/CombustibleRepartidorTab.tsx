import { useState, useMemo } from "react";
import { Search, Fuel, Droplets, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar, FilterState } from "@/components/shared/FilterBar";
import { useCargasRepartidorAll } from "@/hooks/useCargasRepartidorAll";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function formatOperador(op: { nombre: string | null; apellido: string | null } | null | undefined): string {
  if (!op) return "-";
  return `${op.apellido || ""}, ${op.nombre?.charAt(0) || ""}.`.trim();
}

export function CombustibleRepartidorTab() {
  const { cargas, isLoading } = useCargasRepartidorAll();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
    maquinariaId: undefined,
  });

  const filtered = useMemo(() => {
    let result = [...cargas];

    if (filters.fechaDesde) {
      const desde = filters.fechaDesde instanceof Date
        ? filters.fechaDesde.toISOString().split("T")[0]
        : filters.fechaDesde;
      result = result.filter((c) => c.fecha >= desde);
    }
    if (filters.fechaHasta) {
      const hasta = filters.fechaHasta instanceof Date
        ? filters.fechaHasta.toISOString().split("T")[0]
        : filters.fechaHasta;
      result = result.filter((c) => c.fecha <= hasta);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          formatOperador(c.operador).toLowerCase().includes(term) ||
          (c.maquinaria?.codigo || "").toLowerCase().includes(term) ||
          (c.maquinaria?.tipo || "").toLowerCase().includes(term) ||
          (c.obra?.nombre || "").toLowerCase().includes(term) ||
          formatOperador(c.parte_diario?.personal).toLowerCase().includes(term)
      );
    }

    return result;
  }, [cargas, filters, searchTerm]);

  const totalLitros = filtered.reduce((sum, c) => sum + (c.litros || 0), 0);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const exportData = filtered.map((c) => ({
      Fecha: formatDate(c.fecha),
      Repartidor: formatOperador(c.parte_diario?.personal),
      Operador: formatOperador(c.operador),
      Máquina: c.maquinaria?.codigo || c.maquinaria?.tipo || "-",
      Obra: c.obra?.nombre || "-",
      Litros: c.litros,
      Horas: c.horas || "-",
      Km: c.km || "-",
      Observaciones: c.observaciones || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Repartidor Calecita");
    const colWidths = Object.keys(exportData[0]).map((key) => ({
      wch: Math.max(key.length, 12),
    }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, `combustible_repartidor_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${exportData.length} registros exportados`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <FilterBar obras={obras} maquinarias={maquinarias} onFilterChange={setFilters} showMaquinariaFilter />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por operador, máquina, obra o repartidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Button variant="outline" onClick={handleExport} className="border-border">
          <Download className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
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
            <p className="text-2xl font-bold text-foreground">
              {filtered.length > 0 ? (totalLitros / filtered.length).toFixed(0) : 0} L
            </p>
            <p className="text-sm text-muted-foreground">Promedio/Carga</p>
          </div>
          <Fuel className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
              <TableHead className="text-muted-foreground font-medium">Repartidor</TableHead>
              <TableHead className="text-muted-foreground font-medium">Operador</TableHead>
              <TableHead className="text-muted-foreground font-medium">Máquina</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Litros</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Horas</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Km</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Fuel className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No hay cargas de repartidor registradas</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((carga) => (
                <TableRow key={carga.id} className="border-border hover:bg-muted/50">
                  <TableCell className="text-foreground">{formatDate(carga.fecha)}</TableCell>
                  <TableCell className="text-foreground">
                    {formatOperador(carga.parte_diario?.personal)}
                  </TableCell>
                  <TableCell className="text-foreground">{formatOperador(carga.operador)}</TableCell>
                  <TableCell className="text-foreground">
                    {carga.maquinaria?.codigo || carga.maquinaria?.tipo || "-"}
                  </TableCell>
                  <TableCell className="text-foreground">{carga.obra?.nombre || "-"}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{carga.litros}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{carga.horas || "-"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{carga.km || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
