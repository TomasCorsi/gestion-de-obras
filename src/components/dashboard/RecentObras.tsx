import { Building2, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Obra {
  id: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  estado: "activa" | "pendiente" | "finalizada" | "pausada";
  progreso: number;
  fechaInicio: string;
}

const obrasDemo: Obra[] = [
  {
    id: "1",
    nombre: "Movimiento de Suelo - Lote 45",
    cliente: "Constructora Andina S.A.",
    ubicacion: "Ruta 40, Km 234",
    estado: "activa",
    progreso: 65,
    fechaInicio: "15/12/2025",
  },
  {
    id: "2",
    nombre: "Excavación Fundaciones",
    cliente: "Inmobiliaria Del Sur",
    ubicacion: "Av. Circunvalación 890",
    estado: "activa",
    progreso: 30,
    fechaInicio: "02/01/2026",
  },
  {
    id: "3",
    nombre: "Nivelación Terreno Industrial",
    cliente: "Parque Industrial Norte",
    ubicacion: "Zona Franca, Sector B",
    estado: "pendiente",
    progreso: 0,
    fechaInicio: "15/01/2026",
  },
  {
    id: "4",
    nombre: "Relleno y Compactación",
    cliente: "Municipalidad de Trelew",
    ubicacion: "Calle San Martín 1200",
    estado: "pausada",
    progreso: 45,
    fechaInicio: "10/11/2025",
  },
];

const estadoConfig = {
  activa: { label: "Activa", className: "status-active" },
  pendiente: { label: "Pendiente", className: "status-pending" },
  finalizada: { label: "Finalizada", className: "status-inactive" },
  pausada: { label: "Pausada", className: "status-error" },
};

export function RecentObras() {
  return (
    <div className="card-industrial p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Obras Recientes</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
          Ver todas
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {obrasDemo.map((obra, index) => (
          <div
            key={obra.id}
            className="p-4 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{obra.nombre}</h4>
                <p className="text-sm text-muted-foreground">{obra.cliente}</p>
              </div>
              <Badge className={cn("status-badge ml-2", estadoConfig[obra.estado].className)}>
                {estadoConfig[obra.estado].label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {obra.ubicacion}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {obra.fechaInicio}
              </span>
            </div>

            {obra.estado !== "pendiente" && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="text-foreground font-medium">{obra.progreso}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${obra.progreso}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
