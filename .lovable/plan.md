

# Certificado de Entrega de Ropa de Trabajo y EPP

## Objetivo
Agregar una nueva pestaña "EPP" en la sección Personal para generar PDFs de entrega de ropa de trabajo y elementos de protección personal por empleado.

## Cambios

### 1. Nueva tabla en base de datos: `entregas_epp`
Registrar cada entrega para tener historial:
```sql
CREATE TABLE public.entregas_epp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.entrega_epp_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entregas_epp(id) ON DELETE CASCADE,
  producto text NOT NULL,
  tipo_modelo text DEFAULT '',
  marca text DEFAULT '',
  posee_certificacion boolean DEFAULT true,
  cantidad integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entregas_epp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrega_epp_items ENABLE ROW LEVEL SECURITY;
-- RLS: admins y capataces pueden gestionar
```

### 2. Productos EPP predefinidos
Lista fija de productos típicos (Pantalón, Zapato, Protector Auditivo, Casco, Anteojos, Remera, Buzo, Campera) con sus tipos/modelos por defecto, configurable al crear la entrega.

### 3. Hook `useEntregasEPP`
- CRUD de entregas con sus items
- Query por `personal_id`

### 4. Componente `EntregaEPPTab` (`src/components/personal/EntregaEPPTab.tsx`)
- Selector de empleado (combobox)
- Formulario con tabla editable de productos EPP (producto, tipo/modelo, marca, certificación, cantidad)
- Botón "Generar PDF"
- Historial de entregas anteriores del empleado seleccionado

### 5. Generador PDF `generateEntregaEPPPDF.ts`
Replica la planilla de la imagen:
- Header: "ENTREGA DE ROPA DE TRABAJO Y ELEMENTOS DE PROTECCIÓN PERSONAL" + "Resolución 299/11, Anexo I"
- Datos empresa: Razón Social, CUIT, Dirección, Localidad, CP, Provincia
- Datos empleado: Nombre, DNI, Puesto (rol), descripción de EPP entregado
- Tabla con columnas: N°, Producto, Tipo/Modelo, Marca, Certificación (SI/NO), Cantidad, Fecha entrega, Firma del trabajador (vacío para firmar)

### 6. Nueva pestaña en `Personal.tsx`
Agregar tab "EPP" con icono `ShieldCheck` junto a Empleados, Vacaciones y Liquidaciones, que renderiza `EntregaEPPTab`.

## Resultado
Los usuarios pueden seleccionar un empleado, configurar los items EPP entregados, y generar un PDF listo para imprimir y firmar, con el formato exacto de la Resolución 299/11.

