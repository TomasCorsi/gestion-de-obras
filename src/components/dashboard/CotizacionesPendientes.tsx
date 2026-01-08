import { FileText, Clock, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Cotizacion {
  id: string;
  numero: string;
  cliente: string;
  monto: number;
  vencimiento: string;
  diasRestantes: number;
}

const cotizacionesDemo: Cotizacion[] = [
  { id: "1", numero: "COT-2026-001", cliente: "Constructora Andina S.A.", monto: 2450000, vencimiento: "15/01/2026", diasRestantes: 7 },
  { id: "2", numero: "COT-2026-002", cliente: "Inmobiliaria Del Sur", monto: 890000, vencimiento: "12/01/2026", diasRestantes: 4 },
  { id: "3", numero: "COT-2026-003", cliente: "Parque Industrial Norte", monto: 5200000, vencimiento: "20/01/2026", diasRestantes: 12 },
  { id: "4", numero: "COT-2026-004", cliente: "Municipalidad de Trelew", monto: 1750000, vencimiento: "10/01/2026", diasRestantes: 2 },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CotizacionesPendientes() {
  return (
    <div className="card-industrial p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Cotizaciones Pendientes</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
          Ver todas
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {cotizacionesDemo.map((cot, index) => (
          <div
            key={cot.id}
            className="p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-mono text-primary">{cot.numero}</span>
                <h4 className="font-medium text-foreground text-sm">{cot.cliente}</h4>
              </div>
              <Badge
                className={cn(
                  "status-badge",
                  cot.diasRestantes <= 3
                    ? "status-error"
                    : cot.diasRestantes <= 7
                    ? "status-pending"
                    : "status-active"
                )}
              >
                {cot.diasRestantes}d
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                Vence: {cot.vencimiento}
              </span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(cot.monto)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total pendiente</span>
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(cotizacionesDemo.reduce((sum, c) => sum + c.monto, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
