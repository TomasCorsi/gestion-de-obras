import { useEffect, useMemo, useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { ObraPanel } from "@/components/dashboard/ObraPanel";
import { ObraSelectorDialog } from "@/components/dashboard/ObraSelectorDialog";
import { TendenciaObrasChart } from "@/components/dashboard/TendenciaObrasChart";
import { ComparativaObrasChart } from "@/components/dashboard/ComparativaObrasChart";
import { GastosDistribucionChart } from "@/components/dashboard/GastosDistribucionChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useObrasSeleccionadas, MAX_OBRAS } from "@/hooks/useObrasSeleccionadas";
import { useTableroObras } from "@/hooks/useTableroObras";
import { useTableroSeries } from "@/hooks/useTableroSeries";
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
  const { series, loading: loadingSeries } = useTableroSeries(obraIds, tv ? 60000 : undefined);

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

  const obrasMeta = useMemo(
    () => obras.map((o) => ({ obraId: o.obraId, nombre: o.nombre })),
    [obras]
  );

  const ultimaActualizacion = dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss") : "--:--";

  const kpis = (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 shrink-0">
      <KPICard title="Obras" value={obras.length} icon={Building2} variant="primary" compact tv={tv} />
      <KPICard title="Movimientos hoy" value={nf(totales.movimientos)} icon={Route} compact tv={tv} />
      <KPICard title="m³ hoy" value={nf(totales.m3, 1)} icon={Truck} variant="success" compact tv={tv} />
      <KPICard title="Horas hoy" value={nf(totales.horas, 1)} icon={Clock} compact tv={tv} />
      <KPICard title="Personal hoy" value={nf(totales.personal)} icon={Users} compact tv={tv} />
      <KPICard
        title="Gastos del mes"
        value={formatCurrency(totales.gastos)}
        icon={DollarSign}
        variant="warning"
        compact
        tv={tv}
      />
    </div>
  );

  const graficos = (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-full min-h-0">
      <div className="lg:col-span-2 min-h-0 h-[260px] lg:h-full">
        <TendenciaObrasChart series={series} obras={obrasMeta} loading={loadingSeries} tv={tv} />
      </div>
      <div className="min-h-0 h-[240px] lg:h-full">
        <ComparativaObrasChart obras={obras} loading={loading} tv={tv} />
      </div>
      <div className="min-h-0 h-[240px] lg:h-full">
        <GastosDistribucionChart obras={obras} loading={loading} tv={tv} />
      </div>
    </div>
  );

  const paneles = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full min-h-0">
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
      <div className="h-screen overflow-hidden bg-background p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Centro de Control de Obras</h1>
            <p className="text-muted-foreground">
              {format(ahora, "dd/MM/yyyy")} · {format(ahora, "HH:mm")}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={salirTV} aria-label="Salir de pantalla completa">
            <Minimize2 className="w-5 h-5" />
          </Button>
        </div>

        {kpis}

        {obras.length > 0 ? (
          <>
            <div className="flex-[3] min-h-0">{graficos}</div>
            <div className="flex-[2] min-h-0">{paneles}</div>
          </>

        ) : (
          <div className="flex-1 flex items-center justify-center">{vacio}</div>
        )}

        <div className="flex items-center justify-between text-muted-foreground text-sm border-t border-border pt-2 shrink-0">
          <span>{totales.alertas > 0 ? `${totales.alertas} alerta(s) activas` : "Sin alertas activas"}</span>
          <span>Última actualización: {ultimaActualizacion}</span>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Tablero de Obras" subtitle="Centro de control por obra">
      <div className="flex flex-col lg:h-[calc(100vh-8.5rem)] lg:overflow-hidden gap-3">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setSelectorOpen(true)} className="gap-2">
            <ListFilter className="w-4 h-4" />
            Seleccionar obras
          </Button>

          {obras.map((o) => (
            <Badge key={o.obraId} variant="secondary" className="gap-1 py-1 pl-3 pr-1.5">
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
            <Button size="sm" onClick={entrarTV} className="gap-2" disabled={obras.length === 0}>
              <Maximize2 className="w-4 h-4" />
              Pantalla completa
            </Button>
          </div>
        </div>

        {(loading || loadingSeleccion) && obras.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-industrial p-6">
                <div className="h-56 bg-muted/50 rounded animate-pulse" />
              </Card>
            ))}
          </div>
        ) : obras.length === 0 ? (
          vacio
        ) : (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {kpis}
            <div className="h-[280px] lg:h-auto lg:flex-[3] min-h-0">{graficos}</div>
            <div className="lg:flex-[2] min-h-0">{paneles}</div>
          </div>
        )}
      </div>

      <ObraSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        seleccionadas={obraIds}
        onAplicar={guardar}
      />
    </MainLayout>
  );
}

