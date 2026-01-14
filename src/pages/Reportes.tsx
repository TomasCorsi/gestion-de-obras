import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useReportesData } from "@/hooks/useDashboardData";
import { useAsignacionesPersonal } from "@/hooks/useAsignacionesPersonal";
import { useCotizaciones } from "@/hooks/useCotizaciones";
import { Badge } from "@/components/ui/badge";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

interface ObraFinanciera {
  obraId: string;
  nombre: string;
  cotizacionTotal: number;
  gastosTotal: number;
  combustible: number;
  mantenimiento: number;
  sueldos: number;
  balance: number;
  rentabilidad: number;
}

export default function Reportes() {
  const { loading, obras, combustible, mantenimientos } = useReportesData();
  const { asignacionesPorObra, loading: loadingAsignaciones } = useAsignacionesPersonal();
  const { cotizaciones, loading: loadingCotizaciones } = useCotizaciones();

  // Build financial data per obra
  const obrasFinancieras: ObraFinanciera[] = obras.map((obra) => {
    // Get cotizaciones aprobadas for this obra
    const cotizacionesObra = cotizaciones.filter(
      (c) => c.obra_id === obra.id && c.estado === "aprobada"
    );
    const cotizacionTotal = cotizacionesObra.reduce((sum, c) => sum + (c.total || 0), 0);

    // Get gastos
    const gastoCombustible = combustible
      .filter((c) => c.obra_id === obra.id)
      .reduce((sum, c) => sum + (c.costo_total || 0), 0);

    const gastoMantenimiento = mantenimientos
      .filter((m) => m.maquinaria?.obra_id === obra.id)
      .reduce((sum, m) => sum + (m.costo_total || 0), 0);

    const gastoSueldos = asignacionesPorObra[obra.id]?.totalSueldos || 0;

    const gastosTotal = gastoCombustible + gastoMantenimiento + gastoSueldos;
    const balance = cotizacionTotal - gastosTotal;
    const rentabilidad = cotizacionTotal > 0 ? ((balance / cotizacionTotal) * 100) : 0;

    return {
      obraId: obra.id,
      nombre: obra.nombre,
      cotizacionTotal,
      gastosTotal,
      combustible: gastoCombustible,
      mantenimiento: gastoMantenimiento,
      sueldos: gastoSueldos,
      balance,
      rentabilidad,
    };
  });

  // Filter obras with financial activity and sort by cotizacion
  const obrasConActividad = obrasFinancieras
    .filter((o) => o.cotizacionTotal > 0 || o.gastosTotal > 0)
    .sort((a, b) => b.cotizacionTotal - a.cotizacionTotal);

  // Calculate totals
  const totalCotizaciones = obrasFinancieras.reduce((sum, o) => sum + o.cotizacionTotal, 0);
  const totalGastos = obrasFinancieras.reduce((sum, o) => sum + o.gastosTotal, 0);
  const totalBalance = totalCotizaciones - totalGastos;
  const obrasConPerdida = obrasFinancieras.filter((o) => o.balance < 0 && o.cotizacionTotal > 0).length;

  // Prepare chart data - Cotizaciones vs Gastos
  const chartDataCotizacionesVsGastos = obrasConActividad.slice(0, 10).map((o) => ({
    obra: o.nombre.length > 12 ? o.nombre.slice(0, 12) + "..." : o.nombre,
    cotizacion: o.cotizacionTotal,
    gastos: o.gastosTotal,
    balance: o.balance,
  }));

  // Prepare chart data - Desglose de gastos por obra
  const chartDataGastosDesglose = obrasConActividad
    .filter((o) => o.gastosTotal > 0)
    .slice(0, 8)
    .map((o) => ({
      obra: o.nombre.length > 12 ? o.nombre.slice(0, 12) + "..." : o.nombre,
      combustible: o.combustible,
      mantenimiento: o.mantenimiento,
      sueldos: o.sueldos,
    }));

  // Prepare chart data - Balance por obra (positivo/negativo)
  const chartDataBalance = obrasConActividad
    .filter((o) => o.cotizacionTotal > 0)
    .slice(0, 10)
    .map((o) => ({
      obra: o.nombre.length > 12 ? o.nombre.slice(0, 12) + "..." : o.nombre,
      balance: o.balance,
      rentabilidad: o.rentabilidad,
    }));

  const isLoading = loading || loadingAsignaciones || loadingCotizaciones;

  if (isLoading) {
    return (
      <MainLayout title="Reportes" subtitle="Cotizaciones vs Gastos por Obra">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="card-industrial">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Reportes" subtitle="Cotizaciones vs Gastos por Obra">
      {/* KPIs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cotizaciones Aprobadas</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyShort(totalCotizaciones)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="w-3 h-3" />
                  {cotizaciones.filter((c) => c.estado === "aprobada").length} cotizaciones
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gastos Totales</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyShort(totalGastos)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Combustible + Mantenimiento + Sueldos
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance General</p>
                <p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrencyShort(totalBalance)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {totalBalance >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  {totalCotizaciones > 0
                    ? `${((totalBalance / totalCotizaciones) * 100).toFixed(1)}% rentabilidad`
                    : "Sin cotizaciones"}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                totalBalance >= 0 ? "bg-success/20" : "bg-destructive/20"
              }`}>
                <TrendingUp className={`w-6 h-6 ${totalBalance >= 0 ? "text-success" : "text-destructive"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Obras con Pérdida</p>
                <p className="text-2xl font-bold text-foreground">{obrasConPerdida}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gastos mayores a cotización
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Cotizaciones vs Gastos */}
      <Card className="card-industrial mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Cotizaciones vs Gastos por Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {chartDataCotizacionesVsGastos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataCotizacionesVsGastos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis
                    type="number"
                    stroke="hsl(0 0% 50%)"
                    tick={{ fill: "hsl(0 0% 65%)" }}
                    tickFormatter={(value) => formatCurrencyShort(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="obra"
                    stroke="hsl(0 0% 50%)"
                    tick={{ fill: "hsl(0 0% 65%)", fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0 0% 10%)",
                      border: "1px solid hsl(0 0% 20%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "cotizacion" ? "Cotización" : name === "gastos" ? "Gastos" : "Balance",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "cotizacion" ? "Cotización Aprobada" : value === "gastos" ? "Gastos Totales" : value
                    }
                  />
                  <Bar dataKey="cotizacion" fill="#22c55e" name="cotizacion" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="gastos" fill="#ef4444" name="gastos" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos de cotizaciones aprobadas o gastos</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Balance por Obra */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Rentabilidad por Obra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartDataBalance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataBalance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                    <XAxis
                      type="number"
                      stroke="hsl(0 0% 50%)"
                      tick={{ fill: "hsl(0 0% 65%)" }}
                      tickFormatter={(value) => formatCurrencyShort(value)}
                    />
                    <YAxis
                      type="category"
                      dataKey="obra"
                      stroke="hsl(0 0% 50%)"
                      tick={{ fill: "hsl(0 0% 65%)", fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 10%)",
                        border: "1px solid hsl(0 0% 20%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "balance" ? formatCurrency(value) : `${value.toFixed(1)}%`,
                        name === "balance" ? "Balance" : "Rentabilidad",
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="balance"
                      name="Balance"
                      radius={[0, 4, 4, 0]}
                      fill="#3b82f6"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No hay datos de rentabilidad
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Desglose de Gastos */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Desglose de Gastos por Obra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartDataGastosDesglose.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataGastosDesglose} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                    <XAxis
                      type="number"
                      stroke="hsl(0 0% 50%)"
                      tick={{ fill: "hsl(0 0% 65%)" }}
                      tickFormatter={(value) => formatCurrencyShort(value)}
                    />
                    <YAxis
                      type="category"
                      dataKey="obra"
                      stroke="hsl(0 0% 50%)"
                      tick={{ fill: "hsl(0 0% 65%)", fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0 0% 10%)",
                        border: "1px solid hsl(0 0% 20%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="combustible" stackId="a" fill="#eab308" name="Combustible" />
                    <Bar dataKey="mantenimiento" stackId="a" fill="#f97316" name="Mantenimiento" />
                    <Bar dataKey="sueldos" stackId="a" fill="#3b82f6" name="Sueldos" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No hay gastos registrados
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table: Detalle por Obra */}
      <Card className="card-industrial">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Detalle Financiero por Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {obrasConActividad.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Obra</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cotización</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Combustible</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Mantenimiento</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Sueldos</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total Gastos</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Balance</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {obrasConActividad.map((obra) => (
                    <tr key={obra.obraId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2 font-medium">{obra.nombre}</td>
                      <td className="py-3 px-2 text-right text-success font-mono">
                        {formatCurrency(obra.cotizacionTotal)}
                      </td>
                      <td className="py-3 px-2 text-right text-warning font-mono">
                        {formatCurrency(obra.combustible)}
                      </td>
                      <td className="py-3 px-2 text-right text-orange-500 font-mono">
                        {formatCurrency(obra.mantenimiento)}
                      </td>
                      <td className="py-3 px-2 text-right text-blue-500 font-mono">
                        {formatCurrency(obra.sueldos)}
                      </td>
                      <td className="py-3 px-2 text-right text-destructive font-mono">
                        {formatCurrency(obra.gastosTotal)}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono font-bold ${
                        obra.balance >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        {formatCurrency(obra.balance)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {obra.cotizacionTotal > 0 ? (
                          <Badge 
                            variant={obra.rentabilidad >= 0 ? "default" : "destructive"}
                            className={obra.rentabilidad >= 0 ? "bg-success text-success-foreground" : ""}
                          >
                            {obra.rentabilidad.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="py-3 px-2 font-bold">TOTAL</td>
                    <td className="py-3 px-2 text-right text-success font-mono font-bold">
                      {formatCurrency(totalCotizaciones)}
                    </td>
                    <td className="py-3 px-2 text-right text-warning font-mono font-bold">
                      {formatCurrency(obrasFinancieras.reduce((s, o) => s + o.combustible, 0))}
                    </td>
                    <td className="py-3 px-2 text-right text-orange-500 font-mono font-bold">
                      {formatCurrency(obrasFinancieras.reduce((s, o) => s + o.mantenimiento, 0))}
                    </td>
                    <td className="py-3 px-2 text-right text-blue-500 font-mono font-bold">
                      {formatCurrency(obrasFinancieras.reduce((s, o) => s + o.sueldos, 0))}
                    </td>
                    <td className="py-3 px-2 text-right text-destructive font-mono font-bold">
                      {formatCurrency(totalGastos)}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono font-bold ${
                      totalBalance >= 0 ? "text-success" : "text-destructive"
                    }`}>
                      {formatCurrency(totalBalance)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {totalCotizaciones > 0 && (
                        <Badge 
                          variant={totalBalance >= 0 ? "default" : "destructive"}
                          className={totalBalance >= 0 ? "bg-success text-success-foreground" : ""}
                        >
                          {((totalBalance / totalCotizaciones) * 100).toFixed(1)}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay datos financieros disponibles</p>
              <p className="text-sm mt-1">Agregue cotizaciones aprobadas o registre gastos en las obras</p>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
