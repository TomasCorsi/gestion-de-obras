import { useMemo } from "react";
import { AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertaRemito, EstadoLiquidacion, FilaControl, resumenControl } from "@/lib/remitosControl";

const money = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

interface Props {
  filas: FilaControl[];
  estado: EstadoLiquidacion;
  onEstado: (v: EstadoLiquidacion) => void;
  alerta: AlertaRemito;
  onAlerta: (v: AlertaRemito) => void;
}

/** Totales del período, alertas sin precio/obra y filtro de liquidación (comunes a los 3 tipos). */
export function RemitosControlBar({ filas, estado, onEstado, alerta, onAlerta }: Props) {
  const r = useMemo(() => resumenControl(filas), [filas]);
  const toggle = (a: AlertaRemito) => onAlerta(alerta === a ? "" : a);
  const Lista = ({ items }: { items: { nombre: string; total: number; remitos: number }[] }) => (
    <div className="space-y-1 max-h-72 overflow-auto">
      {items.length === 0 && <p className="text-sm text-muted-foreground">Sin datos</p>}
      {items.map((i) => (
        <div key={i.nombre} className="flex justify-between gap-3 text-sm">
          <span className="truncate">{i.nombre} <span className="text-muted-foreground">({i.remitos})</span></span>
          <span className="font-medium whitespace-nowrap">{money(i.total)}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-2" data-testid="remitos-control">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="card-industrial p-3"><p className="text-xl font-bold">{r.remitos}</p><p className="text-xs text-muted-foreground">Remitos</p></div>
        <div className="card-industrial p-3"><p className="text-xl font-bold">{money(r.total)}</p><p className="text-xs text-muted-foreground">Total del período</p></div>
        <button type="button" onClick={() => toggle("sin_precio")} className={`card-industrial p-3 text-left ${alerta === "sin_precio" ? "ring-2 ring-destructive" : ""}`}>
          <p className={`text-xl font-bold ${r.sinPrecio ? "text-destructive" : ""}`}>{r.sinPrecio}</p><p className="text-xs text-muted-foreground">Sin precio {alerta === "sin_precio" ? "· filtrando" : ""}</p>
        </button>
        <button type="button" onClick={() => toggle("sin_obra")} className={`card-industrial p-3 text-left ${alerta === "sin_obra" ? "ring-2 ring-destructive" : ""}`}>
          <p className={`text-xl font-bold ${r.sinObra ? "text-destructive" : ""}`}>{r.sinObra}</p><p className="text-xs text-muted-foreground">Sin obra {alerta === "sin_obra" ? "· filtrando" : ""}</p>
        </button>
        <div className="card-industrial p-3"><p className="text-xl font-bold">{r.liquidados}</p><p className="text-xs text-muted-foreground">Liquidados</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(r.sinPrecio > 0 || r.sinObra > 0) && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{r.sinPrecio} remitos sin precio · {r.sinObra} sin obra</span>
            {r.sinPrecio > 0 && <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => onAlerta("sin_precio")}>Ver sin precio</Button>}
            {r.sinObra > 0 && <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => onAlerta("sin_obra")}>Ver sin obra</Button>}
            {alerta && <Button size="sm" variant="ghost" className="h-7" onClick={() => onAlerta("")}>Ver todos</Button>}
          </div>
        )}
        <div className="flex-1" />
        <Select value={estado || "todos"} onValueChange={(v) => onEstado(v === "todos" ? "" : (v as EstadoLiquidacion))}>
          <SelectTrigger className="h-9 w-44" aria-label="Estado de liquidación"><CheckCircle2 className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="liquidado">Liquidados</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9"><BarChart3 className="h-4 w-4 mr-1" />Ver por cliente / obra</Button></PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <Tabs defaultValue="cliente">
              <TabsList className="w-full"><TabsTrigger value="cliente" className="flex-1">Clientes</TabsTrigger><TabsTrigger value="obra" className="flex-1">Obras</TabsTrigger></TabsList>
              <TabsContent value="cliente"><Lista items={r.porCliente} /></TabsContent>
              <TabsContent value="obra"><Lista items={r.porObra} /></TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/** Insignia de remito liquidado para las grillas. */
export function LiquidadoBadge({ liquidado }: { liquidado?: boolean | null }) {
  if (!liquidado) return null;
  return <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"><CheckCircle2 className="h-3 w-3" />Liquidado</span>;
}
