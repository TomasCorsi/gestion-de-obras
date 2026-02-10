import { useState, useMemo } from "react";
import { Search, Fuel, Droplets, Download, CalendarDays, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCargasRepartidorAll } from "@/hooks/useCargasRepartidorAll";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const meses = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function formatOperador(op: { nombre: string | null; apellido: string | null } | null | undefined): string {
  if (!op) return "-";
  return `${op.apellido || ""}, ${op.nombre?.charAt(0) || ""}.`.trim();
}

export function CombustibleRepartidorTab() {
  const { cargas, isLoading } = useCargasRepartidorAll();

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const [searchTerm, setSearchTerm] = useState("");
  const [mes, setMes] = useState<string | undefined>(undefined);
  const [year, setYear] = useState(currentYear);
  const [fechaFiltro, setFechaFiltro] = useState<string>("");

  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear; y >= currentYear - 5; y--) result.push(y);
    return result;
  }, [currentYear]);

  const filtered = useMemo(() => {
    let result = [...cargas];

    // Specific day filter (takes priority over month)
    if (fechaFiltro) {
      result = result.filter((c) => c.fecha === fechaFiltro);
    } else if (mes) {
      const monthDate = parseISO(`${year}-${mes}-01`);
      const desde = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const hasta = format(endOfMonth(monthDate), "yyyy-MM-dd");
      result = result.filter((c) => c.fecha >= desde && c.fecha <= hasta);
    }

    // Search
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
  }, [cargas, mes, year, searchTerm, fechaFiltro]);

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
      Tipo: (c.tipo_operador || 'interno').charAt(0).toUpperCase() + (c.tipo_operador || 'interno').slice(1),
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
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por operador, máquina, obra o repartidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={fechaFiltro}
              onChange={(e) => {
                setFechaFiltro(e.target.value);
                if (e.target.value) setMes(undefined);
              }}
              className="pl-9 w-40 bg-card border-border"
            />
            {fechaFiltro && (
              <button
                onClick={() => setFechaFiltro("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={fechaFiltro ? "all" : (mes || "all")}
            onValueChange={(v) => {
              setMes(v === "all" ? undefined : v);
              setFechaFiltro("");
            }}
            disabled={!!fechaFiltro}
          >
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue placeholder="Todos los meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {meses.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className="border-border">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
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
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                  <TableCell className="text-foreground capitalize">{carga.tipo_operador || 'interno'}</TableCell>
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
