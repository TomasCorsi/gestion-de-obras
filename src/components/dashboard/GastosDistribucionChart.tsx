import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ObraTableroData } from "@/hooks/useTableroObras";
import { SERIE_COLORS } from "@/hooks/useTableroSeries";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

interface Props {
  obras: ObraTableroData[];
  loading?: boolean;
  tv?: boolean;
}

export function GastosDistribucionChart({ obras, loading, tv }: Props) {
  const data = obras
    .map((o) => ({ name: o.nombre, value: Math.round(o.gastosMes) }))
    .filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="card-industrial p-3 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className={cn("font-semibold text-foreground", tv ? "text-xl" : "text-sm")}>
          Gastos del mes
        </h3>
        <span className={cn("font-mono-numbers text-muted-foreground", tv ? "text-lg" : "text-xs")}>
          {formatCurrency(total)}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full bg-muted/40 rounded animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Sin gastos registrados este mes
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="50%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={SERIE_COLORS[i % SERIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: tv ? 14 : 12,
                }}
                formatter={(v: number) => [
                  `${formatCurrency(v)} (${total ? Math.round((v / total) * 100) : 0}%)`,
                  "Gasto",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: tv ? 14 : 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
