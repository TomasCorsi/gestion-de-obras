

## Plan: Agregar campo "Tipo de Operador" (Interno / Externo / Fletero) a cargas del repartidor

### Que se agrega

Un nuevo campo `tipo_operador` en la carga de combustible del repartidor con tres opciones: **Interno**, **Externo** y **Fletero**. Este campo se muestra en el formulario de carga, en la lista del parte diario y en la tabla de Gastos > Repartidor.

### Cambios

#### 1. Migracion SQL

Agregar columna `tipo_operador` a la tabla `cargas_combustible_repartidor`:

```sql
ALTER TABLE cargas_combustible_repartidor 
ADD COLUMN tipo_operador text DEFAULT 'interno';
```

Se usa `text` con default `'interno'` para no romper registros existentes.

#### 2. Dialog de carga (`CargaCombustibleRepartidorDialog.tsx`)

- Agregar campo `tipo_operador` al estado del formulario (default: `'interno'`)
- Agregar un Select con las opciones: Interno, Externo, Fletero
- Incluir `tipo_operador` en el objeto que se envia al `onSave`
- Ubicarlo entre Operador y Maquinaria en el formulario

#### 3. Interfaces y hooks

- Agregar `tipo_operador` a la interfaz `CargaRepartidor` en `useCargasRepartidor.ts`
- Agregar `tipo_operador` a `CargaRepartidorInsert`
- Agregar `tipo_operador` a `CargaRepartidorFull` en `useCargasRepartidorAll.ts`
- Actualizar la interfaz `onSave` del dialog para incluir `tipo_operador`

#### 4. Lista del parte diario (`CargasCombustibleRepartidorList.tsx`)

- Agregar columna "Tipo" en la tabla que muestra las cargas dentro del parte diario

#### 5. Tab Repartidor en Gastos (`CombustibleRepartidorTab.tsx`)

- Agregar columna "Tipo" en la tabla
- Incluir `tipo_operador` en la exportacion Excel

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Agregar columna `tipo_operador` |
| `src/hooks/useCargasRepartidor.ts` | Agregar campo a interfaces |
| `src/hooks/useCargasRepartidorAll.ts` | Agregar campo a interfaz |
| `src/components/parte-diario/CargaCombustibleRepartidorDialog.tsx` | Agregar Select de tipo |
| `src/components/parte-diario/CargasCombustibleRepartidorList.tsx` | Agregar columna Tipo |
| `src/components/gastos/CombustibleRepartidorTab.tsx` | Agregar columna Tipo + exportacion |

