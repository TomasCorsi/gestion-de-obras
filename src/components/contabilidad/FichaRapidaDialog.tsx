import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOC_TIPOS, docValido, type DocTipo } from "@/lib/docFiscal";
import { useCrearFicha, useVincularFicha, type TerceroEstado } from "@/hooks/useTercerosFiscal";

const COND = [
  { v: "RI", l: "Responsable Inscripto" }, { v: "MT", l: "Monotributista" }, { v: "EX", l: "Exento" },
  { v: "CF", l: "Consumidor Final" }, { v: "NR", l: "No Responsable" },
];

/** Crea la ficha fiscal de un cliente/proveedor existente sin salir del formulario que la pidió. */
export function FichaRapidaDialog({ maestro, onClose, onCreada }: {
  maestro: TerceroEstado; onClose: () => void; onCreada: (terceroId: string) => void;
}) {
  const [razon, setRazon] = useState(maestro.nombre);
  const [tipo, setTipo] = useState<DocTipo>(maestro.cuit_maestro ? "CUIT" : "SIN");
  const [numero, setNumero] = useState(maestro.cuit_maestro ?? "");
  const [cond, setCond] = useState("RI");
  const crear = useCrearFicha();
  const vincular = useVincularFicha();
  const valido = docValido(tipo, numero);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ficha fiscal de {maestro.nombre}</DialogTitle>
          <DialogDescription>Completá solo lo necesario. El resto de los datos se puede agregar después en Terceros.</DialogDescription>
        </DialogHeader>
        {maestro.sugerencia_tercero_id && (
          <div className="rounded-md border border-primary/50 bg-primary/10 p-3 text-sm">
            Ya existe una ficha con el mismo CUIT.
            <Button size="sm" className="ml-2" disabled={vincular.isPending}
              onClick={() => vincular.mutate({ tercero_id: maestro.sugerencia_tercero_id!, rol: maestro.rol, maestro_id: maestro.maestro_id },
                { onSuccess: () => onCreada(maestro.sugerencia_tercero_id!) })}>
              Vincular a esa ficha
            </Button>
          </div>
        )}
        <div className="space-y-3">
          <div><Label>Razón social</Label><Input value={razon} onChange={(e) => setRazon(e.target.value)} /></div>
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div><Label>Identificación</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as DocTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TIPOS.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Número</Label>
              <Input value={numero} disabled={tipo === "SIN"} onChange={(e) => setNumero(e.target.value)} placeholder={tipo === "CUIT" ? "20-12345678-6" : ""} />
              {!valido && tipo !== "SIN" && numero && <p className="text-xs text-destructive mt-1">Número inválido para {tipo}</p>}
            </div>
          </div>
          <div><Label>Condición ante IVA</Label>
            <Select value={cond} onValueChange={setCond}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COND.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!razon.trim() || !valido || crear.isPending}
            onClick={() => crear.mutate({ rol: maestro.rol, maestro_id: maestro.maestro_id, razon_social: razon, doc_tipo: tipo, doc_numero: tipo === "SIN" ? "" : numero, condicion_iva: cond },
              { onSuccess: (id) => onCreada(id) })}>
            Crear ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
