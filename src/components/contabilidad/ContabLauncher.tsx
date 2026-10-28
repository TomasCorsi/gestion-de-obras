import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Search, Clock, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buscar, esProximamente, navPermitida, resolver, type NavModulo, type Permisos, type Reciente } from "@/lib/contabNav";

export const NavIcon = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as any)[name] ?? Icons.Circle;
  return <C className={className} />;
};

interface TileProps { titulo: string; descripcion?: string; icono?: string; proximamente?: boolean; grande?: boolean; onClick?: () => void; }

export function Tile({ titulo, descripcion, icono, proximamente, grande, onClick }: TileProps) {
  return (
    <button
      type="button"
      disabled={proximamente}
      onClick={proximamente ? undefined : onClick}
      aria-disabled={proximamente}
      className={cn(
        "group relative flex w-full items-start gap-4 rounded-xl border bg-card text-left transition-all",
        grande ? "p-5 min-h-[120px]" : "p-4",
        proximamente
          ? "cursor-not-allowed opacity-55"
          : "hover:-translate-y-0.5 hover:border-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {icono && (
        <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors",
          grande ? "h-12 w-12" : "h-10 w-10", !proximamente && "group-hover:bg-primary group-hover:text-primary-foreground")}>
          <NavIcon name={icono} className={grande ? "h-6 w-6" : "h-5 w-5"} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block font-semibold text-foreground", grande ? "text-lg" : "text-base")}>{titulo}</span>
        {descripcion && <span className="mt-1 block text-sm text-muted-foreground">{descripcion}</span>}
        {proximamente && <Badge variant="outline" className="mt-2">Próximamente</Badge>}
      </span>
      {!proximamente && <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />}
    </button>
  );
}

interface Props { permisos: Permisos; recientes: Reciente[]; onIr: (m: string, s?: string) => void; }

export function ContabLauncher({ permisos, recientes, onIr }: Props) {
  const [q, setQ] = useState("");
  const nav = useMemo(() => navPermitida(permisos), [permisos]);
  const resultados = useMemo(() => buscar(q, permisos), [q, permisos]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar módulo o acceso… (ej.: mayor, órdenes de pago)"
          className="h-12 pl-10 text-base" aria-label="Buscar módulos" />
      </div>

      {q.trim() ? (
        <div className="max-w-2xl divide-y rounded-xl border bg-card" data-testid="resultados-busqueda">
          {resultados.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sin resultados para “{q}”.</p>}
          {resultados.map((r) => (
            <button key={`${r.m}/${r.s ?? ""}`} type="button" disabled={r.proximamente}
              onClick={r.proximamente ? undefined : () => onIr(r.m, r.s)}
              className={cn("flex w-full items-center justify-between px-4 py-3 text-left text-sm",
                r.proximamente ? "cursor-not-allowed text-muted-foreground" : "hover:bg-accent hover:text-accent-foreground")}>
              <span>{r.etiqueta}{r.proximamente && " · Próximamente"}</span>
              {!r.proximamente && <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </div>
      ) : (
        <>
          {recientes.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" />Recientes
              </h2>
              <div className="flex flex-wrap gap-2">
                {recientes.map((r) => {
                  const res = resolver(r.m, r.s, permisos);
                  if (!res) return null;
                  return (
                    <button key={`${r.m}/${r.s ?? ""}`} type="button" onClick={() => onIr(r.m, r.s)}
                      className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary">
                      <NavIcon name={res.modulo.icono} className="h-4 w-4" />
                      {res.modulo.nombre}{res.hoja && <span className="text-muted-foreground">› {res.hoja.nombre}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nav.map((m: NavModulo) => (
              <Tile key={m.id} grande titulo={m.nombre} descripcion={m.descripcion} icono={m.icono}
                proximamente={esProximamente(m)} onClick={() => onIr(m.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
