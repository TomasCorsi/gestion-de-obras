import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useObras } from "@/hooks/useObras";
import {
  useCertificados,
  fetchAcumulados,
  CONCEPTOS_ESTANDAR,
  CATEGORIAS_CERTIFICADO,
  type CertificadoItemForm,
  type CertificadoItem,
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

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

function groupByEtapa<T extends { etapa?: string | null }>(items: T[]) {
  return groupByField(items, (i) => i.etapa || "Sin etapa")
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
  } = useCertificados(selectedObraId);

  // ---- KPIs ----
  const totalCertificados = certificados.length;
  const montoTotal = certificados.reduce((s, c) => s + c.total, 0);
  const montoPendiente = certificados
    .filter((c) => c.estado === "emitido")
    .reduce((s, c) => s + c.total, 0);
  const montoCobrado = certificados
    .filter((c) => c.estado === "cobrado")
    .reduce((s, c) => s + c.total, 0);

  // ---- Add concepto dialog ----
  const [addConceptoOpen, setAddConceptoOpen] = useState(false);
  const [newConcepto, setNewConcepto] = useState({
    nombre: "",
    unidad: "",
    precio_unitario: "",
    categoria: "General",
    cantidad_total: "",
    etapa: "",
  });

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
    });
    setNewConcepto({ nombre: "", unidad: "", precio_unitario: "", categoria: "General", cantidad_total: "", etapa: "" });
    setAddConceptoOpen(false);
  };

  const handleAddEstandar = async (e: { nombre: string; unidad: string; categoria: string }) => {
    if (!selectedObraId) return;
    await createConcepto({
      obra_id: selectedObraId,
      nombre: e.nombre,
      unidad: e.unidad,
      precio_unitario: 0,
      orden: conceptos.length,
      categoria: e.categoria,
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
  const [acumulados, setAcumulados] = useState<AcumuladoConcepto[]>([]);

  const isEditing = !!editingCertId;

  // Fetch acumulados when tipo is obra and dialog is open
  useEffect(() => {
    if (crearOpen && tipoCert === "obra" && selectedObraId && periodo) {
      fetchAcumulados(selectedObraId, periodo, editingCertId || undefined).then(setAcumulados);
    } else {
      setAcumulados([]);
    }
  }, [crearOpen, tipoCert, selectedObraId, periodo, editingCertId]);

  const openCrearCertificado = () => {
    const activos = conceptos.filter((c) => c.activo);
    setItemsDraft(
      activos.map((c) => ({
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
      }))
    );
    setPeriodo(format(new Date(), "yyyy-MM"));
    setObservaciones("");
    setEditingCertId(null);
    setTipoCert("servicio");
    setAnticipoPorcentaje(0);
    setCrearOpen(true);
  };

  const openEditCertificado = async (cert: Certificado) => {
    const items = await fetchItems(cert.id);
    const activos = conceptos.filter((c) => c.activo);

    const draft: CertificadoItemForm[] = activos.map((c) => {
      const existing = items.find((i) => i.concepto_id === c.id);
      return {
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: existing?.cantidad || 0,
        precio_unitario: existing?.precio_unitario || c.precio_unitario,
        subtotal: existing?.subtotal || 0,
        categoria: c.categoria,
        etapa: existing?.etapa || c.etapa,
        cantidad_total: c.cantidad_total,
      };
    });

    setItemsDraft(draft);
    setPeriodo(cert.periodo);
    setObservaciones(cert.observaciones || "");
    setEditingCertId(cert.id);
    setTipoCert(cert.tipo);
    setAnticipoPorcentaje(cert.anticipo_porcentaje);
    setCrearOpen(true);
  };

  const openDuplicarCertificado = async () => {
    if (certificados.length === 0) return;
    const ultimo = certificados[0];
    const items = await fetchItems(ultimo.id);
    const activos = conceptos.filter((c) => c.activo);

    const draft: CertificadoItemForm[] = activos.map((c) => {
      const existing = items.find((i) => i.concepto_id === c.id);
      return {
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: existing?.cantidad || 0,
        precio_unitario: existing?.precio_unitario || c.precio_unitario,
        subtotal: existing ? existing.cantidad * existing.precio_unitario : 0,
        categoria: c.categoria,
        etapa: existing?.etapa || c.etapa,
        cantidad_total: c.cantidad_total,
      };
    });

    setItemsDraft(draft);
    setPeriodo(format(new Date(), "yyyy-MM"));
    setObservaciones("");
    setEditingCertId(null);
    setTipoCert(ultimo.tipo);
    setAnticipoPorcentaje(ultimo.anticipo_porcentaje);
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

  const draftSubtotal = itemsDraft.reduce((s, i) => s + i.subtotal, 0);
  const draftIva = Math.round(draftSubtotal * 0.21 * 100) / 100;
  const draftTotal = draftSubtotal + draftIva;

  // For tipo obra: compute avance total and anticipo
  const getAcumuladoForItem = (conceptoId: string | null) => {
    if (!conceptoId) return { cantidad_anterior: 0, avance_anterior: 0 };
    return acumulados.find((a) => a.concepto_id === conceptoId) || { cantidad_anterior: 0, avance_anterior: 0 };
  };

  const avanceActualTotal = itemsDraft.reduce((s, i) => s + i.subtotal, 0);
  const avanceAnteriorTotal = tipoCert === "obra"
    ? itemsDraft.reduce((s, i) => {
        const ac = getAcumuladoForItem(i.concepto_id);
        return s + ac.avance_anterior;
      }, 0)
    : 0;
  const avanceAcumuladoTotal = avanceAnteriorTotal + avanceActualTotal;
  const anticipoMonto = Math.round(avanceAcumuladoTotal * (anticipoPorcentaje / 100));
  const totalAPagar = avanceActualTotal; // In this period, only current avance minus nothing previously deducted individually

  const handleSaveCertificado = async () => {
    if (isEditing && editingCertId) {
      await updateCertificado({
        id: editingCertId,
        periodo,
        items: itemsDraft,
        observaciones,
        tipo: tipoCert,
        anticipo_porcentaje: anticipoPorcentaje,
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
  const [loadingItems, setLoadingItems] = useState(false);
  const [viewAcumulados, setViewAcumulados] = useState<AcumuladoConcepto[]>([]);
  const viewCert = certificados.find((c) => c.id === viewCertId);

  const openViewCert = async (id: string) => {
    setViewCertId(id);
    setLoadingItems(true);
    const items = await fetchItems(id);
    setViewItems(items);

    const cert = certificados.find((c) => c.id === id);
    if (cert?.tipo === "obra" && selectedObraId) {
      const ac = await fetchAcumulados(selectedObraId, cert.periodo, cert.id);
      setViewAcumulados(ac);
    } else {
      setViewAcumulados([]);
    }
    setLoadingItems(false);
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

    // For obra type, fetch acumulados
    let pdfAcumulados: AcumuladoConcepto[] = [];
    if (targetCert.tipo === "obra" && selectedObraId) {
      pdfAcumulados = await fetchAcumulados(selectedObraId, targetCert.periodo, targetCert.id);
    }

    await generateCertificadoPDF({
      certificado: targetCert,
      items: targetItems,
      obraNombre: selectedObra?.nombre || "",
      obraUbicacion: selectedObra?.ubicacion || undefined,
      clienteNombre: selectedObra?.cliente?.nombre || undefined,
      clienteCuit: selectedObra?.cliente?.cuit || undefined,
      categoriaMap,
      etapaMap,
      cantidadTotalMap,
      acumulados: pdfAcumulados,
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
  const draftGroupedCategoria = groupByCategoria(itemsDraft);
  const draftGroupedEtapa = groupByEtapa(itemsDraft);

  // Group view items
  const viewItemsWithCat = viewItems.map((item) => ({
    ...item,
    categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
  }));
  const viewGroupedCategoria = groupByCategoria(viewItemsWithCat);
  const viewItemsWithEtapa = viewItems.map((item) => ({
    ...item,
    etapa: item.etapa || (item.concepto_id && etapaMap[item.concepto_id]) || null,
  }));
  const viewGroupedEtapa = groupByEtapa(viewItemsWithEtapa);

  return (
    <MainLayout title="Certificados de Obra" subtitle="Gestión de certificaciones mensuales por obra">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-end">
            <Select value={selectedObraId} onValueChange={setSelectedObraId}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Seleccionar obra..." />
              </SelectTrigger>
              <SelectContent>
                {loadingObras ? (
                  <SelectItem value="_loading" disabled>Cargando...</SelectItem>
                ) : (
                  obras
                    .filter((o) => o.estado === "activa")
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.nombre}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
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
                <TabsContent value="conceptos" className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Definí los conceptos que aplican a <strong>{selectedObra?.nombre}</strong> y su precio unitario.
                    </p>
                    <Button onClick={() => setAddConceptoOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Concepto
                    </Button>
                  </div>

                  {/* Quick-add standard concepts */}
                  {conceptosEstandarNoAgregados.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          Agregar concepto rápido
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {conceptosEstandarNoAgregados.map((e) => (
                            <Button key={e.nombre} variant="outline" size="sm" onClick={() => handleAddEstandar(e)}>
                              {e.nombre} ({e.unidad})
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {loadingConceptos ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : conceptos.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No hay conceptos configurados para esta obra.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {conceptosGrouped.map((group) => (
                        <Card key={group.categoria}>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                              {group.categoria}
                            </CardTitle>
                          </CardHeader>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="text-right">P. Unitario</TableHead>
                                <TableHead className="text-right">Cant. Total</TableHead>
                                <TableHead>Etapa</TableHead>
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
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* ==================== ADD CONCEPTO DIALOG ==================== */}
          <Dialog open={addConceptoOpen} onOpenChange={setAddConceptoOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Concepto</DialogTitle>
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
                    <Label>Etapa (opcional)</Label>
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

          {/* ==================== CREAR/EDITAR CERTIFICADO DIALOG ==================== */}
          <Dialog open={crearOpen} onOpenChange={(open) => { setCrearOpen(open); if (!open) setEditingCertId(null); }}>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Editar Certificado" : "Nuevo Certificado"} — {selectedObra?.nombre}
                </DialogTitle>
                {(() => {
                  const groups = tipoCert === "servicio" ? draftGroupedCategoria : draftGroupedEtapa;
                  const totalConceptos = itemsDraft.length;
                  const totalGrupos = groups.length;
                  return totalGrupos > 1 ? (
                    <p className="text-xs text-muted-foreground">
                      {totalConceptos} conceptos en {totalGrupos} {tipoCert === "servicio" ? "categorías" : "etapas"} — desplazá para ver todos
                    </p>
                  ) : null;
                })()}
              </DialogHeader>
              <ScrollArea className="max-h-[55vh] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={tipoCert} onValueChange={(v) => setTipoCert(v as TipoCertificado)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="servicio">Servicio</SelectItem>
                          <SelectItem value="obra">Obra (con acumulados)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Período</Label>
                      <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                    </div>
                    {tipoCert === "obra" && (
                      <div>
                        <Label>Anticipo (%)</Label>
                        <Input type="number" min={0} max={100} value={anticipoPorcentaje || ""} onChange={(e) => setAnticipoPorcentaje(Number(e.target.value))} />
                      </div>
                    )}
                    <div className={tipoCert === "obra" ? "" : "sm:col-span-2"}>
                      <Label>Observaciones</Label>
                      <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas adicionales..." className="min-h-[60px]" />
                    </div>
                  </div>

                  {tipoCert === "servicio" ? (
                    /* ---- SERVICIO: same as before, grouped by categoria ---- */
                    <>
                      {draftGroupedCategoria.map((group) => {
                        const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                        return (
                          <div key={group.categoria}>
                            <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.categoria}</div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Concepto</TableHead>
                                  <TableHead>Unidad</TableHead>
                                  <TableHead className="w-28">Cantidad</TableHead>
                                  <TableHead className="w-36">P. Unitario</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.items.map((item) => {
                                  const globalIdx = itemsDraft.indexOf(item);
                                  return (
                                    <TableRow key={globalIdx}>
                                      <TableCell>{item.descripcion}</TableCell>
                                      <TableCell>{item.unidad}</TableCell>
                                      <TableCell>
                                        <Input type="number" min={0} value={item.cantidad || ""} onChange={(e) => updateItemCantidad(globalIdx, Number(e.target.value))} className="h-8" />
                                      </TableCell>
                                      <TableCell>
                                        <Input type="number" min={0} value={item.precio_unitario || ""} onChange={(e) => updateItemPrecio(globalIdx, Number(e.target.value))} className="h-8" />
                                      </TableCell>
                                      <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                    </TableRow>
                                  );
                                })}
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
                    </>
                  ) : (
                    /* ---- OBRA: grouped by etapa with acumulado columns ---- */
                    <>
                      {draftGroupedEtapa.map((group) => {
                        const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                        return (
                          <div key={group.etapa}>
                            <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.etapa}</div>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[120px]">Concepto</TableHead>
                                    <TableHead>Un.</TableHead>
                                    <TableHead className="text-right">P. Unit.</TableHead>
                                    <TableHead className="text-right">Cant. Total</TableHead>
                                    <TableHead className="text-right">Valor Total</TableHead>
                                    <TableHead className="text-right">% Ant.</TableHead>
                                    <TableHead className="w-24">Cant. Actual</TableHead>
                                    <TableHead className="text-right">% Actual</TableHead>
                                    <TableHead className="text-right">% Acum.</TableHead>
                                    <TableHead className="text-right">Av. Ant.</TableHead>
                                    <TableHead className="text-right">Av. Actual</TableHead>
                                    <TableHead className="text-right">Av. Acum.</TableHead>
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
                                        <TableCell className="font-medium">{item.descripcion}</TableCell>
                                        <TableCell>{item.unidad}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                        <TableCell className="text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(valorTotal)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                        <TableCell>
                                          <Input type="number" min={0} value={item.cantidad || ""} onChange={(e) => updateItemCantidad(globalIdx, Number(e.target.value))} className="h-8" />
                                        </TableCell>
                                        <TableCell className="text-right">{formatPercent(pctActual)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(avActual)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                                <TableFooter>
                                  <TableRow>
                                    <TableCell colSpan={10} className="text-right text-sm font-medium">Subtotal {group.etapa}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(groupAvanceActual)}</TableCell>
                                    <TableCell />
                                  </TableRow>
                                </TableFooter>
                              </Table>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                </div>
              </ScrollArea>
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
                ) : (
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

          {/* ==================== VIEW CERTIFICADO DIALOG ==================== */}
          <Dialog open={!!viewCertId} onOpenChange={() => setViewCertId(null)}>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>
                    {viewCert?.numero} — {selectedObra?.nombre}
                    {viewCert && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {viewCert.tipo === "obra" ? "Obra" : "Servicio"}
                      </Badge>
                    )}
                  </span>
                  {viewCert && (
                    <Button size="sm" variant="outline" onClick={() => handleDownloadPDF()}>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar PDF
                    </Button>
                  )}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                {viewCert && (
                  <div className="space-y-4">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Período: {format(new Date(viewCert.periodo + "-01"), "MMMM yyyy", { locale: es })}</span>
                      <Badge variant="secondary" className={ESTADO_COLORS[viewCert.estado]}>{ESTADO_LABELS[viewCert.estado]}</Badge>
                      {viewCert.fecha_emision && <span>Emitido: {format(new Date(viewCert.fecha_emision), "dd/MM/yyyy")}</span>}
                    </div>
                    {loadingItems ? (
                      <Skeleton className="h-40 w-full" />
                    ) : viewCert.tipo === "servicio" ? (
                      <>
                        {viewGroupedCategoria.map((group) => {
                          const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                          return (
                            <div key={group.categoria}>
                              <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.categoria}</div>
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
                    ) : (
                      /* OBRA VIEW */
                      <>
                        {viewGroupedEtapa.map((group) => {
                          const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                          return (
                            <div key={group.etapa}>
                              <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.etapa}</div>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="min-w-[120px]">Concepto</TableHead>
                                      <TableHead>Un.</TableHead>
                                      <TableHead className="text-right">P. Unit.</TableHead>
                                      <TableHead className="text-right">Cant. Total</TableHead>
                                      <TableHead className="text-right">Valor Total</TableHead>
                                      <TableHead className="text-right">% Ant.</TableHead>
                                      <TableHead className="text-right">Cant. Actual</TableHead>
                                      <TableHead className="text-right">% Actual</TableHead>
                                      <TableHead className="text-right">% Acum.</TableHead>
                                      <TableHead className="text-right">Av. Ant.</TableHead>
                                      <TableHead className="text-right">Av. Actual</TableHead>
                                      <TableHead className="text-right">Av. Acum.</TableHead>
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
                                          <TableCell className="font-medium">{item.descripcion}</TableCell>
                                          <TableCell>{item.unidad}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                          <TableCell className="text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(valorTotal)}</TableCell>
                                          <TableCell className="text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                          <TableCell className="text-right">{item.cantidad.toLocaleString("es-AR")}</TableCell>
                                          <TableCell className="text-right">{formatPercent(pctActual)}</TableCell>
                                          <TableCell className="text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                          <TableCell className="text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(avActual)}</TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                  <TableFooter>
                                    <TableRow>
                                      <TableCell colSpan={10} className="text-right text-sm font-medium">Subtotal {group.etapa}</TableCell>
                                      <TableCell className="text-right font-semibold">{formatCurrency(groupAvanceActual)}</TableCell>
                                      <TableCell />
                                    </TableRow>
                                  </TableFooter>
                                </Table>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t pt-3 space-y-1">
                          {(() => {
                            const viewAvAnterior = viewItems.reduce((s, i) => {
                              const ac = viewAcumulados.find((a) => a.concepto_id === i.concepto_id);
                              return s + (ac?.avance_anterior || 0);
                            }, 0);
                            const viewAvActual = viewItems.reduce((s, i) => s + i.subtotal, 0);
                            const viewAvAcumulado = viewAvAnterior + viewAvActual;
                            const viewAnticipo = Math.round(viewAvAcumulado * (viewCert.anticipo_porcentaje / 100));
                            return (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span>Avance Anterior</span>
                                  <span className="text-muted-foreground">{formatCurrency(viewAvAnterior)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Avance Actual</span>
                                  <span className="font-semibold">{formatCurrency(viewAvActual)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Avance Acumulado</span>
                                  <span className="font-semibold">{formatCurrency(viewAvAcumulado)}</span>
                                </div>
                                {viewCert.anticipo_porcentaje > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span>Anticipo ({viewCert.anticipo_porcentaje}%)</span>
                                    <span className="text-muted-foreground">- {formatCurrency(viewAnticipo)}</span>
                                  </div>
                                )}
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
                  </div>
                )}
              </ScrollArea>
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
  onView,
  onEdit,
  onEmitir,
  onCobrar,
  onDelete,
  onDownloadPDF,
}: {
  cert: Certificado;
  onView: () => void;
  onEdit: () => void;
  onEmitir: () => void;
  onCobrar: () => void;
  onDelete: () => void;
  onDownloadPDF: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-lg">{cert.numero}</p>
              <Badge variant="outline" className="text-xs">
                {cert.tipo === "obra" ? "Obra" : "Servicio"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {format(new Date(cert.periodo + "-01"), "MMMM yyyy", { locale: es })}
            </p>
          </div>
          <Badge variant="secondary" className={ESTADO_COLORS[cert.estado]}>
            {ESTADO_LABELS[cert.estado]}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: concepto.nombre,
    unidad: concepto.unidad,
    precio_unitario: String(concepto.precio_unitario),
    categoria: concepto.categoria,
    cantidad_total: String(concepto.cantidad_total || ""),
    etapa: concepto.etapa || "",
  });

  const handleSaveEdit = () => {
    onUpdate({
      nombre: editForm.nombre,
      unidad: editForm.unidad,
      precio_unitario: Number(editForm.precio_unitario),
      categoria: editForm.categoria,
      cantidad_total: Number(editForm.cantidad_total) || 0,
      etapa: editForm.etapa || null,
    });
    setEditDialogOpen(false);
  };

  return (
    <>
      <TableRow className={!concepto.activo ? "opacity-50" : ""}>
        <TableCell className="font-medium">{concepto.nombre}</TableCell>
        <TableCell>{concepto.unidad}</TableCell>
        <TableCell className="text-right">{formatCurrency(concepto.precio_unitario)}</TableCell>
        <TableCell className="text-right">{concepto.cantidad_total > 0 ? concepto.cantidad_total.toLocaleString("es-AR") : "-"}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{concepto.etapa || "-"}</TableCell>
        <TableCell>
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
        <TableCell className="text-right">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar concepto</TooltipContent>
            </Tooltip>

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

      {/* Edit Concepto Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Concepto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={editForm.nombre} onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Horas Retro" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={editForm.categoria} onValueChange={(v) => setEditForm((p) => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_CERTIFICADO.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa (opcional)</Label>
                <Input value={editForm.etapa} onChange={(e) => setEditForm((p) => ({ ...p, etapa: e.target.value }))} placeholder="Ej: ETAPA 2" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unidad</Label>
                <Select value={editForm.unidad} onValueChange={(v) => setEditForm((p) => ({ ...p, unidad: v }))}>
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
                <Input type="number" value={editForm.precio_unitario} onChange={(e) => setEditForm((p) => ({ ...p, precio_unitario: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Cant. Total</Label>
                <Input type="number" value={editForm.cantidad_total} onChange={(e) => setEditForm((p) => ({ ...p, cantidad_total: e.target.value }))} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.nombre || !editForm.unidad}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
