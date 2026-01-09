// Core types for Calamina Sur

export interface Cliente {
  id: string;
  nombre: string;
  razonSocial?: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  localidad: string;
  provincia: string;
  contactoPrincipal: string;
  notas?: string;
  activo: boolean;
  createdAt: string;
}

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  rol: "administrador" | "supervisor" | "capataz" | "maquinista" | "chofer" | "administrativo" | "auditor";
  email?: string;
  telefono: string;
  fechaIngreso: string;
  activo: boolean;
  licencia?: string;
  vencimientoLicencia?: string;
}

export interface Maquinaria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "excavadora" | "cargadora" | "camion_articulado" | "topadora" | "rodillo" | "retroexcavadora" | "motoniveladora";
  marca: string;
  modelo: string;
  anio: number;
  patente?: string;
  estado: "operativa" | "mantenimiento" | "inactiva" | "en_uso";
  ubicacionActual: string;
  horasAcumuladas: number;
  proximoService: number;
  operadorAsignado?: string;
}

export interface Obra {
  id: string;
  codigo: string;
  nombre: string;
  clienteId: string;
  cliente: string;
  ubicacion: string;
  descripcion: string;
  estado: "activa" | "pendiente" | "finalizada" | "pausada";
  fechaInicio: string;
  fechaFinEstimada?: string;
  fechaFinReal?: string;
  progreso: number;
  responsableId: string;
  responsable: string;
  presupuesto?: number;
}

export interface Cotizacion {
  id: string;
  numero: string;
  clienteId: string;
  cliente: string;
  descripcion: string;
  estado: "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida";
  fechaCreacion: string;
  fechaVencimiento: string;
  responsable: string;
  items: CotizacionItem[];
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
}

export interface CotizacionItem {
  id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Viaje {
  id: string;
  fecha: string;
  obraId: string;
  obra: string;
  choferId: string;
  chofer: string;
  camionId: string;
  camion: string;
  origen: string;
  destino: string;
  material: string;
  volumen: number;
  estado: "programado" | "en_curso" | "completado" | "cancelado";
  horaInicio?: string;
  horaFin?: string;
  kmRecorridos?: number;
  observaciones?: string;
}

export interface Remito {
  id: string;
  numero: string;
  viajeId: string;
  viaje?: Viaje;
  fecha: string;
  cliente: string;
  obra: string;
  material: string;
  cantidad: number;
  unidad: string;
  recibidoPor: string;
  firmado: boolean;
  evidenciaUrl?: string;
  observaciones?: string;
}

export interface CargaCombustible {
  id: string;
  fecha: string;
  clienteId: string;
  cliente: string;
  obraId: string;
  obra: string;
  maquinariaId: string;
  maquinaria: string;
  litros: number;
  precioLitro: number;
  costoTotal: number;
  horasMaquina: number;
  estacion: string;
  operador: string;
  comprobante?: string;
}

export interface Mantenimiento {
  id: string;
  fecha: string;
  maquinariaId: string;
  maquinaria: string;
  tipo: "preventivo" | "correctivo" | "emergencia";
  descripcion: string;
  repuestos?: string;
  costoRepuestos: number;
  costoManoObra: number;
  costoTotal: number;
  horasMaquina: number;
  tecnico: string;
  estado: "programado" | "en_proceso" | "completado";
  proximoMantenimiento?: string;
  observaciones?: string;
}

export interface HoraMaquina {
  id: string;
  fecha: string;
  maquinariaId: string;
  maquinaria: string;
  obraId: string;
  obra: string;
  operadorId: string;
  operador: string;
  horaInicio: string;
  horaFin: string;
  horasTrabajadas: number;
  observaciones?: string;
}
