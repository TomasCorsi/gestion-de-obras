import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useObras } from "@/hooks/useObras";
import {
  useCertificados,
  CONCEPTOS_ESTANDAR,
  CATEGORIAS_CERTIFICADO,
  type CertificadoItemForm,
  type CertificadoItem,
  type EstadoCertificado,
} from "@/hooks/useCertificados";
import { generateCertificadoPDF } from "@/utils/generateCertificadoPDF";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const ESTADO_COLORS: Record<EstadoCertificado, string> = {
  borrador: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  emitido: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  cobrado: "bg-green-500/15 text-green-700 dark:text-green-400",
};

/** Group items by categoria, return sorted entries */
function groupByCategoria<T extends { categoria?: string }>(
  items: T[]
): { categoria: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const cat = item.categoria || "General";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  });
  // Sort by CATEGORIAS_CERTIFICADO order
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ia = CATEGORIAS_CERTIFICADO.indexOf(a);
      const ib = CATEGORIAS_CERTIFICADO.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([categoria, items]) => ({ categoria, items }));
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
    updateCertificadoEstado,
    deleteCertificado,
  } = useCertificados(selectedObraId);

  // ---- Add concepto dialog ----
  const [addConceptoOpen, setAddConceptoOpen] = useState(false);
  const [newConcepto, setNewConcepto] = useState({
    nombre: "",
    unidad: "",
    precio_unitario: "",
    categoria: "General",
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
    });
    setNewConcepto({ nombre: "", unidad: "", precio_unitario: "", categoria: "General" });
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

  // ---- Nuevo certificado ----
  const [crearOpen, setCrearOpen] = useState(false);
  const [periodo, setPeriodo] = useState(() => format(new Date(), "yyyy-MM"));
  const [itemsDraft, setItemsDraft] = useState<CertificadoItemForm[]>([]);

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
      }))
    );
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

  const handleCrearCertificado = async () => {
    await createCertificado({ periodo, items: itemsDraft });
    setCrearOpen(false);
  };

  // ---- Ver certificado ----
  const [viewCertId, setViewCertId] = useState<string | null>(null);
  const [viewItems, setViewItems] = useState<CertificadoItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const viewCert = certificados.find((c) => c.id === viewCertId);

  const openViewCert = async (id: string) => {
    setViewCertId(id);
    setLoadingItems(true);
    const items = await fetchItems(id);
    setViewItems(items);
    setLoadingItems(false);
  };

  // Build categoriaMap for PDF (concepto_id -> categoria)
  const categoriaMap: Record<string, string> = {};
  conceptos.forEach((c) => {
    categoriaMap[c.id] = c.categoria;
  });

  const handleDownloadPDF = async () => {
    if (!viewCert) return;
    await generateCertificadoPDF({
      certificado: viewCert,
      items: viewItems,
      obraNombre: selectedObra?.nombre || "",
      obraUbicacion: selectedObra?.ubicacion || undefined,
      categoriaMap,
    });
  };

  const conceptosEstandarNoAgregados = CONCEPTOS_ESTANDAR.filter(
    (e) => !conceptos.some((c) => c.nombre === e.nombre)
  );

  // Group conceptos by categoria for display
  const conceptosGrouped = groupByCategoria(conceptos);

  // Group draft items by categoria
  const draftGrouped = groupByCategoria(itemsDraft);

  // Group view items by categoria (using conceptos map)
  const viewItemsWithCat = viewItems.map((item) => ({
    ...item,
    categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
  }));
  const viewGrouped = groupByCategoria(viewItemsWithCat);

  return (
    <MainLayout title="Certificados de Obra" subtitle="Gestión de certificaciones mensuales por obra">
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
          <Tabs defaultValue="certificados">
            <TabsList>
              <TabsTrigger value="certificados">Certificados</TabsTrigger>
              <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
            </TabsList>

            {/* ==================== CERTIFICADOS TAB ==================== */}
            <TabsContent value="certificados" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={openCrearCertificado}
                  disabled={conceptos.filter((c) => c.activo).length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Certificado
                </Button>
              </div>

              {loadingCertificados ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : certificados.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay certificados para esta obra.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nro</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">IVA</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificados.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell className="font-medium">{cert.numero}</TableCell>
                          <TableCell>
                            {format(new Date(cert.periodo + "-01"), "MMMM yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={ESTADO_COLORS[cert.estado]}>
                              {cert.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(cert.subtotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cert.iva)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(cert.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => openViewCert(cert.id)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {cert.estado === "borrador" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    updateCertificadoEstado({
                                      id: cert.id,
                                      estado: "emitido",
                                      fecha_emision: format(new Date(), "yyyy-MM-dd"),
                                    })
                                  }
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                              {cert.estado === "emitido" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    updateCertificadoEstado({ id: cert.id, estado: "cobrado" })
                                  }
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              {cert.estado === "borrador" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Eliminar certificado</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        ¿Estás seguro de eliminar {cert.numero}? Esta acción no se puede deshacer.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteCertificado(cert.id)}>
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
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
                        <Button
                          key={e.nombre}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddEstandar(e)}
                        >
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
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Precio Unitario</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conceptosGrouped.map((group) => (
                        group.items.map((c, idx) => (
                          <ConceptoRow
                            key={c.id}
                            concepto={c}
                            showCategoryBadge
                            onUpdate={(updates) => updateConcepto({ id: c.id, ...updates })}
                            onDelete={() => deleteConcepto(c.id)}
                          />
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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
                <Input
                  value={newConcepto.nombre}
                  onChange={(e) => setNewConcepto((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Horas Retro"
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={newConcepto.categoria}
                  onValueChange={(v) => setNewConcepto((p) => ({ ...p, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_CERTIFICADO.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidad</Label>
                <Select
                  value={newConcepto.unidad}
                  onValueChange={(v) => setNewConcepto((p) => ({ ...p, unidad: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Precio Unitario</Label>
                <Input
                  type="number"
                  value={newConcepto.precio_unitario}
                  onChange={(e) => setNewConcepto((p) => ({ ...p, precio_unitario: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddConceptoOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddConcepto} disabled={!newConcepto.nombre || !newConcepto.unidad}>
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== CREAR CERTIFICADO DIALOG ==================== */}
        <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Certificado — {selectedObra?.nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Período</Label>
                <Input
                  type="month"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                />
              </div>

              {draftGrouped.map((group) => {
                const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                return (
                  <div key={group.categoria}>
                    <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">
                      {group.categoria}
                    </div>
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
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.cantidad || ""}
                                  onChange={(e) => updateItemCantidad(globalIdx, Number(e.target.value))}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.precio_unitario || ""}
                                  onChange={(e) => updateItemPrecio(globalIdx, Number(e.target.value))}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={4} className="text-right text-sm font-medium">
                            Subtotal {group.categoria}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(groupSubtotal)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="border-t pt-3 space-y-1">
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCrearOpen(false)}>Cancelar</Button>
              <Button onClick={handleCrearCertificado} disabled={draftSubtotal === 0}>
                Crear Certificado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== VIEW CERTIFICADO DIALOG ==================== */}
        <Dialog open={!!viewCertId} onOpenChange={() => setViewCertId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{viewCert?.numero} — {selectedObra?.nombre}</span>
                {viewCert && (
                  <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {viewCert && (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    Período:{" "}
                    {format(new Date(viewCert.periodo + "-01"), "MMMM yyyy", { locale: es })}
                  </span>
                  <Badge variant="secondary" className={ESTADO_COLORS[viewCert.estado]}>
                    {viewCert.estado}
                  </Badge>
                  {viewCert.fecha_emision && (
                    <span>Emitido: {format(new Date(viewCert.fecha_emision), "dd/MM/yyyy")}</span>
                  )}
                </div>
                {loadingItems ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <>
                    {viewGrouped.map((group) => {
                      const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                      return (
                        <div key={group.categoria}>
                          <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">
                            {group.categoria}
                          </div>
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
                                <TableCell colSpan={4} className="text-right text-sm font-medium">
                                  Subtotal {group.categoria}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(groupSubtotal)}
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      );
                    })}

                    {/* Totals */}
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
                )}
                {viewCert.observaciones && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Observaciones:</strong> {viewCert.observaciones}
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// ---- Inline editable concepto row ----

function ConceptoRow({
  concepto,
  showCategoryBadge,
  onUpdate,
  onDelete,
}: {
  concepto: { id: string; nombre: string; unidad: string; precio_unitario: number; activo: boolean; categoria: string };
  showCategoryBadge?: boolean;
  onUpdate: (u: { precio_unitario?: number; activo?: boolean; categoria?: string }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [precio, setPrecio] = useState(String(concepto.precio_unitario));

  const save = () => {
    onUpdate({ precio_unitario: Number(precio) });
    setEditing(false);
  };

  return (
    <TableRow className={!concepto.activo ? "opacity-50" : ""}>
      <TableCell className="font-medium">{concepto.nombre}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {concepto.categoria}
        </Badge>
      </TableCell>
      <TableCell>{concepto.unidad}</TableCell>
      <TableCell className="text-right">
        {editing ? (
          <Input
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="h-8 w-32 ml-auto"
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer hover:underline"
            onClick={() => setEditing(true)}
          >
            {formatCurrency(concepto.precio_unitario)}
          </span>
        )}
      </TableCell>
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
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
      </TableCell>
    </TableRow>
  );
}
