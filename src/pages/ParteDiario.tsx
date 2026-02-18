import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { useParteDiario, type ParteDiario as ParteDiarioType } from "@/hooks/useParteDiario";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { saveToOfflineCache, loadFromOfflineCache } from "@/hooks/useOfflineCache";
import { supabase } from "@/integrations/supabase/client";
import { useCargasRepartidor } from "@/hooks/useCargasRepartidor";
import { ParteDiarioHomeView } from "@/components/parte-diario/ParteDiarioHomeView";
import { ParteDiarioListView } from "@/components/parte-diario/ParteDiarioListView";
import { ParteDiarioFormView } from "@/components/parte-diario/ParteDiarioFormView";
import { ParteDiarioAdminView } from "@/components/parte-diario/ParteDiarioAdminView";
import { CargaCombustibleRepartidorDialog } from "@/components/parte-diario/CargaCombustibleRepartidorDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo' | 'repartidor_calecita';

const ROL_LABELS: Record<RolPersonal, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
  repartidor_calecita: 'Repartidor Calecita',
};

type ViewMode = 'home' | 'form' | 'list';

const ParteDiario = () => {
  const { role, loading: loadingAuth } = useAuth();
  const { empleado, rolPersonal, loading: loadingEmpleado } = useEmpleadoProfile();
  const { 
    partes = [], 
    partesHoy = [],
    borradorHoy,
    partesCompletadosHoy = [],
    saveDraft, 
    completeParte, 
    discardDraft,
    isSaving,
    isDeleting,
    isLoading: loadingPartes,
  } = useParteDiario();
  const { obras: obrasFromDB = [] } = useObras();
  const { maquinarias: maquinariasFromDB = [] } = useMaquinarias();

  // Offline cache: save when we have fresh data, fall back to cache when empty
  useEffect(() => {
    if (obrasFromDB.length > 0) saveToOfflineCache('obras', obrasFromDB);
  }, [obrasFromDB]);
  useEffect(() => {
    if (maquinariasFromDB.length > 0) saveToOfflineCache('maquinarias', maquinariasFromDB);
  }, [maquinariasFromDB]);

  const obras = obrasFromDB.length > 0
    ? obrasFromDB
    : (loadFromOfflineCache<typeof obrasFromDB>('obras') ?? []);
  const maquinarias = maquinariasFromDB.length > 0
    ? maquinariasFromDB
    : (loadFromOfflineCache<typeof maquinariasFromDB>('maquinarias') ?? []);

  const { data: personal = [] } = useQuery({
    queryKey: ['personal_selector'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_selector" as any)
        .select("id, nombre, apellido, legajo, rol")
        .eq("activo", true)
        .order("apellido");
      if (error) throw error;
      return (data || []) as unknown as { id: string; nombre: string | null; apellido: string | null; legajo: string | null; rol: string | null }[];
    },
  });
  const [view, setView] = useState<ViewMode>('home');
  const [editingParte, setEditingParte] = useState<ParteDiarioType | null>(null);
  const [showEntregaDialog, setShowEntregaDialog] = useState(false);
  const [editingCarga, setEditingCarga] = useState<any>(null);
  const [deletingCarga, setDeletingCarga] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const rol = rolPersonal as RolPersonal | null;
  const isAdmin = role === 'admin';
  const isRepartidor = rol === 'repartidor_calecita';

  // For repartidor: query by repartidor_id to get all their loads
  const { 
    cargas: cargasRepartidor, 
    totalLitros,
    createCarga, 
    updateCarga,
    deleteCarga,
    isCreating: isCreatingCarga,
    isUpdating: isUpdatingCarga,
    isDeleting: isDeletingCarga,
  } = useCargasRepartidor(null, isRepartidor ? empleado?.id : null);

  // Filter deliveries by selected date
  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDateStr = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);
  const isToday = selectedDateStr === todayStr;

  const cargasFiltered = useMemo(() => {
    return cargasRepartidor.filter(c => c.fecha === selectedDateStr);
  }, [cargasRepartidor, selectedDateStr]);

  const totalLitrosFiltered = useMemo(() => {
    return cargasFiltered.reduce((sum, c) => sum + (c.litros || 0), 0);
  }, [cargasFiltered]);

  const handlePrevDay = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d > today ? prev : d;
    });
  }, []);

  // Loading state (evitar "flicker" en admin y en refreshes silenciosos)
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin/Capataz view - show all partes
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <main className="container mx-auto px-4 py-4">
          <ParteDiarioAdminView />
        </main>
      </div>
    );
  }

  // Para roles no-admin, esperamos el perfil de empleado solo si aún no existe
  if (loadingEmpleado && !empleado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No profile found
  if (!empleado) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-8 text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold">Perfil no encontrado</h2>
              <p className="text-muted-foreground">
                Tu cuenta no está vinculada a un empleado. Contacta al administrador.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleNewParte = () => {
    // Always open a blank form for new parte
    setEditingParte(null);
    setView('form');
  };

  const handleContinueDraft = () => {
    setEditingParte(borradorHoy);
    setView('form');
  };

  const handleEditCompletado = (parte: ParteDiarioType) => {
    setEditingParte(parte);
    setView('form');
  };

  const handleDiscardDraft = async () => {
    await discardDraft();
  };

  const handleViewList = () => {
    setView('list');
  };

  const handleBack = () => {
    setEditingParte(null);
    setView('home');
  };

  const handleEditParte = (parte: ParteDiarioType) => {
    setEditingParte(parte);
    setView('form');
  };

  const handleSaveDraft = async (data: any) => {
    await saveDraft(data, editingParte?.id);
    handleBack();
  };

  const handleComplete = async (data: any) => {
    await completeParte(data, editingParte?.id);
    handleBack();
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      
      <main className="container mx-auto px-4 py-4 max-w-lg">
        {view === 'home' && (
          <>
            <ParteDiarioHomeView
              borradorHoy={borradorHoy}
              partesCompletadosHoy={partesCompletadosHoy}
              nombreEmpleado={empleado.nombreCompleto}
              rolLabel={rol ? ROL_LABELS[rol] : 'Empleado'}
              isRepartidor={isRepartidor}
              entregasHoyCount={cargasFiltered.length}
              cargasHoy={cargasFiltered}
              totalLitrosHoy={totalLitrosFiltered}
              isDeletingCarga={isDeletingCarga}
              selectedDate={selectedDate}
              isToday={isToday}
              onPrevDay={handlePrevDay}
              onNextDay={handleNextDay}
              onNewParte={handleNewParte}
              onViewList={handleViewList}
              onContinueDraft={handleContinueDraft}
              onDiscardDraft={handleDiscardDraft}
              onEditCompletado={handleEditCompletado}
              onRegistrarEntrega={() => { setEditingCarga(null); setShowEntregaDialog(true); }}
              onEditCarga={(carga) => { setEditingCarga(carga); setShowEntregaDialog(true); }}
              onDeleteCarga={(carga) => setDeletingCarga(carga)}
              isDiscarding={isDeleting}
            />
            {isRepartidor && (
              <>
                <CargaCombustibleRepartidorDialog
                  open={showEntregaDialog}
                  onOpenChange={setShowEntregaDialog}
                  carga={editingCarga}
                  fechaParte={todayStr}
                  personal={personal}
                  maquinarias={maquinarias}
                  obras={obras}
                  onSave={async (data) => {
                    if (editingCarga) {
                      await updateCarga({ id: editingCarga.id, ...data });
                    } else {
                      await createCarga({
                        ...data,
                        repartidor_id: empleado.id,
                      });
                    }
                  }}
                  isSaving={isCreatingCarga || isUpdatingCarga}
                />
                <DeleteConfirmDialog
                  open={!!deletingCarga}
                  onOpenChange={(open) => { if (!open) setDeletingCarga(null); }}
                  onConfirm={async () => {
                    if (deletingCarga) {
                      await deleteCarga(deletingCarga.id);
                      setDeletingCarga(null);
                    }
                  }}
                  title="¿Eliminar entrega?"
                  description="Se eliminará permanentemente esta entrega de combustible."
                />
              </>
            )}
          </>
        )}

        {view === 'list' && (
          <ParteDiarioListView
            partes={partes}
            onBack={handleBack}
            onEdit={handleEditParte}
          />
        )}

        {view === 'form' && (
          <ParteDiarioFormView
            parte={editingParte}
            empleadoId={empleado.id}
            rol={rol}
            obras={obras}
            maquinarias={maquinarias}
            personal={personal}
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
            onComplete={handleComplete}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
};

export default ParteDiario;
