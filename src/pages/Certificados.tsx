import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CertificadoServiceGrid } from "@/components/certificados/CertificadoServiceGrid";
import { useObras } from "@/hooks/useObras";
import {
  useCertificados,
  fetchAcumulados,
  CONCEPTOS_ESTANDAR,
  CATEGORIAS_CERTIFICADO,
  type CertificadoItemForm,
  type CertificadoItem,
  type CertificadoPago,
  type Certificado,
  type EstadoCertificado,
  type TipoCertificado,
  type AcumuladoConcepto,
} from "@/hooks/useCertificados";
import { generateCertificadoPDF } from "@/utils/generateCertificadoPDF";
import { KPICard } from "@/components/dashboard/KPICard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  FileText,
  Eye,
  Send,
  CheckCircle2,
  Zap,
  Download,
  Copy,
  Pencil,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  HardHat,
  Wrench,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";


const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const formatPercent = (n: number) => `${n.toFixed(1)}%`;

const ESTADO_COLORS: Record<EstadoCertificado, string> = {
  borrador: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  emitido: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  cobrado: "bg-green-500/15 text-green-700 dark:text-green-400",
};

const ESTADO_LABELS: Record<EstadoCertificado, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  cobrado: "Cobrado",
};

/** Group items by a key field, return sorted entries */
function groupByField<T>(items: T[], keyFn: (item: T) => string, sortOrder?: string[]): { key: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (sortOrder) {
        const ia = sortOrder.indexOf(a);
        const ib = sortOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }
      return a.localeCompare(b);
    })
    .map(([key, items]) => ({ key, items }));
}

function groupByCategoria<T extends { categoria?: string }>(items: T[]) {
  return groupByField(items, (i) => i.categoria || "General", CATEGORIAS_CERTIFICADO)
    .map(({ key, items }) => ({ categoria: key, items }));
}

function groupByEtapa<T extends { etapa?: string | null }>(items: T[], etapaOrdenMap?: Record<string, number>) {
  const sortOrder = etapaOrdenMap
    ? Object.entries(etapaOrdenMap)
        .sort(([, a], [, b]) => a - b)
        .map(([etapa]) => etapa)
    : undefined;
  return groupByField(items, (i) => i.etapa || "Sin etapa", sortOrder)
    .map(({ key, items }) => ({ etapa: key, items }));
}

export default function Certificados() {
  const { obras, loading: loadingObras } = useObras();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const selectedObra = obras.find((o) => o.id === selectedObraId);

  const {
    conceptos,
    loadingConceptos,
    certificados,
    loadingCertificados,
    fetchItems,
    createConcepto,
    updateConcepto,
    deleteConcepto,
    createCertificado,
    updateCertificado,
    updateCertificadoEstado,
    deleteCertificado,
    reorderEtapas,
    allPagos,
    fetchPagos,
    createPago,
    deletePago,
    getPagadoByCert,
  } = useCertificados(selectedObraId);

  // Build etapaOrdenMap from conceptos' orden field (min orden per etapa)
  const etapaOrdenMap: Record<string, number> = {};
  conceptos.forEach((c) => {
    const etapa = c.etapa || "Sin etapa";
    if (!(etapa in etapaOrdenMap) || c.orden < etapaOrdenMap[etapa]) {
      etapaOrdenMap[etapa] = c.orden;
    }
  });

  // ---- KPIs ----
  const totalCertificados = certificados.length;
  const montoTotal = certificados.reduce((s, c) => s + c.total, 0);
  const totalPagado = allPagos.reduce((s, p) => s + p.monto, 0);
  const montoPendiente = certificados
    .filter((c) => c.estado !== "cobrado")
    .reduce((s, c) => s + (c.total - getPagadoByCert(c.id)), 0);
  const montoCobrado = totalPagado;

  // ---- Add concepto dialog ----
  const [addConceptoOpen, setAddConceptoOpen] = useState(false);
  const [addConceptoTipo, setAddConceptoTipo] = useState<'obra' | 'servicio'>('servicio');
  const [newConcepto, setNewConcepto] = useState({
    nombre: "",
    unidad: "",
    precio_unitario: "",
    categoria: "General",
    cantidad_total: "",
    etapa: "",
  });

  const openAddConceptoDialog = (tipo: 'obra' | 'servicio') => {
    setAddConceptoTipo(tipo);
    setNewConcepto({ nombre: "", unidad: "", precio_unitario: "", categoria: "General", cantidad_total: "", etapa: "" });
    setAddConceptoOpen(true);
  };

  const handleAddConcepto = async () => {
    if (!selectedObraId || !newConcepto.nombre || !newConcepto.unidad) return;
    await createConcepto({
      obra_id: selectedObraId,
      nombre: newConcepto.nombre,
      unidad: newConcepto.unidad,
      precio_unitario: Number(newConcepto.precio_unitario) || 0,
      orden: conceptos.length,
      categoria: newConcepto.categoria,
      cantidad_total: Number(newConcepto.cantidad_total) || 0,
      etapa: newConcepto.etapa || null,
      tipo: addConceptoTipo,
    });
    setNewConcepto({ nombre: "", unidad: "", precio_unitario: "", categoria: "General", cantidad_total: "", etapa: "" });
    setAddConceptoOpen(false);
  };

  const handleAddEstandar = async (e: { nombre: string; unidad: string; categoria: string }, tipo: 'obra' | 'servicio' = 'servicio') => {
    if (!selectedObraId) return;
    await createConcepto({
      obra_id: selectedObraId,
      nombre: e.nombre,
      unidad: e.unidad,
      precio_unitario: 0,
      orden: conceptos.length,
      categoria: e.categoria,
      tipo,
    });
  };

  // ---- Crear / Editar certificado ----
  const [crearOpen, setCrearOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(() => format(new Date(), "yyyy-MM"));
  const [observaciones, setObservaciones] = useState("");
  const [itemsDraft, setItemsDraft] = useState<CertificadoItemForm[]>([]);
  const [tipoCert, setTipoCert] = useState<TipoCertificado>("servicio");
  const [anticipoPorcentaje, setAnticipoPorcentaje] = useState(0);
  // For "Agregar concepto" dialogs — null = not open, "obra" | "servicio" = which section
  const [addExtraConceptoSection, setAddExtraConceptoSection] = useState<string | null>(null);
  const [numeroCert, setNumeroCert] = useState("");
  const [incluirIva, setIncluirIva] = useState(true);
  const [acumulados, setAcumulados] = useState<AcumuladoConcepto[]>([]);
  // State for adding extra concepts to an existing certificate during edit
  const [addExtraConceptoOpen, setAddExtraConceptoOpen] = useState(false);

  const isEditing = !!editingCertId;


  // Fetch acumulados when tipo is obra or mixto and dialog is open
  useEffect(() => {
    if (crearOpen && (tipoCert === "obra" || tipoCert === "mixto") && selectedObraId && periodo) {
      fetchAcumulados(selectedObraId, periodo, editingCertId || undefined).then(setAcumulados);
    } else {
      setAcumulados([]);
    }
  }, [crearOpen, tipoCert, selectedObraId, periodo, editingCertId]);

  const buildDraftForTipo = (tipo: TipoCertificado) => {
    const activos = conceptos.filter((c) => c.activo);
    if (tipo === "mixto") {
      const obraItems = activos.filter((c) => c.tipo === "obra").map((c) => ({
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: "obra" as const,
      }));
      const servicioItems = activos.filter((c) => c.tipo === "servicio").map((c) => ({
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: "servicio" as const,
      }));
      return [...obraItems, ...servicioItems];
    }
    return activos.filter((c) => c.tipo === tipo).map((c) => ({
      concepto_id: c.id,
      descripcion: c.nombre,
      unidad: c.unidad,
      cantidad: 0,
      precio_unitario: c.precio_unitario,
      subtotal: 0,
      categoria: c.categoria,
      etapa: c.etapa,
      cantidad_total: c.cantidad_total,
      seccion: null as string | null,
    }));
  };

  const buildObraDraft = () => {
    return conceptos.filter((c) => c.activo && c.tipo === "obra").map((c) => ({
      concepto_id: c.id,
      descripcion: c.nombre,
      unidad: c.unidad,
      cantidad: 0,
      precio_unitario: c.precio_unitario,
      subtotal: 0,
      categoria: c.categoria,
      etapa: c.etapa,
      cantidad_total: c.cantidad_total,
      seccion: null as string | null,
    }));
  };

  const openCrearCertificado = () => {
    const initialTipo: TipoCertificado = "servicio";
    setItemsDraft([]);
    setPeriodo(format(new Date(), "yyyy-MM"));
    setObservaciones("");
    setEditingCertId(null);
    setTipoCert(initialTipo);
    setAnticipoPorcentaje(0);
    setNumeroCert("");
    setIncluirIva(true);
    setCrearOpen(true);
  };

  const skipTipoEffectRef = useRef(false);

  const openEditCertificado = async (cert: Certificado) => {
    const items = await fetchItems(cert.id);

    // Build draft ONLY from saved items — snapshot of what was at creation time
    // No cross-contamination from current active concepts
    const draft: CertificadoItemForm[] = items.map((item) => ({
      concepto_id: item.concepto_id,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
      etapa: item.etapa,
      cantidad_total: (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0,
      seccion: item.seccion || (cert.tipo === "mixto" ? "servicio" : null),
      observaciones: (item as any).observaciones || "",
    }));

    setItemsDraft(draft);
    setPeriodo(cert.periodo);
    setObservaciones(cert.observaciones || "");
    setEditingCertId(cert.id);
    skipTipoEffectRef.current = true;
    setTipoCert(cert.tipo);
    setAnticipoPorcentaje(cert.anticipo_porcentaje);
    setNumeroCert(cert.numero);
    setIncluirIva(cert.incluir_iva !== false);
    setCrearOpen(true);
  };

  const openDuplicarCertificado = async () => {
    if (certificados.length === 0) return;
    const ultimo = certificados[0];
    const items = await fetchItems(ultimo.id);

    // Copy items exactly as saved — snapshot of the last period
    // User can then adjust quantities and prices for the new month
    const draft: CertificadoItemForm[] = items.map((item) => ({
      concepto_id: item.concepto_id,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
      etapa: item.etapa,
      cantidad_total: (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0,
      seccion: item.seccion || (ultimo.tipo === "mixto" ? "servicio" : null),
      observaciones: (item as any).observaciones || "",
    }));

    setItemsDraft(draft);
    setPeriodo(format(new Date(), "yyyy-MM"));
    setObservaciones("");
    setEditingCertId(null);
    setTipoCert(ultimo.tipo);
    setAnticipoPorcentaje(ultimo.anticipo_porcentaje);
    setNumeroCert("");
    setIncluirIva(ultimo.incluir_iva !== false);
    setCrearOpen(true);
  };

  const updateItemCantidad = (idx: number, cantidad: number) => {
    setItemsDraft((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, cantidad, subtotal: cantidad * item.precio_unitario }
          : item
      )
    );
  };

  const updateItemPrecio = (idx: number, precio_unitario: number) => {
    setItemsDraft((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, precio_unitario, subtotal: item.cantidad * precio_unitario }
          : item
      )
    );
  };

  const removeItemFromDraft = (idx: number) => {
    setItemsDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  // Rebuild draft when tipoCert changes
  useEffect(() => {
    if (!crearOpen) return;
    if (skipTipoEffectRef.current) {
      skipTipoEffectRef.current = false;
      return;
    }
    if (editingCertId) {
      // Editing: rebuild from all concepts
      setItemsDraft(buildDraftForTipo(tipoCert));
    } else {
      // Creating: auto-populate obra concepts, leave servicio empty
      if (tipoCert === "obra") {
        setItemsDraft(buildObraDraft());
      } else if (tipoCert === "mixto") {
        const obraDraft = conceptos.filter((c) => c.activo && c.tipo === "obra").map((c) => ({
          concepto_id: c.id,
          descripcion: c.nombre,
          unidad: c.unidad,
          cantidad: 0,
          precio_unitario: c.precio_unitario,
          subtotal: 0,
          categoria: c.categoria,
          etapa: c.etapa,
          cantidad_total: c.cantidad_total,
          seccion: "obra" as const,
        }));
        setItemsDraft(obraDraft); // servicio section starts empty
      } else {
        setItemsDraft([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCert]);

  // Multi-select state for "Agregar concepto" dialog
  const [selectedConceptoIds, setSelectedConceptoIds] = useState<Set<string>>(new Set());

  const toggleConceptoSelection = (id: string) => {
    setSelectedConceptoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedConceptosToDraft = () => {
    const seccion = addExtraConceptoSection;
    const toAdd = conceptos.filter((c) => selectedConceptoIds.has(c.id));
    setItemsDraft((prev) => [
      ...prev,
      ...toAdd.map((c) => ({
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: seccion || null,
      })),
    ]);
    setSelectedConceptoIds(new Set());
    setAddExtraConceptoOpen(false);
    setAddExtraConceptoSection(null);
  };

  // Active concepts not yet in draft — for adding extras when editing
  // For non-mixto: filter by tipo matching cert tipo
  const conceptosNoEnDraft = conceptos.filter(
    (c) => c.activo && c.tipo === tipoCert && !itemsDraft.some((i) => i.concepto_id === c.id)
  );
  // For mixto: filter per section AND tipo independently
  const conceptosNoEnDraftObra = conceptos.filter(
    (c) => c.activo && c.tipo === "obra" && !itemsDraft.some((i) => i.concepto_id === c.id && i.seccion === "obra")
  );
  const conceptosNoEnDraftServicio = conceptos.filter(
    (c) => c.activo && c.tipo === "servicio" && !itemsDraft.some((i) => i.concepto_id === c.id && i.seccion === "servicio")
  );

  const addConceptoToDraft = (conceptoId: string, seccion?: string | null) => {
    const c = conceptos.find((x) => x.id === conceptoId);
    if (!c) return;
    setItemsDraft((prev) => [
      ...prev,
      {
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: seccion || null,
      },
    ]);
    setAddExtraConceptoOpen(false);
    setAddExtraConceptoSection(null);
  };

  const draftSubtotal = itemsDraft.reduce((s, i) => s + i.subtotal, 0);
  const draftIva = Math.round(draftSubtotal * 0.21 * 100) / 100;
  const draftTotal = draftSubtotal + draftIva;

  // For tipo obra: compute avance total and anticipo
  const getAcumuladoForItem = (conceptoId: string | null) => {
    if (!conceptoId) return { cantidad_anterior: 0, avance_anterior: 0 };
    return acumulados.find((a) => a.concepto_id === conceptoId) || { cantidad_anterior: 0, avance_anterior: 0 };
  };

  const avanceActualTotal = itemsDraft.reduce((s, i) => s + i.subtotal, 0);
  // For anticipo: only consider obra items
  const obraItemsDraft = itemsDraft.filter((i) => tipoCert === "obra" || i.seccion === "obra");
  const avanceActualObra = obraItemsDraft.reduce((s, i) => s + i.subtotal, 0);
  const avanceAnteriorTotal = (tipoCert === "obra" || tipoCert === "mixto")
    ? obraItemsDraft
        .reduce((s, i) => {
          const ac = getAcumuladoForItem(i.concepto_id);
          return s + ac.avance_anterior;
        }, 0)
    : 0;
  const avanceAcumuladoTotal = avanceAnteriorTotal + avanceActualObra;
  const anticipoMonto = Math.round(avanceAcumuladoTotal * (anticipoPorcentaje / 100));
  const totalAPagar = avanceActualTotal;

  const handleSaveCertificado = async () => {
    if (isEditing && editingCertId) {
      await updateCertificado({
        id: editingCertId,
        periodo,
        items: itemsDraft,
        observaciones,
        tipo: tipoCert,
        anticipo_porcentaje: anticipoPorcentaje,
        numero: numeroCert,
      });
    } else {
      await createCertificado({
        periodo,
        items: itemsDraft,
        observaciones,
        tipo: tipoCert,
        anticipo_porcentaje: anticipoPorcentaje,
      });
    }
    setCrearOpen(false);
    setEditingCertId(null);
  };

  // ---- Ver certificado ----
  const [viewCertId, setViewCertId] = useState<string | null>(null);
  const [viewItems, setViewItems] = useState<CertificadoItem[]>([]);
  const [viewPagos, setViewPagos] = useState<CertificadoPago[]>([]);
  const [newPago, setNewPago] = useState({ fecha: format(new Date(), "yyyy-MM-dd"), monto: "", descripcion: "" });
  const [loadingItems, setLoadingItems] = useState(false);
  const [viewAcumulados, setViewAcumulados] = useState<AcumuladoConcepto[]>([]);
  const viewCert = certificados.find((c) => c.id === viewCertId);

  const openViewCert = async (id: string) => {
    setViewCertId(id);
    setLoadingItems(true);
    setNewPago({ fecha: format(new Date(), "yyyy-MM-dd"), monto: "", descripcion: "" });
    const [items, pagos] = await Promise.all([fetchItems(id), fetchPagos(id)]);
    setViewItems(items);
    setViewPagos(pagos);

    const cert = certificados.find((c) => c.id === id);
    if ((cert?.tipo === "obra" || cert?.tipo === "mixto") && selectedObraId) {
      const ac = await fetchAcumulados(selectedObraId, cert.periodo, cert.id);
      setViewAcumulados(ac);
    } else {
      setViewAcumulados([]);
    }
    setLoadingItems(false);
  };

  const handleAddPago = async () => {
    if (!viewCertId || !newPago.monto) return;
    await createPago({
      certificado_id: viewCertId,
      fecha: newPago.fecha,
      monto: Number(newPago.monto),
      descripcion: newPago.descripcion || undefined,
    });
    const pagos = await fetchPagos(viewCertId);
    setViewPagos(pagos);
    setNewPago({ fecha: format(new Date(), "yyyy-MM-dd"), monto: "", descripcion: "" });
  };

  const handleDeletePago = async (pagoId: string) => {
    await deletePago(pagoId);
    if (viewCertId) {
      const pagos = await fetchPagos(viewCertId);
      setViewPagos(pagos);
    }
  };

  // Build categoriaMap for PDF
  const categoriaMap: Record<string, string> = {};
  const etapaMap: Record<string, string> = {};
  const cantidadTotalMap: Record<string, number> = {};
  conceptos.forEach((c) => {
    categoriaMap[c.id] = c.categoria;
    if (c.etapa) etapaMap[c.id] = c.etapa;
    cantidadTotalMap[c.id] = c.cantidad_total;
  });

  const handleDownloadPDF = async (cert?: Certificado, items?: CertificadoItem[]) => {
    const targetCert = cert || viewCert;
    if (!targetCert) return;

    let targetItems = items || viewItems;
    if (!items && !viewCertId) {
      targetItems = await fetchItems(targetCert.id);
    }

    // For obra type, fetch acumulados and merge ALL active concepts
    let pdfAcumulados: AcumuladoConcepto[] = [];
    if ((targetCert.tipo === "obra" || targetCert.tipo === "mixto") && selectedObraId) {
      pdfAcumulados = await fetchAcumulados(selectedObraId, targetCert.periodo, targetCert.id);

      if (targetCert.tipo === "obra") {
        // Merge all active concepts with certificate items so all stages appear in PDF
        const allItems: CertificadoItem[] = conceptos
          .filter((c) => c.activo)
          .map((c) => {
            const existingItem = targetItems.find((i) => i.concepto_id === c.id);
            if (existingItem) return existingItem;
            return {
              id: `virtual-${c.id}`,
              certificado_id: targetCert.id,
              concepto_id: c.id,
              descripcion: c.nombre,
              unidad: c.unidad,
              cantidad: 0,
              precio_unitario: c.precio_unitario,
              subtotal: 0,
              etapa: c.etapa || null,
              seccion: null,
              created_at: new Date().toISOString(),
            } as CertificadoItem;
          });
        targetItems = allItems;
      }
    }

    // Fetch pagos for this certificate
    const certPagos = await fetchPagos(targetCert.id);

    await generateCertificadoPDF({
      certificado: targetCert,
      items: targetItems,
      obraNombre: selectedObra?.nombre || "",
      obraUbicacion: selectedObra?.ubicacion || undefined,
      clienteNombre: selectedObra?.cliente?.nombre || undefined,
      clienteCuit: selectedObra?.cliente?.cuit || undefined,
      clienteDireccion: selectedObra?.cliente?.direccion || undefined,
      clienteLocalidad: selectedObra?.cliente?.localidad || undefined,
      clienteTelefono: selectedObra?.cliente?.telefono || undefined,
      clienteEmail: selectedObra?.cliente?.email || undefined,
      categoriaMap,
      etapaMap,
      cantidadTotalMap,
      acumulados: pdfAcumulados,
      etapaOrdenMap,
      pagos: certPagos,
    });
  };

  const handleDownloadPDFFromCard = async (cert: Certificado) => {
    const items = await fetchItems(cert.id);
    await handleDownloadPDF(cert, items);
  };

  const conceptosEstandarNoAgregados = CONCEPTOS_ESTANDAR.filter(
    (e) => !conceptos.some((c) => c.nombre === e.nombre)
  );

  // Group conceptos by categoria for display
  const conceptosGrouped = groupByCategoria(conceptos);

  // Group draft items depending on tipo
  const draftGroupedCategoria = groupByCategoria(itemsDraft.filter((i) => !i.seccion || i.seccion === "servicio"));
  const draftGroupedEtapa = groupByEtapa(itemsDraft.filter((i) => !i.seccion || i.seccion === "obra"), etapaOrdenMap);
  // For mixto: separate sections
  const draftMixtoObra = itemsDraft.filter((i) => i.seccion === "obra");
  const draftMixtoServicio = itemsDraft.filter((i) => i.seccion === "servicio");
  const draftMixtoObraGrouped = groupByEtapa(draftMixtoObra, etapaOrdenMap);
  const draftMixtoServicioGrouped = groupByCategoria(draftMixtoServicio);

  // Group view items
  const viewItemsWithCat = viewItems.map((item) => ({
    ...item,
    categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
  }));
  const viewGroupedCategoria = groupByCategoria(viewItemsWithCat.filter((i) => !i.seccion || i.seccion === "servicio"));
  const viewItemsWithEtapa = viewItems.map((item) => ({
    ...item,
    etapa: item.etapa || (item.concepto_id && etapaMap[item.concepto_id]) || null,
  }));
  const viewGroupedEtapa = groupByEtapa(viewItemsWithEtapa.filter((i) => !i.seccion || i.seccion === "obra"), etapaOrdenMap);
  // For mixto view
  const viewMixtoObra = viewItemsWithEtapa.filter((i) => i.seccion === "obra");
  const viewMixtoServicio = viewItemsWithCat.filter((i) => i.seccion === "servicio");
  const viewMixtoObraGrouped = groupByEtapa(viewMixtoObra, etapaOrdenMap);
  const viewMixtoServicioGrouped = groupByCategoria(viewMixtoServicio);

  return (
    <MainLayout title="Certificados de Obra" subtitle="Gestión de certificaciones mensuales por obra">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-end">
            <Combobox
              options={obras
                .filter((o) => o.estado === "activa")
                .map((o) => ({ value: o.id, label: o.nombre }))}
              value={selectedObraId}
              onValueChange={setSelectedObraId}
              placeholder="Seleccionar obra..."
              searchPlaceholder="Buscar obra..."
              emptyText="No se encontraron obras."
              className="w-full sm:w-72"
            />
          </div>

          {!selectedObraId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Seleccioná una obra para ver sus certificados y conceptos.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPIs */}
              {!loadingCertificados && certificados.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard title="Certificados" value={totalCertificados} icon={FileText} variant="default" />
                  <KPICard title="Total Certificado" value={formatCurrency(montoTotal)} icon={TrendingUp} variant="primary" />
                  <KPICard title="Pendiente de Cobro" value={formatCurrency(montoPendiente)} icon={Clock} variant="warning" />
                  <KPICard title="Cobrado" value={formatCurrency(montoCobrado)} icon={DollarSign} variant="success" />
                </div>
              )}

              <Tabs defaultValue="certificados">
                <TabsList>
                  <TabsTrigger value="certificados">Certificados</TabsTrigger>
                  <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
                  <TabsTrigger value="orden-etapas">Orden de Sub Categorías</TabsTrigger>
                </TabsList>

                {/* ==================== CERTIFICADOS TAB ==================== */}
                <TabsContent value="certificados" className="space-y-4">
                  <div className="flex gap-2 justify-end">
                    {certificados.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" onClick={openDuplicarCertificado}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar último
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Crea un nuevo certificado con los datos del último periodo</TooltipContent>
                      </Tooltip>
                    )}
                    <Button onClick={openCrearCertificado} disabled={conceptos.filter((c) => c.activo).length === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Certificado
                    </Button>
                  </div>

                  {loadingCertificados ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : certificados.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No hay certificados para esta obra.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certificados.map((cert) => (
                        <CertificadoCard
                          key={cert.id}
                          cert={cert}
                          pagado={getPagadoByCert(cert.id)}
                          onView={() => openViewCert(cert.id)}
                          onEdit={() => openEditCertificado(cert)}
                          onEmitir={() =>
                            updateCertificadoEstado({
                              id: cert.id,
                              estado: "emitido",
                              fecha_emision: format(new Date(), "yyyy-MM-dd"),
                            })
                          }
                          onCobrar={() => updateCertificadoEstado({ id: cert.id, estado: "cobrado" })}
                          onDelete={() => deleteCertificado(cert.id)}
                          onDownloadPDF={() => handleDownloadPDFFromCard(cert)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ==================== CONCEPTOS TAB ==================== */}
                <TabsContent value="conceptos" className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Definí los conceptos que aplican a <strong>{selectedObra?.nombre}</strong>. Los conceptos de Obra se usan en certificados de tipo Obra o Mixto; los de Servicio en certificados de tipo Servicio o Mixto.
                  </p>

                  {loadingConceptos ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* ---- CONCEPTOS DE OBRA ---- */}
                      <Collapsible defaultOpen className="rounded-lg border border-primary/30 overflow-hidden">
                        <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
                          <CollapsibleTrigger className="group flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                            <ChevronDown className="w-4 h-4 text-primary transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                            <HardHat className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm text-primary">Conceptos de Obra</span>
                            <Badge variant="outline" className="text-xs">{conceptos.filter(c => c.tipo === 'obra').length}</Badge>
                          </CollapsibleTrigger>
                          <Button size="sm" onClick={() => openAddConceptoDialog('obra')}>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar concepto de Obra
                          </Button>
                        </div>
                        <CollapsibleContent>
                        {conceptos.filter(c => c.tipo === 'obra').length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No hay conceptos de obra. Hacé clic en "Agregar concepto de Obra".
                          </div>
                        ) : (
                          <div className="space-y-0">
                            {groupByCategoria(conceptos.filter(c => c.tipo === 'obra')).map((group) => (
                              <div key={group.categoria}>
                                <div className="bg-muted/50 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-y border-border/50">
                                  {group.categoria}
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Concepto</TableHead>
                                      <TableHead>Unidad</TableHead>
                                      <TableHead className="text-right">P. Unitario</TableHead>
                                      <TableHead className="text-right">Cant. Total</TableHead>
                                      <TableHead>Categoría</TableHead>
                                      <TableHead>Sub Categoría</TableHead>
                                      <TableHead>Estado</TableHead>
                                      <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.items.map((c) => (
                                      <ConceptoRow
                                        key={c.id}
                                        concepto={c}
                                        onUpdate={(updates) => updateConcepto({ id: c.id, ...updates })}
                                        onDelete={() => deleteConcepto(c.id)}
                                      />
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ))}
                          </div>
                        )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* ---- CONCEPTOS DE SERVICIO ---- */}
                      <Collapsible defaultOpen className="rounded-lg border border-secondary/50 overflow-hidden">
                        <div className="bg-secondary/30 px-4 py-3 flex items-center justify-between">
                          <CollapsibleTrigger className="group flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                            <Wrench className="w-4 h-4" />
                            <span className="font-semibold text-sm">Conceptos de Servicio</span>
                            <Badge variant="outline" className="text-xs">{conceptos.filter(c => c.tipo === 'servicio').length}</Badge>
                          </CollapsibleTrigger>
                          <Button size="sm" variant="outline" onClick={() => openAddConceptoDialog('servicio')}>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar concepto de Servicio
                          </Button>
                        </div>
                        <CollapsibleContent>
                        {conceptos.filter(c => c.tipo === 'servicio').length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No hay conceptos de servicio. Hacé clic en "Agregar concepto de Servicio".
                          </div>
                        ) : (
                          <div className="space-y-0">
                            {groupByCategoria(conceptos.filter(c => c.tipo === 'servicio')).map((group) => (
                              <div key={group.categoria}>
                                <div className="bg-muted/50 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-y border-border/50">
                                  {group.categoria}
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Concepto</TableHead>
                                      <TableHead>Unidad</TableHead>
                                      <TableHead className="text-right">P. Unitario</TableHead>
                                      <TableHead className="text-right">Cant. Total</TableHead>
                                      <TableHead>Categoría</TableHead>
                                      <TableHead>Sub Categoría</TableHead>
                                      <TableHead>Estado</TableHead>
                                      <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.items.map((c) => (
                                      <ConceptoRow
                                        key={c.id}
                                        concepto={c}
                                        onUpdate={(updates) => updateConcepto({ id: c.id, ...updates })}
                                        onDelete={() => deleteConcepto(c.id)}
                                      />
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ))}
                          </div>
                        )}
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </TabsContent>

                {/* ==================== ORDEN DE ETAPAS TAB ==================== */}
                <TabsContent value="orden-etapas" className="space-y-4">
                  <EtapasOrdenTab
                    conceptos={conceptos}
                    etapaOrdenMap={etapaOrdenMap}
                    onReorder={reorderEtapas}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* ==================== ADD CONCEPTO DIALOG ==================== */}
          <Dialog open={addConceptoOpen} onOpenChange={setAddConceptoOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {addConceptoTipo === 'obra' ? <HardHat className="w-4 h-4 text-primary" /> : <Wrench className="w-4 h-4" />}
                  Nuevo Concepto de {addConceptoTipo === 'obra' ? 'Obra' : 'Servicio'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={newConcepto.nombre} onChange={(e) => setNewConcepto((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Horas Retro" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoría</Label>
                    <Select value={newConcepto.categoria} onValueChange={(v) => setNewConcepto((p) => ({ ...p, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_CERTIFICADO.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                   <Label>Sub Categoría (opcional)</Label>
                    <Input value={newConcepto.etapa} onChange={(e) => setNewConcepto((p) => ({ ...p, etapa: e.target.value }))} placeholder="Ej: ETAPA 2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Unidad</Label>
                    <Select value={newConcepto.unidad} onValueChange={(v) => setNewConcepto((p) => ({ ...p, unidad: v }))}>
                      <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                      <SelectContent>
                        {["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"].map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Precio Unitario</Label>
                    <Input type="number" value={newConcepto.precio_unitario} onChange={(e) => setNewConcepto((p) => ({ ...p, precio_unitario: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <Label>Cant. Total</Label>
                    <Input type="number" value={newConcepto.cantidad_total} onChange={(e) => setNewConcepto((p) => ({ ...p, cantidad_total: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddConceptoOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddConcepto} disabled={!newConcepto.nombre || !newConcepto.unidad}>Agregar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          <Dialog open={crearOpen} onOpenChange={(open) => { setCrearOpen(open); if (!open) setEditingCertId(null); }}>
            <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Editar Certificado" : "Nuevo Certificado"} — {selectedObra?.nombre}
                </DialogTitle>
                {(() => {
                  const totalConceptos = itemsDraft.length;
                  return totalConceptos > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {totalConceptos} conceptos — desplazá para ver todos
                    </p>
                  ) : null;
                })()}
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipoCert} onValueChange={(v) => setTipoCert(v as TipoCertificado)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servicio">Servicio</SelectItem>
                      <SelectItem value="obra">Obra (con acumulados)</SelectItem>
                      <SelectItem value="mixto">Mixto (Obra + Servicio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                {isEditing && (
                  <div>
                    <Label>Número</Label>
                    <Input value={numeroCert} onChange={(e) => setNumeroCert(e.target.value)} placeholder="CERT-001" />
                  </div>
                )}
                {(tipoCert === "obra" || tipoCert === "mixto") && (
                  <div>
                    <Label>Anticipo (%)</Label>
                    <Input type="number" min={0} max={100} value={anticipoPorcentaje || ""} onChange={(e) => setAnticipoPorcentaje(Number(e.target.value))} />
                  </div>
                )}
                <div className={(tipoCert === "obra" || tipoCert === "mixto") ? "" : "sm:col-span-2"}>
                  <Label>Observaciones</Label>
                  <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas adicionales..." className="min-h-[60px]" />
                </div>
              </div>
              <div className="pr-2">
                <div className="space-y-4">
                  {tipoCert === "servicio" ? (
                    /* ---- SERVICIO: editable grid ---- */
                    <CertificadoServiceGrid
                      items={itemsDraft.filter((i) => !i.seccion)}
                      seccion={null}
                      conceptos={conceptos.filter(c => c.tipo === 'servicio')}
                      onItemsChange={(newServiceItems) => {
                        const otherItems = itemsDraft.filter((i) => i.seccion != null);
                        setItemsDraft([...otherItems, ...newServiceItems]);
                      }}
                    />
                  ) : tipoCert === "obra" ? (
                    /* ---- OBRA: grouped by etapa with acumulado columns ---- */
                    <>
                      {draftGroupedEtapa.map((group) => {
                        const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                        return (
                          <div key={group.etapa}>
                            <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.items[0]?.categoria ? `${group.items[0].categoria} > ${group.etapa}` : group.etapa}</div>
                            <div className="overflow-hidden">
                              <Table className="text-xs">
                               <TableHeader>
                                  <TableRow>
                                    <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                    <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                    <TableHead className="px-1.5 py-2">Un.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                    <TableHead className="px-1.5 py-2 w-24">C.Act.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                    <TableHead className="px-1 py-2 w-8"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.items.map((item) => {
                                    const globalIdx = itemsDraft.indexOf(item);
                                    const ac = getAcumuladoForItem(item.concepto_id);
                                    const cantTotal = item.cantidad_total || 0;
                                    const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                    const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                    const pctAcumulado = pctAnterior + pctActual;
                                    const avAnterior = ac.avance_anterior;
                                    const avActual = item.subtotal;
                                    const avAcumulado = avAnterior + avActual;
                                    const valorTotal = cantTotal * item.precio_unitario;
                                    return (
                                      <TableRow key={globalIdx}>
                                        <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-muted-foreground">{item.categoria || "-"}</TableCell>
                                        <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5">
                                          <Input type="number" min={0} value={item.cantidad || ""} onChange={(e) => updateItemCantidad(globalIdx, Number(e.target.value))} className="h-7 w-20 text-xs" />
                                        </TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                        <TableCell className="px-1 py-1.5">
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeItemFromDraft(globalIdx)}>
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                                <TableFooter>
                                  <TableRow>
                                    <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                    <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                    <TableCell />
                                  </TableRow>
                                </TableFooter>
                              </Table>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    /* ---- MIXTO: Sección Obra + Sección Servicio ---- */
                    <>
                      {/* SECCIÓN OBRA */}
                      <div className="rounded-md border border-primary/30 overflow-hidden">
                        <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
                          <span className="font-semibold text-sm text-primary">Sección Obra (con acumulados)</span>
                          {conceptosNoEnDraftObra.length > 0 && (
                            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setAddExtraConceptoOpen(true); setAddExtraConceptoSection("obra"); }}>
                              <Plus className="w-3 h-3 mr-1" />Agregar concepto
                            </Button>
                          )}
                        </div>
                        {draftMixtoObraGrouped.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No hay conceptos de obra. Agregá uno con el botón de arriba.
                          </div>
                        ) : (
                          draftMixtoObraGrouped.map((group) => {
                            const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                            return (
                              <div key={group.etapa}>
                                <div className="bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground border-l-2 border-primary/40 ml-2 mt-1">{group.items[0]?.categoria ? `${group.items[0].categoria} > ${group.etapa}` : group.etapa}</div>
                                <div className="overflow-hidden">
                                  <Table className="text-xs">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                        <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                        <TableHead className="px-1.5 py-2">Un.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                        <TableHead className="px-1.5 py-2 w-24">C.Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                        <TableHead className="px-1 py-2 w-8"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item) => {
                                        const globalIdx = itemsDraft.indexOf(item);
                                        const ac = getAcumuladoForItem(item.concepto_id);
                                        const cantTotal = item.cantidad_total || 0;
                                        const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                        const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                        const pctAcumulado = pctAnterior + pctActual;
                                        const avAnterior = ac.avance_anterior;
                                        const avActual = item.subtotal;
                                        const avAcumulado = avAnterior + avActual;
                                        const valorTotal = cantTotal * item.precio_unitario;
                                        return (
                                          <TableRow key={globalIdx}>
                                            <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-muted-foreground">{item.categoria || "-"}</TableCell>
                                            <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5">
                                              <Input type="number" min={0} value={item.cantidad || ""} onChange={(e) => updateItemCantidad(globalIdx, Number(e.target.value))} className="h-7 w-20 text-xs" />
                                            </TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                            <TableCell className="px-1 py-1.5">
                                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeItemFromDraft(globalIdx)}>
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                    <TableFooter>
                                      <TableRow>
                                        <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                        <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                        <TableCell />
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* SECCIÓN SERVICIO */}
                      <div className="rounded-md border border-secondary/50 overflow-hidden mt-4">
                        <div className="bg-secondary/30 px-4 py-2 flex items-center justify-between">
                          <span className="font-semibold text-sm">Sección Servicio (Precio × Cantidad)</span>
                        </div>
                        <div className="p-2">
                          <CertificadoServiceGrid
                            items={draftMixtoServicio}
                            seccion="servicio"
                            conceptos={conceptos.filter(c => c.tipo === 'servicio')}
                            onItemsChange={(newServiceItems) => {
                              const obraItems = itemsDraft.filter((i) => i.seccion === "obra");
                              setItemsDraft([...obraItems, ...newServiceItems]);
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Totals - always visible outside scroll */}
              <div className="border-t pt-3 space-y-1 px-1">
                {tipoCert === "servicio" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="font-semibold">{formatCurrency(draftSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA 21%</span>
                      <span>{formatCurrency(draftIva)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL</span>
                      <span>{formatCurrency(draftTotal)}</span>
                    </div>
                  </>
                ) : tipoCert === "obra" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Avance Anterior</span>
                      <span className="text-muted-foreground">{formatCurrency(avanceAnteriorTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avance Actual</span>
                      <span className="font-semibold">{formatCurrency(avanceActualTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avance Acumulado</span>
                      <span className="font-semibold">{formatCurrency(avanceAcumuladoTotal)}</span>
                    </div>
                    {anticipoPorcentaje > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Anticipo ({anticipoPorcentaje}%)</span>
                        <span className="text-muted-foreground">- {formatCurrency(anticipoMonto)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>IVA 21%</span>
                      <span>{formatCurrency(draftIva)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL A PAGAR</span>
                      <span>{formatCurrency(draftTotal)}</span>
                    </div>
                  </>
                ) : (
                  /* MIXTO totals */
                  <>
                    {(() => {
                      const obraSubtotal = draftMixtoObra.reduce((s, i) => s + i.subtotal, 0);
                      const servicioSubtotal = draftMixtoServicio.reduce((s, i) => s + i.subtotal, 0);
                      const totalSub = obraSubtotal + servicioSubtotal;
                      const totalIva = Math.round(totalSub * 0.21 * 100) / 100;
                      const anticipoMixto = Math.round(obraSubtotal * (anticipoPorcentaje / 100));
                      const totalFinal = totalSub - anticipoMixto + totalIva;
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Subtotal Obra</span>
                            <span className="font-medium">{formatCurrency(obraSubtotal)}</span>
                          </div>
                          {anticipoPorcentaje > 0 && (
                            <div className="flex justify-between text-sm pl-4 text-muted-foreground">
                              <span>Anticipo ({anticipoPorcentaje}%) s/ Obra</span>
                              <span>- {formatCurrency(Math.round(obraSubtotal * (anticipoPorcentaje / 100)))}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Subtotal Servicio</span>
                            <span className="font-medium">{formatCurrency(servicioSubtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>IVA 21%</span>
                            <span>{formatCurrency(totalIva)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(totalFinal)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCrearOpen(false); setEditingCertId(null); }}>Cancelar</Button>
                <Button onClick={handleSaveCertificado} disabled={draftSubtotal === 0}>
                  {isEditing ? "Guardar Cambios" : "Crear Certificado"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ==================== ADD EXTRA CONCEPTO DIALOG (Multi-select, grouped) ==================== */}
          <Dialog open={addExtraConceptoOpen} onOpenChange={(open) => { setAddExtraConceptoOpen(open); if (!open) { setSelectedConceptoIds(new Set()); setAddExtraConceptoSection(null); } }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {tipoCert === "obra" || (tipoCert === "mixto" && addExtraConceptoSection === "obra")
                    ? <><HardHat className="w-4 h-4 text-primary" />Agregar conceptos de Obra</>
                    : <><Wrench className="w-4 h-4" />Agregar conceptos de Servicio</>
                  }
                </DialogTitle>
              </DialogHeader>
              {(() => {
                const conceptosParaAgregar = tipoCert === "mixto"
                  ? (addExtraConceptoSection === "obra" ? conceptosNoEnDraftObra : conceptosNoEnDraftServicio)
                  : conceptosNoEnDraft;
                const groupedForDialog = groupByCategoria(conceptosParaAgregar);
                return conceptosParaAgregar.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay conceptos disponibles para agregar.</p>
                ) : (
                  <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
                    {groupedForDialog.map(({ categoria, items }) => {
                      const etapaGroups = groupByEtapa(items);
                      return (
                        <div key={categoria}>
                          <div className="bg-muted px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{categoria}</div>
                          {etapaGroups.map(({ etapa, items: etapaItems }) => (
                            <div key={etapa}>
                              {etapa !== "Sin etapa" && (
                                <div className="pl-3 py-1 text-xs font-medium text-muted-foreground border-l-2 border-primary/30 ml-2 mb-0.5">{etapa}</div>
                              )}
                              {etapaItems.map((c) => (
                                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors">
                                  <Checkbox checked={selectedConceptoIds.has(c.id)} onCheckedChange={() => toggleConceptoSelection(c.id)} />
                                  <span className="flex-1 text-sm font-medium">{c.nombre}</span>
                                  <span className="text-xs text-muted-foreground">{c.unidad}</span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddExtraConceptoOpen(false); setSelectedConceptoIds(new Set()); }}>
                  Cancelar
                </Button>
                <Button onClick={addSelectedConceptosToDraft} disabled={selectedConceptoIds.size === 0}>
                  Agregar {selectedConceptoIds.size > 0 ? `(${selectedConceptoIds.size})` : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ==================== VER CERTIFICADO ==================== */}
          <Dialog open={!!viewCertId} onOpenChange={(open) => { if (!open) setViewCertId(null); }}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {viewCert?.numero} — {selectedObra?.nombre}
                </DialogTitle>
              </DialogHeader>
              <div>
                {loadingItems ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : viewCert && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={ESTADO_COLORS[viewCert.estado]}>
                        {ESTADO_LABELS[viewCert.estado]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {viewCert.tipo === "obra" ? "Obra" : viewCert.tipo === "mixto" ? "Mixto" : "Servicio"}
                      </Badge>
                      <span className="text-sm text-muted-foreground capitalize">
                        {format(parseISO(viewCert.periodo + "-01"), "MMMM yyyy", { locale: es })}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF()} className="ml-auto">
                        <Download className="w-4 h-4 mr-1" /> PDF
                      </Button>
                    </div>

                    {/* Service or simple view */}
                    {viewCert.tipo === "servicio" ? (
                      <>
                        {viewGroupedCategoria.map((group) => {
                          const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                          const etapas = Array.from(new Set(group.items.map((i: any) => i.etapa || ""))).filter(Boolean);
                          const hasEtapas = etapas.length > 0;
                          const itemsWithoutEtapa = group.items.filter((i: any) => !i.etapa);

                          const renderViewTable = (items: typeof group.items, showFooter = false) => (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Concepto</TableHead>
                                  <TableHead>Unidad</TableHead>
                                  <TableHead className="text-right">Cantidad</TableHead>
                                  <TableHead className="text-right">P. Unitario</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell>{item.unidad}</TableCell>
                                    <TableCell className="text-right">{item.cantidad}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              {showFooter && (
                                <TableFooter>
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-right text-sm font-medium">Subtotal {group.categoria}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(groupSubtotal)}</TableCell>
                                  </TableRow>
                                </TableFooter>
                              )}
                            </Table>
                          );

                          return (
                            <div key={group.categoria}>
                              <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.categoria}</div>
                              {hasEtapas ? (
                                <>
                                  {etapas.map((etapa) => {
                                    const etapaItems = group.items.filter((i: any) => (i.etapa || "") === etapa);
                                    return (
                                      <div key={etapa}>
                                        <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground border-l-2 border-primary/40 ml-1 mt-1">{etapa}</div>
                                        {renderViewTable(etapaItems, false)}
                                      </div>
                                    );
                                  })}
                                  {itemsWithoutEtapa.length > 0 && renderViewTable(itemsWithoutEtapa, false)}
                                  <Table>
                                    <TableFooter>
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-right text-sm font-medium">Subtotal {group.categoria}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(groupSubtotal)}</TableCell>
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </>
                              ) : (
                                renderViewTable(group.items, true)
                              )}
                            </div>
                          );
                        })}
                        <div className="border-t pt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span className="font-semibold">{formatCurrency(viewCert.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>IVA 21%</span>
                            <span>{formatCurrency(viewCert.iva)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(viewCert.total)}</span>
                          </div>
                        </div>
                      </>
                    ) : viewCert.tipo === "obra" ? (
                      <>
                        {viewGroupedEtapa.map((group) => {
                          const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                          return (
                            <div key={group.etapa}>
                              <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.etapa}</div>
                              <div className="overflow-hidden">
                                <Table className="text-xs">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                      <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                      <TableHead className="px-1.5 py-2">Un.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">C.Act.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.items.map((item) => {
                                      const ac = viewAcumulados.find((a) => a.concepto_id === item.concepto_id) || { cantidad_anterior: 0, avance_anterior: 0 };
                                      const cantTotal = (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0;
                                      const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                      const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                      const pctAcumulado = pctAnterior + pctActual;
                                      const avAnterior = ac.avance_anterior;
                                      const avActual = item.subtotal;
                                      const avAcumulado = avAnterior + avActual;
                                      const valorTotal = cantTotal * item.precio_unitario;
                                      return (
                                        <TableRow key={item.id}>
                                          <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-muted-foreground">{(item.concepto_id && categoriaMap[item.concepto_id]) || "-"}</TableCell>
                                          <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{item.cantidad}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                  <TableFooter>
                                    <TableRow>
                                      <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                      <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                    </TableRow>
                                  </TableFooter>
                                </Table>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t pt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Avance Anterior</span>
                            <span className="text-muted-foreground">{formatCurrency(viewGroupedEtapa.reduce((s, g) => s + g.items.reduce((ss, i) => { const ac = viewAcumulados.find((a) => a.concepto_id === i.concepto_id); return ss + (ac?.avance_anterior || 0); }, 0), 0))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span className="font-semibold">{formatCurrency(viewCert.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>IVA 21%</span>
                            <span>{formatCurrency(viewCert.iva)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(viewCert.total)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* MIXTO view */
                      <>
                        {/* Sección Obra */}
                        <div className="rounded-md border border-primary/30 overflow-hidden">
                          <div className="bg-primary/10 px-4 py-2">
                            <span className="font-semibold text-sm text-primary">Sección Obra (con acumulados)</span>
                          </div>
                          {viewMixtoObraGrouped.length === 0 ? (
                            <div className="px-4 py-4 text-sm text-muted-foreground text-center">Sin ítems de obra.</div>
                          ) : viewMixtoObraGrouped.map((group) => {
                            const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                            return (
                              <div key={group.etapa}>
                                <div className="bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground border-l-2 border-primary/40 ml-2 mt-1">{group.etapa}</div>
                                <div className="overflow-hidden">
                                  <Table className="text-xs">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                        <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                        <TableHead className="px-1.5 py-2">Un.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">C.Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item) => {
                                        const ac = viewAcumulados.find((a) => a.concepto_id === item.concepto_id) || { cantidad_anterior: 0, avance_anterior: 0 };
                                        const cantTotal = (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0;
                                        const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                        const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                        const pctAcumulado = pctAnterior + pctActual;
                                        const avAnterior = ac.avance_anterior;
                                        const avActual = item.subtotal;
                                        const avAcumulado = avAnterior + avActual;
                                        const valorTotal = cantTotal * item.precio_unitario;
                                        return (
                                          <TableRow key={item.id}>
                                            <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-muted-foreground">{(item.concepto_id && categoriaMap[item.concepto_id]) || "-"}</TableCell>
                                            <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{item.cantidad}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                    <TableFooter>
                                      <TableRow>
                                        <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                        <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Sección Servicio */}
                        <div className="rounded-md border border-secondary/50 overflow-hidden mt-4">
                          <div className="bg-secondary/30 px-4 py-2">
                            <span className="font-semibold text-sm">Sección Servicio (Precio × Cantidad)</span>
                          </div>
                          {viewMixtoServicioGrouped.length === 0 ? (
                            <div className="px-4 py-4 text-sm text-muted-foreground text-center">Sin ítems de servicio.</div>
                          ) : viewMixtoServicioGrouped.map((group) => {
                            const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                            return (
                              <div key={group.categoria}>
                                <div className="bg-muted px-3 py-1.5 text-sm font-semibold">{group.categoria}</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Concepto</TableHead>
                                      <TableHead>Unidad</TableHead>
                                      <TableHead className="text-right">Cantidad</TableHead>
                                      <TableHead className="text-right">P. Unitario</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>{item.descripcion}</TableCell>
                                        <TableCell>{item.unidad}</TableCell>
                                        <TableCell className="text-right">{item.cantidad}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                  <TableFooter>
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-right text-sm font-medium">Subtotal {group.categoria}</TableCell>
                                      <TableCell className="text-right font-semibold">{formatCurrency(groupSubtotal)}</TableCell>
                                    </TableRow>
                                  </TableFooter>
                                </Table>
                              </div>
                            );
                          })}
                        </div>

                        {/* Totals Mixto */}
                        <div className="border-t pt-3 space-y-1">
                          {(() => {
                            const obraSubtotal = viewMixtoObra.reduce((s, i) => s + i.subtotal, 0);
                            const servicioSubtotal = viewMixtoServicio.reduce((s, i) => s + i.subtotal, 0);
                            const obraAvAnterior = viewMixtoObra.reduce((s, i) => {
                              const ac = viewAcumulados.find((a) => a.concepto_id === i.concepto_id);
                              return s + (ac?.avance_anterior || 0);
                            }, 0);
                            const viewAnticipo = Math.round((obraSubtotal + obraAvAnterior) * (viewCert.anticipo_porcentaje / 100));
                            return (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span>Subtotal Obra</span>
                                  <span className="font-medium">{formatCurrency(obraSubtotal)}</span>
                                </div>
                                {viewCert.anticipo_porcentaje > 0 && (
                                  <div className="flex justify-between text-sm pl-4 text-muted-foreground">
                                    <span>Anticipo ({viewCert.anticipo_porcentaje}%) s/ Obra</span>
                                    <span>- {formatCurrency(viewAnticipo)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm">
                                  <span>Subtotal Servicio</span>
                                  <span className="font-medium">{formatCurrency(servicioSubtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>IVA 21%</span>
                                  <span>{formatCurrency(viewCert.iva)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                  <span>TOTAL</span>
                                  <span>{formatCurrency(viewCert.total)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </>
                    )}
                    {viewCert.observaciones && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Observaciones:</strong> {viewCert.observaciones}
                      </p>
                    )}

                    {/* ---- PAGOS SECTION ---- */}
                    <div className="border-t pt-4 mt-4 space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Pagos
                      </h4>
                      {viewPagos.length > 0 ? (
                        <div className="space-y-2">
                          {viewPagos.map((pago) => (
                            <div key={pago.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 text-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{format(new Date(pago.fecha), "dd/MM/yyyy")}</span>
                                <span className="font-semibold">{formatCurrency(pago.monto)}</span>
                                {pago.descripcion && <span className="text-muted-foreground">— {pago.descripcion}</span>}
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeletePago(pago.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
                      )}

                      {/* Saldo */}
                      {(() => {
                        const totalPagadoCert = viewPagos.reduce((s, p) => s + p.monto, 0);
                        const saldoCert = viewCert.total - totalPagadoCert;
                        return (
                          <div className="flex justify-between text-sm font-medium border-t pt-2">
                            <span>Pagado: {formatCurrency(totalPagadoCert)}</span>
                            <span>Saldo pendiente: <strong>{formatCurrency(saldoCert)}</strong></span>
                          </div>
                        );
                      })()}

                      {/* Inline form */}
                      <div className="flex gap-2 items-end flex-wrap">
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha</Label>
                          <Input type="date" value={newPago.fecha} onChange={(e) => setNewPago((p) => ({ ...p, fecha: e.target.value }))} className="h-8 text-xs w-36" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Monto</Label>
                          <Input type="number" min={0} step={0.01} placeholder="0" value={newPago.monto} onChange={(e) => setNewPago((p) => ({ ...p, monto: e.target.value }))} className="h-8 text-xs w-28" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-[120px]">
                          <Label className="text-xs">Descripción</Label>
                          <Input placeholder="Transferencia, cheque..." value={newPago.descripcion} onChange={(e) => setNewPago((p) => ({ ...p, descripcion: e.target.value }))} className="h-8 text-xs" />
                        </div>
                        <Button size="sm" onClick={handleAddPago} disabled={!newPago.monto || Number(newPago.monto) <= 0} className="h-8">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Registrar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}

// ---- Certificado Card Component ----

function CertificadoCard({
  cert,
  pagado = 0,
  onView,
  onEdit,
  onEmitir,
  onCobrar,
  onDelete,
  onDownloadPDF,
}: {
  cert: Certificado;
  pagado?: number;
  onView: () => void;
  onEdit: () => void;
  onEmitir: () => void;
  onCobrar: () => void;
  onDelete: () => void;
  onDownloadPDF: () => void;
}) {
  const saldo = cert.total - pagado;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-lg">{cert.numero}</p>
              <Badge variant="outline" className="text-xs">
                {cert.tipo === "obra" ? "Obra" : cert.tipo === "mixto" ? "Mixto" : "Servicio"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {format(parseISO(cert.periodo + "-01"), "MMMM yyyy", { locale: es })}
            </p>
          </div>
          <Badge variant="secondary" className={ESTADO_COLORS[cert.estado]}>
            {ESTADO_LABELS[cert.estado]}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Subtotal</p>
            <p className="font-medium">{formatCurrency(cert.subtotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">IVA</p>
            <p className="font-medium">{formatCurrency(cert.iva)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-bold text-foreground">{formatCurrency(cert.total)}</p>
          </div>
        </div>
        {pagado > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Pagado</p>
              <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(pagado)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Saldo</p>
              <p className="font-bold">{formatCurrency(saldo)}</p>
            </div>
          </div>
        )}
        {pagado === 0 && <div className="mb-4" />}

        {cert.fecha_emision && (
          <p className="text-xs text-muted-foreground mb-3">
            Emitido: {format(new Date(cert.fecha_emision), "dd/MM/yyyy")}
          </p>
        )}

        <div className="flex gap-1 border-t pt-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onView}>
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalle</TooltipContent>
            </Tooltip>

            {cert.estado === "borrador" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onEdit}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar borrador</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDownloadPDF}>
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descargar PDF</TooltipContent>
            </Tooltip>

            {cert.estado === "borrador" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onEmitir}>
                    <Send className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Emitir certificado</TooltipContent>
              </Tooltip>
            )}

            {cert.estado === "emitido" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onCobrar}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marcar como cobrado</TooltipContent>
              </Tooltip>
            )}

            {cert.estado === "borrador" && (
              <div className="ml-auto">
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar certificado</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de eliminar {cert.numero}? Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Inline editable concepto row ----

function ConceptoRow({
  concepto,
  onUpdate,
  onDelete,
}: {
  concepto: { id: string; nombre: string; unidad: string; precio_unitario: number; activo: boolean; categoria: string; cantidad_total: number; etapa: string | null };
  onUpdate: (u: { precio_unitario?: number; activo?: boolean; categoria?: string; nombre?: string; unidad?: string; cantidad_total?: number; etapa?: string | null }) => void;
  onDelete: () => void;
}) {
  const [nombre, setNombre] = useState(concepto.nombre);
  const [precio, setPrecio] = useState(String(concepto.precio_unitario));
  const [cantTotal, setCantTotal] = useState(String(concepto.cantidad_total || ""));
  const [etapa, setEtapa] = useState(concepto.etapa || "");

  // Sync local state when concepto changes from outside
  useEffect(() => {
    setNombre(concepto.nombre);
    setPrecio(String(concepto.precio_unitario));
    setCantTotal(String(concepto.cantidad_total || ""));
    setEtapa(concepto.etapa || "");
  }, [concepto.nombre, concepto.precio_unitario, concepto.cantidad_total, concepto.etapa]);

  const handleBlurNombre = () => {
    if (nombre.trim() && nombre !== concepto.nombre) onUpdate({ nombre: nombre.trim() });
  };
  const handleBlurPrecio = () => {
    const v = Number(precio);
    if (!isNaN(v) && v !== concepto.precio_unitario) onUpdate({ precio_unitario: v });
  };
  const handleBlurCantTotal = () => {
    const v = Number(cantTotal) || 0;
    if (v !== concepto.cantidad_total) onUpdate({ cantidad_total: v });
  };
  const handleBlurEtapa = () => {
    const v = etapa.trim() || null;
    if (v !== (concepto.etapa || null)) onUpdate({ etapa: v });
  };

  return (
    <TableRow className={!concepto.activo ? "opacity-50" : ""}>
      <TableCell className="p-1">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={handleBlurNombre}
          className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </TableCell>
      <TableCell className="p-1">
        <Select value={concepto.unidad} onValueChange={(v) => onUpdate({ unidad: v })}>
          <SelectTrigger className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"].map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1">
        <Input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          onBlur={handleBlurPrecio}
          className="h-8 text-sm text-right border-transparent bg-transparent hover:border-input focus:border-input w-28"
        />
      </TableCell>
      <TableCell className="p-1">
        <Input
          type="number"
          value={cantTotal}
          onChange={(e) => setCantTotal(e.target.value)}
          onBlur={handleBlurCantTotal}
          className="h-8 text-sm text-right border-transparent bg-transparent hover:border-input focus:border-input w-20"
        />
      </TableCell>
      <TableCell className="p-1">
        <Select value={concepto.categoria} onValueChange={(v) => onUpdate({ categoria: v })}>
          <SelectTrigger className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_CERTIFICADO.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1">
        <Input
          value={etapa}
          onChange={(e) => setEtapa(e.target.value)}
          onBlur={handleBlurEtapa}
          placeholder="-"
          className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </TableCell>
      <TableCell className="p-1">
        <Badge
          variant="secondary"
          className={
            concepto.activo
              ? "bg-green-500/15 text-green-700 dark:text-green-400 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-pointer"
          }
          onClick={() => onUpdate({ activo: !concepto.activo })}
        >
          {concepto.activo ? "Activo" : "Inactivo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right p-1">
        <TooltipProvider>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar concepto</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Eliminar "{concepto.nombre}"? Esto no afecta certificados ya emitidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}

// ---- Etapas Orden Tab Component ----

function EtapasOrdenTab({
  conceptos,
  etapaOrdenMap,
  onReorder,
}: {
  conceptos: { id: string; etapa: string | null; orden: number }[];
  etapaOrdenMap: Record<string, number>;
  onReorder: (etapaOrder: { etapa: string; orden: number }[]) => Promise<void>;
}) {
  // Derive unique etapas sorted by current orden
  const etapas = Object.entries(etapaOrdenMap)
    .sort(([, a], [, b]) => a - b)
    .map(([etapa]) => etapa);

  const [saving, setSaving] = useState(false);

  const moveEtapa = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === etapas.length - 1) return;

    const newEtapas = [...etapas];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    [newEtapas[index], newEtapas[swapIdx]] = [newEtapas[swapIdx], newEtapas[index]];

    setSaving(true);
    try {
      await onReorder(newEtapas.map((etapa, i) => ({ etapa, orden: i })));
    } finally {
      setSaving(false);
    }
  };

  if (etapas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay sub categorías definidas. Asigná sub categorías a los conceptos en la pestaña "Conceptos".
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ordená las sub categorías como quieras que aparezcan en el certificado y el PDF.
      </p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">#</TableHead>
              <TableHead>Sub Categoría</TableHead>
              <TableHead className="text-center">Conceptos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {etapas.map((etapa, idx) => {
              const count = conceptos.filter((c) => (c.etapa || "Sin etapa") === etapa).length;
              return (
                <TableRow key={etapa}>
                  <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{etapa}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{count}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0 || saving}
                      onClick={() => moveEtapa(idx, "up")}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === etapas.length - 1 || saving}
                      onClick={() => moveEtapa(idx, "down")}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
