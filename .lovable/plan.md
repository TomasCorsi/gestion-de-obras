
# Plan: Corregir Problema de Zona Horaria en Fechas

## Problema Identificado

Cuando JavaScript parsea una fecha en formato ISO (`"2026-01-28"`) usando `new Date()`, la interpreta como **medianoche en UTC**. Al mostrarla en la zona horaria local (ej: Argentina UTC-3), la fecha retrocede a las 21:00 del día anterior.

### Ejemplo del Bug

```text
Entrada del usuario: "2026-01-28"
                           ↓
new Date("2026-01-28")  →  2026-01-28 00:00:00 UTC
                           ↓
Visualización en Argentina (UTC-3)  →  2026-01-27 21:00:00
                           ↓
format(date, "d de MMMM")  →  "27 de enero"  ← ERROR
```

## Archivos Afectados

| Archivo | Línea | Problema |
|---------|-------|----------|
| `src/components/parte-diario/ParteDiarioFormView.tsx` | 174 | `new Date(formData.fecha)` |
| `src/components/parte-diario/ParteDiarioListView.tsx` | 54 | `new Date(parte.fecha)` |
| `src/components/parte-diario/ParteDiarioHomeView.tsx` | 69 | `new Date(borradorHoy.fecha)` |
| `src/lib/utils.ts` | 13 | `parseISO(date)` - Este usa date-fns y es correcto |

## Solución Propuesta

Usar `parseISO()` de date-fns en lugar de `new Date()` para parsear fechas en formato string. `parseISO` trata la fecha como **local** en vez de UTC.

### Cambio de Patrón

```text
ANTES (incorrecto)                    DESPUÉS (correcto)
┌────────────────────────────┐       ┌────────────────────────────┐
│ new Date("2026-01-28")     │  →    │ parseISO("2026-01-28")     │
│ Interpreta como UTC        │       │ Interpreta como hora local │
└────────────────────────────┘       └────────────────────────────┘
```

## Cambios a Implementar

### 1. ParteDiarioFormView.tsx

Línea 174:
```typescript
// Antes
{format(new Date(formData.fecha), "EEEE d 'de' MMMM", { locale: es })}

// Después
{format(parseISO(formData.fecha), "EEEE d 'de' MMMM", { locale: es })}
```

### 2. ParteDiarioListView.tsx

Línea 54:
```typescript
// Antes
{format(new Date(parte.fecha), "EEEE d 'de' MMMM", { locale: es })}

// Después  
{format(parseISO(parte.fecha), "EEEE d 'de' MMMM", { locale: es })}
```

### 3. ParteDiarioHomeView.tsx

Línea 69:
```typescript
// Antes
Fecha: {format(new Date(borradorHoy.fecha), "d 'de' MMMM, yyyy", { locale: es })}

// Después
Fecha: {format(parseISO(borradorHoy.fecha), "d 'de' MMMM, yyyy", { locale: es })}
```

### 4. Revisión General

Buscar y corregir otros lugares donde se use `new Date(string)` para parsear fechas ISO, especialmente en componentes de visualización.

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/components/parte-diario/ParteDiarioFormView.tsx` | Usar parseISO en vez de new Date |
| `src/components/parte-diario/ParteDiarioListView.tsx` | Usar parseISO en vez de new Date |
| `src/components/parte-diario/ParteDiarioHomeView.tsx` | Usar parseISO en vez de new Date |
| `src/components/dashboard/RecentObras.tsx` | Revisar y corregir si aplica |
| `src/components/dashboard/CotizacionesPendientes.tsx` | Revisar y corregir si aplica |
| `src/components/maquinarias/GastosMaquinaria.tsx` | Revisar y corregir si aplica |

## Sección Técnica

### Por qué parseISO funciona correctamente

```typescript
import { parseISO, format } from 'date-fns';

// new Date() - interpreta como UTC medianoche
new Date("2026-01-28") 
// → Tue Jan 27 2026 21:00:00 GMT-0300 (en Argentina)

// parseISO() - interpreta como hora local medianoche  
parseISO("2026-01-28")
// → Tue Jan 28 2026 00:00:00 GMT-0300 (en Argentina)
```

### Patrón seguro para mostrar fechas

```typescript
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Siempre usar parseISO para strings de fecha ISO
const fechaCorrecta = format(
  parseISO(fechaString), 
  "EEEE d 'de' MMMM, yyyy", 
  { locale: es }
);
```

## Pruebas Recomendadas

1. Crear un parte diario con fecha de hoy y verificar que muestra la fecha correcta
2. Verificar la lista de partes que las fechas coincidan con lo guardado
3. Revisar el dashboard y otras vistas que muestran fechas

## Beneficios

1. Las fechas se mostrarán correctamente sin importar la zona horaria del usuario
2. Consistencia en todo el sistema usando parseISO
3. El patrón ya existe en utils.ts - solo hay que aplicarlo uniformemente
