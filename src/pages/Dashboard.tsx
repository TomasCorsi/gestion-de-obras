import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { ObraPanel } from "@/components/dashboard/ObraPanel";
import { ObraSelectorDialog } from "@/components/dashboard/ObraSelectorDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useObrasSeleccionadas, MAX_OBRAS } from "@/hooks/useObrasSeleccionadas";
import { useTableroObras } from "@/hooks/useTableroObras";
import { useTableroSeries, MetricaSerie } from "@/hooks/useTableroSeries";
import { useTableroHistorico } from "@/hooks/useTableroHistorico";
import { useTableroRealtime } from "@/hooks/useTableroRealtime";
import { useAutoRotacion } from "@/hooks/useAutoRotacion";
import { format, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Pause,
  Play,
} from "lucide-react";

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

const nf = (v: number, d = 0) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

const OPCIONES_METRICA: { key: MetricaSerie; label: string }[] = [
  { key: "m3", label: "m³" },
  { key: "movimientos", label: "Movimientos" },
  { key: "horas", label: "Horas" },
  { key: "litros", label: "Litros" },
];

export default function Dashboard() {
  const { obraIds, guardar, quitar, loading: loadingSeleccion } = useObrasSeleccionadas();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [tv, setTv] = useState(false);
  const [ahora, setAhora] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const [ayudaVisible, setAyudaVisible] = useState(false);

  const mesesDisponibles = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: es }) };
    });
  }, []);
  const [mes, setMes] = useState<string>(() => format(new Date(), "yyyy-MM"));
  const mesLabel = format(parseISO(`${mes}-01`), "MMMM yyyy", { locale: es });

  const { conectado } = useTableroRealtime(true);

  const { obras, loading, refetch, dataUpdatedAt, esMesActual } = useTableroObras(
    obraIds,
    mes,
    conectado ? 300000 : 60000
  );
  const obrasMeta = useMemo(
    () => obras.map((o) => ({ obraId: o.obraId, nombre: o.nombre })),
    [obras]
  );
  const { series, loading: loadingSeries } = useTableroSeries(
    obrasMeta,
    mes,
    conectado ? 300000 : 60000
  );
  const { historico } = useTableroHistorico(obrasMeta);
  const [metrica, setMetrica] = useState<MetricaSerie>("m3");
  const periodoLabel = esMesActual ? "hoy" : "mes";

  // Rotación automática de métrica (y de obra destacada)
  const rot = useAutoRotacion({
    total: OPCIONES_METRICA.length,
    intervalo: 20000,
    enabled: obras.length > 0,
    onTick: (i) => setMetrica(OPCIONES_METRICA[i].key),
  });
  const obraDestacada = obras.length > 1 ? rot.indice % obras.length : -1;

  const seleccionarMetrica = useCallback(
    (key: MetricaSerie) => {
      setMetrica(key);
      rot.irA(OPCIONES_METRICA.findIndex((o) => o.key === key));
    },
    [rot]
  );

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

  // Oculta el cursor tras 3s de inactividad en modo TV
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!tv) {
      setCursorVisible(true);
      return;
    }
    const mover = () => {
      setCursorVisible(true);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorVisible(false), 3000);
    };
    mover();
    window.addEventListener("mousemove", mover);
    return () => {
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      window.removeEventListener("mousemove", mover);
    };
  }, [tv]);

  const entrarTV = useCallback(async () => {
    setTv(true);
    setAyudaVisible(true);
    setTimeout(() => setAyudaVisible(false), 5000);
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

  // Atajos de teclado (operación sin mouse)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "f") {
        e.preventDefault();
        tv ? salirTV() : entrarTV();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        rot.avanzar(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        rot.avanzar(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        rot.togglePausa();
      } else if (k === "r") {
        e.preventDefault();
        refetch();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const i = Number(e.key) - 1;
        if (OPCIONES_METRICA[i]) seleccionarMetrica(OPCIONES_METRICA[i].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tv, salirTV, entrarTV, rot, refetch, seleccionarMetrica]);

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

  const indicadorVivo = (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          conectado ? "bg-success animate-pulse" : "bg-muted-foreground"
        )}
      />
      <span className={conectado ? "text-success" : "text-muted-foreground"}>
        {conectado ? "En vivo" : "Reconectando"}
      </span>
    </span>
  );

  const kpis = (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 shrink-0">
      <KPICard title="Obras" value={obras.length} icon={Building2} variant="primary" compact tv={tv} />
      <KPICard title={`Movimientos ${periodoLabel}`} value={nf(totales.movimientos)} icon={Route} compact tv={tv} />
      <KPICard title={`m³ ${periodoLabel}`} value={nf(totales.m3, 1)} icon={Truck} variant="success" compact tv={tv} />
      <KPICard title={`Horas ${periodoLabel}`} value={nf(totales.horas, 1)} icon={Clock} compact tv={tv} />
      <KPICard title={`Personal ${periodoLabel}`} value={nf(totales.personal)} icon={Users} compact tv={tv} />
      <KPICard
        title="Gastos del período"
        value={formatCurrency(totales.gastos)}
        icon={DollarSign}
        variant="warning"
        compact
        tv={tv}
      />
    </div>
  );

  const selectorMetrica = (
    <div className="flex items-center gap-1 shrink-0">
      {OPCIONES_METRICA.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => seleccionarMetrica(o.key)}
          className={
            "px-2 py-0.5 rounded text-xs border border-border transition-colors " +
            (tv ? "text-base px-3 py-1 " : "") +
            (metrica === o.key
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground hover:bg-muted")
          }
        >
          {o.label}
        </button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        onClick={rot.togglePausa}
        aria-label={rot.pausado ? "Reanudar rotación" : "Pausar rotación"}
        className="h-7 w-7"
      >
        {rot.pausado ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );

  const barraProgreso = (
    <div className="h-1 w-full bg-muted rounded overflow-hidden shrink-0">
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-linear"
        style={{ width: `${rot.activo ? rot.progreso * 100 : 0}%` }}
      />
    </div>
  );

  const paneles = (
    <div
      className={cn(
        "grid gap-3 h-full min-h-0",
        obras.length === 1 ? "grid-cols-1" : obras.length === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"
      )}
    >
      {obras.map((obra, i) => (
        <ObraPanel
          key={obra.obraId}
          obra={obra}
          index={i}
          tv={tv}
          periodoLabel={periodoLabel}
          metrica={metrica}
          serie={series[metrica] || []}
          loadingSerie={loadingSeries}
          columnas={obras.length}
          historico={historico[obra.obraId]}
          destacada={obraDestacada < 0 || !rot.activo ? undefined : obraDestacada === i}
        />
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
      <div
        className={cn(
          "h-screen overflow-hidden bg-background p-4 flex flex-col gap-3",
          !cursorVisible && "cursor-none"
        )}
      >
        {barraProgreso}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Centro de Control de Obras</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {format(ahora, "dd/MM/yyyy")} · {format(ahora, "HH:mm")} ·{" "}
              <span className="capitalize">{mesLabel}</span>
              {indicadorVivo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectorMetrica}
            <Button variant="ghost" size="icon" onClick={salirTV} aria-label="Salir de pantalla completa">
              <Minimize2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {kpis}

        {obras.length > 0 ? (
          <div className="flex-1 min-h-0">{paneles}</div>
        ) : (
          <div className="flex-1 flex items-center justify-center">{vacio}</div>
        )}

        <div className="flex items-center justify-between text-muted-foreground text-sm border-t border-border pt-2 shrink-0">
          <span>{totales.alertas > 0 ? `${totales.alertas} alerta(s) activas` : "Sin alertas activas"}</span>
          {ayudaVisible ? (
            <span className="text-xs">
              F pantalla completa · ← → métrica · Espacio pausa · R actualizar · 1-4 métrica
            </span>
          ) : (
            <span>Última actualización: {ultimaActualizacion}</span>
          )}
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

          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="h-8 w-44 bg-background text-xs capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-72">
              {mesesDisponibles.map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            {indicadorVivo}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Actualizado {ultimaActualizacion}
            </span>
            {selectorMetrica}
            <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Actualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={entrarTV} className="gap-2" disabled={obras.length === 0}>
              <Maximize2 className="w-4 h-4" />
              Pantalla completa
            </Button>
          </div>
        </div>

        {barraProgreso}

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
            <div className="flex-1 min-h-0 lg:min-h-[420px]">{paneles}</div>
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
