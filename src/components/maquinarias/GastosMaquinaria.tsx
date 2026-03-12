import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Fuel, Truck, Wrench, Calendar, DollarSign, Download, FileText, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useMaquinarias, TipoMaquinaria } from "@/hooks/useMaquinarias";
import { useCombustible } from "@/hooks/useCombustible";
import { useRemitos } from "@/hooks/useRemitos";
import { useMantenimientos } from "@/hooks/useMantenimientos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { generateGastosMaquinariaPDF } from "@/utils/generateGastosMaquinariaPDF";

interface GastoUnificado {
  id: string;
  fecha: string;
  tipo: "combustible" | "remito" | "mantenimiento";
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
  combustible: { label: "Combustible", color: "hsl(38, 92%, 50%)" },
  mantenimiento: { label: "Mantenimiento", color: "hsl(270, 70%, 60%)" },
};

export function GastosMaquinaria() {
  const { maquinarias } = useMaquinarias();
  const { cargas } = useCombustible();
  const { remitos } = useRemitos();
  const { mantenimientos } = useMantenimientos();

  const [selectedMaquinariaId, setSelectedMaquinariaId] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>();
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>();
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [mesActivo, setMesActivo] = useState<string>("todos"); // "todos", "actual", "YYYY-MM", "custom"

  const mesesDisponibles = useMemo(() => {
    const now = new Date();
    const meses: { value: string; label: string; desde: Date; hasta: Date }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      meses.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMM yyyy", { locale: es }),
        desde: startOfMonth(d),
        hasta: endOfMonth(d),
      });
    }
    return meses;
  }, []);

  const seleccionarMes = (valor: string) => {
    setMesActivo(valor);
    if (valor === "todos") {
      setFechaDesde(undefined);
      setFechaHasta(undefined);
    } else if (valor === "custom") {
      // keep current manual dates
    } else {
      const mes = mesesDisponibles.find(m => m.value === valor);
      if (mes) {
        setFechaDesde(mes.desde);
        setFechaHasta(mes.hasta);
      }
    }
  };

  const maquinariasFiltradas = useMemo(() => {
    if (tipoFilter === "todos") return maquinarias;
    return maquinarias.filter((m) => m.tipo === tipoFilter);
  }, [maquinarias, tipoFilter]);

  const maquinariaOptions = useMemo(() => {
    return maquinariasFiltradas
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
      .map((m) => {
        const codigo = m.codigo || "S/C";
        const tipo = tiposConfig[m.tipo] || m.tipo;
        const patente = m.patente || "";
        const label = patente ? `${codigo} - ${tipo} - ${patente}` : `${codigo} - ${tipo}`;
        const searchValue = `${codigo} ${tipo} ${patente} ${m.nombre || ""} ${m.marca || ""}`.toLowerCase();
        return { value: m.id, label, searchValue };
      });
  }, [maquinariasFiltradas]);

  useMemo(() => {
    if (selectedMaquinariaId && !maquinariasFiltradas.find(m => m.id === selectedMaquinariaId)) {
      setSelectedMaquinariaId("");
    }
  }, [maquinariasFiltradas, selectedMaquinariaId]);

  const datosFiltrados = useMemo(() => {
    if (!selectedMaquinariaId) {
      return { combustible: [], remitos: [], mantenimientos: [] };
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
      remitos: remitos.filter(
        (r) => r.maquinaria_id === selectedMaquinariaId && filtrarPorFecha(r.fecha)
      ),
      mantenimientos: mantenimientos.filter(
        (m) => m.maquinaria_id === selectedMaquinariaId && filtrarPorFecha(m.fecha)
      ),
    };
  }, [selectedMaquinariaId, cargas, remitos, mantenimientos, fechaDesde, fechaHasta]);

  // Próximo mantenimiento: del último mantenimiento completado con datos de próximo service
  const proximoMantenimiento = useMemo(() => {
    if (!selectedMaquinariaId) return null;
    const completados = mantenimientos
      .filter(m => m.maquinaria_id === selectedMaquinariaId && m.estado === "completado")
      .sort((a, b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime());

    const conProximo = completados.find(
      m => m.proximo_mantenimiento || m.proximo_service_hr || m.proximo_service_km
    );
    if (!conProximo) return null;
    return {
      fecha: conProximo.proximo_mantenimiento,
      horas: conProximo.proximo_service_hr,
      km: conProximo.proximo_service_km,
    };
  }, [selectedMaquinariaId, mantenimientos]);

  const totales = useMemo(() => {
    const totalCombustible = datosFiltrados.combustible.reduce((acc, c) => acc + (c.costo_total || 0), 0);
    const totalLitros = datosFiltrados.combustible.reduce((acc, c) => acc + (c.litros || 0), 0);
    const totalRemitos = datosFiltrados.remitos.length;
    const totalViajes = datosFiltrados.remitos.reduce((acc, r) => acc + (r.cantidad_viajes || 0), 0);
    const costoRemitos = datosFiltrados.remitos.reduce((acc, r) => acc + (r.precio_total || 0), 0);
    const totalMantenimientos = datosFiltrados.mantenimientos.length;
    const costoMantenimientos = datosFiltrados.mantenimientos.reduce((acc, m) => acc + (m.costo_total || 0), 0);

    return {
      totalCombustible,
      totalLitros,
      totalRemitos,
      totalViajes,
      costoRemitos,
      totalMantenimientos,
      costoMantenimientos,
      gastoTotal: totalCombustible + costoMantenimientos + costoRemitos,
    };
  }, [datosFiltrados]);

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

    datosFiltrados.remitos.forEach((r) => {
      const ruta = [r.desde, r.hasta].filter(Boolean).join(" → ");
      gastos.push({
        id: r.id,
        fecha: r.fecha,
        tipo: "remito",
        descripcion: `Remito #${r.numero} - ${r.material}${ruta ? ` (${ruta})` : ""} - ${r.cantidad_viajes || 1} viaje(s)`,
        costo: r.precio_total || 0,
        obra: r.obra?.nombre,
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
    remito: { label: "Remito", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    mantenimiento: { label: "Mantenimiento", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  };

  const limpiarFiltros = () => {
    setFechaDesde(undefined);
    setFechaHasta(undefined);
  };

  const exportarExcel = () => {
    const maquinaria = maquinarias.find((m) => m.id === selectedMaquinariaId);
    if (!maquinaria) { toast.error("Selecciona una maquinaria primero"); return; }

    const workbook = XLSX.utils.book_new();

    const resumenData = [
      ["Gastos por Maquinaria"],
      [""],
      ["Maquinaria:", maquinaria?.nombre || ""],
      ["Código:", maquinaria?.codigo || ""],
      ["Tipo:", tiposConfig[maquinaria.tipo] || maquinaria.tipo],
      ["Período:", `${fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio"} - ${fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual"}`],
      [""],
      ["Combustible", `$${totales.totalCombustible.toLocaleString()}`, `${totales.totalLitros.toLocaleString()} L`],
      ["Remitos/Viajes", `$${totales.costoRemitos.toLocaleString()}`, `${totales.totalRemitos} remitos / ${totales.totalViajes} viajes`],
      ["Mantenimientos", `$${totales.costoMantenimientos.toLocaleString()}`, `${totales.totalMantenimientos} servicios`],
      [""],
      ["GASTO TOTAL", `$${totales.gastoTotal.toLocaleString()}`],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");

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
    if (!maquinaria) { toast.error("Selecciona una maquinaria primero"); return; }

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
                  <SelectItem key={value} value={value}>{label}</SelectItem>
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
        {/* Filtro por mes */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={mesActivo === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => seleccionarMes("todos")}
          >
            Todo
          </Button>
          {mesesDisponibles.slice(0, 6).map((mes) => (
            <Button
              key={mes.value}
              variant={mesActivo === mes.value ? "default" : "outline"}
              size="sm"
              onClick={() => seleccionarMes(mes.value)}
              className="capitalize"
            >
              {mes.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={mesActivo === "custom" ? "default" : "outline"} size="sm">
                <Calendar className="w-4 h-4 mr-1" />
                {mesActivo === "custom" && fechaDesde && fechaHasta
                  ? `${format(fechaDesde, "dd/MM")} - ${format(fechaHasta, "dd/MM")}`
                  : "Rango"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 space-y-3" align="start">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Desde</p>
                <CalendarComponent mode="single" selected={fechaDesde} onSelect={(d) => { setFechaDesde(d); setMesActivo("custom"); }} locale={es} className="pointer-events-auto" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Hasta</p>
                <CalendarComponent mode="single" selected={fechaHasta} onSelect={(d) => { setFechaHasta(d); setMesActivo("custom"); }} locale={es} className="pointer-events-auto" />
              </div>
            </PopoverContent>
          </Popover>
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
                  Remitos / Viajes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${totales.costoRemitos.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {totales.totalRemitos} remitos • {totales.totalViajes} viajes
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

          {/* Próximo mantenimiento */}
          {proximoMantenimiento && (
            <Card className="card-industrial border-amber-500/30 bg-amber-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="font-medium text-foreground">Próximo Mantenimiento:</span>
                  {proximoMantenimiento.fecha && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      {format(parseISO(proximoMantenimiento.fecha), "dd/MM/yyyy")}
                    </Badge>
                  )}
                  {proximoMantenimiento.horas && (
                    <span className="text-sm text-muted-foreground">
                      a las {proximoMantenimiento.horas.toLocaleString()} hr
                    </span>
                  )}
                  {proximoMantenimiento.km && (
                    <span className="text-sm text-muted-foreground">
                      / {proximoMantenimiento.km.toLocaleString()} km
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                    <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => <span>${Number(value).toLocaleString()}</span>} />} />
                    <Legend />
                    <Bar dataKey="combustible" name="Combustible" stackId="a" fill="hsl(38, 92%, 50%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="mantenimiento" name="Mantenimiento" stackId="a" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} />
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
                  <span className="text-muted-foreground">Gasto Total (Combustible + Mantenimiento + Remitos)</span>
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
                        <TableCell className="text-muted-foreground">{gasto.obra || "-"}</TableCell>
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
