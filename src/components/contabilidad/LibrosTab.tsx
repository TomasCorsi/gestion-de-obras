import { useState } from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBalanceSumasSaldos, useLibroDiario, mayorConSaldo } from "@/hooks/useContabPeriodos";
import { useContabPlanCuentas, useMayorCuenta } from "@/hooks/useContabilidad";
import { Combobox } from "@/components/ui/combobox";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
const fmtDate = (s: string) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const safe = (v: any) => (typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v);

export function LibrosTab() {
  const y = new Date().getFullYear();
  const [desde, setDesde] = useState(`${y}-01-01`);
  const [hasta, setHasta] = useState(`${y}-12-31`);
  const diario = useLibroDiario(desde, hasta);
  const balance = useBalanceSumasSaldos(desde, hasta);

  const exportar = () => {
    const wb = XLSX.utils.book_new();
    const d: any[] = [];
    (diario.data ?? []).forEach((a) => (a.lineas ?? []).sort((x: any, z: any) => x.orden - z.orden).forEach((l: any) => d.push({
      "N°": a.numero_ejercicio, Fecha: fmtDate(a.fecha), Asiento: safe(a.descripcion), Estado: a.estado,
      Cuenta: l.cuenta ? `${l.cuenta.codigo} ${l.cuenta.nombre}` : "", Detalle: safe(l.descripcion ?? ""), Debe: Number(l.debe), Haber: Number(l.haber),
    })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), "Libro Diario");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((balance.data ?? []).map((b) => ({
      Código: b.codigo, Cuenta: b.nombre, Debe: b.debe, Haber: b.haber, Saldo: b.saldo,
    }))), "Sumas y Saldos");
    XLSX.writeFile(wb, `libros_${desde}_${hasta}.xlsx`);
  };

  const tot = (balance.data ?? []).reduce((s, b) => ({ d: s.d + b.debe, h: s.h + b.haber }), { d: 0, h: 0 });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label>Desde</Label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div><Label>Hasta</Label><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <Button variant="outline" onClick={exportar}><Download className="w-4 h-4 mr-1" />Excel</Button>
        <p className="text-xs text-muted-foreground">Solo incluye asientos confirmados (y revertidos con su contraasiento).</p>
      </div>
      <Tabs defaultValue="diario">
        <TabsList><TabsTrigger value="diario">Libro Diario</TabsTrigger><TabsTrigger value="mayor">Libro Mayor</TabsTrigger><TabsTrigger value="balance">Sumas y Saldos</TabsTrigger></TabsList>
        <TabsContent value="mayor"><LibroMayor desde={desde} hasta={hasta} /></TabsContent>
        <TabsContent value="diario">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">N°</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Cuenta / Detalle</th><th className="px-3 py-2 text-right">Debe</th><th className="px-3 py-2 text-right">Haber</th></tr></thead>
              <tbody>
                {diario.isLoading && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
                {!diario.isLoading && (diario.data ?? []).length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No hay asientos confirmados en el rango</td></tr>}
                {(diario.data ?? []).map((a) => [
                  <tr key={a.id} className="border-t bg-muted/20 font-medium">
                    <td className="px-3 py-1 font-mono">{a.numero_ejercicio}</td><td className="px-3 py-1">{fmtDate(a.fecha)}</td>
                    <td className="px-3 py-1" colSpan={3}>{a.descripcion}{a.estado === "revertido" && <span className="ml-2 text-xs text-destructive">(revertido)</span>}</td>
                  </tr>,
                  ...(a.lineas ?? []).sort((x: any, z: any) => x.orden - z.orden).map((l: any) => (
                    <tr key={l.id}><td></td><td></td>
                      <td className={`px-3 py-1 text-xs ${l.haber > 0 ? "pl-8" : ""}`}>{l.cuenta ? `${l.cuenta.codigo} · ${l.cuenta.nombre}` : "—"}{l.descripcion ? ` — ${l.descripcion}` : ""}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{l.debe > 0 ? fmt(l.debe) : ""}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{l.haber > 0 ? fmt(l.haber) : ""}</td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="balance">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">Cuenta</th><th className="px-3 py-2 text-right">Debe</th><th className="px-3 py-2 text-right">Haber</th><th className="px-3 py-2 text-right">Saldo</th></tr></thead>
              <tbody>
                {(balance.data ?? []).map((b) => (
                  <tr key={b.codigo} className="border-t">
                    <td className="px-3 py-1 font-mono text-xs">{b.codigo}</td><td className="px-3 py-1">{b.nombre}</td>
                    <td className="px-3 py-1 text-right tabular-nums">{fmt(b.debe)}</td><td className="px-3 py-1 text-right tabular-nums">{fmt(b.haber)}</td>
                    <td className={`px-3 py-1 text-right tabular-nums font-medium ${b.saldo < 0 ? "text-destructive" : ""}`}>{fmt(b.saldo)}</td>
                  </tr>
                ))}
                {(balance.data ?? []).length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin movimientos</td></tr>}
              </tbody>
              <tfoot className="border-t-2 font-semibold"><tr><td></td><td className="px-3 py-2">Totales</td><td className="px-3 py-2 text-right tabular-nums">{fmt(tot.d)}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(tot.h)}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(tot.d - tot.h)}</td></tr></tfoot>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LibroMayor({ desde, hasta }: { desde: string; hasta: string }) {
  const { data: cuentas = [] } = useContabPlanCuentas();
  const [cuenta, setCuenta] = useState<string>("");
  const { data = [], isLoading } = useMayorCuenta(cuenta || null, desde, hasta);
  const filas = mayorConSaldo(data as any[]);
  const opts = (cuentas as any[]).filter((c) => c.imputable).map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` }));
  return (
    <div className="space-y-3">
      <div className="max-w-md"><Label>Cuenta</Label>
        <Combobox options={opts} value={cuenta} onValueChange={setCuenta} placeholder="Elegí una cuenta" searchPlaceholder="Buscar cuenta..." />
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">N°</th><th className="px-3 py-2">Concepto</th><th className="px-3 py-2 text-right">Debe</th><th className="px-3 py-2 text-right">Haber</th><th className="px-3 py-2 text-right">Saldo</th></tr></thead>
          <tbody>
            {!cuenta && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Elegí una cuenta para ver sus movimientos</td></tr>}
            {cuenta && isLoading && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
            {cuenta && !isLoading && filas.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Sin movimientos confirmados en el rango</td></tr>}
            {filas.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-3 py-1">{fmtDate(f.fecha)}</td><td className="px-3 py-1 font-mono">{f.numero ?? "—"}</td>
                <td className="px-3 py-1">{f.concepto}{f.estado === "revertido" && <span className="ml-2 text-xs text-destructive">(revertido)</span>}</td>
                <td className="px-3 py-1 text-right tabular-nums">{f.debe > 0 ? fmt(f.debe) : ""}</td>
                <td className="px-3 py-1 text-right tabular-nums">{f.haber > 0 ? fmt(f.haber) : ""}</td>
                <td className={`px-3 py-1 text-right tabular-nums font-medium ${f.saldo < 0 ? "text-destructive" : ""}`}>{fmt(f.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
