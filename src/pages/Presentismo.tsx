import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DetailRow } from "@/components/shared/DetailRow";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { ClipboardList, Plus, Search, Eye, Pencil, Trash2, Calendar, Users, Clock } from "lucide-react";
import { presentismoData as initialData, obrasData, personalData, clientesData } from "@/data/mockData";
import { RegistroHH } from "@/types";
import { toast } from "sonner";

const estadoLabels: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
  licencia: "Licencia",
  vacaciones: "Vacaciones",
  enfermedad: "Enfermedad",
};

const estadoColors: Record<string, string> = {
  presente: "bg-green-500/20 text-green-400 border-green-500/30",
  ausente: "bg-red-500/20 text-red-400 border-red-500/30",
  licencia: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  vacaciones: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  enfermedad: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function Presentismo() {
  const [registros, setRegistros] = useState<RegistroHH[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaFilter, setFechaFilter] = useState(new Date().toISOString().split("T")[0]);
  const [obraFilter, setObraFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroHH | null>(null);
  const [formData, setFormData] = useState<Partial<RegistroHH>>({});

  // Get capataces
  const capataces = personalData.filter(p => p.rol === "capataz");
  
  // Get personal that can be registered (not admin roles)
  const personalRegistrable = personalData.filter(p => 
    ["maquinista", "chofer", "capataz"].includes(p.rol)
  );

  // Filtered registros by date first
  const registrosPorFecha = registros.filter(r => r.fecha === fechaFilter);
  
  // Then apply other filters
  const filteredRegistros = registrosPorFecha.filter((reg) => {
    const matchesSearch = reg.persona.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesObra = obraFilter === "all" || reg.obraId === obraFilter;
    const matchesEstado = estadoFilter === "all" || reg.estado === estadoFilter;
    return matchesSearch && matchesObra && matchesEstado;
  });

  // Stats for selected date
  const presentes = registrosPorFecha.filter(r => r.estado === "presente").length;
  const ausentes = registrosPorFecha.filter(r => r.estado === "ausente").length;
  const totalHH = registrosPorFecha.reduce((acc, r) => acc + r.horasTotales, 0);
  const totalHHExtra = registrosPorFecha.reduce((acc, r) => acc + r.horasExtra, 0);

  // Filtered obras based on cliente
  const filteredObras = formData.clienteId 
    ? obrasData.filter(o => o.clienteId === formData.clienteId && o.estado === "activa")
    : obrasData.filter(o => o.estado === "activa");

  // Calculate hours
  const calcularHoras = (horaEntrada: string, horaSalida: string) => {
    if (!horaEntrada || !horaSalida) return { horasNormales: 0, horasExtra: 0, horasTotales: 0 };
    
    const [entH, entM] = horaEntrada.split(":").map(Number);
    const [salH, salM] = horaSalida.split(":").map(Number);
    
    const entradaMins = entH * 60 + entM;
    const salidaMins = salH * 60 + salM;
    const totalMins = salidaMins - entradaMins - 60; // rest 1hr for lunch
    
    const horasTotales = Math.max(0, totalMins / 60);
    const horasNormales = Math.min(8, horasTotales);
    const horasExtra = Math.max(0, horasTotales - 8);
    
    return { horasNormales, horasExtra, horasTotales };
  };

  // CRUD handlers
  const handleNew = () => {
    setSelectedRegistro(null);
    setFormData({
      fecha: fechaFilter,
      personaId: "",
      persona: "",
      obraId: "",
      obra: "",
      clienteId: "",
      cliente: "",
      capatazId: "",
      capataz: "",
      horaEntrada: "07:00",
      horaSalida: "15:00",
      horasNormales: 8,
      horasExtra: 0,
      horasTotales: 8,
      tarea: "",
      estado: "presente",
    });
    setIsFormOpen(true);
  };

  const handleEdit = (registro: RegistroHH) => {
    setSelectedRegistro(registro);
    setFormData({ ...registro });
    setIsFormOpen(true);
  };

  const handleView = (registro: RegistroHH) => {
    setSelectedRegistro(registro);
    setIsDetailOpen(true);
  };

  const handleDelete = (registro: RegistroHH) => {
    setSelectedRegistro(registro);
    setIsDeleteOpen(true);
  };

  const handleSubmit = () => {
    const persona = personalData.find(p => p.id === formData.personaId);
    const obra = obrasData.find(o => o.id === formData.obraId);
    const cliente = clientesData.find(c => c.id === formData.clienteId);
    const capataz = personalData.find(p => p.id === formData.capatazId);
    
    const horas = formData.estado === "presente" 
      ? calcularHoras(formData.horaEntrada || "", formData.horaSalida || "")
      : { horasNormales: 0, horasExtra: 0, horasTotales: 0 };

    const registroData: RegistroHH = {
      ...formData,
      id: selectedRegistro?.id || String(Date.now()),
      persona: persona ? `${persona.nombre} ${persona.apellido}` : "",
      obra: obra?.nombre || "",
      cliente: cliente?.nombre || "",
      capataz: capataz ? `${capataz.nombre} ${capataz.apellido}` : "",
      ...horas,
    } as RegistroHH;

    if (selectedRegistro) {
      setRegistros(registros.map(r => r.id === selectedRegistro.id ? registroData : r));
      toast.success("Registro actualizado correctamente");
    } else {
      setRegistros([registroData, ...registros]);
      toast.success("Registro creado correctamente");
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedRegistro) {
      setRegistros(registros.filter(r => r.id !== selectedRegistro.id));
      toast.success("Registro eliminado correctamente");
    }
    setIsDeleteOpen(false);
  };

  // Update hours when times change
  const handleTimeChange = (field: "horaEntrada" | "horaSalida", value: string) => {
    const newFormData = { ...formData, [field]: value };
    const horas = calcularHoras(
      field === "horaEntrada" ? value : formData.horaEntrada || "",
      field === "horaSalida" ? value : formData.horaSalida || ""
    );
    setFormData({ ...newFormData, ...horas });
  };

  return (
    <MainLayout title="Presentismo (HH)" subtitle="Control de asistencia y horas trabajadas">
      <div className="space-y-6 animate-fade-in">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button onClick={handleNew} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Registro
          </Button>
        </div>

        {/* Date Selector and KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <Input
              type="date"
              value={fechaFilter}
              onChange={(e) => setFechaFilter(e.target.value)}
              className="border-0 p-0 h-auto text-lg font-semibold focus-visible:ring-0"
            />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4" /> Presentes
            </div>
            <div className="text-2xl font-bold text-green-400">{presentes}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Ausentes</div>
            <div className="text-2xl font-bold text-destructive">{ausentes}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" /> Total HH
            </div>
            <div className="text-2xl font-bold text-foreground">{totalHH.toFixed(1)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">HH Extra</div>
            <div className="text-2xl font-bold text-yellow-400">{totalHHExtra.toFixed(1)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar persona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={obraFilter} onValueChange={setObraFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las obras</SelectItem>
              {obrasData.filter(o => o.estado === "activa").map((obra) => (
                <SelectItem key={obra.id} value={obra.id}>{obra.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="presente">Presente</SelectItem>
              <SelectItem value="ausente">Ausente</SelectItem>
              <SelectItem value="licencia">Licencia</SelectItem>
              <SelectItem value="vacaciones">Vacaciones</SelectItem>
              <SelectItem value="enfermedad">Enfermedad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Persona</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>HH Normal</TableHead>
                <TableHead>HH Extra</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No hay registros para esta fecha
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistros.map((reg) => (
                  <TableRow key={reg.id} className="border-border">
                    <TableCell className="font-medium">{reg.persona}</TableCell>
                    <TableCell>{reg.obra}</TableCell>
                    <TableCell className="text-muted-foreground">{reg.cliente}</TableCell>
                    <TableCell>
                      <Badge className={estadoColors[reg.estado]}>
                        {estadoLabels[reg.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell>{reg.horaEntrada || "-"}</TableCell>
                    <TableCell>{reg.horaSalida || "-"}</TableCell>
                    <TableCell>{reg.horasNormales}</TableCell>
                    <TableCell className={reg.horasExtra > 0 ? "text-yellow-400 font-medium" : ""}>
                      {reg.horasExtra}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{reg.tarea || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(reg)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(reg)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(reg)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Form Dialog */}
        <FormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title={selectedRegistro ? "Editar Registro" : "Nuevo Registro de Asistencia"}
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formData.fecha || ""}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(v) => setFormData({ ...formData, estado: v as RegistroHH["estado"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presente">Presente</SelectItem>
                  <SelectItem value="ausente">Ausente</SelectItem>
                  <SelectItem value="licencia">Licencia</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="enfermedad">Enfermedad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Persona</Label>
              <Select
                value={formData.personaId}
                onValueChange={(v) => setFormData({ ...formData, personaId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
                <SelectContent>
                  {personalRegistrable.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.apellido} - {p.rol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formData.clienteId}
                onValueChange={(v) => {
                  const cliente = clientesData.find(c => c.id === v);
                  setFormData({ 
                    ...formData, 
                    clienteId: v,
                    cliente: cliente?.nombre || "",
                    obraId: "",
                    obra: ""
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clientesData.filter(c => c.activo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select
                value={formData.obraId}
                onValueChange={(v) => {
                  const obra = obrasData.find(o => o.id === v);
                  setFormData({ ...formData, obraId: v, obra: obra?.nombre || "" });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                <SelectContent>
                  {filteredObras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Capataz Responsable</Label>
              <Select
                value={formData.capatazId}
                onValueChange={(v) => setFormData({ ...formData, capatazId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar capataz" /></SelectTrigger>
                <SelectContent>
                  {capataces.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} {c.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {formData.estado === "presente" && (
              <>
                <div className="space-y-2">
                  <Label>Hora Entrada</Label>
                  <Input
                    type="time"
                    value={formData.horaEntrada || ""}
                    onChange={(e) => handleTimeChange("horaEntrada", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Salida</Label>
                  <Input
                    type="time"
                    value={formData.horaSalida || ""}
                    onChange={(e) => handleTimeChange("horaSalida", e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Tarea Realizada</Label>
                  <Input
                    value={formData.tarea || ""}
                    onChange={(e) => setFormData({ ...formData, tarea: e.target.value })}
                    placeholder="Descripción de la tarea..."
                  />
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">HH Normales</div>
                    <div className="text-xl font-bold">{formData.horasNormales?.toFixed(1) || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">HH Extra</div>
                    <div className="text-xl font-bold text-yellow-400">{formData.horasExtra?.toFixed(1) || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-xl font-bold text-primary">{formData.horasTotales?.toFixed(1) || 0}</div>
                  </div>
                </div>
              </>
            )}
            
            {formData.estado !== "presente" && (
              <div className="space-y-2 col-span-2">
                <Label>Observaciones</Label>
                <Input
                  value={formData.observaciones || ""}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Motivo de ausencia, licencia, etc."
                />
              </div>
            )}
          </div>
        </FormDialog>

        {/* Detail Dialog */}
        <DetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title="Detalle del Registro"
        >
          {selectedRegistro && (
            <div className="space-y-3">
              <DetailRow label="Fecha" value={selectedRegistro.fecha} />
              <DetailRow label="Persona" value={selectedRegistro.persona} />
              <DetailRow label="Cliente" value={selectedRegistro.cliente} />
              <DetailRow label="Obra" value={selectedRegistro.obra} />
              <DetailRow label="Capataz" value={selectedRegistro.capataz} />
              <DetailRow 
                label="Estado" 
                value={
                  <Badge className={estadoColors[selectedRegistro.estado]}>
                    {estadoLabels[selectedRegistro.estado]}
                  </Badge>
                } 
              />
              {selectedRegistro.estado === "presente" && (
                <>
                  <DetailRow label="Hora Entrada" value={selectedRegistro.horaEntrada} />
                  <DetailRow label="Hora Salida" value={selectedRegistro.horaSalida} />
                  <DetailRow label="HH Normales" value={selectedRegistro.horasNormales.toString()} />
                  <DetailRow label="HH Extra" value={selectedRegistro.horasExtra.toString()} />
                  <DetailRow label="Total HH" value={selectedRegistro.horasTotales.toString()} />
                  <DetailRow label="Tarea" value={selectedRegistro.tarea} />
                </>
              )}
              {selectedRegistro.observaciones && (
                <DetailRow label="Observaciones" value={selectedRegistro.observaciones} />
              )}
            </div>
          )}
        </DetailDialog>

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onConfirm={handleConfirmDelete}
          title="Eliminar Registro"
          description={`¿Está seguro de eliminar el registro de "${selectedRegistro?.persona}"? Esta acción no se puede deshacer.`}
        />
      </div>
    </MainLayout>
  );
}