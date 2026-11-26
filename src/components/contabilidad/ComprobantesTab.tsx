import { useMemo, useState } from "react";
import { Plus, FileText, Trash2, CheckCircle2, Ban, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useContabComprobantes, useDeleteComprobante, useConfirmarComprobante, useAnularComprobante,
  type ContabComprobante, type CbteEstado, type CbteTipo,
} from "@/hooks/useContabilidad";
import { ComprobanteDialog } from "./ComprobanteDialog";
import { useContabAsientos } from "@/hooks/useContabilidad";
import { estadosComprobante, type EstadoContable } from "@/lib/contabEstados";
import { FilterBar, type FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { Search } from "lucide-react";
import { etapaComprobante, ETAPA_LABEL } from "@/lib/contab1c";

const TIPO_LABEL: Record<CbteTipo, string> = {
  FA_A: "Factura A", FA_B: "Factura B", FA_C: "Factura C",
  NC_A: "N. Crédito A", NC_B: "N. Crédito B", NC_C: "N. Crédito C",
  ND_A: "N. Débito A", ND_B: "N. Débito B", ND_C: "N. Débito C",
  RECIBO: "Recibo", TICKET: "Ticket",
  FA_CPA_A: "Factura Compra A", FA_CPA_B: "Factura Compra B", FA_CPA_C: "Factura Compra C",
  NC_CPA: "NC Compra", ND_CPA: "ND Compra", OTRO: "Otro",
};

const CONTABLE: Record<EstadoContable, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  registrado: { label: "Registrado", variant: "secondary" },
  contabilizado: { label: "Contabilizado", variant: "default" },
  anulado: { label: "Anulado", variant: "destructive" },
};
const FINANCIERO: Record<string, string> = { pendiente: "Pendiente", parcial: "Parcial", cancelado: "Cancelado" };

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fmtDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export function ComprobantesTab({ esVenta, terceroId }: { esVenta: boolean; terceroId?: string }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ fechaDesde: undefined, fechaHasta: undefined, mes: undefined, obraId: undefined });
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();

  const { data = [], isLoading, isError } = useContabComprobantes({ esVenta, terceroId });
  const del = useDeleteComprobante();
  const confirmar = useConfirmarComprobante();
  const anular = useAnularComprobante();
  const { data: asientos = [] } = useContabAsientos();
  const estadoAsiento = useMemo(() => new Map((asientos as any[]).map((a) => [a.id, a.estado ?? "borrador"])), [asientos]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const base = filterByDateAndObra(data as any[], filters) as ContabComprobante[];
    if (!s) return base;
    return base.filter((c) =>
      [c.tercero?.razon_social, c.numero?.toString(), c.tercero?.cuit, TIPO_LABEL[c.tipo]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s))
    );
  }, [data, search, filters]);
  const totales = useMemo(() => filtered.reduce((t, c) => ({
    neto: t.neto + +c.neto_21 + +c.neto_105 + +c.neto_27 + +c.neto_0 + +c.exento + +c.no_gravado,
    iva: t.iva + +c.iva_21 + +c.iva_105 + +c.iva_27,
    total: t.total + +c.total,
  }), { neto: 0, iva: 0, total: 0 }), [filtered]);

  const handleEdit = (c: ContabComprobante) => {
    setEditId(c.id);
    setOpen(true);
  };
  const handleNew = () => {
    setEditId(null);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      {terceroId && <Badge variant="outline">Ficha fiscal seleccionada</Badge>}
      {isError && <p role="alert" className="text-sm text-destructive">No se pudieron cargar los comprobantes. Intentá nuevamente.</p>}
      <FilterBar obras={obras as any} maquinarias={maquinarias as any} showMaquinariaFilter onFilterChange={setFilters} />
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tercero, número, CUIT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo {esVenta ? "comprobante de venta" : "comprobante de compra"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Nº</th>
                  <th className="px-3 py-2">Tercero</th>
                  <th className="px-3 py-2">Obra</th>
                  <th className="px-3 py-2">Máquina</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Contable</th>
                  <th className="px-3 py-2">Financiero</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>
                )}
                {!isLoading && !isError && filtered.length === 0 && (
                  <tr><td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">
                    <FileText className="inline w-4 h-4 mr-2" />Sin comprobantes
                  </td></tr>
                )}
                {filtered.map((c) => {
                  const neto = +c.neto_21 + +c.neto_105 + +c.neto_27 + +c.neto_0 + +c.exento + +c.no_gravado;
                  const iva = +c.iva_21 + +c.iva_105 + +c.iva_27;
                  const est = estadosComprobante(c.estado, c.asiento_id ? estadoAsiento.get(c.asiento_id) : null);
                  return (
                    <tr key={c.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.fecha)}</td>
                      <td className="px-3 py-2">{TIPO_LABEL[c.tipo]}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono">
                        {String(c.punto_venta).padStart(5, "0")}-{String(c.numero).padStart(8, "0")}
                      </td>
                      <td className="px-3 py-2">{c.tercero?.razon_social ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{c.obra?.nombre ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{c.maquinaria ? (c.maquinaria.codigo || c.maquinaria.nombre) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(neto)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(iva)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(c.total)}</td>
                      <td className="px-3 py-2">
                        {(() => { const et = etapaComprobante(c.estado, c.asiento_id, c.asiento_id ? estadoAsiento.get(c.asiento_id) : null); return (
                          <Badge variant={et === "contabilizado" ? "default" : et === "anulado" ? "destructive" : et === "asiento_borrador" ? "outline" : "secondary"}>{ETAPA_LABEL[et]}</Badge>
                        ); })()}
                      </td>
                      <td className="px-3 py-2 text-xs">{est.financiero ? FINANCIERO[est.financiero] : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(c)} title="Ver / editar">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {c.estado === "borrador" && !c.asiento_id && (
                          <Button size="icon" variant="ghost" onClick={() => confirmar.mutate(c.id)} title="Generar asiento borrador">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        {(c.estado === "confirmado" || c.estado === "parcial" || c.estado === "pagado") && (
                          <Button size="icon" variant="ghost" onClick={() => anular.mutate(c.id)} title="Anular">
                            <Ban className="w-4 h-4 text-amber-600" />
                          </Button>
                        )}
                        {c.estado === "borrador" && !c.asiento_id && (
                          <Button size="icon" variant="ghost" onClick={() => setDelId(c.id)} title="Eliminar">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td colSpan={6} className="px-3 py-2 text-right text-muted-foreground">Total ({filtered.length})</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(totales.neto)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(totales.iva)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(totales.total)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {open && (
        <ComprobanteDialog
          open={open}
          onClose={() => { setOpen(false); setEditId(null); }}
          comprobanteId={editId}
          esVenta={esVenta}
        />
      )}

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar comprobante</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (delId) { del.mutate(delId); setDelId(null); } }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
