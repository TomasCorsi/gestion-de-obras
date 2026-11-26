import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Copy, CheckCircle2, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { compararOc, type OcSnapshot, type FacturaOcLinea } from '@/lib/compraOc';
import type { OrdenCompraWithRelations } from '@/hooks/useOrdenesCompra';

interface Props {
  proveedorId: string; ocId: string; snapshot: OcSnapshot | null; items: FacturaOcLinea[];
  cbteId: string | null; editable: boolean; dirty: boolean; contabilizado: boolean;
  onElegir: (oc: OrdenCompraWithRelations | null, copiar: boolean) => void;
}
interface Revision { aprobado: boolean; requiere_aprobacion: boolean; cerrado: boolean }
export function CompraOcPanel(p: Props) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const [accion, setAccion] = useState<'aprobar' | 'cerrar' | null>(null);
  const [copiar, setCopiar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const { data: admin = false } = useQuery({ queryKey: ['oc_puede_aprobar'], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (error) throw error; return data;
  }});
  const ordenes = useQuery({ queryKey: ['oc_para_factura', p.proveedorId], enabled: !!p.proveedorId && p.editable, queryFn: async () => {
    const rows: OrdenCompraWithRelations[] = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await supabase.from('ordenes_compra').select('*,items:orden_compra_items(*)').eq('proveedor_id', p.proveedorId).in('estado', ['emitida', 'recibida']).order('fecha', {ascending: false}).order('id').range(start, start + 499);
      if (error) throw error;
      rows.push(...data as OrdenCompraWithRelations[]);
      if (data.length < 500) break;
    }
    return rows;
  }});
  const saldos = useQuery({ queryKey: ['oc_saldos', p.ocId, p.cbteId], enabled: !!p.ocId, queryFn: async () => {
    const { data, error } = await supabase.rpc('contab_oc_saldos', { _oc_id: p.ocId, _excluir: p.cbteId ?? undefined });
    if (error) throw error;
    return data as unknown as { cerrado: boolean; cantidades: Record<string, number> };
  }});
  const revision = useQuery({ queryKey: ['oc_revision', p.cbteId], enabled: !!p.cbteId && !!p.ocId && !p.dirty, queryFn: async () => {
    const { data, error } = await supabase.rpc('contab_oc_revision', { _cbte_id: p.cbteId ?? '' });
    if (error) throw error; return data as unknown as Revision;
  }});
  const decisiones = useQuery({ queryKey: ['oc_decisiones', p.ocId], enabled: !!p.ocId, queryFn: async () => {
    const { data, error } = await supabase.from('contab_oc_decisiones').select('id,accion,motivo,created_at').eq('orden_compra_id', p.ocId).order('created_at', { ascending: false }).limit(20);
    if (error) throw error; return data;
  }});
  const snapshot = p.snapshot;
  const lineas = (snapshot?.items ?? []).map(l => ({ ...l, otros: Number(saldos.data?.cantidades[l.id] ?? 0) }));
  const comp = compararOc(lineas, p.items);
  const opciones = (ordenes.data ?? []).map(o => ({ value: o.id, label: `OC ${o.numero} · ${o.moneda} · ${o.estado}` }));
  if (p.ocId && !opciones.some(o => o.value === p.ocId)) opciones.unshift({value: p.ocId, label: `OC ${snapshot?.numero ?? 'vinculada'} · ${snapshot?.moneda ?? ''}`});
  const elegida = ordenes.data?.find(o => o.id === p.ocId);
  const cerrado = saldos.data?.cerrado ?? revision.data?.cerrado ?? false;
  const decidir = async () => {
    if (!p.cbteId || !accion || !motivo.trim()) return;
    setOcupado(true);
    try {
      const { error } = await supabase.rpc('contab_oc_decidir', { _cbte_id: p.cbteId, _accion: accion, _motivo: motivo.trim() });
      if (error) throw error;
      await Promise.all(['oc_revision', 'oc_saldos', 'oc_decisiones'].map(k => qc.invalidateQueries({queryKey:[k]})));
      toast.success(accion === 'aprobar' ? 'Diferencias aprobadas' : 'Saldo de la OC cerrado'); setAccion(null); setMotivo('');
    } catch(e) { toast.error(e instanceof Error ? e.message : String((e as {message?: string})?.message ?? 'No se pudo registrar la decisión')); }
    finally { setOcupado(false); }
  };
  return <section className="mt-4 border-y py-4 space-y-3">
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-0"><Label>Orden de compra</Label><Combobox options={[{value:'_',label:'Sin orden de compra'},...opciones]} value={p.ocId || '_'} onValueChange={v => p.onElegir(ordenes.data?.find(o => o.id === v) ?? null, false)} disabled={!p.editable || !p.proveedorId || ordenes.isLoading} placeholder="Elegí una OC" emptyText="No hay órdenes emitidas de este proveedor" /></div>
      {p.editable && !p.cbteId && elegida && <Button variant="outline" onClick={() => setCopiar(true)} disabled={cerrado || saldos.isLoading || saldos.isError}><Copy className="h-4 w-4 mr-2" />Cargar renglones de la OC</Button>}
    </div>
    {ordenes.isError && <p role="alert" className="text-sm text-destructive">No se pudieron cargar las órdenes. <Button variant="link" onClick={() => ordenes.refetch()}>Reintentar</Button></p>}
    {snapshot && <>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">OC {snapshot.numero} · {snapshot.moneda}</Badge><Badge variant={cerrado ? 'secondary' : 'outline'}>{cerrado ? 'Saldo cerrado' : 'Saldo abierto'}</Badge>{revision.data?.aprobado && !p.dirty && <Badge>Diferencias aprobadas</Badge>}</div>
      {saldos.isLoading ? <p className="text-sm text-muted-foreground">Consultando cantidades…</p> : saldos.isError ? <p role="alert" className="text-sm text-destructive">No se pudieron consultar los saldos. <Button variant="link" onClick={() => saldos.refetch()}>Reintentar</Button></p> : <>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-muted"><tr><th className="p-2 text-left">Autorizado en OC</th><th className="p-2">Unidad</th><th className="p-2 text-right">Cant. OC</th><th className="p-2 text-right">Otras facturas</th><th className="p-2 text-right">Esta factura</th><th className="p-2 text-right">Pendiente</th><th className="p-2 text-right">Precio OC</th><th className="p-2 text-left">Diferencias</th></tr></thead><tbody>{comp.lineas.map(l => <tr key={l.id} className="border-b"><td className="p-2">{l.descripcion}</td><td className="p-2 text-center">{l.unidad}</td><td className="p-2 text-right">{Number(l.cantidad)}</td><td className="p-2 text-right">{l.otros}</td><td className="p-2 text-right">{l.actual}</td><td className="p-2 text-right">{cerrado ? 'Cerrado' : l.pendiente}</td><td className="p-2 text-right">{Number(l.precio_unitario).toFixed(2)}</td><td className="p-2 text-destructive">{[l.excedida ? 'Cantidad excedida' : '',l.precioDistinto ? 'Precio distinto' : ''].filter(Boolean).join(' · ') || '—'}</td></tr>)}</tbody></table></div>
        {comp.extras.length > 0 && <p className="text-sm text-destructive">No incluidos en la OC: {comp.extras.map(i => i.descripcion || 'Renglón sin descripción').join(', ')}.</p>}
        {comp.requiereAprobacion && !revision.data?.aprobado && <p role="alert" className="text-sm text-destructive">Diferencias pendientes de aprobación antes de confirmar la factura.</p>}
      </>}
      {revision.isError && <p role="alert" className="text-sm text-destructive">No se pudo comprobar la aprobación. <Button variant="link" onClick={() => revision.refetch()}>Reintentar</Button></p>}
      {admin && p.cbteId && !p.dirty && !p.contabilizado && comp.requiereAprobacion && !revision.data?.aprobado && <Button variant="outline" onClick={() => setAccion('aprobar')} disabled={saldos.isError || revision.isError || revision.isLoading}><CheckCircle2 className="h-4 w-4 mr-2" />Aprobar diferencias</Button>}
      {admin && p.contabilizado && !cerrado && comp.lineas.some(l => l.pendiente > 0) && <Button variant="outline" onClick={() => setAccion('cerrar')}><LockKeyhole className="h-4 w-4 mr-2" />Cerrar saldo pendiente</Button>}
      {(decisiones.data ?? []).map(d => <p key={d.id} className="text-xs text-muted-foreground">{d.accion === 'aprobar' ? 'Aprobación' : 'Cierre de saldo'} · {new Date(d.created_at).toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'})} · {d.motivo}</p>)}
    </>}
    <AlertDialog open={copiar} onOpenChange={setCopiar}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cargar renglones de la OC</AlertDialogTitle><AlertDialogDescription>Se reemplazarán los renglones de esta factura por las cantidades pendientes de la OC. La orden original no se modifica.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if(elegida) p.onElegir({...elegida,items:elegida.items?.map(l => ({...l,cantidad:Math.max(0,Number(l.cantidad)-Number(saldos.data?.cantidades[l.id] ?? 0))})).filter(l => l.cantidad > 0)},true); }}>Cargar renglones</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={!!accion} onOpenChange={v => { if(!v && !ocupado) setAccion(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{accion === 'aprobar' ? 'Aprobar diferencias de la factura' : 'Cerrar saldo pendiente de la OC'}</AlertDialogTitle><AlertDialogDescription>{accion === 'aprobar' ? 'La aprobación queda registrada para los datos actuales de la factura; si cambian, debe revisarse nuevamente.' : 'El saldo restante no se seguirá facturando. Esta decisión no modifica cantidades ni precios originales y no puede deshacerse desde esta pantalla.'}</AlertDialogDescription></AlertDialogHeader><Label htmlFor="oc-motivo">Motivo</Label><Textarea id="oc-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} /><AlertDialogFooter><AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel><Button onClick={decidir} disabled={ocupado || !motivo.trim()}>{ocupado ? 'Registrando…' : 'Confirmar decisión'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}