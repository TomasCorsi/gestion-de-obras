import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Fuel, Truck, Wrench, Calendar, DollarSign, Download, FileText, ChevronDown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { useMaquinarias, TipoMaquinaria } from "@/hooks/useMaquinarias";
import { useCombustible } from "@/hooks/useCombustible";
import { useViajes } from "@/hooks/useViajes";
import { useMantenimientos } from "@/hooks/useMantenimientos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { generateGastosMaquinariaPDF } from "@/utils/generateGastosMaquinariaPDF";

interface GastoUnificado {
  id: string;
  fecha: string;
  tipo: "combustible" | "viaje" | "mantenimiento";
  descripcion: string;
  costo: number;
  obra?: string;
}

const tiposConfig: Record<TipoMaquinaria, string> = {
  cargadora: "Cargadora",
  compactador: "Compactador",
  retroexcavadora: "Retroexcavadora",
  minicargadora: "Minicargadora",
  motoniveladora: "Motoniveladora",
  topador: "Topador",
  pala_retro: "Pala Retro",
  batea: "Batea",
  acoplado: "Acoplado",
  camion: "Camión",
  carreton: "Carretón",
  cisterna: "Cisterna",
  tanque_cisterna: "Tanque Cisterna",
  tanque_regador_tractor: "Tanque Regador Tractor",
  soplador: "Soplador",
  zanjeadora: "Zanjeadora",
  rastra: "Rastra",
  tractor: "Tractor",
  rastra_grosspal: "Rastra Grosspal",
  auto: "Auto",
  camioneta: "Camioneta",
  grupo_electrogeno: "Grupo Electrógeno",
};

const chartConfig = {
  combustible: {
    label: "Combustible",
    color: "hsl(38, 92%, 50%)", // amber
  },
  mantenimiento: {
    label: "Mantenimiento",
    color: "hsl(270, 70%, 60%)", // purple
  },
};

export function GastosMaquinaria() {
  const { maquinarias } = useMaquinarias();
  const { cargas } = useCombustible();
  const { viajes } = useViajes();
  const { mantenimientos } = useMantenimientos();

  const [selectedMaquinariaId, setSelectedMaquinariaId] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>();
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>();
  const [tipoFilter, setTipoFilter] = useState<string>("todos");

  // Filtrar maquinarias por tipo
  const maquinariasFiltradas = useMemo(() => {
    if (tipoFilter === "todos") return maquinarias;
    return maquinarias.filter((m) => m.tipo === tipoFilter);
  }, [maquinarias, tipoFilter]);

  // Opciones para el combobox de maquinarias (búsqueda por código, tipo, patente)
  const maquinariaOptions = useMemo(() => {
    return maquinariasFiltradas
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
      .map((m) => {
        const codigo = m.codigo || "S/C";
        const tipo = tiposConfig[m.tipo] || m.tipo;
        const patente = m.patente || "";
        // Label visible: código - tipo - patente (si tiene)
        const label = patente 
          ? `${codigo} - ${tipo} - ${patente}`
          : `${codigo} - ${tipo}`;
        // searchValue incluye todos los campos para búsqueda
        const searchValue = `${codigo} ${tipo} ${patente} ${m.nombre || ""} ${m.marca || ""}`.toLowerCase();
        return {
          value: m.id,
          label,
          searchValue,
        };
      });
  }, [maquinariasFiltradas]);

  // Reset maquinaria selection when type filter changes and current selection is not in filtered list
  useMemo(() => {
    if (selectedMaquinariaId && !maquinariasFiltradas.find(m => m.id === selectedMaquinariaId)) {
      setSelectedMaquinariaId("");
    }
  }, [maquinariasFiltradas, selectedMaquinariaId]);

  // Filtrar datos por maquinaria y fechas
  const datosFiltrados = useMemo(() => {
    if (!selectedMaquinariaId) {
      return { combustible: [], viajes: [], mantenimientos: [] };
    }

    const filtrarPorFecha = (fecha: string) => {
      const fechaItem = parseISO(fecha);
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

  // Datos para el gráfico mensual
  const datosGraficoMensual = useMemo(() => {
    const mesesMap = new Map<string, { combustible: number; mantenimiento: number }>();

    datosFiltrados.combustible.forEach((c) => {
      if (!c.fecha) return;
      const mes = format(parseISO(c.fecha), "yyyy-MM");
      const actual = mesesMap.get(mes) || { combustible: 0, mantenimiento: 0 };
      actual.combustible += c.costo_total || 0;
      mesesMap.set(mes, actual);
    });

    datosFiltrados.mantenimientos.forEach((m) => {
      const mes = format(parseISO(m.fecha), "yyyy-MM");
      const actual = mesesMap.get(mes) || { combustible: 0, mantenimiento: 0 };
      actual.mantenimiento += m.costo_total || 0;
      mesesMap.set(mes, actual);
    });

    return Array.from(mesesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, data]) => ({
        mes: format(parseISO(mes + "-01"), "MMM yyyy", { locale: es }),
        combustible: data.combustible,
        mantenimiento: data.mantenimiento,
      }));
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

    return gastos.sort((a, b) => (b.fecha ? parseISO(b.fecha).getTime() : 0) - (a.fecha ? parseISO(a.fecha).getTime() : 0));
  }, [datosFiltrados]);

  const tipoGastoConfig = {
    combustible: { label: "Combustible", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    viaje: { label: "Viaje", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    mantenimiento: { label: "Mantenimiento", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  };

  const limpiarFiltros = () => {
    setFechaDesde(undefined);
    setFechaHasta(undefined);
  };

  const exportarExcel = () => {
    const maquinaria = maquinarias.find((m) => m.id === selectedMaquinariaId);
    if (!maquinaria) {
      toast.error("Selecciona una maquinaria primero");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Hoja resumen
    const resumenData = [
      ["Gastos por Maquinaria"],
      [""],
      ["Maquinaria:", maquinaria?.nombre || ""],
      ["Código:", maquinaria?.codigo || ""],
      ["Tipo:", tiposConfig[maquinaria.tipo] || maquinaria.tipo],
      [
        "Período:",
        `${fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio"} - ${fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual"}`,
      ],
      [""],
      ["Combustible", `$${totales.totalCombustible.toLocaleString()}`, `${totales.totalLitros.toLocaleString()} L`],
      ["Viajes", `${totales.totalViajes}`, `${totales.totalKm.toLocaleString()} km`],
      ["Mantenimientos", `$${totales.costoMantenimientos.toLocaleString()}`, `${totales.totalMantenimientos} servicios`],
      [""],
      ["GASTO TOTAL", `$${totales.gastoTotal.toLocaleString()}`],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");

    // Hoja detalle
    const detalleData = [
      ["Fecha", "Tipo", "Descripción", "Obra", "Costo"],
      ...gastosUnificados.map((g) => [
        g.fecha ? format(parseISO(g.fecha), "dd/MM/yyyy") : "",
        tipoGastoConfig[g.tipo].label,
        g.descripcion,
        g.obra || "-",
        g.costo,
      ]),
    ];
    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
    XLSX.utils.book_append_sheet(workbook, wsDetalle, "Detalle");

    const fileName = `Gastos_${maquinaria?.codigo || "Maquinaria"}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel exportado correctamente");
  };

  const exportarPDF = async () => {
    const maquinaria = maquinarias.find((m) => m.id === selectedMaquinariaId);
    if (!maquinaria) {
      toast.error("Selecciona una maquinaria primero");
      return;
    }

    const gastosParaPDF = gastosUnificados.map((g) => ({
      fecha: g.fecha,
      tipo: tipoGastoConfig[g.tipo].label,
      descripcion: g.descripcion,
      obra: g.obra || "-",
      costo: g.costo,
    }));

    try {
      await generateGastosMaquinariaPDF(
        {
          codigo: maquinaria.codigo,
          nombre: maquinaria.nombre,
          tipo: tiposConfig[maquinaria.tipo],
          marca: maquinaria.marca,
          patente: maquinaria.patente,
          anio: maquinaria.anio,
          estado: maquinaria.estado,
          horas_acumuladas: maquinaria.horas_acumuladas,
        },
        totales,
        gastosParaPDF,
        fechaDesde,
        fechaHasta
      );
      toast.success("PDF exportado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-48">
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Tipo de maquinaria" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {Object.entries(tiposConfig).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          {selectedMaquinariaId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportar
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background z-50">
                <DropdownMenuItem onClick={exportarExcel} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportarPDF} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

          {/* Gráfico de evolución mensual */}
          {datosGraficoMensual.length > 0 && (
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="text-lg">Evolución de Gastos Mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={datosGraficoMensual}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="mes" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          formatter={(value, name) => (
                            <span>${Number(value).toLocaleString()}</span>
                          )}
                        />
                      } 
                    />
                    <Legend />
                    <Bar 
                      dataKey="combustible" 
                      name="Combustible" 
                      stackId="a" 
                      fill="hsl(38, 92%, 50%)" 
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      dataKey="mantenimiento" 
                      name="Mantenimiento" 
                      stackId="a" 
                      fill="hsl(270, 70%, 60%)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

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
                          <Badge className={cn("status-badge", tipoGastoConfig[gasto.tipo].className)}>
                            {tipoGastoConfig[gasto.tipo].label}
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
