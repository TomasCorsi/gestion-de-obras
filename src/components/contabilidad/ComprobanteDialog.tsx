import { opcionObra, opcionMaquina } from "@/lib/contabSelectorOptions";
import { CompraOcPanel } from './CompraOcPanel';
import { asociarOc, type OcSnapshot } from '@/lib/compraOc';
import type { OrdenCompraWithRelations } from '@/hooks/useOrdenesCompra';
import { Combobox } from "@/components/ui/combobox";
import { FichaRapidaDialog } from "./FichaRapidaDialog";
import { useTercerosEstado, type TerceroEstado } from "@/hooks/useTercerosFiscal";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, SplitSquareHorizontal, Sparkles } from "lucide-react";
import { ImportFacturaProveedorDialog, type ParsedOrdenCompra } from "@/components/proveedores/ImportFacturaProveedorDialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { RepartosItemPanel } from "./RepartosItemPanel";
import { VinculosItemPanel } from "./VinculosItemPanel";
import { AsientoComprobanteView } from "./AsientoComprobanteView";
import { useRepartos, useVinculos, useAsientoCbte, useGenerarAsientoCbte } from "@/hooks/useContab1c";
import { etapaComprobante, permisosComprobante, ETAPA_LABEL, cambiosPendientes, problemasCompatibilidad, MSG_CAMBIOS_PENDIENTES } from "@/lib/contab1c";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/searchable-select";
import {
  useContabComprobanteItems, useSaveComprobante, useContabTerceros, useContabPlanCuentas,
  type ContabComprobante, type ContabCbteItem, type CbteTipo,
} from "@/hooks/useContabilidad";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
  comprobanteId: string | null;
  esVenta: boolean;
}

const TIPOS_VENTA: { v: CbteTipo; l: string }[] = [
  { v: "FA_A", l: "Factura A" },
  { v: "FA_B", l: "Factura B" },
  { v: "FA_C", l: "Factura C" },
  { v: "NC_A", l: "Nota de Crédito A" },
  { v: "NC_B", l: "Nota de Crédito B" },
  { v: "NC_C", l: "Nota de Crédito C" },
  { v: "ND_A", l: "Nota de Débito A" },
  { v: "ND_B", l: "Nota de Débito B" },
  { v: "ND_C", l: "Nota de Débito C" },
  { v: "RECIBO", l: "Recibo" },
  { v: "TICKET", l: "Ticket" },
];
const TIPOS_COMPRA: { v: CbteTipo; l: string }[] = [
  { v: "FA_CPA_A", l: "Factura Compra A" },
  { v: "FA_CPA_B", l: "Factura Compra B" },
  { v: "FA_CPA_C", l: "Factura Compra C" },
  { v: "NC_CPA", l: "NC Compra" },
  { v: "ND_CPA", l: "ND Compra" },
  { v: "OTRO", l: "Otro" },
];

type ItemDraft = {
  oc_linea_id?: string | null;
  id?: string;
  descripcion: string;
  cuenta_id: string | null;
  cantidad: number;
  precio_unit: number;
  neto: number;
  alicuota_iva: number;
  iva: number;
  obra_id: string | null;
  maquinaria_id: string | null;
};

const blankItem = (): ItemDraft => ({
  descripcion: "",
  cuenta_id: null,
  cantidad: 1,
  precio_unit: 0,
  neto: 0,
  alicuota_iva: 21,
  iva: 0,
  obra_id: null,
  maquinaria_id: null,
});

export function ComprobanteDialog({ open, onClose, comprobanteId: idInicial, esVenta }: Props) {
  const { data: terceros = [] } = useContabTerceros();
  const { data: cuentas = [] } = useContabPlanCuentas();
  const { obras = [] } = useObras();
  const { maquinarias: maquinas = [] } = useMaquinarias();
  const save = useSaveComprobante();
  const generar = useGenerarAsientoCbte();
  const [creadoId, setCreadoId] = useState<string | null>(null);
  const comprobanteId = idInicial ?? creadoId;
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Carga comprobante existente
  const { data: existing } = useQuery({
    queryKey: ["contab_cbte_one", comprobanteId],
    enabled: !!comprobanteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contab_comprobantes").select("*").eq("id", comprobanteId).single();
      if (error) throw error;
      return data as ContabComprobante;
    },
  });
  const { data: existingItems = [] } = useContabComprobanteItems(comprobanteId);
  const { data: asientoData } = useAsientoCbte(existing?.asiento_id ?? null);
  const etapa = existing ? etapaComprobante(existing.estado, existing.asiento_id, (asientoData as any)?.asiento?.estado ?? (existing.asiento_id ? "borrador" : null)) : "registrado";
  const permisosBase = permisosComprobante({ tipo: existing?.tipo ?? "", etapa, guardado: !!existing, puedeCargar: true });
  const itemIds = useMemo(() => existingItems.map((i) => i.id), [existingItems]);
  const { data: repartos = [] } = useRepartos(itemIds);
  const { data: vinculos = [] } = useVinculos(comprobanteId);

  const [tipo, setTipo] = useState<CbteTipo>(esVenta ? "FA_B" : "FA_CPA_A");
  const [puntoVenta, setPuntoVenta] = useState(1);
  const [numero, setNumero] = useState<number>(0);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [fechaVto, setFechaVto] = useState("");
  const [terceroId, setTerceroId] = useState<string>("");
  const { data: maestros = [] } = useTercerosEstado();
  const rolMaestro = esVenta ? "cliente" : "proveedor";
  const delRol = useMemo(() => maestros.filter((m) => m.rol === rolMaestro && (m.activo || m.tercero_id === terceroId)), [maestros, rolMaestro, terceroId]);
  const [maestroElegido, setMaestroElegido] = useState<string>("");
  const maestroSel = maestroElegido || delRol.find((m) => m.tercero_id && m.tercero_id === terceroId)?.maestro_id || "";
  const maestrosOpts = delRol.map((m) => ({ value: m.maestro_id, label: `${m.nombre}${m.cuit_maestro ? ` · ${m.cuit_maestro}` : ""}${m.tercero_id ? "" : " (sin ficha)"}` }));
  const [fichaPara, setFichaPara] = useState<TerceroEstado | null>(null);
  const elegirMaestro = (id: string) => {
    if (id !== maestroSel) { setOcId(''); setOcSnapshot(null); setItems(a => a.map(i => ({...i,oc_linea_id:null}))); }
    setMaestroElegido(id);
    const m = delRol.find((x) => x.maestro_id === id);
    if (!m) { setTerceroId(""); return; }
    if (m.tercero_id) setTerceroId(m.tercero_id);
    else { setTerceroId(""); setFichaPara(m); }
  };
  const tercero = (terceros as any[]).find((t) => t.id === (existing?.tercero_id ?? ""));
  const [obraId, setObraId] = useState<string>("");
  const [maqId, setMaqId] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [percIva, setPercIva] = useState(0);
  const [percIibb, setPercIibb] = useState(0);
  const [percOtras, setPercOtras] = useState(0);
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);
  const [ocId, setOcId] = useState('');
  const [ocSnapshot, setOcSnapshot] = useState<OcSnapshot | null>(null);
  const [moneda, setMoneda] = useState('ARS');
  const [cotizacion, setCotizacion] = useState(1);
  const proveedorActual = delRol.find(m => m.tercero_id === terceroId)?.maestro_id ?? '';
  const elegirOc = (o: OrdenCompraWithRelations | null, copiar: boolean) => {
    if (!o) { setOcId(''); setOcSnapshot(null); setItems(a => a.map(i => ({...i,oc_linea_id:null}))); return; }
    if (!copiar) { setOcId(o.id); setOcSnapshot({numero:o.numero,moneda:o.moneda,items:o.items ?? []}); }
    setMoneda(o.moneda);
    if (copiar) {
      if (!o.items?.length) { toast.warning('La OC no tiene cantidades pendientes.'); return; }
      setObraId(o.obra_id ?? ''); setMaqId(o.maquinaria_id ?? '');
      setItems(o.items.map(i => {
        const cantidad = Number(i.cantidad), precio_unit = Number(i.precio_unitario);
        const neto = +(cantidad * precio_unit).toFixed(2), alicuota_iva = o.incluir_iva ? Number(o.iva_porcentaje) : 0;
        return {...blankItem(),oc_linea_id:i.id,descripcion:[i.articulo,i.descripcion].filter(Boolean).join(' - '),cantidad,precio_unit,neto,alicuota_iva,iva:+(neto*alicuota_iva/100).toFixed(2),obra_id:o.obra_id,maquinaria_id:o.maquinaria_id};
      }));
    } else setItems(a => { const referencias = asociarOc(o.items ?? [],a); return a.map((i,k) => ({...i,oc_linea_id:referencias[k]})); });
  };
  const [importOpen, setImportOpen] = useState(false);
  const aplicarFactura = (p: ParsedOrdenCompra) => {
    const t = p.tipo_comprobante === "nota_credito" ? "NC_CPA" : p.tipo_comprobante === "nota_debito" ? "ND_CPA"
      : p.letra ? (`FA_CPA_${p.letra}` as CbteTipo) : null;
    if (t) setTipo(t);
    if (p.punto_venta) setPuntoVenta(Math.round(p.punto_venta));
    if (p.numero) setNumero(Math.round(p.numero));
    if (p.fecha) setFecha(p.fecha);
    if (p.fecha_vencimiento) setFechaVto(p.fecha_vencimiento);
    setPercIva(+(p.percepcion_iva || 0)); setPercIibb(+(p.percepcion_iibb || 0));
    const cuit = (p.proveedor_cuit || "").replace(/\D/g, "");
    const m = cuit.length === 11 ? delRol.find((x) => (x.cuit_maestro || "").replace(/\D/g, "") === cuit) : undefined;
    if (m) elegirMaestro(m.maestro_id);
    else toast.warning(`No se encontró un proveedor con CUIT ${p.proveedor_cuit || "—"}. Elegilo a mano.`);
    const defAli = p.incluir_iva === false ? 0 : (p.iva_porcentaje ?? 21);
    const nuevos = (p.items || []).map((i) => {
      const cantidad = +i.cantidad || 1, pu = +i.precio_unitario || 0;
      const ali = [0, 10.5, 21, 27].includes(+(i.alicuota_iva ?? NaN)) ? Number(i.alicuota_iva) : defAli;
      const neto = +(cantidad * pu).toFixed(2);
      return { ...blankItem(), descripcion: [i.articulo, i.descripcion].filter(Boolean).join(" - "), cantidad, precio_unit: pu, neto, alicuota_iva: ali, iva: +(neto * ali / 100).toFixed(2) };
    });
    if (nuevos.length) {
      const referencias = asociarOc(ocSnapshot?.items ?? [], nuevos);
      setItems(nuevos.map((i,k) => ({...i,oc_linea_id:referencias[k]})));
    }
    toast.success(`Factura importada: ${nuevos.length} renglones. Revisá cuentas e importes antes de guardar.`);
  };

  useEffect(() => {
    if (existing) {
      setTipo(existing.tipo);
      setPuntoVenta(existing.punto_venta);
      setNumero(existing.numero);
      setFecha(existing.fecha);
      setFechaVto(existing.fecha_vto ?? "");
      setTerceroId(existing.tercero_id ?? "");
      setObraId(existing.obra_id ?? "");
      setMaqId(existing.maquinaria_id ?? "");
      setObservaciones(existing.observaciones ?? "");
      setPercIva(+existing.perc_iva);
      setPercIibb(+existing.perc_iibb);
      setPercOtras(+existing.perc_otras);
      setOcId(existing.orden_compra_id ?? ''); setOcSnapshot(existing.oc_snapshot ?? null);
      setMoneda(existing.moneda); setCotizacion(+existing.cotizacion);
    }
  }, [existing]);

  useEffect(() => {
    if (existingItems.length > 0) {
      setItems(existingItems.map((i) => ({
        id: i.id,
        oc_linea_id: i.oc_linea_id ?? null,
        descripcion: i.descripcion,
        cuenta_id: i.cuenta_id,
        cantidad: +i.cantidad,
        precio_unit: +i.precio_unit,
        neto: +i.neto,
        alicuota_iva: +i.alicuota_iva,
        iva: +i.iva,
        obra_id: i.obra_id,
        maquinaria_id: i.maquinaria_id,
      })));
    }
  }, [existingItems]);

  const cuentasImputables = useMemo(() => cuentas.filter((c) => c.imputable && c.activa), [cuentas]);

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems((arr) => {
      const next = [...arr];
      const it = { ...next[idx], ...patch };
      // Recalc
      const cantidad = +it.cantidad || 0;
      const pu = +it.precio_unit || 0;
      it.neto = +(cantidad * pu).toFixed(2);
      it.iva = +(it.neto * (+it.alicuota_iva / 100)).toFixed(2);
      next[idx] = it;
      return next;
    });
  };

  const totales = useMemo(() => {
    const acc = { neto_21: 0, iva_21: 0, neto_105: 0, iva_105: 0, neto_27: 0, iva_27: 0, neto_0: 0 };
    items.forEach((it) => {
      const a = +it.alicuota_iva;
      if (a === 21) { acc.neto_21 += +it.neto; acc.iva_21 += +it.iva; }
      else if (a === 10.5) { acc.neto_105 += +it.neto; acc.iva_105 += +it.iva; }
      else if (a === 27) { acc.neto_27 += +it.neto; acc.iva_27 += +it.iva; }
      else { acc.neto_0 += +it.neto; }
    });
    const subtotalNeto = acc.neto_21 + acc.neto_105 + acc.neto_27 + acc.neto_0;
    const subtotalIva = acc.iva_21 + acc.iva_105 + acc.iva_27;
    const total = subtotalNeto + subtotalIva + (+percIva || 0) + (+percIibb || 0) + (+percOtras || 0);
    return { ...acc, subtotalNeto, subtotalIva, total };
  }, [items, percIva, percIibb, percOtras]);

  // Cambios sin guardar: se derivan comparando el formulario con lo que devolvió la base.
  const pendientes = useMemo(() => cambiosPendientes(
    existing ? {
      cab: { tipo: existing.tipo, punto_venta: existing.punto_venta, numero: existing.numero, fecha: existing.fecha, fecha_vto: existing.fecha_vto ?? null,
        tercero_id: existing.tercero_id ?? null, obra_id: existing.obra_id ?? null, maquinaria_id: existing.maquinaria_id ?? null,
        observaciones: existing.observaciones ?? null, perc_iva: +existing.perc_iva, perc_iibb: +existing.perc_iibb, perc_otras: +existing.perc_otras },
      items: existingItems as any[],
    } : null,
    { cab: { tipo, punto_venta: puntoVenta, numero, fecha, fecha_vto: fechaVto || null, tercero_id: terceroId || null, obra_id: obraId || null,
        maquinaria_id: maqId || null, observaciones, perc_iva: percIva, perc_iibb: percIibb, perc_otras: percOtras }, items },
  ), [existing, existingItems, tipo, puntoVenta, numero, fecha, fechaVto, terceroId, obraId, maqId, observaciones, percIva, percIibb, percOtras, items]);
  const dirty = !!existing && (pendientes.length > 0 || ocId !== (existing.orden_compra_id ?? '') || moneda !== existing.moneda || cotizacion !== +existing.cotizacion || items.some((i,k) => (i.oc_linea_id ?? null) !== (existingItems[k]?.oc_linea_id ?? null)));
  const permisos = permisosComprobante({ tipo: existing?.tipo ?? "", etapa, guardado: !!existing && !dirty, puedeCargar: true });
  const incompatibles = useMemo(() => existing ? problemasCompatibilidad({
    tipo: existing.tipo, items: existingItems.map((i) => ({ id: i.id, neto: +i.neto })), repartos, vinculos,
  }) : [], [existing, existingItems, repartos, vinculos]);
  const bloqueoAsiento = dirty || incompatibles.length > 0;


  const handleSave = async () => {
    if (!terceroId) return;
    setErrorGuardado(null);
    try {
      const id = await save.mutateAsync({
        cbte: {
          id: comprobanteId ?? undefined,
          tipo,
          punto_venta: puntoVenta,
          numero,
          fecha,
          fecha_vto: fechaVto || null,
          tercero_id: terceroId || null,
          es_venta: esVenta,
          estado: existing?.estado ?? "borrador",
          neto_21: totales.neto_21, iva_21: totales.iva_21,
          neto_105: totales.neto_105, iva_105: totales.iva_105,
          neto_27: totales.neto_27, iva_27: totales.iva_27,
          neto_0: totales.neto_0,
          exento: 0, no_gravado: 0,
          perc_iva: +percIva || 0,
          perc_iibb: +percIibb || 0,
          perc_otras: +percOtras || 0,
          total: totales.total,
          obra_id: obraId || null,
          maquinaria_id: maqId || null,
          observaciones,
          ...(!esVenta ? {orden_compra_id:ocId || null} : {}),
          moneda,
          cotizacion,
        } as any,
        items: items.map((i) => ({
          id: i.id,
          oc_linea_id: i.oc_linea_id ?? null,
          descripcion: i.descripcion,
          cuenta_id: i.cuenta_id,
          cantidad: i.cantidad,
          precio_unit: i.precio_unit,
          neto: i.neto,
          alicuota_iva: i.alicuota_iva,
          iva: i.iva,
          obra_id: i.obra_id,
          maquinaria_id: i.maquinaria_id,
        })),
      });
      if (!comprobanteId) setCreadoId(id);
      // Releer desde la base todo lo que depende del comprobante antes de rehabilitar operaciones.
      await Promise.all(["contab_cbte_one", "contab_cbte_items", "contab_repartos", "contab_vinculos", "contab_asiento_cbte", "contab_docs_op"]
        .map((k) => qc.invalidateQueries({ queryKey: [k] })));
    } catch (e: any) {
      setErrorGuardado(e?.message ?? "No se pudo guardar");
    }
  };

  const isReadOnly = !!existing && !permisos.editarItems;
  const tipos = esVenta ? TIPOS_VENTA : TIPOS_COMPRA;
  const fmtM = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {comprobanteId ? "Editar" : "Nuevo"} comprobante de {esVenta ? "venta" : "compra"}
            {existing && (
              <Badge data-testid="etapa-cbte" variant={etapa === "contabilizado" ? "default" : etapa === "anulado" ? "destructive" : "secondary"}>
                {ETAPA_LABEL[etapa]}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        {!esVenta && !existing && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1">
              <Sparkles className="w-4 h-4 text-primary" /> Importar factura con IA
            </Button>
            <ImportFacturaProveedorDialog open={importOpen} onOpenChange={setImportOpen} onImport={aplicarFactura} modo="factura" />
          </div>
        )}
        {errorGuardado && <div role="alert" className="rounded border border-destructive bg-destructive/10 p-2 text-sm text-destructive">{errorGuardado}</div>}
        {etapa === "asiento_borrador" && <p className="text-xs text-muted-foreground">Con asiento en borrador los renglones quedan bloqueados; podés ajustar repartos y vínculos y regenerar el borrador.</p>}
        {(etapa === "contabilizado" || etapa === "anulado") && <p className="text-xs text-muted-foreground">Comprobante {etapa === "anulado" ? "anulado" : "contabilizado"}: todo en solo lectura.</p>}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as CbteTipo)} disabled={!!isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Pto. Venta</Label>
            <Input type="number" value={puntoVenta} onChange={(e) => setPuntoVenta(+e.target.value)} disabled={!!isReadOnly} />
          </div>
          <div className="col-span-2">
            <Label>Número</Label>
            <Input type="number" value={numero} onChange={(e) => setNumero(+e.target.value)} disabled={!!isReadOnly} />
          </div>
          <div className="col-span-2">
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={!!isReadOnly} />
          </div>
          <div className="col-span-3">
            <Label>Vencimiento</Label>
            <Input type="date" value={fechaVto} onChange={(e) => setFechaVto(e.target.value)} disabled={!!isReadOnly} />
          </div>

          <div className="col-span-6">
            <Label>{esVenta ? "Cliente" : "Proveedor"}</Label>
            {isReadOnly ? (
              <Input value={delRol.find((m) => m.maestro_id === maestroSel)?.nombre ?? ""} disabled />
            ) : <Combobox
              options={maestrosOpts}
              value={maestroSel}
              onValueChange={elegirMaestro}
              placeholder={esVenta ? "Elegí un cliente" : "Elegí un proveedor"}
              searchPlaceholder="Buscar…"
            />}
            {maestroSel && !terceroId && <p className="text-xs text-destructive mt-1">Falta la ficha fiscal: completala para continuar.</p>}
            {fichaPara && (
              <FichaRapidaDialog maestro={fichaPara} onClose={() => setFichaPara(null)}
                onCreada={(id) => { setTerceroId(id); setFichaPara(null); }} />
            )}
          </div>
          <div className="col-span-3">
            <Label>Obra (cabecera)</Label>
            <Select value={obraId || "_"} onValueChange={(v) => setObraId(v === "_" ? "" : v)} disabled={!!isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">— sin obra —</SelectItem>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{opcionObra(o).label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Label>Máquina (cabecera)</Label>
            <Select value={maqId || "_"} onValueChange={(v) => setMaqId(v === "_" ? "" : v)} disabled={!!isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">— sin máquina —</SelectItem>
                {maquinas.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{opcionMaquina(m).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!esVenta && (tipo.startsWith('FA_CPA_') || !!ocId) && <>
          <CompraOcPanel proveedorId={proveedorActual} ocId={ocId} snapshot={ocSnapshot} items={items} cbteId={comprobanteId} editable={!isReadOnly} dirty={dirty} contabilizado={etapa === 'contabilizado'} onElegir={elegirOc} />
          {ocId && moneda === 'USD' && <div className="mt-3 max-w-xs"><Label>Cotización USD a ARS</Label><Input type="number" min="0.01" step="0.01" value={cotizacion} onChange={e => setCotizacion(+e.target.value)} disabled={isReadOnly} /></div>}
        </>}

        {/* ITEMS */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base">Renglones</Label>
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={() => setItems((a) => [...a, blankItem()])}>
                <Plus className="w-4 h-4 mr-1" />Agregar renglón
              </Button>
            )}
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="w-full min-w-[1100px] text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-1 text-left min-w-48">Descripción</th>
                  {ocId && <th className="px-2 py-1 text-left">Renglón OC</th>}
                  <th className="px-2 py-1 text-left">Cuenta</th>
                  <th className="px-2 py-1 text-right w-20">Cant.</th>
                  <th className="px-2 py-1 text-right w-28">Precio</th>
                  <th className="px-2 py-1 text-right w-28">Neto</th>
                  <th className="px-2 py-1 text-right w-20">IVA %</th>
                  <th className="px-2 py-1 text-right w-28">IVA</th>
                  <th className="px-2 py-1 text-left">Obra</th>
                  <th className="px-2 py-1 text-left">Máquina</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <Fragment key={it.id ?? `n${idx}`}>
                  <tr className="border-t">
                    <td className="px-1 py-1">
                      <Input value={it.descripcion} onChange={(e) => updateItem(idx, { descripcion: e.target.value })} disabled={!!isReadOnly} className="h-7" />
                    </td>
                    {ocId && <td className="px-1 py-1 min-w-40"><Select value={it.oc_linea_id ?? '_'} onValueChange={v => updateItem(idx,{oc_linea_id:v === '_' ? null : v})} disabled={isReadOnly}><SelectTrigger className="h-7"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_">No incluido en OC</SelectItem>{ocSnapshot?.items.map(l => <SelectItem key={l.id} value={l.id}>{l.descripcion} · {l.unidad}</SelectItem>)}</SelectContent></Select></td>}
                    <td className="px-1 py-1">
                      <Select value={it.cuenta_id ?? "_"} onValueChange={(v) => updateItem(idx, { cuenta_id: v === "_" ? null : v })} disabled={!!isReadOnly}>
                        <SelectTrigger className="h-7"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">—</SelectItem>
                          {cuentasImputables.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-1 py-1">
                      <Input type="number" value={it.cantidad} onChange={(e) => updateItem(idx, { cantidad: +e.target.value })} disabled={!!isReadOnly} className="h-7 text-right" />
                    </td>
                    <td className="px-1 py-1">
                      <Input type="number" value={it.precio_unit} onChange={(e) => updateItem(idx, { precio_unit: +e.target.value })} disabled={!!isReadOnly} className="h-7 text-right" />
                    </td>
                    <td className="px-1 py-1 text-right tabular-nums">{it.neto.toFixed(2)}</td>
                    <td className="px-1 py-1">
                      <Select value={String(it.alicuota_iva)} onValueChange={(v) => updateItem(idx, { alicuota_iva: +v })} disabled={!!isReadOnly}>
                        <SelectTrigger className="h-7"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="10.5">10.5%</SelectItem>
                          <SelectItem value="21">21%</SelectItem>
                          <SelectItem value="27">27%</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-1 py-1 text-right tabular-nums">{it.iva.toFixed(2)}</td>
                    <td className="px-1 py-1">
                      <Select value={it.obra_id ?? "_"} onValueChange={(v) => updateItem(idx, { obra_id: v === "_" ? null : v })} disabled={!!isReadOnly}>
                        <SelectTrigger className="h-7"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">—</SelectItem>
                          {obras.map((o) => <SelectItem key={o.id} value={o.id}>{opcionObra(o).label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-1 py-1">
                      <Select value={it.maquinaria_id ?? "_"} onValueChange={(v) => updateItem(idx, { maquinaria_id: v === "_" ? null : v })} disabled={!!isReadOnly}>
                        <SelectTrigger className="h-7"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">—</SelectItem>
                          {maquinas.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>{opcionMaquina(m).label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      {it.id && existing && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAbierto(abierto === it.id ? null : it.id ?? null)}
                          aria-label={`Repartos y vínculos del renglón ${idx + 1}`}>
                          <SplitSquareHorizontal className="w-4 h-4 mr-1" />
                          {fmtM(+it.neto - (repartos.filter((r) => r.item_id === it.id).reduce((a, r) => a + Number(r.importe_efectivo), 0)))}
                        </Button>
                      )}
                      {!isReadOnly && (
                        <Button size="icon" variant="ghost" onClick={() => setItems((a) => a.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                  {abierto === it.id && it.id && existing && (
                    <tr className="bg-muted/20">
                      <td colSpan={ocId ? 11 : 10} className="p-3 space-y-4">
                        {dirty && <p role="alert" className="text-xs text-destructive">{MSG_CAMBIOS_PENDIENTES}</p>}
                        <RepartosItemPanel itemId={it.id} neto={+it.neto} repartos={repartos.filter((r) => r.item_id === it.id)}
                          editable={permisos.editarRepartos} fecha={existing.fecha} obras={obras as any} maquinas={maquinas as any} />
                        <VinculosItemPanel cbteId={existing.id} itemId={it.id} neto={+it.neto} esVenta={esVenta} fecha={existing.fecha}
                          proveedorId={tercero?.proveedor_id ?? null} clienteId={tercero?.cliente_id ?? null}
                          vinculos={vinculos.filter((v) => v.item_id === it.id)} habilitado={permisos.vincular} motivo={permisos.motivoSinVinculos} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {existing && !dirty && <p className="mt-1 text-xs text-muted-foreground">El botón de cada renglón muestra el importe pendiente de repartir y abre repartos y vínculos.</p>}
          {!existing && <p className="mt-1 text-xs text-muted-foreground">Guardá el comprobante para habilitar repartos y vínculos.</p>}
        </div>

        {/* TOTALES */}
        <div className="grid grid-cols-12 gap-3 mt-4">
          <div className="col-span-6">
            <Label>Observaciones</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} disabled={!!isReadOnly} rows={3} />
          </div>
          <div className="col-span-6 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal Neto</span><span className="tabular-nums">{totales.subtotalNeto.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>IVA</span><span className="tabular-nums">{totales.subtotalIva.toFixed(2)}</span></div>
            <div className="grid grid-cols-3 gap-2 my-2">
              <div><Label className="text-xs">Perc. IVA</Label><Input type="number" value={percIva} onChange={(e) => setPercIva(+e.target.value)} disabled={!!isReadOnly} className="h-7" /></div>
              <div><Label className="text-xs">Perc. IIBB</Label><Input type="number" value={percIibb} onChange={(e) => setPercIibb(+e.target.value)} disabled={!!isReadOnly} className="h-7" /></div>
              <div><Label className="text-xs">Otras perc.</Label><Input type="number" value={percOtras} onChange={(e) => setPercOtras(+e.target.value)} disabled={!!isReadOnly} className="h-7" /></div>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2"><span>TOTAL {moneda}</span><span className="tabular-nums">{totales.total.toFixed(2)}</span></div>
          </div>
        </div>

        {existing?.asiento_id && <div className="mt-4"><AsientoComprobanteView asientoId={existing.asiento_id} /></div>}

        {dirty && (
          <div role="alert" data-testid="cambios-pendientes" className="mt-4 rounded border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
            {MSG_CAMBIOS_PENDIENTES}. Repartos, vínculos y asiento quedan deshabilitados hasta guardar.
          </div>
        )}
        {!dirty && incompatibles.length > 0 && (permisosBase.generar || permisosBase.regenerar) && (
          <div role="alert" data-testid="incompatibles" className="mt-4 rounded border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
            Revisá repartos y vínculos antes de generar el asiento: {incompatibles.join("; ")}.
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {permisosBase.generar && (
            <Button variant="secondary" onClick={() => { if(existing) generar.mutate({ cbteId: existing.id, regenerar: false }); }} disabled={generar.isPending || !permisos.generar || bloqueoAsiento} title={dirty ? MSG_CAMBIOS_PENDIENTES : undefined}>
              Generar asiento borrador
            </Button>
          )}
          {permisosBase.regenerar && (
            <Button variant="secondary" onClick={() => { if(existing) generar.mutate({ cbteId: existing.id, regenerar: true }); }} disabled={generar.isPending || !permisos.regenerar || bloqueoAsiento} title={dirty ? MSG_CAMBIOS_PENDIENTES : undefined}>
              Regenerar borrador
            </Button>
          )}
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={save.isPending || !terceroId}>
              {save.isPending ? "Guardando…" : "Guardar borrador"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
