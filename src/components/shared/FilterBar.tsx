import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Obra {
  id: string;
  nombre: string;
}

interface FilterBarProps {
  obras: Obra[];
  onFilterChange: (filters: FilterState) => void;
  showObraFilter?: boolean;
}

export interface FilterState {
  fechaDesde: Date | undefined;
  fechaHasta: Date | undefined;
  mes: string | undefined;
  obraId: string | undefined;
}

const MESES = [
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

export function FilterBar({ obras, onFilterChange, showObraFilter = true }: FilterBarProps) {
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>();
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>();
  const [mes, setMes] = useState<string | undefined>();
  const [obraId, setObraId] = useState<string | undefined>();

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const handleMesChange = (value: string) => {
    if (value === "none") {
      setMes(undefined);
      setFechaDesde(undefined);
      setFechaHasta(undefined);
      onFilterChange({ fechaDesde: undefined, fechaHasta: undefined, mes: undefined, obraId });
    } else {
      setMes(value);
      const monthDate = parseISO(`${selectedYear}-${value}-01`);
      const desde = startOfMonth(monthDate);
      const hasta = endOfMonth(monthDate);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      onFilterChange({ fechaDesde: desde, fechaHasta: hasta, mes: value, obraId });
    }
  };

  const handleYearChange = (value: string) => {
    const year = parseInt(value);
    setSelectedYear(year);
    if (mes) {
      const monthDate = parseISO(`${year}-${mes}-01`);
      const desde = startOfMonth(monthDate);
      const hasta = endOfMonth(monthDate);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      onFilterChange({ fechaDesde: desde, fechaHasta: hasta, mes, obraId });
    }
  };

  const handleFechaDesdeChange = (date: Date | undefined) => {
    setFechaDesde(date);
    setMes(undefined);
    onFilterChange({ fechaDesde: date, fechaHasta, mes: undefined, obraId });
  };

  const handleFechaHastaChange = (date: Date | undefined) => {
    setFechaHasta(date);
    setMes(undefined);
    onFilterChange({ fechaDesde, fechaHasta: date, mes: undefined, obraId });
  };

  const handleObraChange = (value: string) => {
    const newObraId = value === "none" ? undefined : value;
    setObraId(newObraId);
    onFilterChange({ fechaDesde, fechaHasta, mes, obraId: newObraId });
  };

  const clearFilters = () => {
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setMes(undefined);
    setObraId(undefined);
    onFilterChange({ fechaDesde: undefined, fechaHasta: undefined, mes: undefined, obraId: undefined });
  };

  const hasActiveFilters = fechaDesde || fechaHasta || mes || obraId;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
      <Filter className="w-4 h-4 text-muted-foreground" />
      
      {/* Year Selector */}
      <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px] h-9">
          <SelectValue placeholder="Año" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month Selector */}
      <Select value={mes || "none"} onValueChange={handleMesChange}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Todos los meses</SelectItem>
          {MESES.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start text-left font-normal",
              !fechaDesde && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Desde"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fechaDesde}
            onSelect={handleFechaDesdeChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start text-left font-normal",
              !fechaHasta && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Hasta"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fechaHasta}
            onSelect={handleFechaHastaChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {showObraFilter && (
        <>
          <div className="h-6 w-px bg-border mx-1" />

          {/* Obra Selector */}
          <Select value={obraId || "none"} onValueChange={handleObraChange}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Todas las obras</SelectItem>
              {obras.map((obra) => (
                <SelectItem key={obra.id} value={obra.id}>
                  {obra.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

// Helper function to filter data by date range and obra
export function filterByDateAndObra<T extends { fecha?: string | null; obra_id?: string | null }>(
  data: T[],
  filters: FilterState
): T[] {
  return data.filter((item) => {
    // Filter by date range
    if (filters.fechaDesde || filters.fechaHasta) {
      if (!item.fecha) return false;
      const itemDate = new Date(item.fecha);
      
      if (filters.fechaDesde && itemDate < filters.fechaDesde) return false;
      if (filters.fechaHasta && itemDate > filters.fechaHasta) return false;
    }

    // Filter by obra
    if (filters.obraId && item.obra_id !== filters.obraId) {
      return false;
    }

    return true;
  });
}
