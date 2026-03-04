

# Certificado: No auto-poblar conceptos + Descripcion con buscador

## Problema actual

Al crear un certificado nuevo, `openCrearCertificado` llama a `buildDraftForTipo()` que pre-carga todos los conceptos activos como filas. El usuario quiere empezar con la grilla vacia y agregar conceptos manualmente, seleccionandolos desde un desplegable con buscador.

## Cambios

### 1. `src/pages/Certificados.tsx` — Iniciar con grilla vacia

En `openCrearCertificado`, reemplazar `setItemsDraft(buildDraftForTipo(initialTipo))` por `setItemsDraft([])` para que el formulario arranque sin filas.

Tambien, cuando el usuario cambia el tipo de certificado, no reconstruir el draft automaticamente si estamos creando (no editando). Solo reconstruir si estamos editando.

### 2. `src/components/certificados/CertificadoServiceGrid.tsx` — Combobox en Descripcion

Pasar la lista de conceptos disponibles como prop (`conceptos`). Reemplazar el `<Input>` de descripcion por el componente `<Combobox>` existente, que ya tiene buscador integrado.

Cuando el usuario selecciona un concepto del desplegable:
- Auto-completar `unidad`, `precio_unitario` y `categoria` desde el concepto seleccionado
- Guardar el `concepto_id` en la fila
- Permitir tambien escribir texto libre (opcion "Otro / personalizado" al final del listado)

**Props nuevas de CertificadoServiceGrid:**
```typescript
conceptos: CertificadoConcepto[];  // lista de conceptos disponibles para el combobox
```

**Opciones del Combobox:**
- Se construyen desde `conceptos.filter(c => c.activo)`, mostrando `nombre` como label
- Al seleccionar, se llena automaticamente unidad, precio_unitario, categoria y concepto_id
- Se incluye una opcion "Personalizado" que permite escribir manualmente

### 3. Pasar conceptos al grid desde `Certificados.tsx`

Donde se renderiza `<CertificadoServiceGrid>`, agregar la prop `conceptos={conceptos}`.

### Archivos a modificar
1. `src/pages/Certificados.tsx` — iniciar draft vacio, pasar conceptos al grid
2. `src/components/certificados/CertificadoServiceGrid.tsx` — reemplazar Input por Combobox en columna Descripcion

