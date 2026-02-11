import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObservacionesMaquina, ObservacionMaquina } from "@/hooks/useObservacionesMaquina";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  Search,
  Loader2,
  Wrench,
  Calendar,
  User,
  MapPin,
  Clock,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export function ObservacionesCampoTab() {
  const { observaciones, pendientes, atendidas, isLoading, toggleAtendida, isUpdating } =
    useObservacionesMaquina();

  const [filtro, setFiltro] = useState<"pendientes" | "atendidas" | "todas">("pendientes");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolucionData, setResolucionData] = useState<Record<string, { atendida_por: string; notas: string }>>({});

  const { data: tecnicosOptions = [] } = useQuery({
    queryKey: ["personal_tecnicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_selector" as any)
        .select("id, nombre, apellido, rol")
        .in("rol", ["mecanico", "ayudante"])
        .eq("activo", true)
        .order("apellido") as { data: { id: string; nombre: string | null; apellido: string | null; rol: string }[] | null; error: any };
      if (error) throw error;
      return (data || []).map((p): ComboboxOption => {
        const fullName = `${p.apellido || ""} ${p.nombre || ""}`.trim();
        const rolLabel = p.rol === "mecanico" ? "Mecánico" : "Ayudante";
        return {
          value: `${p.nombre || ""} ${p.apellido || ""}`.trim(),
          label: `${fullName} (${rolLabel})`,
          searchValue: fullName,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    let list = observaciones;
    if (filtro === "pendientes") list = pendientes;
    else if (filtro === "atendidas") list = atendidas;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (o) =>
          o.maquinaria?.nombre?.toLowerCase().includes(term) ||
          o.maquinaria?.codigo?.toLowerCase().includes(term) ||
          o.observacion.toLowerCase().includes(term)
      );
    }
    return list;
  }, [observaciones, pendientes, atendidas, filtro, searchTerm]);

  // KPIs
  const atendidasHoy = atendidas.filter(
    (o) => o.fecha_atencion && new Date(o.fecha_atencion).toDateString() === new Date().toDateString()
  ).length;

  const maquinaMasReportada = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    pendientes.forEach((o) => {
      const key = o.maquinaria_id || "sin-maquina";
      if (!counts[key]) counts[key] = { name: o.maquinaria?.nombre || o.maquinaria?.codigo || "Sin asignar", count: 0 };
      counts[key].count++;
    });
    let max = { name: "-", count: 0 };
    Object.values(counts).forEach((v) => { if (v.count > max.count) max = v; });
    return max;
  }, [pendientes]);

  const handleToggle = async (obs: ObservacionMaquina) => {
    if (!obs.atendida) {
      // Expand to fill resolution data
      setExpandedId(obs.id);
      if (!resolucionData[obs.id]) {
        setResolucionData((prev) => ({ ...prev, [obs.id]: { atendida_por: "", notas: "" } }));
      }
    } else {
      // Unmark
      await toggleAtendida({ id: obs.id, atendida: false });
    }
  };

  const handleConfirmAtendida = async (obs: ObservacionMaquina) => {
    const data = resolucionData[obs.id];
    await toggleAtendida({
      id: obs.id,
      atendida: true,
      atendida_por: data?.atendida_por || undefined,
      notas_resolucion: data?.notas || undefined,
    });
    setExpandedId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{pendientes.length}</p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{atendidasHoy}</p>
            <p className="text-sm text-muted-foreground">Atendidas hoy</p>
          </div>
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <p className="text-2xl font-bold text-foreground truncate max-w-[140px]">{maquinaMasReportada.name}</p>
            <p className="text-sm text-muted-foreground">Más reportada ({maquinaMasReportada.count})</p>
          </div>
          <Wrench className="w-8 h-8 text-destructive" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por máquina u observación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="pendientes">Pendientes</SelectItem>
            <SelectItem value="atendidas">Atendidas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay observaciones {filtro === "pendientes" ? "pendientes" : filtro === "atendidas" ? "atendidas" : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((obs) => {
            const isExpanded = expandedId === obs.id;
            const operador = obs.parte_diario?.personal;
            const operadorName = operador
              ? `${operador.nombre || ""} ${operador.apellido || ""}`.trim()
              : "Desconocido";

            return (
              <Card
                key={obs.id}
                className={cn(
                  "card-industrial transition-all",
                  obs.atendida && "opacity-70",
                  !obs.atendida && "border-l-4 border-l-warning"
                )}
              >
                <CardContent className="pt-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <Checkbox
                        checked={obs.atendida}
                        onCheckedChange={() => handleToggle(obs)}
                        disabled={isUpdating}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn("font-semibold text-foreground", obs.atendida && "line-through opacity-60")}>
                          {obs.maquinaria?.nombre || "Sin máquina"}
                        </h4>
                        {obs.atendida ? (
                          <Badge className="status-badge status-active text-xs">Atendida</Badge>
                        ) : (
                          <Badge className="status-badge status-pending text-xs">Pendiente</Badge>
                        )}
                      </div>

                      {obs.maquinaria?.patente && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Patente: {obs.maquinaria.patente}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(obs.fecha_reporte)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {operadorName}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-foreground/80">{obs.observacion || "Sin detalle"}</p>

                      {/* Resolution info (if already resolved) */}
                      {obs.atendida && obs.notas_resolucion && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
                          <span className="font-medium">Resolución:</span> {obs.notas_resolucion}
                          {obs.atendida_por && <> — <span className="font-medium">{obs.atendida_por}</span></>}
                          {obs.fecha_atencion && (
                            <span className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(obs.fecha_atencion)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded resolution form */}
                  {isExpanded && !obs.atendida && (
                    <div className="ml-8 space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                      <div className="space-y-1">
                        <Label className="text-xs">Atendida por</Label>
                        <Combobox
                          options={tecnicosOptions}
                          value={resolucionData[obs.id]?.atendida_por || ""}
                          onValueChange={(val) =>
                            setResolucionData((prev) => ({
                              ...prev,
                              [obs.id]: { ...prev[obs.id], atendida_por: val },
                            }))
                          }
                          placeholder="Seleccionar técnico..."
                          searchPlaceholder="Buscar mecánico o ayudante..."
                          emptyText="No se encontraron técnicos."
                          className="bg-card border-border h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notas de resolución</Label>
                        <Textarea
                          placeholder="¿Qué se hizo para resolver?"
                          value={resolucionData[obs.id]?.notas || ""}
                          onChange={(e) =>
                            setResolucionData((prev) => ({
                              ...prev,
                              [obs.id]: { ...prev[obs.id], notas: e.target.value },
                            }))
                          }
                          className="bg-card border-border min-h-[60px] text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmAtendida(obs)}
                          disabled={isUpdating}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
