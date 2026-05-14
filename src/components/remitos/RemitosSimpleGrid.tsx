import { useMemo, useRef, useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import { RemitoWithRelations } from "@/hooks/useRemitos";
import { ObraWithRelations } from "@/hooks/useObras";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface RemitosSimpleGridProps {
  remitos: RemitoWithRelations[];
  obras: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  onEdit: (remito: RemitoWithRelations) => void;
  onDelete: (id: string) => void;
  creadoresMap?: Record<string, string>;
  /** Si true, habilita drag & drop. */
  reorderEnabled?: boolean;
  /** Reasignar orden persistido en DB. */
  onReorder?: (id: string, newOrden: number) => Promise<boolean> | void;
}

interface RowProps {
  r: RemitoWithRelations;
  maqMap: Record<string, string>;
  creadoresMap?: Record<string, string>;
  onEdit: (r: RemitoWithRelations) => void;
  onDelete: (id: string) => void;
  reorderEnabled: boolean;
}

function SortableRow({ r, maqMap, creadoresMap, onEdit, onDelete, reorderEnabled }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: r.id,
    disabled: !reorderEnabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="text-xs">
      <TableCell className="py-2 w-[30px] px-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={!reorderEnabled}
          className={`flex items-center justify-center h-7 w-6 rounded ${
            reorderEnabled
              ? "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted"
              : "cursor-not-allowed text-muted-foreground/30"
          }`}
          title={reorderEnabled ? "Arrastrar para reordenar" : "Quitá los filtros y la búsqueda para reordenar"}
          aria-label="Reordenar fila"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="py-2">{r.fecha}</TableCell>
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
  reorderEnabled = false,
  onReorder,
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => remitos.map((r) => r.id), [remitos]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!reorderEnabled || !onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = remitos.findIndex((r) => r.id === active.id);
    const newIndex = remitos.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    // Build new array order to find neighbours of the dropped item
    const reordered = [...remitos];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // List is sorted DESC by `orden`, so neighbour above has HIGHER orden, below has LOWER
    const above = reordered[newIndex - 1];
    const below = reordered[newIndex + 1];

    const fallbackOrden = (r?: RemitoWithRelations) =>
      r?.orden != null ? Number(r.orden) : new Date(r?.created_at || Date.now()).getTime() / 1000;

    let newOrden: number;
    if (above && below) {
      newOrden = (fallbackOrden(above) + fallbackOrden(below)) / 2;
    } else if (above) {
      newOrden = fallbackOrden(above) - 1;
    } else if (below) {
      newOrden = fallbackOrden(below) + 1;
    } else {
      newOrden = Date.now() / 1000;
    }

    await onReorder(String(active.id), newOrden);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-muted-foreground">
        {remitos.length} remitos · {totalViajes} viajes · ${totalPrecio.toLocaleString("es-AR")}
        {!reorderEnabled && onReorder && (
          <span className="ml-2 italic">
            (Quitá los filtros y la búsqueda para poder reordenar arrastrando)
          </span>
        )}
      </div>

      <div
        className="overflow-auto border rounded-md"
        style={{ height: "calc(100vh - 360px)", minHeight: "400px" }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-muted shadow-sm">
              <TableRow className="bg-muted/95 hover:bg-muted/95">
                <TableHead className="text-xs w-[30px] px-1"></TableHead>
                <TableHead className="text-xs min-w-[90px]">Fecha</TableHead>
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
                {creadoresMap && <TableHead className="text-xs min-w-[140px]">Cargado por</TableHead>}
                <TableHead className="text-xs w-[80px] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remitos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={creadoresMap ? 23 : 22} className="text-center text-muted-foreground py-8">
                    No hay remitos para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  {remitos.map((r) => (
                    <SortableRow
                      key={r.id}
                      r={r}
                      maqMap={maqMap}
                      creadoresMap={creadoresMap}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      reorderEnabled={reorderEnabled}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
}
