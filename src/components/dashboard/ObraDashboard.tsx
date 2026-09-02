import { ObraTableroData } from "@/hooks/useTableroObras";
import { MetricaSerie, SeriePunto } from "@/hooks/useTableroSeries";
import { HistoricoObra } from "@/hooks/useTableroHistorico";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Truck,
  Clock,
  Users,
  DollarSign,
  Boxes,
  Activity,
  Fuel,
  Route,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const nf = (v: number, d = 0) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

const METRICA_LABEL: Record<MetricaSerie, string> = {
  m3: "m³",
  movimientos: "Movimientos",
  horas: "Horas",
  litros: "Litros",
};

const GASTO_COLORS = ["#B00020", "#E4A11B", "#6B7280"];

interface KPIProps {
  icon: typeof Truck;
  label: string;
  value: string;
  sub?: string;
  tv?: boolean;
  destacado?: boolean;
}

function KPI({ icon: Icon, label, value, sub, tv, destacado }: KPIProps) {
  return (
    <Card
      className={cn(
        "card-industrial px-3 py-2 flex flex-col justify-center min-w-0",
        destacado && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn("shrink-0", tv ? "w-5 h-5" : "w-4 h-4")} />
        <span className={cn("uppercase tracking-wide truncate", tv ? "text-sm" : "text-[11px]")}>
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-bold font-mono-numbers text-foreground leading-none mt-1",
          tv ? "text-4xl" : destacado ? "text-3xl" : "text-2xl"
        )}
      >
        {value}
      </p>
      {sub !== undefined && (
        <p className={cn("text-muted-foreground font-mono-numbers mt-0.5", tv ? "text-sm" : "text-[11px]")}>
          Hist. {sub}
        </p>
      )}
    </Card>
  );
}

function ChartCard({
  titulo,
  extra,
  tv,
  children,
}: {
  titulo: string;
  extra?: string;
  tv?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="card-industrial p-2 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-1 pb-1 shrink-0">
        <span
          className={cn("uppercase tracking-wide text-muted-foreground", tv ? "text-sm" : "text-[11px]")}
        >
          {titulo}
        </span>
        {extra && (
          <span className={cn("font-mono-numbers font-semibold", tv ? "text-base" : "text-xs")}>
            {extra}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </Card>
  );
}

const tooltipStyle = (tv?: boolean) => ({
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: tv ? 14 : 12,
});

interface Props {
  obra: ObraTableroData;
  metrica: MetricaSerie;
  serie: SeriePunto[];
  loadingSerie?: boolean;
  historico?: HistoricoObra;
  periodoLabel?: string;
  mesLabel?: string;
  tv?: boolean;
  posicion?: { actual: number; total: number };
}

export function ObraDashboard({
  obra,
  metrica,
  serie,
  loadingSerie,
  historico,
  periodoLabel = "hoy",
  mesLabel,
  tv,
  posicion,
}: Props) {
  const decimales = metrica === "movimientos" ? 0 : 1;
  const data = serie.map((p) => ({ label: p.label, valor: Number(p[obra.obraId]) || 0 }));
  const total = data.reduce((s, d) => s + d.valor, 0);

  let acumulado = 0;
  const dataAcum = data.map((d) => {
    acumulado += d.valor;
    return { label: d.label, acumulado: Number(acumulado.toFixed(1)) };
  });

  const gastos = [
    { name: "Combustible", value: Math.round(obra.costoCombustible) },
    { name: "Mantenimiento", value: Math.round(obra.costoMantenimiento) },
    { name: "Otros gastos", value: Math.round(obra.costoOtros) },
  ].filter((g) => g.value > 0);

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 shrink-0 border-b border-border pb-2">
        <div className="min-w-0">
          <p className={cn("text-muted-foreground uppercase tracking-wide", tv ? "text-sm" : "text-[11px]")}>
            Obra en pantalla {mesLabel ? `· ${mesLabel}` : ""}
          </p>
          <h2 className={cn("font-bold text-foreground truncate", tv ? "text-5xl" : "text-2xl")}>
            {obra.nombre}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {obra.alertas.length > 0 && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive font-semibold",
                tv ? "text-base" : "text-xs"
              )}
            >
              <AlertTriangle className={cn(tv ? "w-5 h-5" : "w-4 h-4")} />
              {obra.alertas.length} alerta{obra.alertas.length > 1 ? "s" : ""}
            </span>
          )}
          <Badge
            variant={obra.estado === "activa" ? "default" : "secondary"}
            className={cn("capitalize", tv && "text-base px-3 py-1")}
          >
            {obra.estado}
          </Badge>
          {posicion && posicion.total > 1 && (
            <div className="flex items-center gap-2">
              <span className={cn("text-muted-foreground", tv ? "text-base" : "text-xs")}>
                {posicion.actual + 1}/{posicion.total}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(posicion.total, 10) }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "rounded-full",
                      tv ? "w-2.5 h-2.5" : "w-2 h-2",
                      i === posicion.actual ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
        <KPI
          icon={Route}
          label={`Movimientos ${periodoLabel}`}
          value={nf(obra.movimientosHoy)}
          sub={historico && nf(historico.movimientos)}
          tv={tv}
          destacado
        />
        <KPI
          icon={Boxes}
          label="m³ del período"
          value={nf(obra.m3Mes, 1)}
          sub={historico && nf(historico.m3, 1)}
          tv={tv}
          destacado
        />
        <KPI
          icon={Clock}
          label="Horas del período"
          value={nf(obra.horasMes, 1)}
          sub={historico && nf(historico.horas, 1)}
          tv={tv}
          destacado
        />
        <KPI
          icon={DollarSign}
          label="Gastos del período"
          value={formatCurrency(obra.gastosMes)}
          sub={historico && formatCurrency(historico.gastos)}
          tv={tv}
          destacado
        />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
        <KPI icon={Fuel} label="Litros" value={nf(obra.litrosMes)} sub={historico && nf(historico.litros)} tv={tv} />
        <KPI
          icon={Truck}
          label="Maquinaria en uso"
          value={`${nf(obra.maquinariasEnUso)}/${nf(obra.maquinariasTotal)}`}
          tv={tv}
        />
        <KPI
          icon={Users}
          label={`Personal ${periodoLabel}`}
          value={nf(obra.personalHoy)}
          sub={historico && nf(historico.personal)}
          tv={tv}
        />
        <KPI
          icon={Activity}
          label="Viajes de remitos"
          value={nf(obra.viajesMes)}
          sub={historico && nf(historico.viajes)}
          tv={tv}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
        <div className="lg:col-span-2 grid grid-rows-2 gap-2 min-h-0">
          <ChartCard titulo={`${METRICA_LABEL[metrica]} por día`} extra={nf(total, decimales)} tv={tv}>
            {loadingSerie ? (
              <div className="h-full bg-muted/40 rounded animate-pulse" />
            ) : total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin datos en el período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: tv ? 13 : 10 }}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 13 : 10 }} width={42} />
                  <RTooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    contentStyle={tooltipStyle(tv)}
                    formatter={(v: number) => [nf(v, decimales), METRICA_LABEL[metrica]]}
                  />
                  <Bar dataKey="valor" fill="#B00020" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard titulo={`${METRICA_LABEL[metrica]} acumulado del período`} tv={tv}>
            {total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin datos en el período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataAcum} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E4A11B" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#E4A11B" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: tv ? 13 : 10 }}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 13 : 10 }} width={42} />
                  <RTooltip
                    contentStyle={tooltipStyle(tv)}
                    formatter={(v: number) => [nf(v, decimales), "Acumulado"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    stroke="#E4A11B"
                    strokeWidth={2}
                    fill="url(#gradAcum)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-rows-2 gap-2 min-h-0">
          <ChartCard titulo="Composición de gastos" extra={formatCurrency(obra.gastosMes)} tv={tv}>
            {gastos.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin gastos cargados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastos}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={2}
                  >
                    {gastos.map((g, i) => (
                      <Cell key={g.name} fill={GASTO_COLORS[i % GASTO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={tv ? 28 : 20}
                    wrapperStyle={{ fontSize: tv ? 13 : 10 }}
                  />
                  <RTooltip
                    contentStyle={tooltipStyle(tv)}
                    formatter={(v: number, n: string) => [formatCurrency(v), n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard titulo="Horas por maquinaria" tv={tv}>
            {obra.horasPorMaquina.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin horas registradas
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={obra.horasPorMaquina}
                  layout="vertical"
                  margin={{ top: 2, right: 12, left: 4, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 13 : 10 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={tv ? 130 : 90}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: tv ? 13 : 10 }}
                  />
                  <RTooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    contentStyle={tooltipStyle(tv)}
                    formatter={(v: number) => [nf(v, 1), "Horas"]}
                  />
                  <Bar dataKey="horas" fill="#6B7280" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>

      {obra.alertas.length > 0 && (
        <div
          className={cn(
            "shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-destructive truncate",
            tv ? "text-base" : "text-xs"
          )}
        >
          {obra.alertas.join(" · ")}
        </div>
      )}
    </div>
  );
}
