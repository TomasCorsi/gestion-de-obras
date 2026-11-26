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
import Clientes from "@/pages/Clientes";
import { LibrosTab } from "@/components/contabilidad/LibrosTab";
import { ContabLauncher, Tile, NavIcon, ModuloTile } from "@/components/contabilidad/ContabLauncher";
import { agregarReciente, iconoHoja, migas, recientesValidos, resolver, RECIENTES_KEY, type Destino, type Permisos, type Reciente } from "@/lib/contabNav";
import { Fragment } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Registro de Compras: facturas + gastos sin factura (pantalla existente de gastos, solo admin). */
function RegistroCompras({ terceroId, admin }: { terceroId?: string; admin: boolean }) {
  const [params, setParams] = useSearchParams();
  const tab = admin && params.get("t") === "sin-factura" ? "sin-factura" : "facturas";
  const cambiar = (v: string) => { const n = new URLSearchParams(params); if (v === "sin-factura") n.set("t", v); else n.delete("t"); setParams(n, { replace: true }); };
  const facturas = <ComprobantesTab key={terceroId} esVenta={false} terceroId={terceroId} />;
  if (!admin) return facturas;
  return (
    <Tabs value={tab} onValueChange={cambiar}>
      <TabsList><TabsTrigger value="facturas">Facturas de proveedores</TabsTrigger><TabsTrigger value="sin-factura">Gastos sin factura</TabsTrigger></TabsList>
      <TabsContent value="facturas">{facturas}</TabsContent>
      <TabsContent value="sin-factura">
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">Si el gasto tiene factura a nombre de la empresa, cargalo en <b>Facturas de proveedores</b>.</div>
        <GastosGeneralesTab />
      </TabsContent>
    </Tabs>
  );
}

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
function Pantalla({ d, proveedorId, terceroId, admin = false }: { d: Destino; proveedorId?: string; terceroId?: string; admin?: boolean }) {
  const k = `${d.pantalla}/${d.subtab ?? ""}/${d.ivaTipo ?? ""}/${d.abrirAlta ? 1 : 0}`;
  switch (d.pantalla) {
    case "compras": return <RegistroCompras terceroId={terceroId} admin={admin} />;
    case "ventas": return <ComprobantesTab esVenta={true} />;
    case "pagos": return <PagosTab key={k + (d.modo ?? "")} inicial={d.subtab as any} abrirAlta={d.abrirAlta} modoValores={d.modo === "buscar" ? "buscar" : "cartera"} />;
    case "asientos": return <AsientosTab key={k + (d.modo ?? "")} soloConsulta={d.modo === "listado"} />;
    case "periodos": return <PeriodosTab key={k + (d.modo ?? "")} enfoqueCierre={d.modo === "cierre"} />;
    case "libros": return <LibrosTab key={k} inicial={d.subtab as any} />;
    case "reportes": return <ReportesTab key={k} inicial={d.subtab as any} ivaTipo={d.ivaTipo} />;
    case "config": return <ConfigTab key={k} inicial={d.subtab as any} />;
    case "ordenes": return <OrdenesCompraTab key={proveedorId} proveedorId={proveedorId} />;
    case "gastos": return <GastosGeneralesTab />;
    case "proveedores": return <ProveedoresMaestro embebido />;
    case "clientes": return <Clientes embebido />;
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

  // Enlace viejo Compras > Gastos Generales → pestaña "Gastos sin factura".
  useEffect(() => {
    if (m === "compras" && s === "gastos") setParams(new URLSearchParams({ m: "compras", s: "comprobantes", t: "sin-factura" }), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, s]);

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

          {res && res.destino && <Pantalla d={res.destino} proveedorId={params.get("proveedor_id") || undefined} terceroId={params.get("tercero_id") || undefined} admin={permisos.admin} />}

          {res && !res.destino && !res.hoja && res.modulo.hijos.length > 0 && (
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 flex flex-col items-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `color-mix(in srgb, hsl(var(--mod-${res.modulo.id})) 15%, transparent)`, color: `hsl(var(--mod-${res.modulo.id}))` }}>
                  <NavIcon name={res.modulo.icono} className="h-8 w-8" />
                </span>
                <h2 className="mt-3 text-2xl font-bold">{res.modulo.nombre}</h2>
                <p className="text-sm text-muted-foreground">{res.modulo.descripcion}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {res.modulo.hijos.map((h) => (
                  <div key={h.id} className="w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)] xl:w-[calc(20%-0.8rem)]"><ModuloTile id={res.modulo.id} titulo={h.nombre} descripcion={h.descripcion} icono={iconoHoja(h, res.modulo)} proximamente={!h.destino} onClick={() => irValidado(res.modulo.id, h.id)} /></div>
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
