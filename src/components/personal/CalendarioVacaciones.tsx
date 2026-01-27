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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Calendar,
  Users,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { VacacionDB, MotivoVacacion } from "@/hooks/useVacaciones";
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
  differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";

interface CalendarioVacacionesProps {
  vacaciones: VacacionDB[];
}

type ViewMode = "estado" | "motivo";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MOTIVO_LABELS: Record<string, string> = {
  vacaciones: "Vacaciones",
  licencia_medica: "Licencia Médica",
  permiso_personal: "Permiso Personal",
  otro: "Otro",
};

const MOTIVO_COLORS: Record<MotivoVacacion, { bg: string; text: string; border: string; dot: string }> = {
  vacaciones: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  licencia_medica: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  permiso_personal: {
    bg: "bg-violet-500/20",
    text: "text-violet-400",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
  },
  otro: {
    bg: "bg-slate-500/20",
    text: "text-slate-400",
    border: "border-slate-500/30",
    dot: "bg-slate-500",
  },
};

const ESTADO_COLORS = {
  aprobada: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
    dot: "bg-green-500",
  },
  pendiente: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
  },
};

const UMBRAL_CRITICO = 3;

function formatNombreAbreviado(nombre: string | null, apellido: string | null): string {
  if (!apellido && !nombre) return "N/N";
  const apellidoStr = apellido || "";
  const nombreInicial = nombre ? `${nombre.charAt(0)}.` : "";
  return `${apellidoStr}, ${nombreInicial}`.trim();
}

function formatFechaCorta(fecha: string): string {
  return format(parseISO(fecha), "dd/MM", { locale: es });
}

function getVacacionColors(vacacion: VacacionDB, viewMode: ViewMode) {
  if (viewMode === "motivo") {
    const motivo = vacacion.motivo as MotivoVacacion;
    return MOTIVO_COLORS[motivo] || MOTIVO_COLORS.otro;
  }
  return ESTADO_COLORS[vacacion.estado as keyof typeof ESTADO_COLORS] || ESTADO_COLORS.pendiente;
}

export function CalendarioVacaciones({ vacaciones }: CalendarioVacacionesProps) {
  const [mesActual, setMesActual] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("estado");
  const [empleadoFilter, setEmpleadoFilter] = useState<string>("all");
  const [showRejected, setShowRejected] = useState(false);

  const diasDelMes = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mesActual]);

  // Filtrar vacaciones según configuración
  const vacacionesFiltradas = useMemo(() => {
    let filtered = vacaciones.filter(v => {
      if (!showRejected && v.estado === "rechazada") return false;
      return v.estado === "aprobada" || v.estado === "pendiente" || (showRejected && v.estado === "rechazada");
    });

    if (empleadoFilter !== "all") {
      filtered = filtered.filter(v => v.personal_id === empleadoFilter);
    }

    return filtered;
  }, [vacaciones, showRejected, empleadoFilter]);

  // Lista única de empleados para el filtro
  const empleadosUnicos = useMemo(() => {
    const empleadosMap = new Map<string, { id: string; nombre: string; apellido: string }>();
    vacaciones.forEach(v => {
      if (v.personal_id && v.personal) {
        empleadosMap.set(v.personal_id, {
          id: v.personal_id,
          nombre: v.personal.nombre || "",
          apellido: v.personal.apellido || "",
        });
      }
    });
    return Array.from(empleadosMap.values()).sort((a, b) => 
      (a.apellido || "").localeCompare(b.apellido || "")
    );
  }, [vacaciones]);

  const getVacacionesDelDia = (dia: Date) => {
    return vacacionesFiltradas.filter(v => {
      const inicio = parseISO(v.fecha_inicio);
      const fin = parseISO(v.fecha_fin);
      return isWithinInterval(dia, { start: inicio, end: fin });
    });
  };

  // Estadísticas del mes
  const estadisticasMes = useMemo(() => {
    const inicioMes = startOfMonth(mesActual);
    const finMes = endOfMonth(mesActual);
    const diasMes = eachDayOfInterval({ start: inicioMes, end: finMes });
    
    let totalPersonasAusentes = new Set<string>();
    let diaMasAusencias = { fecha: inicioMes, cantidad: 0 };
    
    diasMes.forEach(dia => {
      const vacacionesDia = getVacacionesDelDia(dia);
      vacacionesDia.forEach(v => totalPersonasAusentes.add(v.personal_id));
      
      if (vacacionesDia.length > diaMasAusencias.cantidad) {
        diaMasAusencias = { fecha: dia, cantidad: vacacionesDia.length };
      }
    });

    return {
      totalPersonas: totalPersonasAusentes.size,
      diaMasAusencias,
    };
  }, [mesActual, vacacionesFiltradas]);

  const vacacionesDelDiaSeleccionado = useMemo(() => {
    if (!selectedDay) return [];
    return getVacacionesDelDia(selectedDay);
  }, [selectedDay, vacacionesFiltradas]);

  // Datos para el timeline
  const timelineData = useMemo(() => {
    const inicioMes = startOfMonth(mesActual);
    const finMes = endOfMonth(mesActual);
    
    return vacacionesFiltradas
      .filter(v => {
        const inicio = parseISO(v.fecha_inicio);
        const fin = parseISO(v.fecha_fin);
        return (inicio <= finMes && fin >= inicioMes);
      })
      .sort((a, b) => parseISO(a.fecha_inicio).getTime() - parseISO(b.fecha_inicio).getTime());
  }, [mesActual, vacacionesFiltradas]);

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
    <div className="space-y-4">
      {/* Controles y Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Estadísticas del mes */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{estadisticasMes.totalPersonas}</p>
                <p className="text-xs text-muted-foreground">Personas con licencia este mes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                estadisticasMes.diaMasAusencias.cantidad >= UMBRAL_CRITICO 
                  ? "bg-destructive/10" 
                  : "bg-amber-500/10"
              )}>
                <TrendingUp className={cn(
                  "w-5 h-5",
                  estadisticasMes.diaMasAusencias.cantidad >= UMBRAL_CRITICO 
                    ? "text-destructive" 
                    : "text-amber-500"
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {estadisticasMes.diaMasAusencias.cantidad > 0 
                    ? format(estadisticasMes.diaMasAusencias.fecha, "d MMM", { locale: es })
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Día con más ausencias ({estadisticasMes.diaMasAusencias.cantidad} personas)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="view-mode" className="text-sm">Ver por motivo</Label>
              <Switch
                id="view-mode"
                checked={viewMode === "motivo"}
                onCheckedChange={(checked) => setViewMode(checked ? "motivo" : "estado")}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-rejected"
                checked={showRejected}
                onCheckedChange={(checked) => setShowRejected(checked === true)}
              />
              <Label htmlFor="show-rejected" className="text-sm">
                Mostrar rechazadas
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro por empleado */}
      <div className="flex items-center gap-4">
        <Select value={empleadoFilter} onValueChange={setEmpleadoFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por empleado" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todos los empleados</SelectItem>
            {empleadosUnicos.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.apellido?.toUpperCase()}, {emp.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {empleadoFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEmpleadoFilter("all")}
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar filtro
          </Button>
        )}
      </div>

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
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {viewMode === "estado" ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Aprobada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-muted-foreground">Pendiente</span>
                  </div>
                  {showRejected && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-muted-foreground">Rechazada</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Vacaciones</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Médica</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    <span className="text-muted-foreground">Personal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                    <span className="text-muted-foreground">Otro</span>
                  </div>
                </>
              )}
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
                const esCritico = vacacionesDelDia.length >= UMBRAL_CRITICO;

                return (
                  <div
                    key={index}
                    onClick={() => handleDayClick(dia)}
                    className={cn(
                      "min-h-28 p-2 border-b border-r border-border transition-colors relative",
                      !esMesActual && "bg-muted/30",
                      esHoy && "bg-primary/10 ring-1 ring-primary ring-inset",
                      esSeleccionado && "bg-primary/20 ring-2 ring-primary ring-inset",
                      tieneVacaciones && "cursor-pointer hover:bg-muted/50",
                      esCritico && "ring-2 ring-destructive ring-inset"
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
                      
                      {/* Badge contador de ausencias */}
                      {tieneVacaciones && (
                        <Badge
                          className={cn(
                            "text-xs px-1.5 py-0",
                            esCritico
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {vacacionesDelDia.length}
                        </Badge>
                      )}
                    </div>

                    {/* Indicador de día crítico */}
                    {esCritico && (
                      <div className="absolute top-1 right-8">
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                      </div>
                    )}

                    {/* Badges de empleados de vacaciones */}
                    <div className="space-y-1">
                      <TooltipProvider>
                        {vacacionesDelDia.slice(0, 3).map((vacacion) => {
                          const colors = getVacacionColors(vacacion, viewMode);
                          return (
                            <Tooltip key={vacacion.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "text-xs px-2 py-1 rounded truncate cursor-pointer flex items-center gap-1 border",
                                    colors.bg,
                                    colors.text,
                                    colors.border
                                  )}
                                >
                                  <User className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate font-medium">
                                    {formatNombreAbreviado(vacacion.personal?.nombre, vacacion.personal?.apellido)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-popover border-border p-3 max-w-xs z-50">
                                <div className="space-y-2">
                                  <p className="font-semibold text-foreground">
                                    {vacacion.personal?.apellido?.toUpperCase()}, {vacacion.personal?.nombre}
                                  </p>
                                  {vacacion.personal?.legajo && (
                                    <p className="text-xs text-muted-foreground">
                                      Legajo: {vacacion.personal.legajo}
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
                                        ESTADO_COLORS[vacacion.estado as keyof typeof ESTADO_COLORS]?.bg,
                                        ESTADO_COLORS[vacacion.estado as keyof typeof ESTADO_COLORS]?.text,
                                        ESTADO_COLORS[vacacion.estado as keyof typeof ESTADO_COLORS]?.border
                                      )}
                                    >
                                      {vacacion.estado === "aprobada" ? "Aprobada" : vacacion.estado === "pendiente" ? "Pendiente" : "Rechazada"}
                                    </Badge>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {vacacionesDelDia.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground cursor-pointer text-center font-medium">
                                +{vacacionesDelDia.length - 3} más
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-popover border-border max-w-xs p-3 z-50">
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

          {/* Timeline horizontal */}
          {timelineData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Timeline de Licencias - {format(mesActual, "MMMM yyyy", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-4">
                    {timelineData.map((vacacion) => {
                      const inicioMes = startOfMonth(mesActual);
                      const finMes = endOfMonth(mesActual);
                      const totalDiasMes = differenceInDays(finMes, inicioMes) + 1;
                      
                      const inicioVac = parseISO(vacacion.fecha_inicio);
                      const finVac = parseISO(vacacion.fecha_fin);
                      
                      const inicioVisible = inicioVac < inicioMes ? inicioMes : inicioVac;
                      const finVisible = finVac > finMes ? finMes : finVac;
                      
                      const offsetDias = differenceInDays(inicioVisible, inicioMes);
                      const duracionVisible = differenceInDays(finVisible, inicioVisible) + 1;
                      
                      const leftPercent = (offsetDias / totalDiasMes) * 100;
                      const widthPercent = (duracionVisible / totalDiasMes) * 100;
                      
                      const colors = getVacacionColors(vacacion, viewMode);

                      return (
                        <div key={vacacion.id} className="flex items-center gap-3">
                          <div className="w-32 flex-shrink-0 text-xs text-muted-foreground truncate">
                            {formatNombreAbreviado(vacacion.personal?.nombre, vacacion.personal?.apellido)}
                          </div>
                          <div className="flex-1 h-6 bg-muted/30 rounded relative">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute h-full rounded cursor-pointer border",
                                      colors.bg,
                                      colors.border
                                    )}
                                    style={{
                                      left: `${leftPercent}%`,
                                      width: `${Math.max(widthPercent, 2)}%`,
                                    }}
                                  >
                                    <span className={cn("text-xs px-1 truncate block leading-6", colors.text)}>
                                      {vacacion.dias_totales}d
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover border-border p-2 z-50">
                                  <p className="font-medium">{vacacion.personal?.apellido}, {vacacion.personal?.nombre}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFechaCorta(vacacion.fecha_inicio)} - {formatFechaCorta(vacacion.fecha_fin)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {MOTIVO_LABELS[vacacion.motivo]} • {vacacion.dias_totales} días
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
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
                  {vacacionesDelDiaSeleccionado.map((vacacion) => {
                    const colors = getVacacionColors(vacacion, viewMode);
                    return (
                      <div
                        key={vacacion.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          colors.bg,
                          colors.border
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                              colors.dot
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">
                              {vacacion.personal?.apellido?.toUpperCase()}, {vacacion.personal?.nombre}
                            </p>
                            {vacacion.personal?.legajo && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Legajo: {vacacion.personal.legajo}
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
                                  ESTADO_COLORS[vacacion.estado as keyof typeof ESTADO_COLORS]?.bg,
                                  ESTADO_COLORS[vacacion.estado as keyof typeof ESTADO_COLORS]?.text,
                                  ESTADO_COLORS[vacacion.estado as keyof typeof ESTADO_COLORS]?.border
                                )}
                              >
                                {vacacion.estado === "aprobada" ? "Aprobada" : vacacion.estado === "pendiente" ? "Pendiente" : "Rechazada"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
