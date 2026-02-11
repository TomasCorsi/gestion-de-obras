import { Plus, ClipboardList, AlertCircle, Trash2, CheckCircle2, Fuel, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ParteDiario } from "@/hooks/useParteDiario";
import type { CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { CargasCombustibleRepartidorList } from "./CargasCombustibleRepartidorList";

interface ParteDiarioHomeViewProps {
  borradorHoy: ParteDiario | null;
  partesCompletadosHoy: ParteDiario[];
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
  onEditCompletado: (parte: ParteDiario) => void;
  onRegistrarEntrega?: () => void;
  onEditCarga?: (carga: CargaRepartidor) => void;
  onDeleteCarga?: (carga: CargaRepartidor) => void;
  isDiscarding?: boolean;
}

export const ParteDiarioHomeView = ({
  borradorHoy,
  partesCompletadosHoy,
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
      <div className={`grid ${isRepartidor ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
        <Button 
          onClick={onNewParte} 
          className="h-24 flex-col gap-2 px-2"
          size="lg"
        >
          <Plus className="w-8 h-8" />
          <span className="font-semibold text-xs leading-tight text-center">Nuevo Parte</span>
        </Button>
        <Button 
          onClick={onViewList} 
          variant="outline" 
          className="h-24 flex-col gap-2 px-2"
          size="lg"
        >
          <ClipboardList className="w-8 h-8" />
          <span className="font-semibold text-xs leading-tight text-center">Mis Partes</span>
        </Button>
        {isRepartidor && onRegistrarEntrega && (
          <Button 
            onClick={onRegistrarEntrega} 
            variant="secondary"
            className="h-24 flex-col gap-2 px-2"
            size="lg"
          >
            <Fuel className="w-8 h-8" />
            <span className="font-semibold text-xs leading-tight text-center">Entrega</span>
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

      {/* Completed partes list */}
      {partesCompletadosHoy.length > 0 && !borradorHoy && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <p className="font-semibold text-foreground">
                {partesCompletadosHoy.length === 1 
                  ? 'Ya completaste tu parte de hoy ✓'
                  : `Completaste ${partesCompletadosHoy.length} partes hoy ✓`}
              </p>
              <div className="space-y-2">
                {partesCompletadosHoy.map(parte => (
                  <div key={parte.id} className="flex items-center justify-between bg-background/50 rounded-md p-2">
                    <div className="text-sm">
                      {parte.maquinarias 
                        ? <span className="font-medium">{parte.maquinarias.codigo || parte.maquinarias.tipo}{parte.maquinarias.patente ? ` - ${parte.maquinarias.patente}` : ''}</span>
                        : parte.obras 
                          ? <span className="font-medium">{parte.obras.nombre}</span>
                          : <span className="text-muted-foreground">Sin máquina</span>
                      }
                      {parte.hora_entrada && parte.hora_salida && (
                        <span className="text-muted-foreground ml-2">
                          {parte.hora_entrada} - {parte.hora_salida}
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onEditCompletado(parte)} className="h-8 w-8 p-0">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
                  {borradorHoy.maquinarias && ` • ${borradorHoy.maquinarias.codigo || borradorHoy.maquinarias.tipo}`}
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
