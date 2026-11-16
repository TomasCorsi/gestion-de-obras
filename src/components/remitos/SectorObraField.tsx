import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useSectoresObra } from "@/hooks/useSectoresObra";

/** Desplegable «Sector de obra»: misma mecánica que Tipo Material, pero con lista propia por obra. */
export function SectorObraField({ obraId, value, onChange, labelClassName = "text-xs truncate block" }: { obraId: string | null | undefined; value: string; onChange: (v: string) => void; labelClassName?: string }) {
  const { sectores, addSector } = useSectoresObra(obraId);
  const handle = (v: string) => {
    onChange(v);
    if (v?.trim()) addSector(v);
  };
  return (
    <div className="space-y-1.5">
      <Label className={labelClassName}>Sector de obra</Label>
      <Combobox
        options={sectores.map((s) => ({ value: s, label: s }))}
        value={value}
        onValueChange={handle}
        placeholder={obraId ? "Buscar sector..." : "Elegí la obra primero"}
        allowCustom
        customLabel="Agregar sector"
        disabled={!obraId}
      />
    </div>
  );
}
