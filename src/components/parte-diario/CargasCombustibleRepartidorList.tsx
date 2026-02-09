import { Pencil, Trash2, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface CargasCombustibleRepartidorListProps {
  cargas: CargaRepartidor[];
  totalLitros: number;
  onEdit: (carga: CargaRepartidor) => void;
  onDelete: (carga: CargaRepartidor) => void;
  isDeleting: boolean;
}

export function CargasCombustibleRepartidorList({
  cargas,
  totalLitros,
  onEdit,
  onDelete,
  isDeleting,
}: CargasCombustibleRepartidorListProps) {
  if (cargas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Fuel className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No hay cargas de combustible registradas</p>
          <p className="text-sm mt-1">Presione el botón para agregar una</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Fecha</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargas.map((carga) => (
                <TableRow key={carga.id}>
                  <TableCell className="text-sm">
                    {format(parseISO(carga.fecha), 'dd/MM', { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {carga.operador 
                      ? `${carga.operador.apellido || ''}, ${carga.operador.nombre?.charAt(0) || ''}.`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {carga.tipo_operador || 'interno'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {carga.maquinaria?.codigo || carga.maquinaria?.tipo || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {carga.litros}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {carga.horas || '-'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {carga.km || '-'}
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-28">
                    {carga.obra?.nombre || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(carga)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(carga)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={4} className="text-right">
                  Total:
                </TableCell>
                <TableCell className="text-right text-primary">
                  {totalLitros} L
                </TableCell>
                <TableCell colSpan={4}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
