## Plan

1. **Hacer visible “Mis Documentos” como acceso principal**
   - Agregar un botón/tarjeta “Mis Documentos” directamente en la pantalla de Parte Diario, junto a “Nuevo Parte” y “Mis Partes”.
   - Debe aparecer aunque no haya documentos pendientes, para que la sección exista siempre.

2. **Agregar acceso dentro del menú de usuario**
   - Incluir “Mis Documentos” en el desplegable del avatar, debajo de “Perfil”.
   - Mostrar el contador rojo si hay documentos pendientes.

3. **Mantener el ícono superior, pero hacerlo más compatible con mobile**
   - Dejar el ícono de documentos en la barra superior para pantallas con espacio.
   - Ajustar el layout mobile para que no quede oculto, cortado o tapado por el menú/avatar.

4. **Banner del Parte Diario**
   - Mantener el banner amarillo solo cuando haya documentos pendientes.
   - El nuevo botón fijo “Mis Documentos” servirá como respaldo si el contador no carga o si no hay pendientes.

5. **Verificación**
   - Revisar que `/mis-documentos` siga protegida para usuarios autenticados.
   - Verificar en mobile que se vea: botón/tarjeta “Mis Documentos”, opción en el menú del avatar, y contador cuando corresponda.

## Detalles técnicos

- Archivos previstos:
  - `src/components/layout/TopNavbar.tsx`
  - `src/components/parte-diario/ParteDiarioHomeView.tsx`
- No tocaría la base de datos ni las políticas en esta pasada, porque la captura muestra que el problema principal ahora es de navegación/visibilidad de la sección en la interfaz.