import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import { RemitoWithRelations } from "@/hooks/useRemitos";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface LiquidacionClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remitos: RemitoWithRelations[];
}

interface TipoResumen {
  tipo: string;
  viajes: number;
  cantidad: number;
  unidad: string;
  precioTotal: number;
}

export function LiquidacionClienteDialog({
  open,
  onOpenChange,
  remitos,
}: LiquidacionClienteDialogProps) {
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Get unique clients from remitos (both cliente and cliente_destino)
  const clientesUnicos = useMemo(() => {
    const set = new Set<string>();
    remitos.forEach((r) => {
      if (r.cliente) set.add(r.cliente);
      if (r.cliente_destino) set.add(r.cliente_destino);
    });
    return [...set].sort();
  }, [remitos]);

  // Get remitos for selected client
  const remitosCliente = useMemo(() => {
    if (!selectedCliente) return [];
    return remitos.filter(
      (r) => r.cliente === selectedCliente || r.cliente_destino === selectedCliente
    );
  }, [remitos, selectedCliente]);

  // Get unique types for this client
  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    remitosCliente.forEach((r) => {
      if (r.tipo_material) set.add(r.tipo_material);
    });
    return [...set].sort();
  }, [remitosCliente]);

  // Initialize selectedTypes when client changes
  useMemo(() => {
    if (tiposUnicos.length > 0 && !initialized) {
      setSelectedTypes(new Set(tiposUnicos));
      setInitialized(true);
    }
  }, [tiposUnicos, initialized]);

  // Reset when client changes
  const handleClienteChange = (value: string) => {
    setSelectedCliente(value);
    setInitialized(false);
    setSelectedTypes(new Set());
  };

  // When tipos change, auto-select all
  useMemo(() => {
    if (!initialized && tiposUnicos.length > 0) {
      setSelectedTypes(new Set(tiposUnicos));
      setInitialized(true);
    }
  }, [tiposUnicos, initialized]);

  const toggleType = (tipo: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  };

  const selectAllTypes = () => setSelectedTypes(new Set(tiposUnicos));
  const deselectAllTypes = () => setSelectedTypes(new Set());

  // Calculate summary grouped by tipo_material
  const resumen: TipoResumen[] = useMemo(() => {
    const map: Record<string, TipoResumen> = {};

    remitosCliente
      .filter((r) => r.tipo_material && selectedTypes.has(r.tipo_material))
      .forEach((r) => {
        const tipo = r.tipo_material!;
        if (!map[tipo]) {
          map[tipo] = { tipo, viajes: 0, cantidad: 0, unidad: r.unidad || "M3", precioTotal: 0 };
        }
        map[tipo].viajes += r.cantidad_viajes || 1;
        map[tipo].cantidad += r.cantidad || 0;
        map[tipo].precioTotal += r.precio_total || 0;
      });

    return Object.values(map).sort((a, b) => a.tipo.localeCompare(b.tipo));
  }, [remitosCliente, selectedTypes]);

  const totales = useMemo(
    () => ({
      viajes: resumen.reduce((s, r) => s + r.viajes, 0),
      cantidad: resumen.reduce((s, r) => s + r.cantidad, 0),
      precioTotal: resumen.reduce((s, r) => s + r.precioTotal, 0),
    }),
    [resumen]
  );

  const exportarExcel = () => {
    if (resumen.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const wb = XLSX.utils.book_new();
    const data = resumen.map((r) => ({
      "Tipo Material": r.tipo,
      Viajes: r.viajes,
      Cantidad: r.cantidad,
      Unidad: r.unidad,
      "Precio Total": r.precioTotal,
    }));
    data.push({
      "Tipo Material": "TOTAL",
      Viajes: totales.viajes,
      Cantidad: totales.cantidad,
      Unidad: "",
      "Precio Total": totales.precioTotal,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length, 14),
    }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Liquidación");
    const fileName = `Liquidacion_${selectedCliente.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Excel exportado");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Liquidación por Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Cliente
            </label>
            <Select value={selectedCliente} onValueChange={handleClienteChange}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientesUnicos.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type checkboxes */}
          {selectedCliente && tiposUnicos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Tipos de material a incluir
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllTypes}>
                    Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllTypes}>
                    Ninguno
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {tiposUnicos.map((tipo) => (
                  <label
                    key={tipo}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTypes.has(tipo)}
                      onCheckedChange={() => toggleType(tipo)}
                    />
                    {tipo}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Summary table */}
          {selectedCliente && resumen.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo Material</TableHead>
                      <TableHead className="text-center">Viajes</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-center">Unidad</TableHead>
                      <TableHead className="text-right">Precio Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.map((r) => (
                      <TableRow key={r.tipo}>
                        <TableCell className="font-medium">{r.tipo}</TableCell>
                        <TableCell className="text-center">{r.viajes}</TableCell>
                        <TableCell className="text-center">
                          {r.cantidad.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-center">{r.unidad}</TableCell>
                        <TableCell className="text-right">
                          ${r.precioTotal.toLocaleString("es-AR")}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-center">{totales.viajes}</TableCell>
                      <TableCell className="text-center">
                        {totales.cantidad.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        ${totales.precioTotal.toLocaleString("es-AR")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button onClick={exportarExcel} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </Button>
              </div>
            </>
          )}

          {selectedCliente && remitosCliente.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay remitos para este cliente en el período seleccionado.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
