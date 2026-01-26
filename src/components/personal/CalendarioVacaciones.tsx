import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, User, X, Calendar } from "lucide-react";
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

const MOTIVO_LABELS: Record<string, string> = {
  vacaciones: "Vacaciones",
  licencia_medica: "Licencia Médica",
  permiso_personal: "Permiso Personal",
  otro: "Otro",
};

function formatNombreAbreviado(nombre: string | null, apellido: string | null): string {
  if (!apellido && !nombre) return "N/N";
  const apellidoStr = apellido || "";
  const nombreInicial = nombre ? `${nombre.charAt(0)}.` : "";
  return `${apellidoStr}, ${nombreInicial}`.trim();
}

function formatFechaCorta(fecha: string): string {
  return format(parseISO(fecha), "dd/MM", { locale: es });
}

export function CalendarioVacaciones({ vacaciones }: CalendarioVacacionesProps) {
  const [mesActual, setMesActual] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

  const vacacionesDelDiaSeleccionado = useMemo(() => {
    if (!selectedDay) return [];
    return getVacacionesDelDia(selectedDay);
  }, [selectedDay, vacacionesActivas]);

  const mesAnterior = () => setMesActual(prev => subMonths(prev, 1));
  const mesSiguiente = () => setMesActual(prev => addMonths(prev, 1));
  const hoy = () => setMesActual(new Date());

  const handleDayClick = (dia: Date) => {
    const vacacionesDia = getVacacionesDelDia(dia);
    if (vacacionesDia.length > 0) {
      setSelectedDay(isSameDay(dia, selectedDay || new Date(0)) ? null : dia);
    }
  };

  return (
    <div className="flex gap-4">
      {/* Calendario */}
      <div className="flex-1 space-y-4">
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
              const esSeleccionado = selectedDay && isSameDay(dia, selectedDay);
              const tieneVacaciones = vacacionesDelDia.length > 0;

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(dia)}
                  className={cn(
                    "min-h-28 p-2 border-b border-r border-border transition-colors",
                    !esMesActual && "bg-muted/30",
                    esHoy && "bg-primary/10 ring-1 ring-primary ring-inset",
                    esSeleccionado && "bg-primary/20 ring-2 ring-primary ring-inset",
                    tieneVacaciones && "cursor-pointer hover:bg-muted/50"
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
                                "text-xs px-2 py-1 rounded truncate cursor-pointer flex items-center gap-1",
                                vacacion.estado === "aprobada"
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              )}
                            >
                              <User className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate font-medium">
                                {formatNombreAbreviado(vacacion.personal?.nombre, vacacion.personal?.apellido)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border-border p-3 max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-foreground">
                                {vacacion.personal?.apellido?.toUpperCase()}, {vacacion.personal?.nombre}
                              </p>
                              {(vacacion.personal as any)?.legajo && (
                                <p className="text-xs text-muted-foreground">
                                  Legajo: {(vacacion.personal as any).legajo}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Del {formatFechaCorta(vacacion.fecha_inicio)} al {formatFechaCorta(vacacion.fecha_fin)}
                                <span className="ml-1 text-foreground">({vacacion.dias_totales} días)</span>
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {MOTIVO_LABELS[vacacion.motivo] || vacacion.motivo}
                                </span>
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    vacacion.estado === "aprobada"
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  )}
                                >
                                  {vacacion.estado === "aprobada" ? "Aprobada" : "Pendiente"}
                                </Badge>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {vacacionesDelDia.length > 3 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground cursor-pointer text-center font-medium">
                              +{vacacionesDelDia.length - 3} más
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border-border max-w-xs p-3">
                            <div className="space-y-1">
                              {vacacionesDelDia.slice(3).map((v) => (
                                <p key={v.id} className="text-sm">
                                  {v.personal?.apellido?.toUpperCase()}, {v.personal?.nombre}
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

      {/* Panel lateral de detalle */}
      {selectedDay && vacacionesDelDiaSeleccionado.length > 0 && (
        <Card className="w-80 flex-shrink-0 bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {format(selectedDay, "d 'de' MMMM yyyy", { locale: es })}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedDay(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {vacacionesDelDiaSeleccionado.length} persona{vacacionesDelDiaSeleccionado.length !== 1 ? "s" : ""} de licencia
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-3">
                {vacacionesDelDiaSeleccionado.map((vacacion) => (
                  <div
                    key={vacacion.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      vacacion.estado === "aprobada"
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-yellow-500/10 border-yellow-500/30"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                          vacacion.estado === "aprobada" ? "bg-green-500" : "bg-yellow-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">
                          {vacacion.personal?.apellido?.toUpperCase()}, {vacacion.personal?.nombre}
                        </p>
                        {(vacacion.personal as any)?.legajo && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Legajo: {(vacacion.personal as any).legajo}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Del {formatFechaCorta(vacacion.fecha_inicio)} al {formatFechaCorta(vacacion.fecha_fin)}
                          <span className="text-foreground font-medium ml-1">
                            ({vacacion.dias_totales} días)
                          </span>
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {MOTIVO_LABELS[vacacion.motivo] || vacacion.motivo}
                          </span>
                          <Badge
                            className={cn(
                              "text-xs",
                              vacacion.estado === "aprobada"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            )}
                          >
                            {vacacion.estado === "aprobada" ? "Aprobada" : "Pendiente"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
