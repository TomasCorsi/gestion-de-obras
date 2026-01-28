import { Plus, ClipboardList, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ParteDiario } from "@/hooks/useParteDiario";

interface ParteDiarioHomeViewProps {
  borradorHoy: ParteDiario | null;
  nombreEmpleado: string;
  rolLabel: string;
  onNewParte: () => void;
  onViewList: () => void;
  onContinueDraft: () => void;
  onDiscardDraft: () => void;
  isDiscarding?: boolean;
}

export const ParteDiarioHomeView = ({
  borradorHoy,
  nombreEmpleado,
  rolLabel,
  onNewParte,
  onViewList,
  onContinueDraft,
  onDiscardDraft,
  isDiscarding = false,
}: ParteDiarioHomeViewProps) => {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-foreground">📋 Parte Diario</h1>
        <p className="text-muted-foreground mt-1">
          Hola, {nombreEmpleado} ({rolLabel})
        </p>
      </div>

      {/* Main buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={onNewParte} 
          className="h-28 flex-col gap-3 text-lg"
          size="lg"
        >
          <Plus className="w-10 h-10" />
          <span className="font-semibold">Nuevo Parte</span>
        </Button>
        <Button 
          onClick={onViewList} 
          variant="outline" 
          className="h-28 flex-col gap-3 text-lg"
          size="lg"
        >
          <ClipboardList className="w-10 h-10" />
          <span className="font-semibold">Ver Mis Partes</span>
        </Button>
      </div>

      {/* Draft alert */}
      {borradorHoy && (
        <Alert className="bg-amber-500/10 border-amber-500/50">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-foreground">Tienes un borrador sin completar</p>
                <p className="text-sm text-muted-foreground">
                  Fecha: {format(new Date(borradorHoy.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                  {borradorHoy.obras && ` • ${borradorHoy.obras.nombre}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onContinueDraft} className="flex-1">
                  Continuar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onDiscardDraft}
                  disabled={isDiscarding}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Descartar
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
