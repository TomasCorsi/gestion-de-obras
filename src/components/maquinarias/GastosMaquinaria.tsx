import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Fuel, Truck, Wrench, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useCombustible } from "@/hooks/useCombustible";
import { useViajes } from "@/hooks/useViajes";
import { useMantenimientos } from "@/hooks/useMantenimientos";
import { cn } from "@/lib/utils";

interface GastoUnificado {
  id: string;
  fecha: string;
  tipo: "combustible" | "viaje" | "mantenimiento";
  descripcion: string;
  costo: number;
  obra?: string;
}

export function GastosMaquinaria() {
  const { maquinarias } = useMaquinarias();
  const { cargas } = useCombustible();
  const { viajes } = useViajes();
  const { mantenimientos } = useMantenimientos();

  const [selectedMaquinariaId, setSelectedMaquinariaId] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>();
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>();

  // Opciones para el combobox de maquinarias
  const maquinariaOptions = useMemo(() => {
    return maquinarias
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
      .map((m) => ({
        value: m.id,
        label: `${m.codigo || "S/C"} - ${m.nombre || "Sin nombre"}`,
      }));
  }, [maquinarias]);

  // Filtrar datos por maquinaria y fechas
  const datosFiltrados = useMemo(() => {
    if (!selectedMaquinariaId) {
      return { combustible: [], viajes: [], mantenimientos: [] };
    }

    const filtrarPorFecha = (fecha: string) => {
      const fechaItem = new Date(fecha);
      if (fechaDesde && fechaItem < fechaDesde) return false;
      if (fechaHasta && fechaItem > fechaHasta) return false;
      return true;
    };

    return {
      combustible: cargas.filter(
        (c) => c.maquinaria_id === selectedMaquinariaId && (!c.fecha || filtrarPorFecha(c.fecha))
      ),
      viajes: viajes.filter(
        (v) => v.camion_id === selectedMaquinariaId && filtrarPorFecha(v.fecha)
      ),
      mantenimientos: mantenimientos.filter(
        (m) => m.maquinaria_id === selectedMaquinariaId && filtrarPorFecha(m.fecha)
      ),
    };
  }, [selectedMaquinariaId, cargas, viajes, mantenimientos, fechaDesde, fechaHasta]);

  // Cálculos de totales
  const totales = useMemo(() => {
    const totalCombustible = datosFiltrados.combustible.reduce(
      (acc, c) => acc + (c.costo_total || 0),
      0
    );
    const totalLitros = datosFiltrados.combustible.reduce(
      (acc, c) => acc + (c.litros || 0),
      0
    );
    const totalViajes = datosFiltrados.viajes.length;
    const totalKm = datosFiltrados.viajes.reduce(
      (acc, v) => acc + (v.km_recorridos || 0),
      0
    );
    const totalVolumen = datosFiltrados.viajes.reduce(
      (acc, v) => acc + (v.volumen || 0),
      0
    );
    const totalMantenimientos = datosFiltrados.mantenimientos.length;
    const costoMantenimientos = datosFiltrados.mantenimientos.reduce(
      (acc, m) => acc + (m.costo_total || 0),
      0
    );

    return {
      totalCombustible,
      totalLitros,
      totalViajes,
      totalKm,
      totalVolumen,
      totalMantenimientos,
      costoMantenimientos,
      gastoTotal: totalCombustible + costoMantenimientos,
    };
  }, [datosFiltrados]);

  // Unificar gastos en una tabla
  const gastosUnificados = useMemo(() => {
    const gastos: GastoUnificado[] = [];

    datosFiltrados.combustible.forEach((c) => {
      gastos.push({
        id: c.id,
        fecha: c.fecha || "",
        tipo: "combustible",
        descripcion: `${c.litros?.toLocaleString() || 0} L @ $${c.precio_litro?.toLocaleString() || 0}/L`,
        costo: c.costo_total || 0,
        obra: c.obra?.nombre,
      });
    });

    datosFiltrados.viajes.forEach((v) => {
      gastos.push({
        id: v.id,
        fecha: v.fecha,
        tipo: "viaje",
        descripcion: `${v.origen} → ${v.destino} (${v.material})`,
        costo: 0,
        obra: v.obra?.nombre,
      });
    });

    datosFiltrados.mantenimientos.forEach((m) => {
      gastos.push({
        id: m.id,
        fecha: m.fecha,
        tipo: "mantenimiento",
        descripcion: `${m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}: ${m.descripcion}`,
        costo: m.costo_total || 0,
        obra: undefined,
      });
    });

    return gastos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [datosFiltrados]);

  const tipoConfig = {
    combustible: { label: "Combustible", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    viaje: { label: "Viaje", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    mantenimiento: { label: "Mantenimiento", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  };

  const limpiarFiltros = () => {
    setFechaDesde(undefined);
    setFechaHasta(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <Combobox
            options={maquinariaOptions}
            value={selectedMaquinariaId}
            onValueChange={setSelectedMaquinariaId}
            placeholder="Seleccionar maquinaria..."
            searchPlaceholder="Buscar por código o nombre..."
            emptyText="No se encontraron maquinarias"
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-border">
                <Calendar className="w-4 h-4 mr-2" />
                {fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Desde"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={fechaDesde}
                onSelect={setFechaDesde}
                locale={es}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-border">
                <Calendar className="w-4 h-4 mr-2" />
                {fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Hasta"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={fechaHasta}
                onSelect={setFechaHasta}
                locale={es}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {(fechaDesde || fechaHasta) && (
            <Button variant="ghost" onClick={limpiarFiltros}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {!selectedMaquinariaId ? (
        <div className="text-center py-12 text-muted-foreground">
          Selecciona una maquinaria para ver sus gastos asociados
        </div>
      ) : (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-industrial">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  Combustible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${totales.totalCombustible.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {totales.totalLitros.toLocaleString()} litros
                </p>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Truck className="w-4 h-4 text-blue-400" />
                  Viajes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {totales.totalViajes} viajes
                </div>
                <p className="text-sm text-muted-foreground">
                  {totales.totalKm.toLocaleString()} km • {totales.totalVolumen.toLocaleString()} m³
                </p>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Wrench className="w-4 h-4 text-purple-400" />
                  Mantenimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${totales.costoMantenimientos.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {totales.totalMantenimientos} servicios
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Total general */}
          <Card className="card-industrial bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Gasto Total (Combustible + Mantenimiento)</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  ${totales.gastoTotal.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tabla detallada */}
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="text-lg">Detalle de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              {gastosUnificados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay registros para esta maquinaria en el período seleccionado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gastosUnificados.map((gasto) => (
                      <TableRow key={`${gasto.tipo}-${gasto.id}`}>
                        <TableCell className="font-mono text-sm">
                          {gasto.fecha ? format(new Date(gasto.fecha), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("status-badge", tipoConfig[gasto.tipo].className)}>
                            {tipoConfig[gasto.tipo].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{gasto.descripcion}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {gasto.obra || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {gasto.costo > 0 ? `$${gasto.costo.toLocaleString()}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
