import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/searchable-select";
import { opcionObra, opcionMaquina } from "@/lib/contabSelectorOptions";
import { esCuentaDisponibilidad } from "@/lib/planCuentas";
import {
  totalCobro, errorValores, esCheque, renglonesPorForma, FORMAS_PAGO,
  type ValorCobro, type FormaPago, type Moneda,
} from "@/lib/cobroValores";
import { useContabTerceros, useContabPlanCuentas, useContabComprobantes, useSaveCobroValores } from "@/hooks/useContabilidad";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";

const MEDIOS = ["efectivo", "transferencia", "cheque", "echeck", "tarjeta", "deposito", "otro"];
const MEDIO_LABEL: Record<string, string> = { echeck: "e-check", deposito: "depósito" };
const fmt = (n: number, cur = "ARS") => new Intl.NumberFormat("es-AR", { style: "currency", currency: cur }).format(Number(n || 0));

function Bloque({ titulo, children, className = "" }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`rounded-md border p-3 space-y-2 ${className}`}>
      <legend className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function CobroDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: terceros = [] } = useContabTerceros();
  const { data: cuentas = [] } = useContabPlanCuentas();
  const { obras = [] } = useObras();
  const { maquinarias: maquinas = [] } = useMaquinarias();
  const { data: comprobantes = [] } = useContabComprobantes({ esVenta: true });
  const save = useSaveCobroValores();

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [numero, setNumero] = useState("");
  const [provisorio, setProvisorio] = useState("");
  const [tercero, setTercero] = useState("");
  const [forma, setForma] = useState<FormaPago>("cheque");
  const [concepto, setConcepto] = useState("");
  const [cbteId, setCbteId] = useState("");
  const [obra, setObra] = useState("");
  const [maq, setMaq] = useState("");
  const [valores, setValores] = useState<ValorCobro[]>(renglonesPorForma("cheque"));

  const ficha = terceros.find((t) => t.id === tercero);
  const cuentasCaja = useMemo(() => cuentas.filter((c) => c.imputable && c.activa && esCuentaDisponibilidad(c.codigo)), [cuentas]);
  const cbtes = useMemo(
    () => comprobantes.filter((c) => c.tercero_id === tercero && (c.estado === "confirmado" || c.estado === "parcial")),
    [comprobantes, tercero],
  );

  const cambiarForma = (f: FormaPago) => {
    setForma(f);
    const vacios = valores.every((v) => !Number(v.importe_moneda));
    if (vacios) setValores(renglonesPorForma(f));
  };
  const setValor = (i: number, p: Partial<ValorCobro>) => setValores((vs) => vs.map((v, j) => (j === i ? { ...v, ...p } : v)));
  const agregar = () => setValores((vs) => [...vs, { medio: vs.at(-1)?.medio ?? "cheque", moneda: vs.at(-1)?.moneda ?? "ARS", importe_moneda: 0, cotizacion: vs.at(-1)?.cotizacion ?? 1 }]);

  const totalPesos = totalCobro(valores);
  const totalUsd = Math.round(valores.filter((v) => v.moneda === "USD").reduce((s, v) => s + Number(v.importe_moneda || 0), 0) * 100) / 100;
  const err = !tercero ? "Elegí el cliente" : errorValores(valores);

  const handleSave = async () => {
    if (err) return;
    await save.mutateAsync({
      cabecera: {
        es_cobro: true, fecha, tercero_id: tercero, recibo_numero: numero, recibo_provisorio: provisorio,
        concepto, moneda_declarada: "ARS", importe_declarado: "", comprobante_id: cbteId, obra_id: obra, maquinaria_id: maq,
      },
      valores: valores.map((v) => ({ ...v, cotizacion: v.moneda === "ARS" ? 1 : v.cotizacion })),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cobranzas · Nuevo recibo</DialogTitle></DialogHeader>

        <div className="grid gap-3 lg:grid-cols-[1fr_2fr_1.4fr_0.9fr]">
          <Bloque titulo="Recibo">
            <div><Label className="text-xs">Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <div><Label className="text-xs">Número</Label><Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0001-00000001" /></div>
            <div><Label className="text-xs">Provisorio</Label><Input value={provisorio} onChange={(e) => setProvisorio(e.target.value)} /></div>
          </Bloque>

          <Bloque titulo="Cliente">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Select value={tercero} onValueChange={(v) => { setTercero(v); setCbteId(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {terceros.map((t) => <SelectItem key={t.id} value={t.id}>{t.razon_social}{t.cuit ? ` · ${t.cuit}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-xs text-muted-foreground block">CUIT</span>{ficha?.cuit ?? "—"}</div>
              <div><span className="text-xs text-muted-foreground block">Pos. IVA</span>{ficha?.condicion_iva ?? "—"}</div>
              <div className="col-span-2"><span className="text-xs text-muted-foreground block">Domicilio</span>{ficha?.domicilio ?? "—"}</div>
            </div>
          </Bloque>

          <Bloque titulo="Forma de pago">
            <RadioGroup value={forma} onValueChange={(v) => cambiarForma(v as FormaPago)} className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {FORMAS_PAGO.map((f) => (
                <label key={f.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value={f.value} /> {f.label}
                </label>
              ))}
            </RadioGroup>
          </Bloque>

          <Bloque titulo="Asiento">
            <p className="text-xs text-muted-foreground">Se genera un asiento borrador al registrar, con fecha {fecha.split("-").reverse().join("/")}. El número se asigna al confirmarlo.</p>
          </Bloque>
        </div>

        <Bloque titulo="Se recibe">
          <div className="grid gap-3 grid-cols-1">
            <div><Label className="text-xs">En concepto de</Label><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Comprobante que cancela (opcional)</Label>
              <Select value={cbteId || "_"} onValueChange={(v) => setCbteId(v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">— a cuenta —</SelectItem>
                  {cbtes.map((c) => <SelectItem key={c.id} value={c.id}>{c.tipo} {String(c.punto_venta).padStart(5, "0")}-{String(c.numero).padStart(8, "0")} · {fmt(c.total)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Obra</Label>
              <Select value={obra || "_"} onValueChange={(v) => setObra(v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="_">—</SelectItem>{obras.map((o) => <SelectItem key={o.id} value={o.id}>{opcionObra(o).label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Máquina</Label>
              <Select value={maq || "_"} onValueChange={(v) => setMaq(v === "_" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="_">—</SelectItem>{maquinas.map((m: any) => <SelectItem key={m.id} value={m.id}>{opcionMaquina(m).label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Bloque>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm min-w-[1350px]">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-2 py-2 w-36">Medio</th><th className="px-2 py-2 w-48">Cuenta</th><th className="px-2 py-2 min-w-[110px]">Cheq.Nº</th>
                <th className="px-2 py-2 min-w-[130px]">Bco.Emisor</th><th className="px-2 py-2 w-36">Vto.</th><th className="px-2 py-2 min-w-[130px]">CUIT Cheq.</th>
                <th className="px-2 py-2 min-w-[160px]">Detalle</th><th className="px-2 py-2 w-20">Moneda</th><th className="px-2 py-2 w-28 text-right">Importe</th>
                <th className="px-2 py-2 w-24 text-right">Cotiz.</th><th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {valores.map((v, i) => {
                const ch = esCheque(v.medio);
                return (
                  <tr key={i} className="border-t align-top">
                    <td className="p-1">
                      <Select value={v.medio} onValueChange={(m) => setValor(i, { medio: m })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{MEDIOS.map((m) => <SelectItem key={m} value={m} className="capitalize">{MEDIO_LABEL[m] ?? m}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Select value={v.cuenta_id || "_"} onValueChange={(c) => setValor(i, { cuenta_id: c === "_" ? undefined : c })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="_">Automática</SelectItem>{cuentasCaja.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-1"><Input className="h-8" disabled={!ch} value={v.cheque_numero ?? ""} onChange={(e) => setValor(i, { cheque_numero: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8" disabled={!ch} value={v.cheque_banco ?? ""} onChange={(e) => setValor(i, { cheque_banco: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8" type="date" disabled={!ch} value={v.cheque_fecha_pago ?? ""} onChange={(e) => setValor(i, { cheque_fecha_pago: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8" disabled={!ch} value={v.cheque_cuit ?? ""} onChange={(e) => setValor(i, { cheque_cuit: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8" value={(ch ? v.cheque_librador : v.referencia) ?? ""} placeholder={ch ? "Librador" : "Referencia"}
                      onChange={(e) => setValor(i, ch ? { cheque_librador: e.target.value } : { referencia: e.target.value })} /></td>
                    <td className="p-1">
                      <Select value={v.moneda} onValueChange={(m) => setValor(i, { moneda: m as Moneda })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="ARS">$</SelectItem><SelectItem value="USD">US$</SelectItem></SelectContent>
                      </Select>
                    </td>
                    <td className="p-1"><Input className="h-8 text-right" type="number" value={v.importe_moneda || ""} onChange={(e) => setValor(i, { importe_moneda: +e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 text-right" type="number" disabled={v.moneda === "ARS"} value={v.moneda === "ARS" ? "" : v.cotizacion || ""} onChange={(e) => setValor(i, { cotizacion: +e.target.value })} /></td>
                    <td className="p-1 text-center">
                      {valores.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setValores((vs) => vs.filter((_, j) => j !== i))} aria-label="Quitar renglón">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-2 border-t"><Button size="sm" variant="outline" onClick={agregar}><Plus className="w-4 h-4 mr-1" /> Agregar renglón</Button></div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-6 text-sm">
          <span>Totales: <strong className="tabular-nums">{fmt(totalPesos)}</strong></span>
          <span>US$: <strong className="tabular-nums">{fmt(totalUsd, "USD")}</strong></span>
`}
            </span>
          )}
        </div>
        {err && <p className="text-xs text-destructive text-right">{err}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending || !!err}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
