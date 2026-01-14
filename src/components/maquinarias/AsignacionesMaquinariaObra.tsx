import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Truck, 
  DollarSign, 
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsignacionesMaquinaria, AsignacionMaquinariaForm } from "@/hooks/useAsignacionesMaquinaria";
import { useHorasMaquina } from "@/hooks/useHorasMaquina";
import { useMaquinarias, TipoMaquinaria } from "@/hooks/useMaquinarias";
import { useObras } from "@/hooks/useObras";
import { cn } from "@/lib/utils";

const tiposConfig: Record<TipoMaquinaria, { label: string; color: string }> = {
  cargadora: { label: "Cargadora", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  compactador: { label: "Compactador", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  retroexcavadora: { label: "Retro", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  minicargadora: { label: "Minicargadora", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  motoniveladora: { label: "Motonivel.", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  topador: { label: "Topador", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  pala_retro: { label: "Pala Retro", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  batea: { label: "Batea", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  acoplado: { label: "Acoplado", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  camion: { label: "Camión", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  carreton: { label: "Carretón", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  cisterna: { label: "Cisterna", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  tanque_cisterna: { label: "Tanque Cist.", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  tanque_regador_tractor: { label: "Tanque Reg.", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  soplador: { label: "Soplador", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  zanjeadora: { label: "Zanjeadora", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  rastra: { label: "Rastra", color: "bg-lime-500/20 text-lime-400 border-lime-500/30" },
  tractor: { label: "Tractor", color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30" },
  rastra_grosspal: { label: "Rastra Grosspal", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  auto: { label: "Auto", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
  camioneta: { label: "Camioneta", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function AsignacionesMaquinariaObra() {
  const { asignaciones, asignacionesPorObra, loading, createAsignacion, updateAsignacion, deleteAsignacion } = useAsignacionesMaquinaria();
  const { horasMaquina, getHorasPorObraYMaquinaria } = useHorasMaquina();
  const { maquinarias } = useMaquinarias();
  const { obras } = useObras();
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<string | null>(null);
  const [formData, setFormData] = useState<AsignacionMaquinariaForm>({
    obra_id: "",
    maquinaria_id: "",
    costo_hora: 0,
    activa: true,
  });

  const obrasActivas = obras.filter(o => o.estado === "activa" || o.estado === "pendiente");
  
  // Get maquinarias that are not already assigned to the selected obra
  const maquinariasDisponibles = maquinarias.filter(m => {
    if (!formData.obra_id) return true;
    // When editing, include the current maquinaria
    if (isEditing) {
      const currentAsig = asignaciones.find(a => a.id === selectedAsignacion);
      if (currentAsig && currentAsig.maquinaria_id === m.id) return true;
    }
    // Exclude maquinarias already assigned to this obra
    return !asignaciones.some(a => a.obra_id === formData.obra_id && a.maquinaria_id === m.id);
  });

  const handleNew = () => {
    setIsEditing(false);
    setSelectedAsignacion(null);
    setFormData({
      obra_id: "",
      maquinaria_id: "",
      costo_hora: 0,
      activa: true,
    });
    setFormOpen(true);
  };

  const handleEdit = (asignacion: any) => {
    setIsEditing(true);
    setSelectedAsignacion(asignacion.id);
    setFormData({
      obra_id: asignacion.obra_id,
      maquinaria_id: asignacion.maquinaria_id,
      costo_hora: asignacion.costo_hora,
      activa: asignacion.activa,
      observaciones: asignacion.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteAsignacion(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedAsignacion) {
      await updateAsignacion(selectedAsignacion, formData);
    } else {
      await createAsignacion(formData);
    }
    setFormOpen(false);
  };

  // Calculate total cost of machine hours across all obras
  const calcularCostoTotalHoras = () => {
    return asignaciones.reduce((total, asig) => {
      const horas = getHorasPorObraYMaquinaria(asig.obra_id, asig.maquinaria_id);
      return total + (horas * asig.costo_hora);
    }, 0);
  };

  // Calculate cost for a specific obra
  const calcularCostoObra = (obraId: string) => {
    const asigObra = asignaciones.filter(a => a.obra_id === obraId);
    return asigObra.reduce((total, asig) => {
      const horas = getHorasPorObraYMaquinaria(asig.obra_id, asig.maquinaria_id);
      return total + (horas * asig.costo_hora);
    }, 0);
  };

  // Count machines by type
  const maquinariasPorTipo = maquinarias.reduce((acc, maq) => {
    acc[maq.tipo] = (acc[maq.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count assignments by type
  const asignacionesPorTipo = asignaciones.reduce((acc, asig) => {
    if (asig.maquinaria?.tipo) {
      acc[asig.maquinaria.tipo] = (acc[asig.maquinaria.tipo] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats by Machine Type */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Object.entries(tiposConfig).slice(0, 8).map(([key, config]) => {
          const total = maquinariasPorTipo[key] || 0;
          const asignados = asignacionesPorTipo[key] || 0;
          if (total === 0) return null;
          return (
            <div key={key} className="card-industrial p-3 text-center">
              <p className="text-xl font-bold text-foreground">{total}</p>
              <Badge className={cn("status-badge text-[10px] mt-1", config.color)}>
                {config.label}
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-1">
                {asignados > 0 ? `${asignados} asignadas` : "disponibles"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Card */}
      <Card className="card-industrial">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Asignación de Maquinarias a Obras</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gestión de costos por hora de maquinaria
              </p>
            </div>
          </div>
          <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 btn-industrial">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Asignación
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Card */}
          <div className="p-4 rounded-lg bg-accent/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">Total Costo Horas Máquina:</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(calcularCostoTotalHoras())}
              </span>
            </div>
          </div>

          {/* Assignments by Obra */}
          {Object.entries(asignacionesPorObra).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay asignaciones de maquinaria registradas
            </div>
          ) : (
            Object.entries(asignacionesPorObra).map(([obraId, data]) => {
              const costoObra = calcularCostoObra(obraId);
              return (
                <div key={obraId} className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">{data.obra?.nombre || "Obra sin nombre"}</span>
                      <Badge variant="outline" className="text-xs">
                        {data.asignaciones.length} máquinas
                      </Badge>
                    </div>
                    <span className="font-semibold text-primary">
                      {formatCurrency(costoObra)}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Maquinaria</TableHead>
                        <TableHead className="text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-muted-foreground text-right">Costo/Hora</TableHead>
                        <TableHead className="text-muted-foreground text-right">Horas</TableHead>
                        <TableHead className="text-muted-foreground text-right">Total</TableHead>
                        <TableHead className="text-muted-foreground">Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.asignaciones.map((asig) => {
                        const horas = getHorasPorObraYMaquinaria(asig.obra_id, asig.maquinaria_id);
                        const totalAsig = horas * asig.costo_hora;
                        return (
                          <TableRow key={asig.id} className="border-border">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {asig.maquinaria?.codigo || "-"}
                                </span>
                                <span className="text-muted-foreground">
                                  {asig.maquinaria?.nombre || ""}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                "status-badge text-xs",
                                tiposConfig[asig.maquinaria?.tipo as TipoMaquinaria]?.color
                              )}>
                                {tiposConfig[asig.maquinaria?.tipo as TipoMaquinaria]?.label || asig.maquinaria?.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(asig.costo_hora)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>{horas.toFixed(1)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(totalAsig)}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                "status-badge",
                                asig.activa ? "status-active" : "status-inactive"
                              )}>
                                {asig.activa ? "Activa" : "Inactiva"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover border-border">
                                  <DropdownMenuItem onClick={() => handleEdit(asig)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(asig.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Asignación" : "Nueva Asignación de Maquinaria"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select
                value={formData.obra_id}
                onValueChange={(value) => setFormData({ ...formData, obra_id: value, maquinaria_id: "" })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {obrasActivas.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>
                      {obra.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Maquinaria</Label>
              <Select
                value={formData.maquinaria_id}
                onValueChange={(value) => setFormData({ ...formData, maquinaria_id: value })}
                disabled={!formData.obra_id}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar maquinaria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-[300px]">
                  {maquinariasDisponibles
                    .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
                    .map((maq) => (
                      <SelectItem key={maq.id} value={maq.id}>
                        {maq.codigo} - {tiposConfig[maq.tipo]?.label || maq.tipo}
                        {maq.nombre ? ` (${maq.nombre})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Costo por Hora ($)</Label>
              <Input
                type="number"
                value={formData.costo_hora}
                onChange={(e) => setFormData({ ...formData, costo_hora: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
                min="0"
                step="100"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Asignación Activa</Label>
              <Switch
                checked={formData.activa}
                onCheckedChange={(checked) => setFormData({ ...formData, activa: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {isEditing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
