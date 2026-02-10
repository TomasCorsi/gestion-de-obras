import { Plus, ClipboardList, AlertCircle, Trash2, CheckCircle2, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ParteDiario } from "@/hooks/useParteDiario";
import type { CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { CargasCombustibleRepartidorList } from "./CargasCombustibleRepartidorList";

interface ParteDiarioHomeViewProps {
  borradorHoy: ParteDiario | null;
  parteCompletadoHoy: ParteDiario | null;
  nombreEmpleado: string;
  rolLabel: string;
  isRepartidor?: boolean;
  entregasHoyCount?: number;
  cargasHoy?: CargaRepartidor[];
  totalLitrosHoy?: number;
  isDeletingCarga?: boolean;
  onNewParte: () => void;
  onViewList: () => void;
  onContinueDraft: () => void;
  onDiscardDraft: () => void;
  onEditCompletado: () => void;
  onRegistrarEntrega?: () => void;
  onEditCarga?: (carga: CargaRepartidor) => void;
  onDeleteCarga?: (carga: CargaRepartidor) => void;
  isDiscarding?: boolean;
}

export const ParteDiarioHomeView = ({
  borradorHoy,
  parteCompletadoHoy,
  nombreEmpleado,
  rolLabel,
  isRepartidor = false,
  entregasHoyCount = 0,
  cargasHoy = [],
  totalLitrosHoy = 0,
  isDeletingCarga = false,
  onNewParte,
  onViewList,
  onContinueDraft,
  onDiscardDraft,
  onEditCompletado,
  onRegistrarEntrega,
  onEditCarga,
  onDeleteCarga,
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
      <div className={`grid ${isRepartidor ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
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
        {isRepartidor && onRegistrarEntrega && (
          <Button 
            onClick={onRegistrarEntrega} 
            variant="secondary"
            className="h-28 flex-col gap-3 text-lg"
            size="lg"
          >
            <Fuel className="w-10 h-10" />
            <span className="font-semibold text-sm">Registrar Entrega</span>
          </Button>
        )}
      </div>

      {/* Entregas hoy list for repartidor */}
      {isRepartidor && cargasHoy.length > 0 && onEditCarga && onDeleteCarga && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Entregas de hoy ({entregasHoyCount})
          </h2>
          <CargasCombustibleRepartidorList
            cargas={cargasHoy}
            totalLitros={totalLitrosHoy}
            onEdit={onEditCarga}
            onDelete={onDeleteCarga}
            isDeleting={isDeletingCarga}
          />
        </div>
      )}

      {/* Entregas hoy summary when no cargas */}
      {isRepartidor && cargasHoy.length === 0 && (
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">
            No registraste entregas hoy
          </p>
        </div>
      )}

      {/* Completed parte alert */}
      {parteCompletadoHoy && !borradorHoy && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-foreground">Ya completaste tu parte de hoy ✓</p>
                <p className="text-sm text-muted-foreground">
                  {parteCompletadoHoy.obras && `Obra: ${parteCompletadoHoy.obras.nombre}`}
                  {parteCompletadoHoy.hora_entrada && parteCompletadoHoy.hora_salida && 
                    ` • ${parteCompletadoHoy.hora_entrada} - ${parteCompletadoHoy.hora_salida}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={onEditCompletado} className="w-full">
                Editar parte de hoy
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Draft alert */}
      {borradorHoy && (
        <Alert className="bg-amber-500/10 border-amber-500/50">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-foreground">Tienes un borrador sin completar</p>
                <p className="text-sm text-muted-foreground">
                  Fecha: {format(parseISO(borradorHoy.fecha), "d 'de' MMMM, yyyy", { locale: es })}
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