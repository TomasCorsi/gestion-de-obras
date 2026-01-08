import { Cliente, Persona, Maquinaria, Obra, Cotizacion, Viaje, Remito, CargaCombustible, Mantenimiento } from "@/types";

export const clientesData: Cliente[] = [
  {
    id: "1",
    nombre: "Constructora Andina S.A.",
    razonSocial: "Constructora Andina S.A.",
    cuit: "30-71234567-8",
    email: "contacto@constructoraandina.com",
    telefono: "0280-4445566",
    direccion: "Av. Roca 1234",
    localidad: "Trelew",
    provincia: "Chubut",
    contactoPrincipal: "Roberto Méndez",
    activo: true,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    nombre: "Inmobiliaria Del Sur",
    razonSocial: "Inmobiliaria Del Sur S.R.L.",
    cuit: "30-70987654-3",
    email: "ventas@delsur.com.ar",
    telefono: "0280-4423344",
    direccion: "San Martín 567",
    localidad: "Rawson",
    provincia: "Chubut",
    contactoPrincipal: "Laura González",
    activo: true,
    createdAt: "2024-03-20",
  },
  {
    id: "3",
    nombre: "Parque Industrial Norte",
    razonSocial: "Parque Industrial Norte S.A.",
    cuit: "30-71555888-9",
    email: "admin@pinorte.com.ar",
    telefono: "0280-4478899",
    direccion: "Zona Franca, Sector B",
    localidad: "Puerto Madryn",
    provincia: "Chubut",
    contactoPrincipal: "Carlos Ruiz",
    activo: true,
    createdAt: "2024-02-10",
  },
  {
    id: "4",
    nombre: "Municipalidad de Trelew",
    cuit: "30-99999999-1",
    email: "obras@trelew.gob.ar",
    telefono: "0280-4420000",
    direccion: "Av. Fontana 240",
    localidad: "Trelew",
    provincia: "Chubut",
    contactoPrincipal: "Ing. María Fernández",
    activo: true,
    createdAt: "2023-06-01",
  },
  {
    id: "5",
    nombre: "Desarrollos Patagonia",
    razonSocial: "Desarrollos Patagonia S.A.",
    cuit: "30-71666999-2",
    email: "proyectos@despat.com.ar",
    telefono: "0280-4455667",
    direccion: "Belgrano 890",
    localidad: "Trelew",
    provincia: "Chubut",
    contactoPrincipal: "Martín Acosta",
    activo: true,
    createdAt: "2024-05-12",
  },
];

export const personalData: Persona[] = [
  { id: "1", nombre: "Juan", apellido: "Pérez", dni: "28456789", rol: "supervisor", telefono: "280-4551234", fechaIngreso: "2020-03-15", activo: true },
  { id: "2", nombre: "Carlos", apellido: "Gómez", dni: "31234567", rol: "capataz", telefono: "280-4552345", fechaIngreso: "2021-06-20", activo: true },
  { id: "3", nombre: "María", apellido: "López", dni: "29876543", rol: "administrativo", email: "mlopez@calaminasur.com", telefono: "280-4553456", fechaIngreso: "2019-01-10", activo: true },
  { id: "4", nombre: "Pedro", apellido: "Rodríguez", dni: "32567890", rol: "maquinista", telefono: "280-4554567", fechaIngreso: "2022-02-28", activo: true, licencia: "B2", vencimientoLicencia: "2025-08-15" },
  { id: "5", nombre: "Ana", apellido: "Martínez", dni: "30123456", rol: "chofer", telefono: "280-4555678", fechaIngreso: "2021-09-05", activo: true, licencia: "E1", vencimientoLicencia: "2025-03-20" },
  { id: "6", nombre: "Roberto", apellido: "Sánchez", dni: "27890123", rol: "maquinista", telefono: "280-4556789", fechaIngreso: "2018-11-12", activo: true, licencia: "B2", vencimientoLicencia: "2024-12-01" },
  { id: "7", nombre: "Lucía", apellido: "Fernández", dni: "33456789", rol: "chofer", telefono: "280-4557890", fechaIngreso: "2023-04-18", activo: true, licencia: "E1", vencimientoLicencia: "2026-04-18" },
  { id: "8", nombre: "Diego", apellido: "Torres", dni: "29012345", rol: "capataz", telefono: "280-4558901", fechaIngreso: "2020-07-22", activo: true },
];

export const maquinariasData: Maquinaria[] = [
  { id: "1", codigo: "EXC-001", nombre: "CAT 320D", tipo: "excavadora", marca: "Caterpillar", modelo: "320D", anio: 2019, estado: "en_uso", ubicacionActual: "Obra Lote 45", horasAcumuladas: 4520, proximoService: 5000, operadorAsignado: "Pedro Rodríguez" },
  { id: "2", codigo: "CAR-001", nombre: "Komatsu WA380", tipo: "cargadora", marca: "Komatsu", modelo: "WA380-8", anio: 2020, estado: "operativa", ubicacionActual: "Base Central", horasAcumuladas: 3200, proximoService: 3500 },
  { id: "3", codigo: "CAM-001", nombre: "Volvo A30G", tipo: "camion_articulado", marca: "Volvo", modelo: "A30G", anio: 2018, patente: "AB123CD", estado: "mantenimiento", ubicacionActual: "Taller", horasAcumuladas: 6800, proximoService: 7000 },
  { id: "4", codigo: "TOP-001", nombre: "CAT D6T", tipo: "topadora", marca: "Caterpillar", modelo: "D6T", anio: 2021, estado: "en_uso", ubicacionActual: "Obra Circunvalación", horasAcumuladas: 2100, proximoService: 2500, operadorAsignado: "Roberto Sánchez" },
  { id: "5", codigo: "ROD-001", nombre: "Bomag BW211", tipo: "rodillo", marca: "Bomag", modelo: "BW211D-50", anio: 2020, estado: "inactiva", ubicacionActual: "Base Central", horasAcumuladas: 1800, proximoService: 2000 },
  { id: "6", codigo: "EXC-002", nombre: "Hyundai R210", tipo: "excavadora", marca: "Hyundai", modelo: "R210LC-9", anio: 2022, estado: "en_uso", ubicacionActual: "Obra Zona Franca", horasAcumuladas: 980, proximoService: 1000 },
];

export const obrasData: Obra[] = [
  { id: "1", codigo: "OBR-2025-045", nombre: "Movimiento de Suelo - Lote 45", clienteId: "1", cliente: "Constructora Andina S.A.", ubicacion: "Ruta 40, Km 234", descripcion: "Movimiento de 5000m³ de suelo", estado: "activa", fechaInicio: "2025-12-15", progreso: 65, responsableId: "1", responsable: "Juan Pérez", presupuesto: 4500000 },
  { id: "2", codigo: "OBR-2026-001", nombre: "Excavación Fundaciones", clienteId: "2", cliente: "Inmobiliaria Del Sur", ubicacion: "Av. Circunvalación 890", descripcion: "Excavación para fundaciones de edificio", estado: "activa", fechaInicio: "2026-01-02", progreso: 30, responsableId: "2", responsable: "Carlos Gómez", presupuesto: 1200000 },
  { id: "3", codigo: "OBR-2026-002", nombre: "Nivelación Terreno Industrial", clienteId: "3", cliente: "Parque Industrial Norte", ubicacion: "Zona Franca, Sector B", descripcion: "Nivelación de 2 hectáreas", estado: "pendiente", fechaInicio: "2026-01-15", progreso: 0, responsableId: "1", responsable: "Juan Pérez", presupuesto: 6800000 },
  { id: "4", codigo: "OBR-2025-038", nombre: "Relleno y Compactación", clienteId: "4", cliente: "Municipalidad de Trelew", ubicacion: "Calle San Martín 1200", descripcion: "Relleno y compactación vía pública", estado: "pausada", fechaInicio: "2025-11-10", progreso: 45, responsableId: "2", responsable: "Carlos Gómez", presupuesto: 2300000 },
  { id: "5", codigo: "OBR-2025-032", nombre: "Preparación Terreno Residencial", clienteId: "5", cliente: "Desarrollos Patagonia", ubicacion: "Barrio Norte, Manzana 12", descripcion: "Preparación completa del terreno", estado: "finalizada", fechaInicio: "2025-10-01", fechaFinReal: "2025-12-20", progreso: 100, responsableId: "1", responsable: "Juan Pérez", presupuesto: 3500000 },
];

export const cotizacionesData: Cotizacion[] = [
  {
    id: "1", numero: "COT-2026-001", clienteId: "1", cliente: "Constructora Andina S.A.", descripcion: "Movimiento de 5,000 m³ de tierra", estado: "enviada",
    fechaCreacion: "2026-01-02", fechaVencimiento: "2026-01-15", responsable: "Admin",
    items: [
      { id: "1", descripcion: "Movimiento de suelo", unidad: "m³", cantidad: 5000, precioUnitario: 450, subtotal: 2250000 },
      { id: "2", descripcion: "Transporte de material", unidad: "viaje", cantidad: 100, precioUnitario: 8500, subtotal: 850000 },
    ],
    subtotal: 3100000, iva: 651000, total: 3751000,
  },
  {
    id: "2", numero: "COT-2026-002", clienteId: "2", cliente: "Inmobiliaria Del Sur", descripcion: "Excavación y relleno para fundaciones", estado: "enviada",
    fechaCreacion: "2026-01-03", fechaVencimiento: "2026-01-12", responsable: "Admin",
    items: [
      { id: "1", descripcion: "Excavación de fundaciones", unidad: "m³", cantidad: 800, precioUnitario: 520, subtotal: 416000 },
      { id: "2", descripcion: "Relleno con tosca", unidad: "m³", cantidad: 400, precioUnitario: 380, subtotal: 152000 },
    ],
    subtotal: 568000, iva: 119280, total: 687280,
  },
];

export const viajesData: Viaje[] = [
  { id: "1", fecha: "2026-01-08", obraId: "1", obra: "Movimiento de Suelo - Lote 45", choferId: "5", chofer: "Ana Martínez", camionId: "3", camion: "Volvo A30G", origen: "Cantera Norte", destino: "Obra Lote 45", material: "Tosca", volumen: 18, estado: "completado", horaInicio: "07:30", horaFin: "09:15", kmRecorridos: 45 },
  { id: "2", fecha: "2026-01-08", obraId: "1", obra: "Movimiento de Suelo - Lote 45", choferId: "7", chofer: "Lucía Fernández", camionId: "3", camion: "Volvo A30G", origen: "Cantera Norte", destino: "Obra Lote 45", material: "Tosca", volumen: 18, estado: "completado", horaInicio: "09:45", horaFin: "11:30", kmRecorridos: 45 },
  { id: "3", fecha: "2026-01-08", obraId: "2", obra: "Excavación Fundaciones", choferId: "5", chofer: "Ana Martínez", camionId: "3", camion: "Volvo A30G", origen: "Obra Circunvalación", destino: "Vertedero Municipal", material: "Tierra excavada", volumen: 20, estado: "en_curso", horaInicio: "14:00" },
  { id: "4", fecha: "2026-01-09", obraId: "1", obra: "Movimiento de Suelo - Lote 45", choferId: "5", chofer: "Ana Martínez", camionId: "3", camion: "Volvo A30G", origen: "Cantera Norte", destino: "Obra Lote 45", material: "Tosca", volumen: 18, estado: "programado" },
];

export const remitosData: Remito[] = [
  { id: "1", numero: "REM-2026-0001", viajeId: "1", fecha: "2026-01-08", cliente: "Constructora Andina S.A.", obra: "Movimiento de Suelo - Lote 45", material: "Tosca", cantidad: 18, unidad: "m³", recibidoPor: "Jorge Méndez", firmado: true },
  { id: "2", numero: "REM-2026-0002", viajeId: "2", fecha: "2026-01-08", cliente: "Constructora Andina S.A.", obra: "Movimiento de Suelo - Lote 45", material: "Tosca", cantidad: 18, unidad: "m³", recibidoPor: "Jorge Méndez", firmado: true },
  { id: "3", numero: "REM-2026-0003", viajeId: "3", fecha: "2026-01-08", cliente: "Inmobiliaria Del Sur", obra: "Excavación Fundaciones", material: "Tierra excavada", cantidad: 20, unidad: "m³", recibidoPor: "", firmado: false },
];

export const combustibleData: CargaCombustible[] = [
  { id: "1", fecha: "2026-01-08", maquinariaId: "1", maquinaria: "CAT 320D", litros: 280, precioLitro: 950, costoTotal: 266000, horasMaquina: 4520, estacion: "YPF Trelew", operador: "Pedro Rodríguez" },
  { id: "2", fecha: "2026-01-07", maquinariaId: "4", maquinaria: "CAT D6T", litros: 350, precioLitro: 950, costoTotal: 332500, horasMaquina: 2100, estacion: "Shell Rawson", operador: "Roberto Sánchez" },
  { id: "3", fecha: "2026-01-06", maquinariaId: "2", maquinaria: "Komatsu WA380", litros: 220, precioLitro: 950, costoTotal: 209000, horasMaquina: 3200, estacion: "YPF Trelew", operador: "Diego Torres" },
  { id: "4", fecha: "2026-01-05", maquinariaId: "6", maquinaria: "Hyundai R210", litros: 180, precioLitro: 950, costoTotal: 171000, horasMaquina: 980, estacion: "Axion Puerto Madryn", operador: "Pedro Rodríguez" },
];

export const mantenimientosData: Mantenimiento[] = [
  { id: "1", fecha: "2026-01-08", maquinariaId: "3", maquinaria: "Volvo A30G", tipo: "preventivo", descripcion: "Service 7000 horas - cambio de aceite, filtros y revisión general", repuestos: "Aceite motor x20L, Filtro aceite, Filtro aire, Filtro combustible", costoRepuestos: 185000, costoManoObra: 45000, costoTotal: 230000, horasMaquina: 6800, tecnico: "Taller Mecánico Central", estado: "en_proceso", proximoMantenimiento: "2026-04-08" },
  { id: "2", fecha: "2026-01-03", maquinariaId: "1", maquinaria: "CAT 320D", tipo: "correctivo", descripcion: "Reparación sistema hidráulico - reemplazo de mangueras", repuestos: "Manguera hidráulica x3, Conectores, Aceite hidráulico x10L", costoRepuestos: 95000, costoManoObra: 35000, costoTotal: 130000, horasMaquina: 4480, tecnico: "Finning Argentina", estado: "completado" },
  { id: "3", fecha: "2026-01-15", maquinariaId: "6", maquinaria: "Hyundai R210", tipo: "preventivo", descripcion: "Service 1000 horas programado", costoRepuestos: 0, costoManoObra: 0, costoTotal: 0, horasMaquina: 980, tecnico: "Por asignar", estado: "programado" },
];
