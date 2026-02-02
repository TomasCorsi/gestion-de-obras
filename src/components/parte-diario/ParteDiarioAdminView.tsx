import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { 
  Loader2, 
  Eye, 
  Clock, 
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowLeft,
  BarChart3,
  List,
  Trash2,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ParteDiarioRendimientoTab } from "./ParteDiarioRendimientoTab";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
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
  const [parteToDelete, setParteToDelete] = useState<ParteDiario | null>(null);
  const [activeTab, setActiveTab] = useState<string>("listado");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { partes, isLoading, deleteParte, isDeleting } = useParteDiarioAdmin(filters);
  const { personal = [] } = usePersonal();
  const { obras = [] } = useObras();

  // Filter partes by search term (employee name)
  const filteredPartes = useMemo(() => {
    if (!searchTerm.trim()) return partes;
    const term = searchTerm.toLowerCase();
    return partes.filter((parte) => {
      const nombre = parte.personal?.nombre?.toLowerCase() || "";
      const apellido = parte.personal?.apellido?.toLowerCase() || "";
      return nombre.includes(term) || apellido.includes(term) || `${nombre} ${apellido}`.includes(term);
    });
  }, [partes, searchTerm]);

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

  if (isLoading && activeTab === "listado") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Partes Diarios - Todos los Empleados</h2>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="listado" className="gap-2">
              <List className="h-4 w-4" />
              Listado
            </TabsTrigger>
            <TabsTrigger value="rendimiento" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Rendimiento
            </TabsTrigger>
          </TabsList>

          {/* Listado Tab */}
          <TabsContent value="listado" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">Listado de Partes</CardTitle>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <FilterComponent
                      filters={filters}
                      onFiltersChange={setFilters}
                      empleados={personal}
                      obras={obras}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPartes.length === 0 ? (
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
                        {filteredPartes.map((parte) => (
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
                                    ? "border-chart-3 text-chart-3 bg-chart-3/10"
                                    : "bg-chart-1/10 text-chart-1 border-chart-1/30"
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
                              <div className="flex items-center gap-1">
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setParteToDelete(parte);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {filteredPartes.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Mostrando {filteredPartes.length} parte{filteredPartes.length !== 1 ? 's' : ''} diario{filteredPartes.length !== 1 ? 's' : ''}
                    {searchTerm && ` (filtrado de ${partes.length})`}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rendimiento Tab */}
          <TabsContent value="rendimiento" className="mt-4">
            <ParteDiarioRendimientoTab personal={personal} />
          </TabsContent>
        </Tabs>
      </div>

      <ParteDiarioDetailDialog
        parte={selectedParte}
        open={!!selectedParte}
        onOpenChange={(open) => !open && setSelectedParte(null)}
        showEmpleado
        personalList={personal}
      />

      <DeleteConfirmDialog
        open={!!parteToDelete}
        onOpenChange={(open) => !open && setParteToDelete(null)}
        onConfirm={async () => {
          if (parteToDelete) {
            await deleteParte(parteToDelete.id);
            setParteToDelete(null);
          }
        }}
        title="¿Eliminar parte diario?"
        description={parteToDelete ? 
          `Se eliminará permanentemente el parte de ${parteToDelete.personal?.nombre || ''} ${parteToDelete.personal?.apellido || ''} del ${format(parseISO(parteToDelete.fecha), "dd/MM/yyyy")}.` 
          : "Esta acción no se puede deshacer."
        }
      />
    </>
  );
};
