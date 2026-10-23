import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTercerosEstado, useFicha, useGuardarFicha, useVincularFicha, type TerceroEstado } from "@/hooks/useTercerosFiscal";
import { useContabPlanCuentas } from "@/hooks/useContabilidad";
import { FichaRapidaDialog } from "./FichaRapidaDialog";

export function TercerosPanel() {
  const { data = [], isLoading } = useTercerosEstado();
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [crear, setCrear] = useState<TerceroEstado | null>(null);
  const [editar, setEditar] = useState<string | null>(null);
  const vincular = useVincularFicha();

  const filas = useMemo(() => data.filter((r) =>
    (rol === "todos" || r.rol === rol) &&
    (estado === "todos" || (estado === "con" ? !!r.tercero_id : !r.tercero_id)) &&
    (!q || `${r.nombre} ${r.cuit_maestro ?? ""} ${r.razon_social ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [data, q, rol, estado]);
  const sinFicha = data.filter((r) => !r.tercero_id).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input placeholder="Buscar nombre o CUIT…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={rol} onValueChange={setRol}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Clientes y proveedores</SelectItem><SelectItem value="cliente">Clientes</SelectItem><SelectItem value="proveedor">Proveedores</SelectItem></SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="con">Con ficha</SelectItem><SelectItem value="sin">Sin ficha</SelectItem></SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{sinFicha} sin ficha fiscal. Los datos de contacto se editan en Clientes y Proveedores.</p>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">CUIT (maestro)</th><th className="px-3 py-2">Ficha fiscal</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
            {filas.map((r) => (
              <tr key={`${r.rol}-${r.maestro_id}`} className="border-t">
                <td className="px-3 py-2">{r.nombre}{!r.activo && <span className="ml-1 text-xs text-muted-foreground">(inactivo)</span>}</td>
                <td className="px-3 py-2 text-xs capitalize">{r.rol}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.cuit_maestro ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.tercero_id ? (
                    <span className="text-xs">{r.razon_social} · {r.doc_tipo} {r.doc_numero ?? ""} {r.tipo === "ambos" && <Badge variant="secondary" className="ml-1">cliente y proveedor</Badge>}</span>
                  ) : <Badge variant="outline">Sin ficha</Badge>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {r.tercero_id ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditar(r.tercero_id)}>Datos fiscales</Button>
                  ) : (
                    <>
                      {r.sugerencia_tercero_id && (
                        <Button size="sm" variant="outline" className="mr-2" disabled={vincular.isPending}
                          onClick={() => vincular.mutate({ tercero_id: r.sugerencia_tercero_id!, rol: r.rol, maestro_id: r.maestro_id })}>
                          Vincular (mismo CUIT)
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setCrear(r)}>Crear ficha</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
      {crear && <FichaRapidaDialog maestro={crear} onClose={() => setCrear(null)} onCreada={() => setCrear(null)} />}
      {editar && <FichaFiscalDialog id={editar} onClose={() => setEditar(null)} />}
    </div>
  );
}

const CAMPOS = ["razon_social", "condicion_iva", "domicilio_fiscal", "provincia", "cp", "iibb_condicion", "iibb_numero", "iibb_jurisdiccion",
  "ganancias_regimen", "exencion_detalle", "exencion_vigencia_hasta", "banco", "cbu", "cbu_alias", "plazo_pago_dias",
  "cuenta_deudores_id", "cuenta_proveedores_id"] as const;

function FichaFiscalDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: ficha } = useFicha(id);
  const { data: cuentas = [] } = useContabPlanCuentas();
  const guardar = useGuardarFicha();
  const [f, setF] = useState<Record<string, any>>({});
  useEffect(() => { if (ficha) setF(Object.fromEntries(CAMPOS.map((k) => [k, ficha[k] ?? ""]))); }, [ficha]);
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  const opts = (cuentas as any[]).filter((c) => c.imputable && c.activa).map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` }));
  const txt = (k: string, l: string, type = "text") => (
    <div><Label>{l}</Label><Input type={type} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></div>
  );
  const guardarClick = () => {
    const payload: Record<string, any> = { id };
    CAMPOS.forEach((k) => { const v = f[k]; payload[k] = v === "" ? null : v; });
    if (payload.plazo_pago_dias != null) payload.plazo_pago_dias = Number(payload.plazo_pago_dias);
    if (!payload.razon_social) return;
    guardar.mutate(payload, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Datos fiscales · {ficha?.doc_tipo} {ficha?.doc_numero ?? ""}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {txt("razon_social", "Razón social")}
          <div><Label>Condición IVA</Label>
            <Select value={f.condicion_iva || "RI"} onValueChange={(v) => set("condicion_iva", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["RI", "MT", "EX", "CF", "NR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {txt("domicilio_fiscal", "Domicilio fiscal")}
          <div className="grid grid-cols-2 gap-3">{txt("provincia", "Provincia")}{txt("cp", "CP")}</div>
          <div><Label>Ingresos Brutos</Label>
            <Select value={f.iibb_condicion || "none"} onValueChange={(v) => set("iibb_condicion", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin dato</SelectItem><SelectItem value="local">Local</SelectItem><SelectItem value="convenio">Convenio multilateral</SelectItem>
                <SelectItem value="exento">Exento</SelectItem><SelectItem value="no_inscripto">No inscripto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">{txt("iibb_numero", "N° IIBB")}{txt("iibb_jurisdiccion", "Jurisdicción")}</div>
          {txt("ganancias_regimen", "Régimen Ganancias")}
          <div className="grid grid-cols-2 gap-3">{txt("exencion_detalle", "Exención / no retención")}{txt("exencion_vigencia_hasta", "Vigente hasta", "date")}</div>
          {txt("banco", "Banco")}
          <div className="grid grid-cols-2 gap-3">{txt("cbu", "CBU")}{txt("cbu_alias", "Alias")}</div>
          {txt("plazo_pago_dias", "Plazo de pago (días)", "number")}
          <div />
          <div><Label>Cuenta deudores (como cliente)</Label>
            <Combobox options={opts} value={f.cuenta_deudores_id || ""} onValueChange={(v) => set("cuenta_deudores_id", v)} placeholder="Usar la general" searchPlaceholder="Buscar cuenta..." />
          </div>
          <div><Label>Cuenta proveedores (como proveedor)</Label>
            <Combobox options={opts} value={f.cuenta_proveedores_id || ""} onValueChange={(v) => set("cuenta_proveedores_id", v)} placeholder="Usar la general" searchPlaceholder="Buscar cuenta..." />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Las cuentas propias quedan guardadas; por ahora los asientos siguen usando las cuentas generales configuradas. No se compensan saldos entre cliente y proveedor.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={guardar.isPending || !f.razon_social} onClick={guardarClick}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
