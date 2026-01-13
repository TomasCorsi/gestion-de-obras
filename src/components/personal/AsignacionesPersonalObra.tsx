import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Users,
  DollarSign,
  Building2,
  Trash2,
  Edit,
} from "lucide-react";
import { useAsignacionesPersonal, AsignacionForm, AsignacionPersonalObra } from "@/hooks/useAsignacionesPersonal";
import { useObras, ObraWithRelations } from "@/hooks/useObras";
import { RolPersonal } from "@/hooks/usePersonal";
import { cn } from "@/lib/utils";

const rolesConfig: Record<RolPersonal, { label: string; color: string }> = {
  capataz: { label: "Capataz", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  maquinista: { label: "Maquinista", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  chofer: { label: "Chofer", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  administrativo: { label: "Administrativo", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  ayudante: { label: "Ayudante", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  sereno: { label: "Sereno", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  mecanico: { label: "Mecánico", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  topografo: { label: "Topógrafo", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AsignacionesPersonalObra() {
  const { asignaciones, asignacionesPorObra, loading, createAsignacion, updateAsignacion, deleteAsignacion } = useAsignacionesPersonal();
  const { obras } = useObras();
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<AsignacionPersonalObra | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<AsignacionForm>({
    obra_id: "",
    rol: "maquinista",
    cantidad: 1,
    sueldo_mensual: 0,
    observaciones: "",
  });

  // Only show active obras
  const obrasActivas = obras.filter(o => o.estado === "activa" || o.estado === "pendiente");

  const handleNew = () => {
    setIsEditing(false);
    setSelectedAsignacion(null);
    setFormData({
      obra_id: obrasActivas[0]?.id || "",
      rol: "maquinista",
      cantidad: 1,
      sueldo_mensual: 0,
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (asignacion: AsignacionPersonalObra) => {
    setIsEditing(true);
    setSelectedAsignacion(asignacion);
    setFormData({
      obra_id: asignacion.obra_id,
      rol: asignacion.rol,
      cantidad: asignacion.cantidad,
      sueldo_mensual: asignacion.sueldo_mensual,
      observaciones: asignacion.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteAsignacion(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isEditing && selectedAsignacion) {
      await updateAsignacion(selectedAsignacion.id, formData);
    } else {
      await createAsignacion(formData);
    }

    setIsSubmitting(false);
    setFormOpen(false);
  };

  // Calculate totals
  const totalGeneral = Object.values(asignacionesPorObra).reduce(
    (sum, grupo) => sum + grupo.totalSueldos,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Asignación de Personal a Obras</h2>
        </div>
        <Button
          onClick={handleNew}
          className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
          disabled={obrasActivas.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Asignación
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="card-industrial bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              <span className="text-muted-foreground">Total Sueldos Asignados:</span>
            </div>
            <span className="text-2xl font-bold text-success">{formatCurrency(totalGeneral)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Asignaciones por Obra */}
      {Object.keys(asignacionesPorObra).length === 0 ? (
        <Card className="card-industrial">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay asignaciones de personal registradas</p>
            <p className="text-sm mt-1">
              Asigna categorías de personal a tus obras para controlar los gastos de sueldos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(asignacionesPorObra).map((grupo) => (
            <Card key={grupo.obra?.id} className="card-industrial overflow-hidden">
              <CardHeader className="pb-2 bg-muted/30">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {grupo.obra?.nombre || "Obra desconocida"}
                  </div>
                  <Badge className="status-badge status-active">
                    Total: {formatCurrency(grupo.totalSueldos)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-medium">Rol</TableHead>
                      <TableHead className="text-muted-foreground font-medium text-center">Cantidad</TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">Sueldo/Mes</TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">Total</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.asignaciones.map((asig) => (
                      <TableRow key={asig.id} className="border-border">
                        <TableCell>
                          <Badge className={cn("status-badge", rolesConfig[asig.rol]?.color)}>
                            {rolesConfig[asig.rol]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {asig.cantidad}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(asig.sueldo_mensual)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCurrency(asig.costo_total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(asig)}
                            >
                              <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(asig.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isEditing ? "Editar Asignación" : "Nueva Asignación de Personal"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obra_id">Obra</Label>
              <Select
                value={formData.obra_id}
                onValueChange={(value) => setFormData({ ...formData, obra_id: value })}
                disabled={isEditing}
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
              <Label htmlFor="rol">Categoría de Personal</Label>
              <Select
                value={formData.rol}
                onValueChange={(value) => setFormData({ ...formData, rol: value as RolPersonal })}
                disabled={isEditing}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(rolesConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min={1}
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })}
                  className="bg-muted border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sueldo_mensual">Sueldo Mensual ($)</Label>
                <Input
                  id="sueldo_mensual"
                  type="number"
                  min={0}
                  value={formData.sueldo_mensual}
                  onChange={(e) => setFormData({ ...formData, sueldo_mensual: parseFloat(e.target.value) || 0 })}
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Costo Total Mensual:</span>
                <span className="text-lg font-bold text-success">
                  {formatCurrency(formData.cantidad * formData.sueldo_mensual)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90" 
                disabled={isSubmitting || !formData.obra_id}
              >
                {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Asignación"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
