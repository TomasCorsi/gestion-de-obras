import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MetricaSerie, SeriePunto, SERIE_COLORS } from "@/hooks/useTableroSeries";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  series: Record<MetricaSerie, SeriePunto[]>;
  obras: { obraId: string; nombre: string }[];
  loading?: boolean;
  tv?: boolean;
}

const OPCIONES: { key: MetricaSerie; label: string }[] = [
  { key: "movimientos", label: "Movimientos" },
  { key: "m3", label: "m³" },
  { key: "horas", label: "Horas" },
];

export function TendenciaObrasChart({ series, obras, loading, tv }: Props) {
  const [metrica, setMetrica] = useState<MetricaSerie>("movimientos");
  const data = series[metrica] || [];

  return (
    <Card className="card-industrial p-3 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className={cn("font-semibold text-foreground", tv ? "text-xl" : "text-sm")}>
          Tendencia · 14 días
        </h3>
        <div className="flex gap-1">
          {OPCIONES.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setMetrica(o.key)}
              className={cn(
                "px-2 py-0.5 rounded text-xs border border-border transition-colors",
                tv && "text-base px-3 py-1",
                metrica === o.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full bg-muted/40 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                {obras.map((o, i) => (
                  <linearGradient key={o.obraId} id={`grad-${o.obraId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SERIE_COLORS[i % SERIE_COLORS.length]} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={SERIE_COLORS[i % SERIE_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 14 : 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 14 : 10 }} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: tv ? 14 : 12,
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: tv ? 14 : 11 }} />
              {obras.map((o, i) => (
                <Area
                  key={o.obraId}
                  type="monotone"
                  dataKey={o.obraId}
                  name={o.nombre}
                  stroke={SERIE_COLORS[i % SERIE_COLORS.length]}
                  strokeWidth={tv ? 3 : 2}
                  fill={`url(#grad-${o.obraId})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
