import { ObraTableroData } from "@/hooks/useTableroObras";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  tv?: boolean;
}

function Metric({ icon: Icon, label, value, tv }: MetricProps) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-2 py-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", tv && "w-4 h-4")} />
        <span className={cn("truncate uppercase tracking-wide", tv ? "text-xs" : "text-[10px]")}>
          {label}
        </span>
      </div>
      <p className={cn("font-bold font-mono-numbers text-foreground leading-tight", tv ? "text-2xl" : "text-base")}>
        {value}
      </p>
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
    <Card className={cn("card-industrial p-3 flex flex-col gap-2 h-full min-h-0", tv && "p-4 gap-3")}>
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <p className={cn("text-muted-foreground", tv ? "text-sm" : "text-[10px]")}>OBRA {index + 1}</p>
          <h2 className={cn("font-bold text-foreground truncate", tv ? "text-2xl" : "text-base")}>
            {obra.nombre}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {obra.alertas.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-destructive text-xs font-semibold">
                    <AlertTriangle className={cn("w-3.5 h-3.5", tv && "w-4 h-4")} />
                    {obra.alertas.length}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {obra.alertas.map((a, i) => (
                    <p key={i} className="text-xs">• {a}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Badge variant={obra.estado === "activa" ? "default" : "secondary"} className="capitalize">
            {obra.estado}
          </Badge>
        </div>
      </div>

      <div className={cn("grid grid-cols-3 gap-2 flex-1 min-h-0", tv && "gap-3")}>
        <Metric icon={Activity} label="Movim. hoy" value={nf(obra.movimientosHoy)} tv={tv} />
        <Metric icon={Boxes} label="m³ hoy" value={nf(obra.m3Hoy, 1)} tv={tv} />
        <Metric icon={Clock} label="Horas hoy" value={nf(obra.horasHoy, 1)} tv={tv} />
        <Metric
          icon={Truck}
          label="Maquinaria"
          value={`${nf(obra.maquinariasEnUso)}/${nf(obra.maquinariasTotal)}`}
          tv={tv}
        />
        <Metric icon={Users} label="Personal" value={nf(obra.personalHoy)} tv={tv} />
        <Metric icon={DollarSign} label="Gastos mes" value={formatCurrency(obra.gastosMes)} tv={tv} />
      </div>
    </Card>
  );
}
