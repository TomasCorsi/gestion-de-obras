import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { useParteDiario, type ParteDiario as ParteDiarioType } from "@/hooks/useParteDiario";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { usePersonal } from "@/hooks/usePersonal";
import { ParteDiarioHomeView } from "@/components/parte-diario/ParteDiarioHomeView";
import { ParteDiarioListView } from "@/components/parte-diario/ParteDiarioListView";
import { ParteDiarioFormView } from "@/components/parte-diario/ParteDiarioFormView";
import { ParteDiarioAdminView } from "@/components/parte-diario/ParteDiarioAdminView";

type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo';

const ROL_LABELS: Record<RolPersonal, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
};

type ViewMode = 'home' | 'form' | 'list';

const ParteDiario = () => {
  const { role, loading: loadingAuth } = useAuth();
  const { empleado, rolPersonal, loading: loadingEmpleado } = useEmpleadoProfile();
  const { 
    partes = [], 
    parteHoy,
    borradorHoy,
    parteCompletadoHoy,
    saveDraft, 
    completeParte, 
    discardDraft,
    isSaving,
    isDeleting,
    isLoading: loadingPartes,
  } = useParteDiario();
  const { obras = [] } = useObras();
  const { maquinarias = [] } = useMaquinarias();
  const { personal = [] } = usePersonal();
  
  const [view, setView] = useState<ViewMode>('home');
  const [editingParte, setEditingParte] = useState<ParteDiarioType | null>(null);

  const rol = rolPersonal as RolPersonal | null;
  const isAdmin = role === 'admin';

  // Loading state
  if (loadingAuth || loadingEmpleado) {
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
    // If there's any parte today (draft or completed), load it for editing
    if (parteHoy) {
      setEditingParte(parteHoy);
    } else {
      setEditingParte(null);
    }
    setView('form');
  };

  const handleContinueDraft = () => {
    setEditingParte(borradorHoy);
    setView('form');
  };

  const handleEditCompletado = () => {
    setEditingParte(parteCompletadoHoy);
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
    await saveDraft(data);
    handleBack();
  };

  const handleComplete = async (data: any) => {
    await completeParte(data);
    handleBack();
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      
      <main className="container mx-auto px-4 py-4 max-w-lg">
        {view === 'home' && (
          <ParteDiarioHomeView
            borradorHoy={borradorHoy}
            parteCompletadoHoy={parteCompletadoHoy}
            nombreEmpleado={empleado.nombreCompleto}
            rolLabel={rol ? ROL_LABELS[rol] : 'Empleado'}
            onNewParte={handleNewParte}
            onViewList={handleViewList}
            onContinueDraft={handleContinueDraft}
            onDiscardDraft={handleDiscardDraft}
            onEditCompletado={handleEditCompletado}
            isDiscarding={isDeleting}
          />
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
