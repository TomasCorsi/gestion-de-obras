import { Truck, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface Maquinaria {
  id: string;
  nombre: string;
  tipo: string;
  estado: "operativa" | "mantenimiento" | "inactiva" | "en_uso";
  obra?: string;
  horas_acumuladas?: number;
}

const maquinariasDemo: Maquinaria[] = [
  { id: "1", nombre: "CAT 320D", tipo: "Excavadora", estado: "en_uso", obra: "Obra Lote 45", horas_acumuladas: 1250 },
  { id: "2", nombre: "Komatsu WA380", tipo: "Cargadora", estado: "operativa", obra: undefined, horas_acumuladas: 890 },
  { id: "3", nombre: "Volvo A30G", tipo: "Camión Articulado", estado: "mantenimiento", obra: undefined, horas_acumuladas: 2100 },
  { id: "4", nombre: "CAT D6T", tipo: "Topadora", estado: "en_uso", obra: "Obra Circunvalación", horas_acumuladas: 1580 },
  { id: "5", nombre: "Bomag BW211", tipo: "Rodillo", estado: "inactiva", obra: undefined, horas_acumuladas: 450 },
  { id: "6", nombre: "Hyundai R210", tipo: "Excavadora", estado: "en_uso", obra: "Obra Zona Franca", horas_acumuladas: 980 },
];

const estadoConfig = {
  operativa: { icon: CheckCircle, label: "Operativa", color: "text-success" },
  mantenimiento: { icon: Wrench, label: "Mantenimiento", color: "text-warning" },
  inactiva: { icon: Clock, label: "Inactiva", color: "text-muted-foreground" },
  en_uso: { icon: Truck, label: "En Uso", color: "text-primary" },
};

export function MaquinariasStatus() {
  const statusCounts = maquinariasDemo.reduce((acc, m) => {
    acc[m.estado] = (acc[m.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="card-industrial p-5">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Estado de Maquinarias</h3>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="text-center p-2 bg-muted/50 rounded-lg">
              <Icon className={cn("w-4 h-4 mx-auto mb-1", config.color)} />
              <p className="text-lg font-bold text-foreground">{statusCounts[key] || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {maquinariasDemo.map((maq, index) => {
          const config = estadoConfig[maq.estado];
          const Icon = config.icon;
          return (
            <div
              key={maq.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-muted", config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{maq.nombre}</p>
                  <p className="text-xs text-muted-foreground">{maq.tipo} {maq.obra && `• ${maq.obra}`}</p>
                </div>
              </div>
              {maq.horas_acumuladas && maq.horas_acumuladas > 0 && (
                <span className="text-sm font-mono text-muted-foreground">
                  {maq.horas_acumuladas.toLocaleString()}h
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Alert */}
      <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
        <p className="text-xs text-warning">
          <span className="font-medium">Volvo A30G</span> requiere servicio programado
        </p>
      </div>
    </div>
  );
}
