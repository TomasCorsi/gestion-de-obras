import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Plus,
  Search,
  Filter,
  Building2,
  MapPin,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Obra {
  id: string;
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  estado: "activa" | "pendiente" | "finalizada" | "pausada";
  fechaInicio: string;
  fechaFin?: string;
  progreso: number;
  responsable: string;
}

const obrasDemo: Obra[] = [
  {
    id: "1",
    codigo: "OBR-2025-045",
    nombre: "Movimiento de Suelo - Lote 45",
    cliente: "Constructora Andina S.A.",
    ubicacion: "Ruta 40, Km 234",
    estado: "activa",
    fechaInicio: "15/12/2025",
    progreso: 65,
    responsable: "Juan Pérez",
  },
  {
    id: "2",
    codigo: "OBR-2026-001",
    nombre: "Excavación Fundaciones",
    cliente: "Inmobiliaria Del Sur",
    ubicacion: "Av. Circunvalación 890",
    estado: "activa",
    fechaInicio: "02/01/2026",
    progreso: 30,
    responsable: "Carlos Gómez",
  },
  {
    id: "3",
    codigo: "OBR-2026-002",
    nombre: "Nivelación Terreno Industrial",
    cliente: "Parque Industrial Norte",
    ubicacion: "Zona Franca, Sector B",
    estado: "pendiente",
    fechaInicio: "15/01/2026",
    progreso: 0,
    responsable: "María López",
  },
  {
    id: "4",
    codigo: "OBR-2025-038",
    nombre: "Relleno y Compactación",
    cliente: "Municipalidad de Trelew",
    ubicacion: "Calle San Martín 1200",
    estado: "pausada",
    fechaInicio: "10/11/2025",
    progreso: 45,
    responsable: "Pedro Rodríguez",
  },
  {
    id: "5",
    codigo: "OBR-2025-032",
    nombre: "Preparación Terreno Residencial",
    cliente: "Desarrollos Patagonia",
    ubicacion: "Barrio Norte, Manzana 12",
    estado: "finalizada",
    fechaInicio: "01/10/2025",
    fechaFin: "20/12/2025",
    progreso: 100,
    responsable: "Ana Martínez",
  },
];

const estadoConfig = {
  activa: { label: "Activa", className: "status-active" },
  pendiente: { label: "Pendiente", className: "status-pending" },
  finalizada: { label: "Finalizada", className: "status-inactive" },
  pausada: { label: "Pausada", className: "status-error" },
};

export default function Obras() {
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");

  const filteredObras = obrasDemo.filter((obra) => {
    const matchesSearch =
      obra.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter === "todos" || obra.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  return (
    <MainLayout title="Obras" subtitle="Gestión de proyectos y obras">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cliente o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activa">Activas</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="pausada">Pausadas</SelectItem>
              <SelectItem value="finalizada">Finalizadas</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Obra
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Código</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-muted-foreground font-medium">Ubicación</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium">Progreso</TableHead>
              <TableHead className="text-muted-foreground font-medium">Responsable</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredObras.map((obra, index) => (
              <TableRow
                key={obra.id}
                className="border-border table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell className="font-mono text-sm text-primary">{obra.codigo}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{obra.nombre}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{obra.cliente}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {obra.ubicacion}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={cn("status-badge", estadoConfig[obra.estado].className)}>
                    {estadoConfig[obra.estado].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          obra.progreso === 100 ? "bg-success" : "bg-primary"
                        )}
                        style={{ width: `${obra.progreso}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">{obra.progreso}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{obra.responsable}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem className="text-foreground cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-foreground cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = obrasDemo.filter((o) => o.estado === key).length;
          return (
            <div key={key} className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-sm text-muted-foreground">{config.label}</p>
              </div>
              <Badge className={cn("status-badge", config.className)}>{key}</Badge>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
