

## Plan: IA para importar cómputos en Cotizaciones

### Objetivo
Agregar un botón "Importar con IA" en el formulario de cotizaciones que permita subir un archivo (Excel, imagen, o pegar texto) y use Lovable AI para extraer automáticamente los rubros e ítems, rellenando el formulario.

### Flujo de uso
```text
1. Click "Nueva Cotización" o "Editar"
2. Click botón "Importar con IA" (junto a "Agregar Rubro")
3. Se abre un dialog con 3 opciones:
   - Subir Excel/CSV
   - Subir imagen (foto de cómputo)
   - Pegar texto/notas
4. La IA procesa el contenido y extrae rubros + ítems
5. Se previsualiza el resultado antes de aplicar
6. Click "Aplicar" → se cargan categorías e ítems al formulario
```

### Cambios

**1. Nueva edge function: `supabase/functions/parse-computo/index.ts`**
- Recibe el contenido (texto plano o base64 de imagen) y el tipo de input
- Usa Lovable AI (gemini-2.5-flash, bueno para multimodal) con tool calling para extraer datos estructurados
- Schema de extracción:
  - `categorias[]`: { numero, nombre }
  - `items[]`: { categoria_index, numero, descripcion, unidad, cantidad_m2, altura_promedio, cantidad_m3, precio_unitario }
  - `descripcion_general`: string (descripción de la obra/cotización)
- System prompt en español con contexto de construcción/movimiento de suelos
- Para Excel: el frontend parsea el archivo a texto tabular y lo envía como texto
- Para imágenes: se envía como base64 y se usa visión multimodal

**2. Nuevo componente: `src/components/cotizaciones/ImportComputoDialog.tsx`**
- Dialog con tabs: "Archivo" | "Imagen" | "Texto"
- Tab Archivo: input file (xlsx, csv) → parsea con SheetJS a texto tabular en el cliente
- Tab Imagen: input file (jpg, png) → convierte a base64
- Tab Texto: textarea para pegar notas/cómputo libre
- Botón "Procesar con IA" → llama a la edge function
- Muestra preview de lo extraído (lista de rubros e ítems)
- Botón "Aplicar al formulario" → inyecta categorías e ítems al state del form

**3. Editar `src/components/cotizaciones/CotizacionFormContent.tsx`**
- Agregar botón "Importar con IA" (icono Sparkles) junto a "Agregar Rubro"
- State para abrir/cerrar el ImportComputoDialog
- Callback `onImportComplete` que recibe categorías + ítems y los setea en el form, recalculando totales

**4. Dependencia: `xlsx` (SheetJS)**
- Para parsear archivos Excel en el cliente antes de enviar a la IA

### Detalle técnico
- Modelo: `google/gemini-2.5-flash` (multimodal, bueno con imágenes y texto, rápido)
- Tool calling para obtener JSON estructurado (no pedir JSON en texto libre)
- El prompt incluye las unidades válidas del sistema (m², m³, tn, hr, gl, un, ml, kg) para que la IA mapee correctamente
- Para imágenes se envía como contenido multimodal `{ type: "image_url", image_url: { url: "data:image/..." } }`
- Preview muestra tabla con los datos extraídos, permitiendo confirmar antes de aplicar

### Archivos a crear/editar
- `supabase/functions/parse-computo/index.ts` — nuevo (edge function)
- `src/components/cotizaciones/ImportComputoDialog.tsx` — nuevo
- `src/components/cotizaciones/CotizacionFormContent.tsx` — agregar botón + integración

