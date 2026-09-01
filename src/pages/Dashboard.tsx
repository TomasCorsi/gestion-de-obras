import { useEffect, useMemo, useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { ObraPanel } from "@/components/dashboard/ObraPanel";
import { ObraSelectorDialog } from "@/components/dashboard/ObraSelectorDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useObrasSeleccionadas, MAX_OBRAS } from "@/hooks/useObrasSeleccionadas";
import { useTableroObras } from "@/hooks/useTableroObras";
import { format } from "date-fns";
import {
  Building2,
  Truck,
  Route,
  DollarSign,
  Users,
  Clock,
  Maximize2,
  Minimize2,
  ListFilter,
  X,
  RefreshCw,
} from "lucide-react";

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

const nf = (v: number, d = 0) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function Dashboard() {
  const { obraIds, guardar, quitar, loading: loadingSeleccion } = useObrasSeleccionadas();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [tv, setTv] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  const { obras, loading, refetch, dataUpdatedAt } = useTableroObras(obraIds, tv ? 60000 : undefined);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Sincroniza el modo TV con la API de pantalla completa
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setTv(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const entrarTV = useCallback(async () => {
    setTv(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* el navegador puede bloquearlo: igual mostramos el modo TV */
    }
  }, []);

  const salirTV = useCallback(async () => {
    setTv(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const totales = useMemo(
    () => ({
      movimientos: obras.reduce((s, o) => s + o.movimientosHoy, 0),
      m3: obras.reduce((s, o) => s + o.m3Hoy, 0),
      maquinarias: obras.reduce((s, o) => s + o.maquinariasTotal, 0),
      maquinariasEnUso: obras.reduce((s, o) => s + o.maquinariasEnUso, 0),
      horas: obras.reduce((s, o) => s + o.horasHoy, 0),
      personal: obras.reduce((s, o) => s + o.personalHoy, 0),
      gastos: obras.reduce((s, o) => s + o.gastosMes, 0),
      alertas: obras.reduce((s, o) => s + o.alertas.length, 0),
    }),
    [obras]
  );

  const ultimaActualizacion = dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss") : "--:--";

  const kpis = (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard title="Obras en tablero" value={obras.length} subtitle={`Máximo ${MAX_OBRAS}`} icon={Building2} variant="primary" />
      <KPICard title="Movimientos hoy" value={nf(totales.movimientos)} subtitle="Viajes e internos" icon={Route} variant="default" />
      <KPICard title="m³ hoy" value={nf(totales.m3, 1)} subtitle="Según remitos" icon={Truck} variant="success" />
      <KPICard title="Horas hoy" value={nf(totales.horas, 1)} subtitle="Horómetro partes diarios" icon={Clock} variant="default" />
      <KPICard title="Personal hoy" value={nf(totales.personal)} subtitle="Reportaron parte" icon={Users} variant="default" />
      <KPICard title="Gastos del mes" value={formatCurrency(totales.gastos)} subtitle="Gastos + mantenimiento" icon={DollarSign} variant="warning" />
    </div>
  );

  const paneles = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {obras.map((obra, i) => (
        <ObraPanel key={obra.obraId} obra={obra} index={i} tv={tv} />
      ))}
    </div>
  );

  const vacio = (
    <Card className="card-industrial p-10 text-center">
      <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-lg font-semibold mb-1">No hay obras seleccionadas</p>
      <p className="text-sm text-muted-foreground mb-4">
        Elegí hasta {MAX_OBRAS} obras para armar tu centro de control.
      </p>
      <Button onClick={() => setSelectorOpen(true)}>Seleccionar obras</Button>
    </Card>
  );

  if (tv) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Centro de Control de Obras</h1>
            <p className="text-muted-foreground text-lg">
              {format(ahora, "dd/MM/yyyy")} · {format(ahora, "HH:mm")}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={salirTV} aria-label="Salir de pantalla completa">
            <Minimize2 className="w-5 h-5" />
          </Button>
        </div>

        {kpis}

        <div className="flex-1">{obras.length > 0 ? paneles : vacio}</div>

        <div className="flex items-center justify-between text-muted-foreground text-sm border-t border-border pt-3">
          <span>{totales.alertas > 0 ? `${totales.alertas} alerta(s) activas` : "Sin alertas activas"}</span>
          <span>Última actualización: {ultimaActualizacion}</span>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Tablero de Obras" subtitle="Centro de control por obra">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button variant="outline" onClick={() => setSelectorOpen(true)} className="gap-2">
          <ListFilter className="w-4 h-4" />
          Seleccionar obras
        </Button>

        {obras.map((o) => (
          <Badge key={o.obraId} variant="secondary" className="gap-1 py-1.5 pl-3 pr-1.5">
            {o.nombre}
            <button
              type="button"
              onClick={() => quitar(o.obraId)}
              className="rounded p-0.5 hover:bg-muted"
              aria-label={`Quitar ${o.nombre}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Actualizado {ultimaActualizacion}
          </span>
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={entrarTV} className="gap-2" disabled={obras.length === 0}>
            <Maximize2 className="w-4 h-4" />
            Pantalla completa
          </Button>
        </div>
      </div>

      {(loading || loadingSeleccion) && obras.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="card-industrial p-6">
              <div className="h-56 bg-muted/50 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : obras.length === 0 ? (
        vacio
      ) : (
        <div className="space-y-6">
          {kpis}
          {paneles}
        </div>
      )}

      <ObraSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        seleccionadas={obraIds}
        onAplicar={guardar}
      />
    </MainLayout>
  );
}
