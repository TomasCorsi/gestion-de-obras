import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowDownUp, FileSpreadsheet, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/searchable-select";
import { useChequesRecibidos, useContabTerceros } from "@/hooks/useContabilidad";
import {
  filtrarCartera, buscarValores, ordenar, totalValores,
  type ColOrden, type TipoValor, type Incluir, type Busqueda, type ValorCartera,
} from "@/lib/valoresCartera";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fd = (s?: string | null) => { if (!s) return "—"; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const ESTADO: Record<string, string> = { en_cartera: "En cartera", depositado: "Depositado", entregado: "Endosado", rechazado: "R" };

function Opciones<T extends string>({ titulo, value, onChange, items }: { titulo: string; value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <fieldset className="rounded-md border p-2">
      <legend className="px-1 text-xs font-medium text-muted-foreground">{titulo}</legend>
      <div className="flex flex-wrap gap-1">
        {items.map(([k, l]) => (
          <Button key={k} type="button" size="sm" variant={value === k ? "default" : "outline"} className="h-7" onClick={() => onChange(k)}>{l}</Button>
        ))}
      </div>
    </fieldset>
  );
}

function Th({ col, label, orden, setOrden, right }: { col: ColOrden; label: string; orden: [ColOrden, boolean]; setOrden: (o: [ColOrden, boolean]) => void; right?: boolean }) {
  const activo = orden[0] === col;
  return (
    <th className={`px-3 py-2 ${right ? "text-right" : ""}`}>
      <button type="button" className={`inline-flex items-center gap-1 hover:text-foreground ${activo ? "text-foreground font-semibold" : ""}`}
        onClick={() => setOrden([col, activo ? !orden[1] : true])}>
        {label}<ArrowDownUp className="w-3 h-3 opacity-60" />
      </button>
    </th>
  );
}

function Grilla({ rows, orden, setOrden, onSelect, seleccionado }: { rows: ValorCartera[]; orden: [ColOrden, boolean]; setOrden: (o: [ColOrden, boolean]) => void; onSelect?: (r: ValorCartera) => void; seleccionado?: string }) {
  const p = { orden, setOrden };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <Th col="asiento" label="Asiento" {...p} /><Th col="recibo" label="Recibo" {...p} /><Th col="cliente" label="Cliente" {...p} />
            <th className="px-3 py-2">CUIT</th><Th col="importe" label="Importe" right {...p} /><Th col="numero" label="Nº cheque" {...p} />
            <Th col="banco" label="Banco" {...p} /><Th col="ingreso" label="F. ingreso" {...p} /><Th col="pago" label="F. pago" {...p} />
            <th className="px-3 py-2">TV</th><th className="px-3 py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Sin valores</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onSelect?.(r)}
              className={`border-t ${onSelect ? "cursor-pointer hover:bg-muted/40" : ""} ${seleccionado === r.id ? "bg-primary/10" : ""}`}>
              <td className="px-3 py-2 tabular-nums">{r.pago?.asiento?.numero ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.pago?.recibo_numero ?? "—"}</td>
              <td className="px-3 py-2">{r.pago?.tercero?.razon_social ?? "—"}</td>
              <td className="px-3 py-2 text-xs">{r.pago?.tercero?.cuit ?? r.pago?.tercero?.doc_numero ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(r.importe)}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.cheque_numero ?? "—"}</td>
              <td className="px-3 py-2">{r.cheque_banco ?? "—"}</td>
              <td className="px-3 py-2">{fd(r.pago?.fecha)}</td>
              <td className="px-3 py-2">{fd(r.cheque_fecha_pago)}</td>
              <td className="px-3 py-2">{r.medio === "echeck" ? "E" : "F"}</td>
              <td className={`px-3 py-2 ${r.cheque_estado === "rechazado" ? "text-destructive font-semibold" : ""}`}>{ESTADO[r.cheque_estado ?? ""] ?? r.cheque_estado ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ValoresCartera() {
  const { data = [], isLoading } = useChequesRecibidos();
  const { data: terceros = [] } = useContabTerceros();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState<TipoValor>("ambos");
  const [incluir, setIncluir] = useState<Incluir>("cartera");
  const [cliente, setCliente] = useState("");
  const [orden, setOrden] = useState<[ColOrden, boolean]>(["pago", true]);
  const rows = useMemo(() => ordenar(filtrarCartera(data, { desde, hasta, tipo, incluir, terceroId: cliente || undefined }), ...orden), [data, desde, hasta, tipo, incluir, cliente, orden]);
  const clientes = (terceros as any[]).filter((t) => t.tipo !== "proveedor");

  const exportar = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Asiento: r.pago?.asiento?.numero ?? "", Recibo: r.pago?.recibo_numero ?? "", Cliente: r.pago?.tercero?.razon_social ?? "",
      CUIT: r.pago?.tercero?.cuit ?? "", Importe: Number(r.importe), "Nº cheque": r.cheque_numero ?? "", Banco: r.cheque_banco ?? "",
      "Fecha ingreso": fd(r.pago?.fecha), "Fecha pago": fd(r.cheque_fecha_pago), TV: r.medio === "echeck" ? "E" : "F",
      Estado: ESTADO[r.cheque_estado ?? ""] ?? r.cheque_estado ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Valores en cartera");
    XLSX.writeFile(wb, `valores_en_cartera_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="rounded-md border p-2">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Período (fecha de ingreso)</legend>
            <div className="flex gap-2">
              <div><Label className="text-xs">Desde</Label><Input type="date" className="h-8" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
              <div><Label className="text-xs">Hasta</Label><Input type="date" className="h-8" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
            </div>
          </fieldset>
          <Opciones titulo="Tipo de valores" value={tipo} onChange={setTipo} items={[["fisicos", "Val. Físicos"], ["echeqs", "ECheqs"], ["ambos", "Ambos"]]} />
          <fieldset className="rounded-md border p-2 min-w-[240px]">
            <legend className="px-1 text-xs font-medium text-muted-foreground">De un cliente</legend>
            <Select value={cliente || "__todos"} onValueChange={(v) => setCliente(v === "__todos" ? "" : v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos">Todos los clientes</SelectItem>
                {clientes.map((t) => <SelectItem key={t.id} value={t.id}>{t.razon_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </fieldset>
          <Opciones titulo="Valores a incluir" value={incluir} onChange={setIncluir} items={[["todos", "Todos"], ["cartera", "En Cartera"], ["endosados", "Endosados"]]} />
          <Button variant="outline" onClick={exportar} disabled={rows.length === 0}><FileSpreadsheet className="w-4 h-4 mr-2" />Exportar a Excel</Button>
        </div>
        <div className="rounded-md border">
          {isLoading ? <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p> : <Grilla rows={rows} orden={orden} setOrden={setOrden} />}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-xs text-muted-foreground">R: Rechazado · TV: Tipo de valor (F: Físico, E: ECheq)</span>
          <span>{rows.length} valores · TOTAL: <strong className="tabular-nums">{fmt(totalValores(rows))}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}

export function BuscarValores() {
  const { data = [], isLoading } = useChequesRecibidos();
  const vacio: Busqueda = { numero: "", banco: "", importe: "", vto: "" };
  const [form, setForm] = useState<Busqueda>(vacio);
  const [busqueda, setBusqueda] = useState<Busqueda>(vacio);
  const [orden, setOrden] = useState<[ColOrden, boolean]>(["numero", true]);
  const [sel, setSel] = useState<ValorCartera | null>(null);
  const primero = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => ordenar(buscarValores(data, busqueda), ...orden), [data, busqueda, orden]);
  const buscado = Object.values(busqueda).some((v) => (v ?? "").trim());
  const nueva = () => { setForm(vacio); setBusqueda(vacio); setSel(null); primero.current?.focus(); };
  const t = sel?.pago?.tercero;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_2fr]">
      <Card>
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-medium">Valor <span className="text-xs text-muted-foreground font-normal">(ingresar el campo por el que se buscará)</span></p>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); setBusqueda(form); setSel(null); }}>
            <div><Label className="text-xs">Cheque Nº</Label><Input ref={primero} autoFocus value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
            <div><Label className="text-xs">Banco emisor</Label><Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} /></div>
            <div><Label className="text-xs">Importe</Label><Input inputMode="decimal" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} /></div>
            <div><Label className="text-xs">Fecha vto.</Label><Input type="date" value={form.vto} onChange={(e) => setForm({ ...form, vto: e.target.value })} /></div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1"><Search className="w-4 h-4 mr-2" />Buscar</Button>
              <Button type="button" variant="outline" onClick={nueva}><RotateCcw className="w-4 h-4 mr-2" />Nueva búsqueda</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div className="space-y-1">
            <p className="font-medium">Origen del valor</p>
            {sel ? <>
              <p><span className="text-muted-foreground">Ingresado:</span> {fd(sel.pago?.fecha)} · Recibo {sel.pago?.recibo_numero ?? "—"}</p>
              <p><span className="text-muted-foreground">Cheque:</span> {sel.cheque_numero ?? "—"} · {sel.cheque_banco ?? "—"}</p>
              <p><span className="text-muted-foreground">Importe:</span> <strong>{fmt(sel.importe)}</strong> · Pago {fd(sel.cheque_fecha_pago)}</p>
              <p><span className="text-muted-foreground">Tipo:</span> {sel.medio === "echeck" ? "ECheq" : "Físico"} · {ESTADO[sel.cheque_estado ?? ""] === "R" ? "Rechazado" : ESTADO[sel.cheque_estado ?? ""] ?? "—"}</p>
            </> : <p className="text-muted-foreground">Elegí un valor de la grilla para ver su origen.</p>}
          </div>
          <div className="space-y-1">
            <p className="font-medium">Cliente</p>
            {sel ? <>
              <p>{t?.razon_social ?? "—"}</p>
              <p className="text-muted-foreground">CUIT {t?.cuit ?? t?.doc_numero ?? "—"}</p>
              <p className="text-muted-foreground">{[t?.domicilio, t?.localidad, t?.provincia].filter(Boolean).join(", ") || "Sin domicilio"}</p>
              {sel.cheque_librador && <p className="text-muted-foreground">Librador: {sel.cheque_librador} {sel.cheque_cuit ? `(${sel.cheque_cuit})` : ""}</p>}
            </> : <p className="text-muted-foreground">—</p>}
          </div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>
            : !buscado ? <p className="p-6 text-center text-sm text-muted-foreground">Ingresá al menos un dato y tocá Buscar.</p>
            : <Grilla rows={rows} orden={orden} setOrden={setOrden} onSelect={setSel} seleccionado={sel?.id} />}
        </CardContent>
      </Card>
    </div>
  );
}
