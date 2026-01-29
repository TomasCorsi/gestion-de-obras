import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Loader2, 
  Eye, 
  Clock, 
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useParteDiarioAdmin, type ParteDiarioAdminFilters } from "@/hooks/useParteDiarioAdmin";
import { usePersonal } from "@/hooks/usePersonal";
import { useObras } from "@/hooks/useObras";
import { ParteDiarioAdminFilters as FilterComponent } from "./ParteDiarioAdminFilters";
import { ParteDiarioDetailDialog } from "./ParteDiarioDetailDialog";
import type { ParteDiario } from "@/hooks/useParteDiario";

const ROL_LABELS: Record<string, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
};

interface ParteDiarioAdminViewProps {
  onBack?: () => void;
}

export const ParteDiarioAdminView = ({ onBack }: ParteDiarioAdminViewProps) => {
  const [filters, setFilters] = useState<ParteDiarioAdminFilters>({});
  const [selectedParte, setSelectedParte] = useState<ParteDiario | null>(null);
  
  const { partes, isLoading } = useParteDiarioAdmin(filters);
  const { personal = [] } = usePersonal();
  const { obras = [] } = useObras();

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  const getEmpleadoNombre = (parte: ParteDiario) => {
    if (!parte.personal) return "Sin asignar";
    const { nombre, apellido } = parte.personal;
    return [nombre, apellido].filter(Boolean).join(" ") || "Sin nombre";
  };

  const getEmpleadoRol = (parte: ParteDiario) => {
    if (!parte.personal) return "";
    return ROL_LABELS[parte.personal.rol] || parte.personal.rol;
  };

  const getMaquinariaLabel = (parte: ParteDiario) => {
    if (!parte.maquinarias) return "-";
    const { codigo, tipo, patente } = parte.maquinarias;
    return codigo || tipo + (patente ? ` (${patente})` : "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Partes Diarios - Todos los Empleados</CardTitle>
              </div>
            </div>
            <FilterComponent
              filters={filters}
              onFiltersChange={setFilters}
              empleados={personal}
              obras={obras}
            />
          </div>
        </CardHeader>
        <CardContent>
          {partes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay partes diarios que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partes.map((parte) => (
                    <TableRow 
                      key={parte.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedParte(parte)}
                    >
                      <TableCell className="font-medium">
                        {format(parseISO(parte.fecha), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{getEmpleadoNombre(parte)}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {getEmpleadoRol(parte)}
                        </span>
                      </TableCell>
                      <TableCell>{parte.obras?.nombre || "-"}</TableCell>
                      <TableCell>{getMaquinariaLabel(parte)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {formatTime(parte.hora_entrada)} - {formatTime(parte.hora_salida)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            parte.estado === "borrador"
                              ? "border-amber-500 text-amber-600 bg-amber-500/10"
                              : "bg-green-500/10 text-green-600 border-green-500/30"
                          )}
                        >
                          {parte.estado === "borrador" ? (
                            <><AlertCircle className="w-3 h-3 mr-1" /> Borrador</>
                          ) : (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Completado</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedParte(parte);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {partes.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Mostrando {partes.length} parte{partes.length !== 1 ? 's' : ''} diario{partes.length !== 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      <ParteDiarioDetailDialog
        parte={selectedParte}
        open={!!selectedParte}
        onOpenChange={(open) => !open && setSelectedParte(null)}
        showEmpleado
      />
    </>
  );
};
