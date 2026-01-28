import { useState, useEffect } from "react";
import { es } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Calendar, Clock, Fuel, ClipboardCheck, FileEdit, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ParteDiario, ParteDiarioInsert } from "@/hooks/useParteDiario";

type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo';

interface ParteDiarioFormViewProps {
  parte: ParteDiario | null;
  empleadoId: string;
  rol: RolPersonal | null;
  obras: Array<{ id: string; nombre: string; estado: string }>;
  maquinarias: Array<{ id: string; codigo: string | null; tipo: string; patente: string | null }>;
  onBack: () => void;
  onSaveDraft: (data: ParteDiarioInsert) => Promise<void>;
  onComplete: (data: ParteDiarioInsert) => Promise<void>;
  isSaving: boolean;
}

export const ParteDiarioFormView = ({
  parte,
  empleadoId,
  rol,
  obras,
  maquinarias,
  onBack,
  onSaveDraft,
  onComplete,
  isSaving,
}: ParteDiarioFormViewProps) => {
  const [savingType, setSavingType] = useState<'draft' | 'complete' | null>(null);
  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    obra_id: '',
    maquinaria_id: '',
    hora_entrada: '',
    hora_salida: '',
    horometro_inicio: '',
    horometro_fin: '',
    combustible: '',
    cantidad_viajes: '',
    cantidad_movimiento_interno: '',
    estado_maquina: 'OK' as 'OK' | 'OBSERVACION',
    observacion_maquina: '',
    check_filtro_aire: false,
    check_aceite_motor: false,
    check_aceite_hidraulico: false,
    check_liquido_refrigerante: false,
    check_uria: false,
  });

  // Load existing parte data
  useEffect(() => {
    if (parte) {
      setFormData({
        fecha: parte.fecha,
        obra_id: parte.obra_id || '',
        maquinaria_id: parte.maquinaria_id || '',
        hora_entrada: parte.hora_entrada || '',
        hora_salida: parte.hora_salida || '',
        horometro_inicio: parte.horometro_inicio?.toString() || '',
        horometro_fin: parte.horometro_fin?.toString() || '',
        combustible: parte.combustible?.toString() || '',
        cantidad_viajes: parte.cantidad_viajes?.toString() || '',
        cantidad_movimiento_interno: parte.cantidad_movimiento_interno?.toString() || '',
        estado_maquina: (parte.estado_maquina as 'OK' | 'OBSERVACION') || 'OK',
        observacion_maquina: parte.observacion_maquina || '',
        check_filtro_aire: parte.check_filtro_aire || false,
        check_aceite_motor: parte.check_aceite_motor || false,
        check_aceite_hidraulico: parte.check_aceite_hidraulico || false,
        check_liquido_refrigerante: parte.check_liquido_refrigerante || false,
        check_uria: parte.check_uria || false,
      });
    }
  }, [parte]);

  // Field visibility based on role
  const showObraField = rol === 'maquinista';
  const showMaquinaField = rol === 'maquinista' || rol === 'chofer';
  const showHorometro = rol === 'maquinista';
  const showViajes = rol === 'chofer';
  const showCombustible = rol === 'maquinista' || rol === 'chofer';
  const showEstadoMaquina = rol === 'maquinista' || rol === 'chofer';

  const checklistItems = [
    { id: 'check_filtro_aire', label: 'Revisión filtro de aire', roles: ['maquinista'] },
    { id: 'check_aceite_motor', label: 'Control aceite motor', roles: ['maquinista', 'chofer'] },
    { id: 'check_aceite_hidraulico', label: 'Control aceite hidráulico', roles: ['maquinista'] },
    { id: 'check_liquido_refrigerante', label: 'Control líquido refrigerante', roles: ['chofer'] },
    { id: 'check_uria', label: 'Control Uría', roles: ['chofer'] },
  ].filter(item => rol && item.roles.includes(rol));

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buildParteData = (): ParteDiarioInsert => {
    return {
      fecha: formData.fecha,
      personal_id: empleadoId,
      obra_id: formData.obra_id || null,
      maquinaria_id: formData.maquinaria_id || null,
      hora_entrada: formData.hora_entrada || null,
      hora_salida: formData.hora_salida || null,
      horometro_inicio: parseFloat(formData.horometro_inicio) || 0,
      horometro_fin: parseFloat(formData.horometro_fin) || 0,
      combustible: parseFloat(formData.combustible) || 0,
      cantidad_viajes: parseInt(formData.cantidad_viajes) || 0,
      cantidad_movimiento_interno: parseInt(formData.cantidad_movimiento_interno) || 0,
      estado_maquina: showEstadoMaquina ? formData.estado_maquina : null,
      observacion_maquina: formData.estado_maquina === 'OBSERVACION' ? formData.observacion_maquina : null,
      check_filtro_aire: formData.check_filtro_aire,
      check_aceite_motor: formData.check_aceite_motor,
      check_aceite_hidraulico: formData.check_aceite_hidraulico,
      check_liquido_refrigerante: formData.check_liquido_refrigerante,
      check_uria: formData.check_uria,
    };
  };

  const validateForComplete = (): boolean => {
    if (showHorometro) {
      const inicio = parseFloat(formData.horometro_inicio) || 0;
      const fin = parseFloat(formData.horometro_fin) || 0;
      if (fin > 0 && fin < inicio) {
        toast.error('El horómetro fin debe ser mayor al inicio');
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setSavingType('draft');
    try {
      await onSaveDraft(buildParteData());
    } finally {
      setSavingType(null);
    }
  };

  const handleComplete = async () => {
    if (!validateForComplete()) return;
    setSavingType('complete');
    try {
      await onComplete(buildParteData());
    } finally {
      setSavingType(null);
    }
  };

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {parte ? 'Editar Parte' : 'Nuevo Parte'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(formData.fecha), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Fecha */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label htmlFor="fecha" className="text-sm text-muted-foreground">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  className="h-12 text-lg border-0 p-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Obra */}
        {showObraField && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">🏗️ Obra</Label>
              <Select value={formData.obra_id} onValueChange={(v) => handleChange('obra_id', v)}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Seleccionar obra..." />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {obras.filter(o => o.estado === 'activa').map(obra => (
                    <SelectItem key={obra.id} value={obra.id} className="text-base py-3">
                      {obra.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Horarios */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <Label className="text-sm text-muted-foreground">Horarios</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora_entrada" className="text-xs text-muted-foreground">Entrada</Label>
                <Input
                  id="hora_entrada"
                  type="time"
                  value={formData.hora_entrada}
                  onChange={(e) => handleChange('hora_entrada', e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
              <div>
                <Label htmlFor="hora_salida" className="text-xs text-muted-foreground">Salida</Label>
                <Input
                  id="hora_salida"
                  type="time"
                  value={formData.hora_salida}
                  onChange={(e) => handleChange('hora_salida', e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Máquina/Camión */}
        {showMaquinaField && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">
                🚜 {rol === 'chofer' ? 'Camión' : 'Máquina'}
              </Label>
              <Select value={formData.maquinaria_id} onValueChange={(v) => handleChange('maquinaria_id', v)}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-60">
                  {maquinarias.map(maq => (
                    <SelectItem key={maq.id} value={maq.id} className="text-base py-3">
                      {maq.codigo || maq.tipo} {maq.patente ? `- ${maq.patente}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Horómetro */}
        {showHorometro && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">📊 Horómetro</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horometro_inicio" className="text-xs text-muted-foreground">Inicio</Label>
                  <Input
                    id="horometro_inicio"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={formData.horometro_inicio}
                    onChange={(e) => handleChange('horometro_inicio', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="horometro_fin" className="text-xs text-muted-foreground">Fin</Label>
                  <Input
                    id="horometro_fin"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={formData.horometro_fin}
                    onChange={(e) => handleChange('horometro_fin', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combustible */}
        {showCombustible && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-5 h-5 text-primary" />
                <Label htmlFor="combustible" className="text-sm text-muted-foreground">Combustible (litros)</Label>
              </div>
              <Input
                id="combustible"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formData.combustible}
                onChange={(e) => handleChange('combustible', e.target.value)}
                className="h-14 text-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Viajes */}
        {showViajes && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">🚚 Viajes</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cantidad_viajes" className="text-xs text-muted-foreground">Cant. Viajes</Label>
                  <Input
                    id="cantidad_viajes"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.cantidad_viajes}
                    onChange={(e) => handleChange('cantidad_viajes', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="cantidad_movimiento_interno" className="text-xs text-muted-foreground">Mov. Interno</Label>
                  <Input
                    id="cantidad_movimiento_interno"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.cantidad_movimiento_interno}
                    onChange={(e) => handleChange('cantidad_movimiento_interno', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado Máquina */}
        {showEstadoMaquina && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">
                🔧 Estado {rol === 'chofer' ? 'Camión' : 'Máquina'}
              </Label>
              <RadioGroup
                value={formData.estado_maquina}
                onValueChange={(v) => handleChange('estado_maquina', v)}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="estado-ok"
                  className={cn(
                    "flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all",
                    formData.estado_maquina === 'OK'
                      ? "border-green-500 bg-green-500/10 text-green-600"
                      : "border-border hover:border-green-500/50"
                  )}
                >
                  <RadioGroupItem value="OK" id="estado-ok" className="sr-only" />
                  <span className="font-semibold text-lg">✓ OK</span>
                </Label>
                <Label
                  htmlFor="estado-obs"
                  className={cn(
                    "flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all",
                    formData.estado_maquina === 'OBSERVACION'
                      ? "border-amber-500 bg-amber-500/10 text-amber-600"
                      : "border-border hover:border-amber-500/50"
                  )}
                >
                  <RadioGroupItem value="OBSERVACION" id="estado-obs" className="sr-only" />
                  <span className="font-semibold">⚠ OBSERVACIÓN</span>
                </Label>
              </RadioGroup>

              {formData.estado_maquina === 'OBSERVACION' && (
                <Textarea
                  placeholder="Describa la observación..."
                  value={formData.observacion_maquina}
                  onChange={(e) => handleChange('observacion_maquina', e.target.value)}
                  className="mt-4 min-h-24 text-base"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        {checklistItems.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <Label className="text-sm text-muted-foreground">Checklist Diario</Label>
              </div>
              <div className="space-y-3">
                {checklistItems.map(item => (
                  <Label
                    key={item.id}
                    htmlFor={item.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      formData[item.id as keyof typeof formData]
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox
                      id={item.id}
                      checked={formData[item.id as keyof typeof formData] as boolean}
                      onCheckedChange={(checked) => handleChange(item.id, !!checked)}
                      className="h-7 w-7"
                    />
                    <span className="text-base font-medium">{item.label}</span>
                  </Label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky footer with two buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex-1 h-14"
          >
            {savingType === 'draft' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <FileEdit className="w-5 h-5 mr-2" />
            )}
            Guardar Borrador
          </Button>
          
          <Button 
            onClick={handleComplete}
            disabled={isSaving}
            className="flex-1 h-14"
          >
            {savingType === 'complete' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            Completar Parte
          </Button>
        </div>
      </div>
    </div>
  );
};
