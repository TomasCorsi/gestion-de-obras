import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
  FileText,
  Clock,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Send,
  Copy,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Cotizacion {
  id: string;
  numero: string;
  cliente: string;
  descripcion: string;
  monto: number;
  estado: "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida";
  fechaCreacion: string;
  fechaVencimiento: string;
  responsable: string;
  items: number;
}

const cotizacionesDemo: Cotizacion[] = [
  {
    id: "1",
    numero: "COT-2026-001",
    cliente: "Constructora Andina S.A.",
    descripcion: "Movimiento de 5,000 m³ de tierra para preparación de terreno",
    monto: 2450000,
    estado: "enviada",
    fechaCreacion: "02/01/2026",
    fechaVencimiento: "15/01/2026",
    responsable: "Admin",
    items: 4,
  },
  {
    id: "2",
    numero: "COT-2026-002",
    cliente: "Inmobiliaria Del Sur",
    descripcion: "Excavación y relleno para fundaciones",
    monto: 890000,
    estado: "enviada",
    fechaCreacion: "03/01/2026",
    fechaVencimiento: "12/01/2026",
    responsable: "Admin",
    items: 3,
  },
  {
    id: "3",
    numero: "COT-2026-003",
    cliente: "Parque Industrial Norte",
    descripcion: "Nivelación de 2 hectáreas para nave industrial",
    monto: 5200000,
    estado: "aprobada",
    fechaCreacion: "28/12/2025",
    fechaVencimiento: "20/01/2026",
    responsable: "Admin",
    items: 6,
  },
  {
    id: "4",
    numero: "COT-2026-004",
    cliente: "Municipalidad de Trelew",
    descripcion: "Compactación y mejora de suelo",
    monto: 1750000,
    estado: "borrador",
    fechaCreacion: "05/01/2026",
    fechaVencimiento: "25/01/2026",
    responsable: "Admin",
    items: 2,
  },
  {
    id: "5",
    numero: "COT-2025-089",
    cliente: "Desarrollos Patagonia",
    descripcion: "Provisión de tosca para relleno",
    monto: 340000,
    estado: "rechazada",
    fechaCreacion: "15/12/2025",
    fechaVencimiento: "30/12/2025",
    responsable: "Admin",
    items: 1,
  },
  {
    id: "6",
    numero: "COT-2025-078",
    cliente: "Consorcio Vial Sur",
    descripcion: "Movimiento de suelo para camino rural",
    monto: 980000,
    estado: "vencida",
    fechaCreacion: "01/12/2025",
    fechaVencimiento: "20/12/2025",
    responsable: "Admin",
    items: 3,
  },
];

const estadoConfig = {
  borrador: { label: "Borrador", icon: FileText, className: "bg-muted/50 text-muted-foreground border-muted" },
  enviada: { label: "Enviada", icon: Send, className: "status-pending" },
  aprobada: { label: "Aprobada", icon: CheckCircle, className: "status-active" },
  rechazada: { label: "Rechazada", icon: XCircle, className: "status-error" },
  vencida: { label: "Vencida", icon: Clock, className: "status-inactive" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Cotizaciones() {
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");

  const filteredCotizaciones = cotizacionesDemo.filter((cot) => {
    const matchesSearch =
      cot.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cot.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cot.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter === "todos" || cot.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  return (
    <MainLayout title="Cotizaciones" subtitle="Presupuestos y propuestas comerciales">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente o descripción..."
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
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="enviada">Enviadas</SelectItem>
              <SelectItem value="aprobada">Aprobadas</SelectItem>
              <SelectItem value="rechazada">Rechazadas</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCotizaciones.map((cot, index) => {
          const config = estadoConfig[cot.estado];
          const Icon = config.icon;
          return (
            <Card
              key={cot.id}
              className="card-industrial animate-fade-in hover:border-primary/30 transition-all cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-primary">{cot.numero}</span>
                    <h3 className="font-semibold text-foreground mt-1">{cot.cliente}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem className="text-foreground cursor-pointer">
                        <FileText className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-foreground cursor-pointer">
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      {cot.estado === "borrador" && (
                        <DropdownMenuItem className="text-foreground cursor-pointer">
                          <Send className="w-4 h-4 mr-2" />
                          Enviar
                        </DropdownMenuItem>
                      )}
                      {cot.estado === "aprobada" && (
                        <DropdownMenuItem className="text-success cursor-pointer">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Convertir a Obra
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {cot.descripcion}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn("status-badge", config.className)}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(cot.monto)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Creación: {cot.fechaCreacion}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Vence: {cot.fechaVencimiento}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border">
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {cot.responsable}
                  </span>
                  <span>{cot.items} ítems</span>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = cotizacionesDemo.filter((c) => c.estado === key).length;
          const total = cotizacionesDemo
            .filter((c) => c.estado === key)
            .reduce((sum, c) => sum + c.monto, 0);
          return (
            <div key={key} className="card-industrial p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("status-badge", config.className)}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
