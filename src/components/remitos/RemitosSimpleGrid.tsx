import { useMemo } from "react";
import {
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
  /** Mostrar columna Cliente Cantera (sólo Franco). */
  showClienteCantera?: boolean;
  /** Ocultar columnas Rem. Tercero, Cli. Origen, Cli. Destino y Proveedor (sólo Franco). */
  hideExtrasForFranco?: boolean;
}

interface RowProps {
  r: RemitoWithRelations;
  maqMap: Record<string, string>;
  creadoresMap?: Record<string, string>;
  showClienteCantera?: boolean;
  hideExtrasForFranco?: boolean;
  onEdit: (r: RemitoWithRelations) => void;
  onDelete: (id: string) => void;
}

function Row({ r, maqMap, creadoresMap, showClienteCantera, hideExtrasForFranco, onEdit, onDelete }: RowProps) {
  return (
    <TableRow className="text-xs">
      <TableCell className="py-2">{r.fecha}</TableCell>
      {!hideExtrasForFranco && <TableCell className="py-2">{r.remito_tercero || "-"}</TableCell>}
      <TableCell className="py-2">{r.remito_local || r.numero || "-"}</TableCell>
      <TableCell className="py-2">{r.desde || "-"}</TableCell>
      <TableCell className="py-2">{r.hasta || "-"}</TableCell>
      <TableCell className="py-2">{r.tipo_material || r.material || "-"}</TableCell>
      <TableCell className="py-2">{r.tipo_transporte || "-"}</TableCell>
      <TableCell className="py-2">{r.maquinaria_id ? maqMap[r.maquinaria_id] || "-" : "-"}</TableCell>
      <TableCell className="py-2">{r.patente_tercero || "-"}</TableCell>
      {!hideExtrasForFranco && <TableCell className="py-2">{r.cliente || "-"}</TableCell>}
      {!hideExtrasForFranco && <TableCell className="py-2">{(r as any).cliente_destino || "-"}</TableCell>}
      {showClienteCantera && (
        <TableCell className="py-2">{(r as any).cliente_cantera || "-"}</TableCell>
      )}
      <TableCell className="py-2 text-right">{r.cantidad_viajes || 0}</TableCell>
      <TableCell className="py-2 text-right">{r.cantidad_uni ?? "-"}</TableCell>
      <TableCell className="py-2 text-right">{r.cantidad || 0}</TableCell>
      <TableCell className="py-2">{r.unidad || "M3"}</TableCell>
      <TableCell className="py-2 text-right">{r.precio_unitario != null ? `$${r.precio_unitario.toLocaleString("es-AR")}` : "-"}</TableCell>
      <TableCell className="py-2 text-right">${(r.precio_total || 0).toLocaleString("es-AR")}</TableCell>
      {!hideExtrasForFranco && <TableCell className="py-2">{r.proveedor || "-"}</TableCell>}
      <TableCell className="py-2">{(() => {
        const fp = (r as any).forma_pago;
        if (!fp) return "-";
        if (fp === "cuenta_corriente") return "Cta. Corriente";
        return fp.charAt(0).toUpperCase() + fp.slice(1);
      })()}</TableCell>
      <TableCell className="py-2 truncate max-w-[130px]">{r.observaciones || "-"}</TableCell>
      {creadoresMap && (
        <TableCell className="py-2">
          {(r as any).created_by ? (creadoresMap[(r as any).created_by] || "-") : "-"}
        </TableCell>
      )}
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
  );
}

export function RemitosSimpleGrid({
  remitos,
  obras: _obras,
  maquinarias,
  onEdit,
  onDelete,
  creadoresMap,
  showClienteCantera = false,
  hideExtrasForFranco = false,
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
    <div className="flex flex-col gap-3">
      <div className="text-xs text-muted-foreground">
        {remitos.length} remitos · {totalViajes} viajes · ${totalPrecio.toLocaleString("es-AR")}
      </div>

      <div
        className="overflow-auto border rounded-md"
        style={{ height: "calc(100vh - 360px)", minHeight: "400px" }}
      >
        <table className="w-full caption-bottom text-sm border-collapse">
          <TableHeader className="sticky top-0 z-20 bg-muted shadow-sm">
            <TableRow className="bg-muted/95 hover:bg-muted/95">
              <TableHead className="text-xs min-w-[90px] bg-muted">Fecha</TableHead>
              {!hideExtrasForFranco && <TableHead className="text-xs min-w-[90px] bg-muted">Rem. Tercero</TableHead>}
              <TableHead className="text-xs min-w-[90px] bg-muted">Rem. Local</TableHead>
              <TableHead className="text-xs min-w-[140px] bg-muted">Desde</TableHead>
              <TableHead className="text-xs min-w-[140px] bg-muted">Hasta</TableHead>
              <TableHead className="text-xs min-w-[100px] bg-muted">Tipo</TableHead>
              <TableHead className="text-xs min-w-[100px] bg-muted">Transporte</TableHead>
              <TableHead className="text-xs min-w-[130px] bg-muted">Vehículo</TableHead>
              <TableHead className="text-xs min-w-[90px] bg-muted">Pat. Tercero</TableHead>
              {!hideExtrasForFranco && <TableHead className="text-xs min-w-[120px] bg-muted">Cli. Origen</TableHead>}
              {!hideExtrasForFranco && <TableHead className="text-xs min-w-[120px] bg-muted">Cli. Destino</TableHead>}
              {showClienteCantera && (
                <TableHead className="text-xs min-w-[140px] bg-muted">Cli. Cantera</TableHead>
              )}
              <TableHead className="text-xs min-w-[55px] text-right bg-muted">Viajes</TableHead>
              <TableHead className="text-xs min-w-[70px] text-right bg-muted">C. Uni.</TableHead>
              <TableHead className="text-xs min-w-[70px] text-right bg-muted">C. Total</TableHead>
              <TableHead className="text-xs min-w-[55px] bg-muted">Unidad</TableHead>
              <TableHead className="text-xs min-w-[70px] text-right bg-muted">P. Unit.</TableHead>
              <TableHead className="text-xs min-w-[80px] text-right bg-muted">P. Total</TableHead>
              {!hideExtrasForFranco && <TableHead className="text-xs min-w-[100px] bg-muted">Proveedor</TableHead>}
              <TableHead className="text-xs min-w-[110px] bg-muted">Forma Pago</TableHead>
              <TableHead className="text-xs min-w-[130px] bg-muted">Observaciones</TableHead>
              {creadoresMap && <TableHead className="text-xs min-w-[140px] bg-muted">Cargado por</TableHead>}
              <TableHead className="text-xs w-[80px] text-center bg-muted">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remitos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(creadoresMap ? 22 : 21) + (showClienteCantera ? 1 : 0) - (hideExtrasForFranco ? 4 : 0)} className="text-center text-muted-foreground py-8">
                  No hay remitos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              remitos.map((r) => (
                <Row
                  key={r.id}
                  r={r}
                  maqMap={maqMap}
                  creadoresMap={creadoresMap}
                  showClienteCantera={showClienteCantera}
                  hideExtrasForFranco={hideExtrasForFranco}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}
