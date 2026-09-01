import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ObraTableroData } from "@/hooks/useTableroObras";
import { SERIE_COLORS } from "@/hooks/useTableroSeries";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

type Metrica = "m3" | "horas" | "movimientos";

const OPCIONES: { key: Metrica; label: string }[] = [
  { key: "m3", label: "m³ mes" },
  { key: "horas", label: "Horas mes" },
  { key: "movimientos", label: "Mov. hoy" },
];

interface Props {
  obras: ObraTableroData[];
  loading?: boolean;
  tv?: boolean;
}

export function ComparativaObrasChart({ obras, loading, tv }: Props) {
  const [metrica, setMetrica] = useState<Metrica>("m3");

  const data = obras
    .map((o) => ({
      nombre: o.nombre.length > 18 ? `${o.nombre.slice(0, 18)}…` : o.nombre,
      valor:
        metrica === "m3" ? o.m3Mes : metrica === "horas" ? o.horasMes : o.movimientosHoy,
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <Card className="card-industrial p-3 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className={cn("font-semibold text-foreground", tv ? "text-xl" : "text-sm")}>
          Comparativa por obra
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
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 14 : 10 }} />
              <YAxis
                type="category"
                dataKey="nombre"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: tv ? 14 : 10 }}
                width={tv ? 160 : 110}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: tv ? 14 : 12,
                }}
              />
              <Bar dataKey="valor" name="Valor" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={SERIE_COLORS[i % SERIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
