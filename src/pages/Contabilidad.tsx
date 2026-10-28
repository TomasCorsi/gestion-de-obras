import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Home, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ComprobantesTab } from "@/components/contabilidad/ComprobantesTab";
import { PagosTab } from "@/components/contabilidad/PagosTab";
import { AsientosTab } from "@/components/contabilidad/AsientosTab";
import { ReportesTab } from "@/components/contabilidad/ReportesTab";
import { ConfigTab } from "@/components/contabilidad/ConfigTab";
import { PeriodosTab } from "@/components/contabilidad/PeriodosTab";
import { OrdenesCompraTab } from "@/components/proveedores/OrdenesCompraTab";
import { GastosGeneralesTab } from "@/components/proveedores/GastosGeneralesTab";
import { ProveedoresMaestro } from "@/pages/Proveedores";
import { LibrosTab } from "@/components/contabilidad/LibrosTab";
import { ContabLauncher, Tile, NavIcon } from "@/components/contabilidad/ContabLauncher";
import { agregarReciente, migas, recientesValidos, resolver, RECIENTES_KEY, type Destino, type Permisos, type Reciente } from "@/lib/contabNav";
import { Fragment } from "react";

/** Permisos consultados en el servidor con las funciones contables existentes. */
function usePermisosContab() {
  return useQuery({
    queryKey: ["contab_permisos_nav"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Permisos> => {
      const { data: u } = await supabase.auth.getUser();
      const [ver, centros, admin] = await Promise.all([
        supabase.rpc("contab_puede", { _accion: "ver" }),
        supabase.rpc("contab_puede_centros"),
        u.user ? supabase.rpc("has_role", { _role: "admin", _user_id: u.user.id }) : Promise.resolve({ data: false }),
      ]);
      return { ver: ver.data === true, centros: centros.data === true, admin: admin.data === true };
    },
  });
}

function leerRecientes(): unknown {
  try { return JSON.parse(localStorage.getItem(RECIENTES_KEY) ?? "[]"); } catch { return []; }
}

/** Renderiza la pantalla existente; los accesos que comparten pantalla usan el mismo componente. */
function Pantalla({ d, prov }: { d: Destino; prov?: string }) {
  const k = `${d.pantalla}/${d.subtab ?? ""}/${d.ivaTipo ?? ""}/${d.abrirAlta ? 1 : 0}`;
  switch (d.pantalla) {
    case "compras": return <ComprobantesTab key={prov} esVenta={false} busquedaInicial={prov} />;
    case "ventas": return <ComprobantesTab esVenta={true} />;
    case "pagos": return <PagosTab key={k} inicial={d.subtab as any} abrirAlta={d.abrirAlta} />;
    case "asientos": return <AsientosTab />;
    case "periodos": return <PeriodosTab />;
    case "libros": return <LibrosTab key={k} inicial={d.subtab as any} />;
    case "reportes": return <ReportesTab key={k} inicial={d.subtab as any} ivaTipo={d.ivaTipo} />;
    case "config": return <ConfigTab key={k} inicial={d.subtab as any} />;
    case "ordenes": return <OrdenesCompraTab key={prov} busquedaInicial={prov} />;
    case "gastos": return <GastosGeneralesTab />;
    case "proveedores": return <ProveedoresMaestro embebido />;
  }
}

export default function Contabilidad() {
  const [params, setParams] = useSearchParams();
  const m = params.get("m");
  const s = params.get("s");
  const { data: permisos, isLoading } = usePermisosContab();
  const [recientesRaw, setRecientesRaw] = useState<unknown>(leerRecientes);

  const res = useMemo(() => (permisos ? resolver(m, s, permisos) : null), [m, s, permisos]);
  const recientes = useMemo(() => (permisos ? recientesValidos(recientesRaw, permisos) : []), [recientesRaw, permisos]);

  const ir = (mod?: string, sub?: string) => {
    const next = new URLSearchParams();
    if (mod) next.set("m", mod);
    if (sub) next.set("s", sub);
    setParams(next);
  };

  // Enlaces inválidos o no autorizados vuelven al inicio.
  useEffect(() => {
    if (permisos && m && !res) ir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permisos, m, res]);

  // Registrar en recientes solo destinos reales y autorizados.
  useEffect(() => {
    if (!res || res.proximamente || !res.destino) return;
    const lista = agregarReciente(recientesValidos(leerRecientes(), permisos!), { m: res.modulo.id, s: res.hoja?.id });
    localStorage.setItem(RECIENTES_KEY, JSON.stringify(lista));
    setRecientesRaw(lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res?.modulo.id, res?.hoja?.id]);

  const irValidado = (mod: string, sub?: string) => { if (permisos && resolver(mod, sub, permisos)) ir(mod, sub); };
  const crumbs = migas(res);

  return (
    <MainLayout title="Contabilidad" subtitle={res ? res.hoja?.nombre ?? res.modulo.nombre : "Inicio Contable"}>
      {isLoading || !permisos ? (
        <div className="flex items-center gap-2 p-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando…</div>
      ) : (
        <div className="space-y-4">
          {res && (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => ir()}><Home className="mr-2 h-4 w-4" />Inicio Contable</Button>
              <Breadcrumb>
                <BreadcrumbList>
                  {crumbs.map((c, i) => (
                    <Fragment key={i}>
                      {i > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {i === crumbs.length - 1 ? <BreadcrumbPage>{c.etiqueta}</BreadcrumbPage> : (
                          <BreadcrumbLink asChild><button type="button" onClick={() => ir(c.m, c.s)}>{c.etiqueta}</button></BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          )}

          {!res && <ContabLauncher permisos={permisos} recientes={recientes} onIr={irValidado} />}

          {res && res.destino && <Pantalla d={res.destino} prov={params.get("prov") ?? undefined} />}

          {res && !res.destino && !res.hoja && res.modulo.hijos.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><NavIcon name={res.modulo.icono} className="h-6 w-6" /></span>
                <div><h2 className="text-xl font-semibold">{res.modulo.nombre}</h2><p className="text-sm text-muted-foreground">{res.modulo.descripcion}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {res.modulo.hijos.map((h) => (
                  <Tile key={h.id} titulo={h.nombre} descripcion={h.descripcion} proximamente={!h.destino} onClick={() => irValidado(res.modulo.id, h.id)} />
                ))}
              </div>
            </div>
          )}

          {res && res.proximamente && (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              Este acceso estará disponible próximamente.
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
