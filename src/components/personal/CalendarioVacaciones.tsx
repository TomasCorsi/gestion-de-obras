import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { VacacionDB } from "@/hooks/useVacaciones";
import { cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

interface CalendarioVacacionesProps {
  vacaciones: VacacionDB[];
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarioVacaciones({ vacaciones }: CalendarioVacacionesProps) {
  const [mesActual, setMesActual] = useState(new Date());

  const diasDelMes = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mesActual]);

  // Solo mostrar vacaciones aprobadas y pendientes
  const vacacionesActivas = useMemo(() => {
    return vacaciones.filter(v => v.estado === "aprobada" || v.estado === "pendiente");
  }, [vacaciones]);

  const getVacacionesDelDia = (dia: Date) => {
    return vacacionesActivas.filter(v => {
      const inicio = parseISO(v.fecha_inicio);
      const fin = parseISO(v.fecha_fin);
      return isWithinInterval(dia, { start: inicio, end: fin });
    });
  };

  const mesAnterior = () => setMesActual(prev => subMonths(prev, 1));
  const mesSiguiente = () => setMesActual(prev => addMonths(prev, 1));
  const hoy = () => setMesActual(new Date());

  return (
    <div className="space-y-4">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={mesAnterior}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={mesSiguiente}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={hoy}>
            Hoy
          </Button>
        </div>
        <h2 className="text-xl font-semibold text-foreground capitalize">
          {format(mesActual, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Aprobada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Pendiente</span>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="card-industrial overflow-hidden">
        {/* Días de la semana */}
        <div className="grid grid-cols-7 border-b border-border">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/50"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7">
          {diasDelMes.map((dia, index) => {
            const vacacionesDelDia = getVacacionesDelDia(dia);
            const esHoy = isSameDay(dia, new Date());
            const esMesActual = isSameMonth(dia, mesActual);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-24 p-2 border-b border-r border-border transition-colors",
                  !esMesActual && "bg-muted/30",
                  esHoy && "bg-primary/10 ring-1 ring-primary ring-inset"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      !esMesActual && "text-muted-foreground/50",
                      esHoy && "text-primary font-bold"
                    )}
                  >
                    {format(dia, "d")}
                  </span>
                </div>

                {/* Badges de empleados de vacaciones */}
                <div className="space-y-1">
                  <TooltipProvider>
                    {vacacionesDelDia.slice(0, 3).map((vacacion) => (
                      <Tooltip key={vacacion.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer flex items-center gap-1",
                              vacacion.estado === "aprobada"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            )}
                          >
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {vacacion.personal?.nombre?.charAt(0) || ""}
                              {vacacion.personal?.apellido?.charAt(0) || ""}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover border-border">
                          <div className="space-y-1">
                            <p className="font-medium">
                              {vacacion.personal?.nombre} {vacacion.personal?.apellido}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {vacacion.fecha_inicio} al {vacacion.fecha_fin}
                            </p>
                            <Badge
                              className={cn(
                                "text-xs",
                                vacacion.estado === "aprobada"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              )}
                            >
                              {vacacion.estado === "aprobada" ? "Aprobada" : "Pendiente"}
                            </Badge>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {vacacionesDelDia.length > 3 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground cursor-pointer text-center">
                            +{vacacionesDelDia.length - 3} más
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover border-border max-w-xs">
                          <div className="space-y-1">
                            {vacacionesDelDia.slice(3).map((v) => (
                              <p key={v.id} className="text-sm">
                                {v.personal?.nombre} {v.personal?.apellido}
                              </p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
