import { useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { RemitoWithRelations } from "@/hooks/useRemitos";
import { ObraWithRelations } from "@/hooks/useObras";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";

interface RemitosSimpleGridProps {
  remitos: RemitoWithRelations[];
  obras: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  onEdit: (remito: RemitoWithRelations) => void;
  onDelete: (id: string) => void;
  creadoresMap?: Record<string, string>;
}

export function RemitosSimpleGrid({
  remitos,
  obras,
  maquinarias,
  onEdit,
  onDelete,
  creadoresMap,
}: RemitosSimpleGridProps) {
  const maqMap = useMemo(() => {
    const m: Record<string, string> = {};
    maquinarias.forEach((mq) => {
      m[mq.id] = [mq.codigo, mq.patente].filter(Boolean).join(" - ");
    });
    return m;
  }, [maquinarias]);

  const totalPrecio = remitos.reduce((s, r) => s + (r.precio_total || 0), 0);
  const totalViajes = remitos.reduce((s, r) => s + (r.cantidad_viajes || 0), 0);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="text-xs text-muted-foreground">
        {remitos.length} remitos · {totalViajes} viajes · ${totalPrecio.toLocaleString("es-AR")}
      </div>

      <div className="flex-1 overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs min-w-[90px] sticky left-0 bg-muted/50 z-10">Fecha</TableHead>
              <TableHead className="text-xs min-w-[90px]">Rem. Tercero</TableHead>
              <TableHead className="text-xs min-w-[90px]">Rem. Local</TableHead>
              <TableHead className="text-xs min-w-[140px]">Desde</TableHead>
              <TableHead className="text-xs min-w-[140px]">Hasta</TableHead>
              <TableHead className="text-xs min-w-[100px]">Tipo</TableHead>
              <TableHead className="text-xs min-w-[100px]">Transporte</TableHead>
              <TableHead className="text-xs min-w-[130px]">Vehículo</TableHead>
              <TableHead className="text-xs min-w-[90px]">Pat. Tercero</TableHead>
              <TableHead className="text-xs min-w-[120px]">Cli. Origen</TableHead>
              <TableHead className="text-xs min-w-[120px]">Cli. Destino</TableHead>
              <TableHead className="text-xs min-w-[55px] text-right">Viajes</TableHead>
              <TableHead className="text-xs min-w-[70px] text-right">C. Uni.</TableHead>
              <TableHead className="text-xs min-w-[70px] text-right">C. Total</TableHead>
              <TableHead className="text-xs min-w-[55px]">Unidad</TableHead>
              <TableHead className="text-xs min-w-[70px] text-right">P. Unit.</TableHead>
              <TableHead className="text-xs min-w-[80px] text-right">P. Total</TableHead>
              <TableHead className="text-xs min-w-[100px]">Proveedor</TableHead>
              <TableHead className="text-xs min-w-[110px]">Forma Pago</TableHead>
              <TableHead className="text-xs min-w-[130px]">Observaciones</TableHead>
              <TableHead className="text-xs w-[80px] text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remitos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={21} className="text-center text-muted-foreground py-8">
                  No hay remitos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              remitos.map((r) => (
                <TableRow key={r.id} className="text-xs">
                  <TableCell className="sticky left-0 bg-card z-10 py-2">{r.fecha}</TableCell>
                  <TableCell className="py-2">{r.remito_tercero || "-"}</TableCell>
                  <TableCell className="py-2">{r.remito_local || r.numero || "-"}</TableCell>
                  <TableCell className="py-2">{r.desde || "-"}</TableCell>
                  <TableCell className="py-2">{r.hasta || "-"}</TableCell>
                  <TableCell className="py-2">{r.tipo_material || r.material || "-"}</TableCell>
                  <TableCell className="py-2">{r.tipo_transporte || "-"}</TableCell>
                  <TableCell className="py-2">{r.maquinaria_id ? maqMap[r.maquinaria_id] || "-" : "-"}</TableCell>
                  <TableCell className="py-2">{r.patente_tercero || "-"}</TableCell>
                  <TableCell className="py-2">{r.cliente || "-"}</TableCell>
                  <TableCell className="py-2">{(r as any).cliente_destino || "-"}</TableCell>
                  <TableCell className="py-2 text-right">{r.cantidad_viajes || 0}</TableCell>
                  <TableCell className="py-2 text-right">{r.cantidad_uni ?? "-"}</TableCell>
                  <TableCell className="py-2 text-right">{r.cantidad || 0}</TableCell>
                  <TableCell className="py-2">{r.unidad || "M3"}</TableCell>
                  <TableCell className="py-2 text-right">{r.precio_unitario != null ? `$${r.precio_unitario.toLocaleString("es-AR")}` : "-"}</TableCell>
                  <TableCell className="py-2 text-right">${(r.precio_total || 0).toLocaleString("es-AR")}</TableCell>
                  <TableCell className="py-2">{r.proveedor || "-"}</TableCell>
                  <TableCell className="py-2">{(() => {
                    const fp = (r as any).forma_pago;
                    if (!fp) return "-";
                    if (fp === "cuenta_corriente") return "Cta. Corriente";
                    return fp.charAt(0).toUpperCase() + fp.slice(1);
                  })()}</TableCell>
                  <TableCell className="py-2 truncate max-w-[130px]">{r.observaciones || "-"}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
