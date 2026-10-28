import { useMemo, useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocsOperativos, useAddVinculo, useAnularVinculo, useSaldosVinculados, type Vinculo } from "@/hooks/useContab1c";
import { DOC_LABEL, docTiposPara, admiteFacturable, docFacturable, saldoDocumento, type DocTipo } from "@/lib/contab1c";

const fmt = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n)));
const num = (s: string) => Number(String(s).replace(",", "."));

export function VinculosItemPanel({ cbteId, itemId, neto, esVenta, fecha, proveedorId, clienteId, vinculos, habilitado, motivo }: {
  cbteId: string; itemId: string; neto: number; esVenta: boolean; fecha: string;
  proveedorId: string | null; clienteId: string | null; vinculos: Vinculo[]; habilitado: boolean; motivo: string | null;
}) {
  const tipos = docTiposPara(esVenta);
  const [tipo, setTipo] = useState<DocTipo>(tipos[0]);
  const [clase, setClase] = useState<"trazabilidad" | "facturable">(esVenta ? "facturable" : "facturable");
  const [q, setQ] = useState("");
  const [docId, setDocId] = useState("");
  const [importe, setImporte] = useState("");
  const [buscar, setBuscar] = useState(false);
  const claseEf = admiteFacturable(tipo) ? clase : "trazabilidad";

  const docs = useDocsOperativos({ tipo: habilitado && buscar ? tipo : null, proveedorId: esVenta ? null : proveedorId, clienteId: esVenta ? clienteId : null, q, hasta: fecha });
  const add = useAddVinculo();
  const anular = useAnularVinculo();
  const vigentes = vinculos.filter((v) => v.estado === "vigente");
  const { data: saldos } = useSaldosVinculados(vigentes);

  const vinculadoItem = vigentes.filter((v) => v.clase === "facturable").reduce((a, v) => a + Number(v.importe_vinculado), 0);
  const libreItem = Math.round((neto - vinculadoItem) * 100) / 100;
  const lista = useMemo(() => (docs.data ?? []).filter((d) => claseEf === "trazabilidad" || docFacturable(d.referencia, d.facturado)), [docs.data, claseEf]);
  const doc = lista.find((d) => d.id === docId);
  const saldoDoc = doc ? saldoDocumento(doc.referencia, doc.facturado) : null;
  const imp = num(importe);
  const tope = Math.min(libreItem, saldoDoc ?? libreItem);
  const valido = !!doc && (claseEf === "trazabilidad" || (imp > 0 && imp <= tope));

  const agregar = () => add.mutate(
    { comprobante_id: cbteId, item_id: itemId, clase: claseEf, doc_tipo: tipo, doc_id: docId, importe: claseEf === "facturable" ? imp : null, nota: null },
    { onSuccess: () => { setDocId(""); setImporte(""); } },
  );

  return (
    <div className="space-y-2" data-testid={`vinculos-${itemId}`}>
      <div className="flex justify-between text-xs">
        <span className="font-semibold">Vínculos operativos</span>
        <span>Facturable vinculado <b>{fmt(vinculadoItem)}</b> · Libre en el ítem <b>{fmt(libreItem)}</b></span>
      </div>
      {vinculos.length === 0 && <p className="text-xs text-muted-foreground">Sin vínculos.</p>}
      {vinculos.map((v) => {
        const s = saldos?.get(`${v.doc_tipo}:${v.doc_id}`);
        return (
          <div key={v.id} className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs ${v.estado === "anulado" ? "opacity-50 line-through" : ""}`}>
            <span className="flex items-center gap-1">
              <Badge variant={v.clase === "facturable" ? "default" : "outline"}>{v.clase === "facturable" ? "Facturable" : "Trazabilidad"}</Badge>
              {DOC_LABEL[v.doc_tipo]} · {v.doc_id.slice(0, 8)}
            </span>
            <span className="flex items-center gap-2 tabular-nums">
              {v.clase === "facturable" && <b>{fmt(v.importe_vinculado)}</b>}
              {s && s.importe_referencia != null && <span className="text-muted-foreground">doc. {fmt(s.importe_referencia)} · saldo {fmt(s.saldo_pendiente)}</span>}
              {habilitado && v.estado === "vigente" && (
                <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Anular vínculo" onClick={() => anular.mutate({ id: v.id, motivo: "Anulado desde el comprobante" })}>
                  <Ban className="h-3.5 w-3.5 text-amber-600" />
                </Button>
              )}
            </span>
          </div>
        );
      })}
      {!habilitado ? (
        motivo && <p className="text-xs text-muted-foreground" data-testid="vinculos-motivo">{motivo}</p>
      ) : !buscar ? (
        <Button size="sm" variant="outline" onClick={() => setBuscar(true)}>Vincular documento</Button>
      ) : (
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <Select value={tipo} onValueChange={(v) => { setTipo(v as DocTipo); setDocId(""); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{DOC_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Select value={claseEf} onValueChange={(v) => setClase(v as any)} disabled={!admiteFacturable(tipo)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="facturable">Facturable (descuenta saldo)</SelectItem>
                <SelectItem value="trazabilidad">Trazabilidad (solo referencia)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-5"><Input placeholder="Buscar número o descripción…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="col-span-12 max-h-48 overflow-y-auto rounded border">
            {docs.isLoading && <p className="p-2 text-xs text-muted-foreground">Buscando…</p>}
            {docs.error && <p className="p-2 text-xs text-destructive">{(docs.error as any).message}</p>}
            {!docs.isLoading && lista.length === 0 && <p className="p-2 text-xs text-muted-foreground">Sin documentos compatibles{!esVenta && proveedorId ? " para este proveedor" : esVenta && clienteId ? " para este cliente" : ""}.</p>}
            {lista.map((d) => {
              const s = saldoDocumento(d.referencia, d.facturado);
              return (
                <button type="button" key={d.id} onClick={() => { setDocId(d.id); if (claseEf === "facturable") setImporte(String(Math.min(libreItem, s ?? libreItem))); }}
                  className={`flex w-full justify-between gap-2 px-2 py-1 text-left text-xs hover:bg-muted ${d.id === docId ? "bg-muted font-semibold" : ""}`}>
                  <span>{d.etiqueta}</span>
                  <span className="tabular-nums whitespace-nowrap">{d.referencia != null ? <>Importe {fmt(d.referencia)} · Vinculado {fmt(d.facturado)} · Disponible {fmt(s)}</> : d.facturado > 0 ? "Ya facturado" : "Sin importe propio"}</span>
                </button>
              );
            })}
          </div>
          {claseEf === "facturable" && (
            <div className="col-span-4"><Input aria-label="Importe a vincular" inputMode="decimal" placeholder="Importe" value={importe} onChange={(e) => setImporte(e.target.value)} /></div>
          )}
          <div className="col-span-4 flex gap-2">
            <Button size="sm" onClick={agregar} disabled={!valido || add.isPending}>Agregar vínculo</Button>
            <Button size="sm" variant="ghost" onClick={() => setBuscar(false)}>Cerrar</Button>
          </div>
          {claseEf === "facturable" && doc && imp > tope && <p className="col-span-12 text-xs text-destructive">Supera lo disponible ({fmt(tope)}).</p>}
        </div>
      )}
    </div>
  );
}
