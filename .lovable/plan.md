Voy a corregir la carga y edición de remitos para que **Cant. Unitaria** acepte decimales de forma confiable con punto o coma.

Cambios propuestos:

1. **Reemplazar la entrada decimal por una lógica más robusta**
   - Mantener el campo como texto controlado, pero agregar atributos explícitos para evitar restricciones del navegador:
     - `type="text"`
     - `inputMode="decimal"`
     - `pattern="[0-9]*[.,]?[0-9]*"`
     - `autoComplete="off"`
   - Aceptar tanto `.` como `,` como separador decimal.

2. **Normalizar antes de guardar**
   - Convertir coma a punto internamente.
   - Guardar el número real en `cantidad_uni`, sin redondear ni truncar.
   - Mantener cálculos automáticos de `Cantidad Total = Cant. Unitaria × Cant. Viajes`.

3. **Evitar que el formulario pierda el decimal mientras se escribe**
   - Permitir estados intermedios como:
     - `0.`
     - `0,`
     - `.5`
     - `,5`
   - Mostrar lo que el usuario escribió, pero guardar numéricamente el equivalente.

4. **Aplicar lo mismo en crear y editar**
   - Al abrir un remito existente, cargar el valor decimal correctamente.
   - Al crear uno nuevo, permitir escribir decimal desde cero.

5. **Verificación**
   - Revisar que el campo ya no use ninguna validación nativa que bloquee el separador decimal.
   - Confirmar en el código que `cantidad_uni` llega como número decimal al guardar.

Archivo a modificar:
- `src/components/remitos/RemitoQuickFormDialog.tsx`