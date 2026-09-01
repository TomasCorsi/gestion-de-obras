import { ObraTableroData } from "@/hooks/useTableroObras";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Truck, Clock, Users, DollarSign, Boxes, Activity } from "lucide-react";

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

const nf = (v: number, d = 0) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

interface MetricProps {
  icon: typeof Truck;
  label: string;
  value: string;
  hint?: string;
  tv?: boolean;
}

function Metric({ icon: Icon, label, value, hint, tv }: MetricProps) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className={cn("w-4 h-4", tv && "w-5 h-5")} />
        <span className={cn("text-xs font-medium uppercase tracking-wide", tv && "text-sm")}>{label}</span>
      </div>
      <p className={cn("font-bold font-mono-numbers text-foreground", tv ? "text-4xl" : "text-xl")}>{value}</p>
      {hint && <p className={cn("text-muted-foreground", tv ? "text-sm" : "text-xs")}>{hint}</p>}
    </div>
  );
}

interface Props {
  obra: ObraTableroData;
  index: number;
  tv?: boolean;
}

export function ObraPanel({ obra, index, tv }: Props) {
  return (
    <Card className={cn("card-industrial p-4 flex flex-col gap-3", tv && "p-6 gap-4")}>
      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0">
          <p className={cn("text-muted-foreground font-medium", tv ? "text-base" : "text-xs")}>
            OBRA {index + 1}
          </p>
          <h2 className={cn("font-bold text-foreground truncate", tv ? "text-3xl" : "text-lg")}>
            {obra.nombre}
          </h2>
          {obra.ubicacion && !tv && (
            <p className="text-xs text-muted-foreground truncate">{obra.ubicacion}</p>
          )}
        </div>
        <Badge variant={obra.estado === "activa" ? "default" : "secondary"} className="capitalize shrink-0">
          {obra.estado}
        </Badge>
      </div>

      <div className={cn("grid grid-cols-2 gap-3", tv && "gap-4")}>
        <Metric icon={Activity} label="Movimientos hoy" value={nf(obra.movimientosHoy)} tv={tv} />
        <Metric icon={Boxes} label="m³" value={nf(obra.m3Hoy, 1)} hint={`${nf(obra.m3Mes, 1)} en el mes`} tv={tv} />
        <Metric
          icon={Truck}
          label="Maquinaria"
          value={nf(obra.maquinariasTotal)}
          hint={`${nf(obra.maquinariasEnUso)} operativas`}
          tv={tv}
        />
        <Metric icon={Clock} label="Horas" value={nf(obra.horasHoy, 1)} hint={`${nf(obra.horasMes, 1)} en el mes`} tv={tv} />
        <Metric icon={Users} label="Personal hoy" value={nf(obra.personalHoy)} tv={tv} />
        <Metric icon={DollarSign} label="Gastos del mes" value={formatCurrency(obra.gastosMes)} tv={tv} />
      </div>

      {obra.alertas.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className={cn("w-4 h-4", tv && "w-5 h-5")} />
            <span className={cn("font-semibold", tv ? "text-base" : "text-xs")}>Alertas</span>
          </div>
          {obra.alertas.map((a, i) => (
            <p key={i} className={cn("text-foreground/90 line-clamp-2", tv ? "text-base" : "text-xs")}>
              • {a}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
