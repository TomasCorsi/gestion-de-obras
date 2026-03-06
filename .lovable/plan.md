

# Generación Masiva de Certificados EPP

## Objetivo
Agregar un botón "Generar PDF Masivo" que genere un solo PDF con una página por cada empleado activo, usando la plantilla de items actual.

## Cambios

### 1. `src/utils/generateEntregaEPPPDF.ts`
- Refactorizar: extraer la lógica de renderizado de una página a una función interna `renderEPPPage(doc, personal, items, fecha, firmaImg)` que reciba el documento ya creado.
- La función `generateEntregaEPPPDF` existente sigue funcionando igual (crea doc, renderiza 1 página, guarda).
- Nueva función exportada `generateEntregaEPPMasivoPDF({ empleados, items, fecha })`:
  - Crea un solo `jsPDF` landscape.
  - Carga la firma una sola vez.
  - Itera los empleados: para cada uno llama `renderEPPPage`, y entre empleados agrega `doc.addPage()`.
  - Guarda como `EPP_Masivo_{fecha}.pdf`.

### 2. `src/components/personal/EntregaEPPTab.tsx`
- Agregar un nuevo bloque de UI "Generación Masiva" debajo de la tabla de items con:
  - Checkbox para filtrar empleados activos (default: todos los activos).
  - Botón "Generar PDF Masivo" con icono `FileStack` o `Files`.
- Handler `handleGenerarMasivo`: toma los items actuales de la plantilla, todos los empleados activos, y llama `generateEntregaEPPMasivoPDF`.
- No registra entregas en la base de datos (solo genera el PDF para impresión).

## Flujo del usuario
1. Configura la plantilla de EPP (productos, marcas, etc.)
2. Selecciona la fecha
3. Click en "Generar PDF Masivo"
4. Se descarga un PDF con N páginas, una por empleado activo

