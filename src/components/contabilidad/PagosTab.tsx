import { opcionObra, opcionMaquina } from "@/lib/contabSelectorOptions";
import { esCuentaDisponibilidad } from "@/lib/planCuentas";
import { totalCobro, importeEnPesos, errorValores, type ValorCobro } from "@/lib/cobroValores";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useContabPagos, useSavePago, useDeletePago, useContabTerceros, useContabPlanCuentas, useContabComprobantes,
  useSaveCobroValores, useChequesRecibidos, useUpdateChequeEstado,
  type PagoMedio,
} from "@/hooks/useContabilidad";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";

const MEDIOS: PagoMedio[] = ["efectivo", "transferencia", "cheque", "tarjeta", "deposito", "otro"];
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fmtDate = (s: string) => { const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };

export function PagosTab({ inicial, abrirAlta }: { inicial?: "cobros" | "pagos"; abrirAlta?: boolean } = {}) {
  const [tab, setTab] = useState<"cobros" | "pagos" | "cheques">(inicial ?? "cobros");
  const esCobro = tab === "cobros";
  const { data = [] } = useContabPagos({ esCobro });
  const del = useDeletePago();
  const [open, setOpen] = useState(!!abrirAlta);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="cobros">Cobranzas</TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
            <TabsTrigger value="cheques">Cheques recibidos</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab !== "cheques" && <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo {esCobro ? "cobro" : "pago"}
        </Button>}
      </div>

      {tab === "cheques" ? <ChequesRecibidos /> : <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tercero</th>
                  <th className="px-3 py-2">Comprobante</th>
                  <th className="px-3 py-2">Medio</th>
                  <th className="px-3 py-2">Referencia</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sin movimientos</td></tr>
                )}
                {data.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{fmtDate(p.fecha)}</td>
                    <td className="px-3 py-2">{p.tercero?.razon_social ?? "—"}</td>
                    <td className="px-3 py-2 text-xs font-mono">
                      {p.comprobante ? `${p.comprobante.tipo} ${String(p.comprobante.punto_venta).padStart(5,"0")}-${String(p.comprobante.numero).padStart(8,"0")}` : "—"}
                    </td>
                    <td className="px-3 py-2 capitalize">{p.medio === "otro" && esCobro ? "varios" : p.medio}</td>
                    <td className="px-3 py-2 text-xs">{p.referencia ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(p.monto)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>}

      {open && <PagoDialog open={open} onClose={() => setOpen(false)} esCobro={esCobro} />}
    </div>
  );
}

function PagoDialog({ open, onClose, esCobro }: { open: boolean; onClose: () => void; esCobro: boolean }) {
  const { data: terceros = [] } = useContabTerceros();
  const { data: cuentas = [] } = useContabPlanCuentas();
  const { obras = [] } = useObras();
  const { maquinarias: maquinas = [] } = useMaquinarias();
  const save = useSavePago();

  const [tercero, setTercero] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [medio, setMedio] = useState<PagoMedio>("transferencia");
  const [monto, setMonto] = useState(0);
  const [cuenta, setCuenta] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [obra, setObra] = useState("");
  const [maq, setMaq] = useState("");
  const [cbteId, setCbteId] = useState("");
  const saveValores = useSaveCobroValores();
  const [valores, setValores] = useState<ValorCobro[]>(esCobro ? [{ medio: "transferencia", moneda: "ARS", importe_moneda: 0, cotizacion: 1 }] : []);
  const nuevoValor = (): ValorCobro => ({ medio: valores.at(-1)?.medio ?? "cheque", moneda: "ARS", importe_moneda: 0, cotizacion: valores.at(-1)?.cotizacion ?? 1 });
  const multiple = esCobro && valores.length > 0;
  const totalMultiple = totalCobro(valores);
  const errMultiple = multiple ? errorValores(valores) : null;
  const setValor = (i: number, p: Partial<ValorCobro>) => setValores((vs) => vs.map((v, j) => (j === i ? { ...v, ...p } : v)));

  const { data: comprobantes = [] } = useContabComprobantes({ esVenta: esCobro });

  const cbtesDisponibles = useMemo(
    () => comprobantes.filter((c) => c.tercero_id === tercero && (c.estado === "confirmado" || c.estado === "parcial")),
    [comprobantes, tercero]
  );

  const cuentasCaja = useMemo(() => cuentas.filter((c) => c.imputable && c.activa && esCuentaDisponibilidad(c.codigo)), [cuentas]);

  const cbteSel = cbtesDisponibles.find((c) => c.id === cbteId);

  const activarMultiple = () => {
    const primero: ValorCobro = { medio, moneda: "ARS", importe_moneda: monto, cotizacion: 1, cuenta_id: cuenta || undefined, referencia: referencia || undefined };
    setValores([primero, { ...primero, importe_moneda: 0, referencia: undefined }]);
  };

  const handleSave = async () => {
    if (multiple) {
      if (!tercero || errMultiple) return;
      await saveValores.mutateAsync({
        cabecera: { es_cobro: true, fecha, tercero_id: tercero, observaciones, obra_id: obra, maquinaria_id: maq, comprobante_id: cbteId },
        valores: valores.map((v) => ({ ...v, cotizacion: v.moneda === "ARS" ? 1 : v.cotizacion })),
      });
      onClose();
      return;
    }
    if (!tercero || monto <= 0) return;
    await save.mutateAsync({
      es_cobro: esCobro,
      fecha,
      tercero_id: tercero,
      medio,
      monto,
      cuenta_id: cuenta || null,
      referencia: referencia || null,
      observaciones: observaciones || null,
      obra_id: obra || null,
      maquinaria_id: maq || null,
      comprobante_id: cbteId || null,
    } as any);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo {esCobro ? "cobro" : "pago"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          {!multiple && <div>
            <Label>Medio de pago</Label>
            <Select value={medio} onValueChange={(v) => setMedio(v as PagoMedio)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEDIOS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>}
          <div className="col-span-2">
            <Label>{esCobro ? "Cliente" : "Proveedor"}</Label>
            <Select value={tercero} onValueChange={setTercero}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {terceros.map((t) => <SelectItem key={t.id} value={t.id}>{t.razon_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Comprobante asociado (opcional)</Label>
            <Select value={cbteId || "_"} onValueChange={(v) => setCbteId(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">— sin asociar —</SelectItem>
                {cbtesDisponibles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.tipo} {String(c.punto_venta).padStart(5,"0")}-{String(c.numero).padStart(8,"0")} · {fmt(c.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {multiple ? (
            <ValoresEditor valores={valores} setValor={setValor} cuentasCaja={cuentasCaja}
              onAgregar={() => setValores((vs) => [...vs, nuevoValor()])}
              onQuitar={(i) => setValores((vs) => vs.filter((_, j) => j !== i))}
              total={totalMultiple} saldoCbte={cbteSel?.total} error={errMultiple} />
          ) : <>
          <div>
            <Label>Monto</Label>
            <Input type="number" value={monto} onChange={(e) => setMonto(+e.target.value)} />
          </div>
          <div>
            <Label>Cuenta (caja/banco)</Label>
            <Select value={cuenta || "_"} onValueChange={(v) => setCuenta(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Auto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Automática</SelectItem>
                {cuentasCaja.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Referencia</Label>
            <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Nº cheque, transferencia…" />
          </div>
          {esCobro && (
            <div className="col-span-2">
              <Button type="button" variant="outline" size="sm" onClick={activarMultiple}>
                <Plus className="w-4 h-4 mr-1" /> Agregar otro valor (varios cheques, pesos y dólares)
              </Button>
            </div>
          )}
          </>}
          <div>
            <Label>Obra</Label>
            <Select value={obra || "_"} onValueChange={(v) => setObra(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{opcionObra(o).label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Máquina</Label>
            <Select value={maq || "_"} onValueChange={(v) => setMaq(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {maquinas.map((m: any) => <SelectItem key={m.id} value={m.id}>{opcionMaquina(m).label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Observaciones</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending || saveValores.isPending || !tercero || (multiple ? !!errMultiple : monto <= 0)}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ESTADOS_CHEQUE: Record<string, string> = { en_cartera: "En cartera", depositado: "Depositado", entregado: "Entregado a proveedor", rechazado: "Rechazado" };

function ValoresEditor({ valores, setValor, onAgregar, onQuitar, cuentasCaja, total, saldoCbte, error }: {
  valores: ValorCobro[]; setValor: (i: number, p: Partial<ValorCobro>) => void; onAgregar: () => void; onQuitar: (i: number) => void;
  cuentasCaja: { id: string; codigo: string; nombre: string }[]; total: number; saldoCbte?: number; error: string | null;
}) {
  const dif = saldoCbte != null ? Math.round((saldoCbte - total) * 100) / 100 : null;
  return (
    <div className="col-span-2 space-y-2">
      <Label>Valores recibidos <span className="font-normal text-muted-foreground">— sumá un renglón por cada cheque o por la parte en dólares</span></Label>
      {valores.map((v, i) => (
        <div key={i} className="rounded-md border p-2 grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <div>
            <Label className="text-xs">Medio</Label>
            <Select value={v.medio} onValueChange={(m) => setValor(i, { medio: m })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MEDIOS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Moneda</Label>
            <Select value={v.moneda} onValueChange={(m) => setValor(i, { moneda: m as "ARS" | "USD" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ARS">Pesos</SelectItem><SelectItem value="USD">Dólares (US$)</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Importe {v.moneda === "USD" ? "US$" : "$"}</Label>
            <Input type="number" value={v.importe_moneda || ""} onChange={(e) => setValor(i, { importe_moneda: +e.target.value })} />
          </div>
          {v.moneda === "USD" ? (
            <div>
              <Label className="text-xs">Cotización</Label>
              <Input type="number" value={v.cotizacion || ""} onChange={(e) => setValor(i, { cotizacion: +e.target.value })} />
            </div>
          ) : (
            <div>
              <Label className="text-xs">Cuenta</Label>
              <Select value={v.cuenta_id || "_"} onValueChange={(c) => setValor(i, { cuenta_id: c === "_" ? undefined : c })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Automática</SelectItem>
                  {cuentasCaja.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {v.medio === "cheque" && <>
            <div><Label className="text-xs">Nº cheque</Label><Input value={v.cheque_numero ?? ""} onChange={(e) => setValor(i, { cheque_numero: e.target.value })} /></div>
            <div><Label className="text-xs">Banco</Label><Input value={v.cheque_banco ?? ""} onChange={(e) => setValor(i, { cheque_banco: e.target.value })} /></div>
            <div><Label className="text-xs">Fecha de pago</Label><Input type="date" value={v.cheque_fecha_pago ?? ""} onChange={(e) => setValor(i, { cheque_fecha_pago: e.target.value })} /></div>
            <div><Label className="text-xs">Librador</Label><Input value={v.cheque_librador ?? ""} onChange={(e) => setValor(i, { cheque_librador: e.target.value })} /></div>
          </>}
          {v.medio !== "cheque" && (
            <div className="col-span-2 md:col-span-3"><Label className="text-xs">Referencia</Label><Input value={v.referencia ?? ""} onChange={(e) => setValor(i, { referencia: e.target.value })} /></div>
          )}
          <div className="flex items-center justify-end gap-2 col-span-2 md:col-span-1 md:col-start-4">
            {v.moneda === "USD" && <span className="text-xs text-muted-foreground tabular-nums">= {fmt(importeEnPesos(v))}</span>}
            {valores.length > 1 && (
              <Button type="button" size="icon" variant="ghost" onClick={() => onQuitar(i)} aria-label="Quitar valor">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAgregar}><Plus className="w-4 h-4 mr-1" /> Agregar otro valor</Button>
      <div className="flex flex-wrap justify-end gap-4 text-sm">
        <span>Total cobrado: <strong className="tabular-nums">{fmt(total)}</strong></span>
        {dif != null && (
          <span className={dif === 0 ? "text-muted-foreground" : "text-destructive"}>
            {dif === 0 ? "Cancela la factura" : dif > 0 ? `Queda pendiente ${fmt(dif)}` : `Excede la factura en ${fmt(-dif)}`}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-destructive text-right">{error}</p>}
    </div>
  );
}

function ChequesRecibidos() {
  const { data = [] } = useChequesRecibidos();
  const upd = useUpdateChequeEstado();
  const hoy = new Date().toISOString().slice(0, 10);
  const enCartera = data.filter((c) => c.cheque_estado === "en_cartera").reduce((s, c) => s + Number(c.importe), 0);
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-3 py-2 text-sm border-b">En cartera: <strong className="tabular-nums">{fmt(enCartera)}</strong></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Fecha de pago</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Banco</th><th className="px-3 py-2">Librador</th><th className="px-3 py-2 text-right">Importe</th><th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sin cheques recibidos</td></tr>}
              {data.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className={`px-3 py-2 ${c.cheque_estado === "en_cartera" && c.cheque_fecha_pago && c.cheque_fecha_pago <= hoy ? "text-destructive font-medium" : ""}`}>
                    {c.cheque_fecha_pago ? fmtDate(c.cheque_fecha_pago) : "—"}
                  </td>
                  <td className="px-3 py-2">{c.pago?.tercero?.razon_social ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.cheque_numero ?? "—"}</td>
                  <td className="px-3 py-2">{c.cheque_banco ?? "—"}</td>
                  <td className="px-3 py-2">{c.cheque_librador ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.importe)}</td>
                  <td className="px-3 py-2 min-w-[170px]">
                    <Select value={c.cheque_estado} onValueChange={(e) => upd.mutate({ id: c.id, estado: e })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ESTADOS_CHEQUE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
