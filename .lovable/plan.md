

## Plan: Permitir multiples partes diarios por maquinista (uno por maquina)

### Contexto del problema
Actualmente el sistema solo permite **un parte diario por empleado por dia**. Esto se refuerza con:
1. Un indice unico en la base de datos (`unique_parte_completado_por_dia`) que impide mas de un parte completado por persona/fecha
2. Logica en el hook `useParteDiario` que busca "el parte de hoy" y siempre lo actualiza en vez de crear uno nuevo
3. La pantalla Home que muestra un solo alerta de "Ya completaste tu parte de hoy"

Para maquinistas que usan varias maquinas en el dia, necesitamos permitir **un parte completado por cada maquina diferente**.

### Cambios

#### 1. Migracion de base de datos
- **Eliminar** el indice unico `unique_parte_completado_por_dia` (personal_id, fecha WHERE estado = 'completado')
- **Crear** un nuevo indice unico `unique_parte_completado_por_dia_maquina` en (personal_id, fecha, maquinaria_id) WHERE estado = 'completado', para evitar duplicados de la misma maquina en el mismo dia
- Esto permite multiples partes completados por dia siempre que sean de maquinas distintas
- Los roles sin maquina (capataz, mecanico, etc.) siguen limitados a un parte por dia ya que su maquinaria_id sera NULL (y NULL es unico en el indice)

#### 2. `src/hooks/useParteDiario.ts`
- Cambiar la query `parte_hoy` para traer **todos** los partes del dia (no solo uno con `maybeSingle`)
- Renombrar a `partesHoy` (array)
- Derivar `borradorHoy` como el primer borrador encontrado (para seguir soportando "continuar borrador")
- Agregar logica: al guardar/completar, buscar si ya existe un parte para esa maquina hoy (por maquinaria_id) y actualizarlo, o crear uno nuevo si es otra maquina
- Exponer `partesCompletadosHoy` (array) para mostrar en el Home

#### 3. `src/components/parte-diario/ParteDiarioHomeView.tsx`
- Cambiar la alerta de "Ya completaste tu parte de hoy" para mostrar una **lista** de partes completados hoy (uno por maquina), ej: "Completaste 2 partes hoy: Cargadora 102, Topador 205"
- Cada parte completado tiene boton "Editar"
- El boton "Nuevo Parte" sigue disponible siempre (para agregar otra maquina)

#### 4. `src/pages/ParteDiario.tsx`
- Adaptar para recibir `partesHoy` como array
- Actualizar `handleNewParte` para que no redirija a un parte existente automaticamente (ahora siempre abre formulario vacio)
- Actualizar `handleEditCompletado` para recibir el parte especifico a editar

#### 5. `src/components/parte-diario/ParteDiarioFormView.tsx`
- Agregar validacion al completar: si el maquinista no selecciono maquina, mostrar error (la maquina es obligatoria para maquinistas)

### Detalle tecnico

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Reemplazar indice unico por uno que incluya maquinaria_id |
| `src/hooks/useParteDiario.ts` | Traer array de partes hoy, logica de guardado por maquina |
| `src/components/parte-diario/ParteDiarioHomeView.tsx` | Lista de partes completados con edicion individual |
| `src/pages/ParteDiario.tsx` | Adaptar flujo para multiples partes |
| `src/components/parte-diario/ParteDiarioFormView.tsx` | Validar maquina obligatoria para maquinistas |

### Comportamiento esperado
- **Maquinista**: Puede crear N partes en el dia, uno por cada maquina diferente. Al tocar "Nuevo Parte", abre formulario vacio. En el Home ve la lista de partes ya cargados.
- **Otros roles** (capataz, mecanico, chofer, etc.): Siguen con el comportamiento actual de un solo parte por dia, ya que su maquinaria_id sera NULL o siempre la misma.

