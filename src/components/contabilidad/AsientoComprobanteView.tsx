import { Badge } from "@/components/ui/badge";
import { useAsientoCbte } from "@/hooks/useContab1c";
import { ImputacionesAsiento } from "./ImputacionesAsiento";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));

export function AsientoComprobanteView({ asientoId }: { asientoId: string }) {
  const { data, isLoading, error } = useAsientoCbte(asientoId);
  if (isLoading) return <p className="text-xs text-muted-foreground">Cargando asiento…</p>;
  if (error || !data) return <p className="text-xs text-destructive">No se pudo leer el asiento.</p>;
  const { asiento, lineas } = data as any;
  return (
    <div className="space-y-2 rounded-md border p-3" data-testid="asiento-cbte">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Asiento {asiento.numero ? `N° ${asiento.numero}` : "(sin número)"} · {asiento.descripcion}
        </p>
        <Badge variant={asiento.estado === "borrador" ? "secondary" : "default"}>{asiento.estado === "borrador" ? "Borrador" : asiento.estado === "confirmado" ? "Contabilizado" : asiento.estado}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">Solo lectura. Las modificaciones se hacen desde el comprobante y se aplican al regenerar el borrador.</p>
      <table className="w-full text-xs">
        <thead className="bg-muted/50"><tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Cuenta</th><th className="px-2 py-1 text-left">Detalle</th><th className="px-2 py-1 text-right">Debe</th><th className="px-2 py-1 text-right">Haber</th></tr></thead>
        <tbody>
          {lineas.map((l: any) => (
            <tr key={l.id} className="border-t">
              <td className="px-2 py-1">{l.orden}</td>
              <td className="px-2 py-1">{l.cuenta ? `${l.cuenta.codigo} · ${l.cuenta.nombre}` : "—"}</td>
              <td className="px-2 py-1">{l.descripcion}</td>
              <td className="px-2 py-1 text-right tabular-nums">{Number(l.debe) ? fmt(l.debe) : ""}</td>
              <td className="px-2 py-1 text-right tabular-nums">{Number(l.haber) ? fmt(l.haber) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ImputacionesAsiento lineas={lineas.filter((l: any) => l.item_id)} editable={false} />
    </div>
  );
}
