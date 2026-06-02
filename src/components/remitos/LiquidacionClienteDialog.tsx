import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Download, FileText, Search } from "lucide-react";
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

type TipoCliente = "cliente_destino" | "cliente_cantera" | "cliente_o_destino";

const TIPO_LABELS: Record<TipoCliente, string> = {
  cliente_o_destino: "Cliente / Cliente destino",
  cliente_destino: "Cliente destino",
  cliente_cantera: "Cliente cantera",
};

export function LiquidacionClienteDialog({
  open,
  onOpenChange,
  remitos,
}: LiquidacionClienteDialogProps) {
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("cliente_o_destino");
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  const [searchCliente, setSearchCliente] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [typesInitialized, setTypesInitialized] = useState(false);

  // Get unique clients based on tipoCliente
  const clientesUnicos = useMemo(() => {
    const set = new Set<string>();
    remitos.forEach((r) => {
      if (tipoCliente === "cliente_o_destino") {
        if (r.cliente) set.add(r.cliente);
        if (r.cliente_destino) set.add(r.cliente_destino);
      } else if (tipoCliente === "cliente_destino") {
        if (r.cliente_destino) set.add(r.cliente_destino);
      } else if (tipoCliente === "cliente_cantera") {
        if (r.cliente_cantera) set.add(r.cliente_cantera);
      }
    });
    return [...set].sort();
  }, [remitos, tipoCliente]);

  const filteredClientes = useMemo(() => {
    const q = searchCliente.trim().toLowerCase();
    if (!q) return clientesUnicos;
    return clientesUnicos.filter((c) => c.toLowerCase().includes(q));
  }, [clientesUnicos, searchCliente]);

  // Get remitos for selected clients based on tipoCliente
  const remitosCliente = useMemo(() => {
    if (selectedClientes.size === 0) return [];
    return remitos.filter((r) => {
      if (tipoCliente === "cliente_o_destino") {
        return (
          (r.cliente && selectedClientes.has(r.cliente)) ||
          (r.cliente_destino && selectedClientes.has(r.cliente_destino))
        );
      }
      if (tipoCliente === "cliente_destino")
        return !!r.cliente_destino && selectedClientes.has(r.cliente_destino);
      if (tipoCliente === "cliente_cantera")
        return !!r.cliente_cantera && selectedClientes.has(r.cliente_cantera);
      return false;
    });
  }, [remitos, selectedClientes, tipoCliente]);

  // Get unique types for selected clients
  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    remitosCliente.forEach((r) => {
      if (r.tipo_material) set.add(r.tipo_material);
    });
    return [...set].sort();
  }, [remitosCliente]);

  // Initialize selectedTypes when client selection changes
  useEffect(() => {
    if (tiposUnicos.length > 0 && !typesInitialized) {
      setSelectedTypes(new Set(tiposUnicos));
      setTypesInitialized(true);
    }
  }, [tiposUnicos, typesInitialized]);

  const handleTipoClienteChange = (value: TipoCliente) => {
    setTipoCliente(value);
    setSelectedClientes(new Set());
    setSearchCliente("");
    setTypesInitialized(false);
    setSelectedTypes(new Set());
  };

  const toggleCliente = (cliente: string) => {
    setSelectedClientes((prev) => {
      const next = new Set(prev);
      if (next.has(cliente)) next.delete(cliente);
      else next.add(cliente);
      return next;
    });
    setTypesInitialized(false);
  };

  const selectAllClientes = () => {
    setSelectedClientes(new Set(filteredClientes));
    setTypesInitialized(false);
  };
  const deselectAllClientes = () => {
    setSelectedClientes(new Set());
    setTypesInitialized(false);
    setSelectedTypes(new Set());
  };

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

    // ---------- Hoja 1: Liquidación (desglose por cliente) ----------
    const clientesOrdenados = [...selectedClientes].sort((a, b) => a.localeCompare(b));

    const matchCliente = (r: RemitoWithRelations, cliente: string) => {
      if (tipoCliente === "cliente_o_destino") {
        return r.cliente === cliente || r.cliente_destino === cliente;
      }
      if (tipoCliente === "cliente_destino") return r.cliente_destino === cliente;
      if (tipoCliente === "cliente_cantera") return r.cliente_cantera === cliente;
      return false;
    };

    type ClienteResumen = {
      cliente: string;
      tipos: TipoResumen[];
      viajes: number;
      cantidad: number;
      precioTotal: number;
    };

    const resumenPorCliente: ClienteResumen[] = clientesOrdenados
      .map((cliente) => {
        const map: Record<string, TipoResumen> = {};
        remitosCliente
          .filter(
            (r) =>
              matchCliente(r, cliente) &&
              r.tipo_material &&
              selectedTypes.has(r.tipo_material)
          )
          .forEach((r) => {
            const tipo = r.tipo_material!;
            if (!map[tipo]) {
              map[tipo] = {
                tipo,
                viajes: 0,
                cantidad: 0,
                unidad: r.unidad || "M3",
                precioTotal: 0,
              };
            }
            map[tipo].viajes += r.cantidad_viajes || 1;
            map[tipo].cantidad += r.cantidad || 0;
            map[tipo].precioTotal += r.precio_total || 0;
          });
        const tipos = Object.values(map).sort((a, b) => a.tipo.localeCompare(b.tipo));
        return {
          cliente,
          tipos,
          viajes: tipos.reduce((s, t) => s + t.viajes, 0),
          cantidad: tipos.reduce((s, t) => s + t.cantidad, 0),
          precioTotal: tipos.reduce((s, t) => s + t.precioTotal, 0),
        };
      })
      .filter((c) => c.tipos.length > 0);

    const aoa: (string | number)[][] = [];
    resumenPorCliente.forEach((c) => {
      aoa.push([`Cliente: ${c.cliente}`, "", "", "", ""]);
      aoa.push(["Tipo Material", "Viajes", "Cantidad", "Unidad", "Precio Total"]);
      c.tipos.forEach((t) => {
        aoa.push([t.tipo, t.viajes, t.cantidad, t.unidad, t.precioTotal]);
      });
      const unidadesUnicas = new Set(c.tipos.map((t) => t.unidad));
      const unidadSubtotal = unidadesUnicas.size === 1 ? [...unidadesUnicas][0] : "";
      aoa.push([`Subtotal ${c.cliente}`, c.viajes, c.cantidad, unidadSubtotal, c.precioTotal]);
      aoa.push(["", "", "", "", ""]);
    });
    const totalGeneral = {
      viajes: resumenPorCliente.reduce((s, c) => s + c.viajes, 0),
      cantidad: resumenPorCliente.reduce((s, c) => s + c.cantidad, 0),
      precioTotal: resumenPorCliente.reduce((s, c) => s + c.precioTotal, 0),
    };
    aoa.push([
      "TOTAL GENERAL",
      totalGeneral.viajes,
      totalGeneral.cantidad,
      "",
      totalGeneral.precioTotal,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Liquidación");

    // ---------- Hoja 2: Liquidación General ----------
    const aoaGeneral: (string | number)[][] = [["Cliente", "Precio Total"]];
    resumenPorCliente.forEach((c) => {
      aoaGeneral.push([c.cliente, c.precioTotal]);
    });
    aoaGeneral.push(["TOTAL", totalGeneral.precioTotal]);
    const wsGeneral = XLSX.utils.aoa_to_sheet(aoaGeneral);
    wsGeneral["!cols"] = [{ wch: 30 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsGeneral, "Liquidación General");

    // ---------- Hoja 3: Detalle Remitos ----------
    const detalleRemitos = remitosCliente
      .filter((r) => r.tipo_material && selectedTypes.has(r.tipo_material))
      .sort((a, b) => {
        const f = (a.fecha || "").localeCompare(b.fecha || "");
        if (f !== 0) return f;
        return (a.numero || "").localeCompare(b.numero || "");
      });

    const fmtFecha = (f: string | null) => {
      if (!f) return "";
      try {
        return format(parseISO(f), "dd/MM/yyyy");
      } catch {
        return f;
      }
    };

    const detalleData = detalleRemitos.map((r) => ({
      Fecha: fmtFecha(r.fecha),
      "N° Remito": r.numero || "",
      "Remito Tercero": r.remito_tercero || "",
      Cliente: r.cliente || "",
      "Cliente Destino": r.cliente_destino || "",
      "Cliente Cantera": r.cliente_cantera || "",
      Desde: r.desde || "",
      Hasta: r.hasta || "",
      "Tipo Material": r.tipo_material || "",
      Viajes: r.cantidad_viajes || 0,
      Cantidad: r.cantidad || 0,
      Unidad: r.unidad || "",
      "Precio Unitario": r.precio_unitario || 0,
      "Precio Total": r.precio_total || 0,
      Transporte: r.tipo_transporte || "",
      Patente: r.maquinaria?.patente || r.patente_tercero || "",
      Observaciones: r.observaciones || "",
    }));

    if (detalleData.length > 0) {
      const wsDetalle = XLSX.utils.json_to_sheet(detalleData);
      wsDetalle["!cols"] = Object.keys(detalleData[0]).map((key) => ({
        wch: Math.max(key.length, 14),
      }));
      XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Remitos");
    }

    const prefijo =
      tipoCliente === "cliente_cantera"
        ? "Liquidacion_Cantera"
        : tipoCliente === "cliente_destino"
        ? "Liquidacion_Destino"
        : "Liquidacion";
    const clientesArr = [...selectedClientes];
    const sufijo =
      clientesArr.length === 1
        ? clientesArr[0].replace(/\s/g, "_")
        : `${clientesArr.length}_clientes`;
    const fileName = `${prefijo}_${sufijo}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Excel exportado");
  };

  const hasSelection = selectedClientes.size > 0;

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
          {/* Tipo de cliente selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Liquidar por
            </label>
            <Select value={tipoCliente} onValueChange={(v) => handleTipoClienteChange(v as TipoCliente)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente_o_destino">{TIPO_LABELS.cliente_o_destino}</SelectItem>
                <SelectItem value="cliente_destino">{TIPO_LABELS.cliente_destino}</SelectItem>
                <SelectItem value="cliente_cantera">{TIPO_LABELS.cliente_cantera}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clientes multi-select with search */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                {TIPO_LABELS[tipoCliente]}{" "}
                {selectedClientes.size > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({selectedClientes.size} seleccionados)
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllClientes} disabled={filteredClientes.length === 0}>
                  Seleccionar todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllClientes} disabled={selectedClientes.size === 0}>
                  Ninguno
                </Button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                placeholder="Buscar cliente..."
                className="pl-9 bg-card"
              />
            </div>

            <div className="rounded-md border max-h-60 overflow-y-auto bg-card">
              {filteredClientes.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  {clientesUnicos.length === 0 ? "No hay datos" : "No se encontraron clientes"}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredClientes.map((c) => (
                    <li key={c}>
                      <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40">
                        <Checkbox
                          checked={selectedClientes.has(c)}
                          onCheckedChange={() => toggleCliente(c)}
                        />
                        <span className="truncate">{c}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Type checkboxes */}
          {hasSelection && tiposUnicos.length > 0 && (
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
          {hasSelection && resumen.length > 0 && (
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

          {hasSelection && remitosCliente.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay remitos para los clientes seleccionados en el período.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
