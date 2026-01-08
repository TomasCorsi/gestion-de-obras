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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Building2,
  Truck,
  DollarSign,
  Route,
  Fuel,
  Wrench,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { obrasData, maquinariasData, viajesData, combustibleData, mantenimientosData } from "@/data/mockData";

const obrasPorEstado = [
  { name: "Activas", value: obrasData.filter(o => o.estado === "activa").length, color: "#22c55e" },
  { name: "Pendientes", value: obrasData.filter(o => o.estado === "pendiente").length, color: "#eab308" },
  { name: "Pausadas", value: obrasData.filter(o => o.estado === "pausada").length, color: "#ef4444" },
  { name: "Finalizadas", value: obrasData.filter(o => o.estado === "finalizada").length, color: "#6b7280" },
];

const maquinariasPorEstado = [
  { name: "En Uso", value: maquinariasData.filter(m => m.estado === "en_uso").length, color: "#B00020" },
  { name: "Operativa", value: maquinariasData.filter(m => m.estado === "operativa").length, color: "#22c55e" },
  { name: "Mantenimiento", value: maquinariasData.filter(m => m.estado === "mantenimiento").length, color: "#eab308" },
  { name: "Inactiva", value: maquinariasData.filter(m => m.estado === "inactiva").length, color: "#6b7280" },
];

const viajesPorDia = [
  { dia: "Lun", viajes: 12, volumen: 216 },
  { dia: "Mar", viajes: 18, volumen: 324 },
  { dia: "Mié", viajes: 15, volumen: 270 },
  { dia: "Jue", viajes: 22, volumen: 396 },
  { dia: "Vie", viajes: 28, volumen: 504 },
  { dia: "Sáb", viajes: 14, volumen: 252 },
  { dia: "Dom", viajes: 5, volumen: 90 },
];

const costosMensuales = [
  { mes: "Ago", combustible: 650000, mantenimiento: 180000 },
  { mes: "Sep", combustible: 720000, mantenimiento: 320000 },
  { mes: "Oct", combustible: 680000, mantenimiento: 150000 },
  { mes: "Nov", combustible: 750000, mantenimiento: 280000 },
  { mes: "Dic", combustible: 820000, mantenimiento: 230000 },
  { mes: "Ene", combustible: 978500, mantenimiento: 360000 },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Reportes() {
  const totalCombustible = combustibleData.reduce((sum, c) => sum + c.costoTotal, 0);
  const totalMantenimiento = mantenimientosData.reduce((sum, m) => sum + m.costoTotal, 0);
  const totalViajes = viajesData.length;
  const volumenTransportado = viajesData.reduce((sum, v) => sum + v.volumen, 0);

  return (
    <MainLayout title="Reportes" subtitle="Análisis y estadísticas">
      {/* KPIs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Obras Activas</p>
                <p className="text-3xl font-bold text-foreground">
                  {obrasData.filter(o => o.estado === "activa").length}
                </p>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +2 esta semana
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Viajes del Mes</p>
                <p className="text-3xl font-bold text-foreground">{totalViajes}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {volumenTransportado} m³ transportados
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                <Route className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gasto Combustible</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCombustible)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {combustibleData.reduce((sum, c) => sum + c.litros, 0).toLocaleString()} litros
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                <Fuel className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mantenimiento</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMantenimiento)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mantenimientosData.length} registros
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Obras por Estado */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Obras por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={obrasPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {obrasPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0 0% 10%)",
                      border: "1px solid hsl(0 0% 20%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {obrasPorEstado.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Maquinarias por Estado */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Maquinarias por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={maquinariasPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {maquinariasPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0 0% 10%)",
                      border: "1px solid hsl(0 0% 20%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {maquinariasPorEstado.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Viajes por Día */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              Viajes de la Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viajesPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis dataKey="dia" stroke="hsl(0 0% 50%)" tick={{ fill: "hsl(0 0% 65%)" }} />
                  <YAxis stroke="hsl(0 0% 50%)" tick={{ fill: "hsl(0 0% 65%)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0 0% 10%)",
                      border: "1px solid hsl(0 0% 20%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "viajes") return [value, "Viajes"];
                      return [`${value} m³`, "Volumen"];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="viajes" fill="#B00020" name="Viajes" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="volumen" fill="#22c55e" name="Volumen (m³)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Costos Mensuales */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Costos Operativos (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costosMensuales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis dataKey="mes" stroke="hsl(0 0% 50%)" tick={{ fill: "hsl(0 0% 65%)" }} />
                  <YAxis
                    stroke="hsl(0 0% 50%)"
                    tick={{ fill: "hsl(0 0% 65%)" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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
                  <Line
                    type="monotone"
                    dataKey="combustible"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ fill: "#eab308" }}
                    name="Combustible"
                  />
                  <Line
                    type="monotone"
                    dataKey="mantenimiento"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: "#f97316" }}
                    name="Mantenimiento"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
