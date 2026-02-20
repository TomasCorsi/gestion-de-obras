

## Filtrar roles en "Empleados sin Parte"

### Cambio
Excluir a los empleados con rol **administrativo**, **sereno** y **topografo** de la lista de personas faltantes en completar el parte diario, ya que estos roles no tienen obligacion de cargar parte.

### Archivo a modificar
**`src/hooks/useEmpleadosSinParte.ts`**

### Detalle
- Definir una lista de roles excluidos: `['administrativo', 'sereno', 'topografo']`
- Filtrar en el paso 1 (despues de traer empleados activos) para que estos roles no se consideren ni en el listado ni en el conteo de `totalActivos`
- Esto se hace con un `.filter()` en el lado del cliente justo despues de recibir los datos de `personal_selector`, antes de cruzar con los partes del dia

### Detalle tecnico

En la linea donde se obtienen los empleados activos (~linea 28-32), se agrega un filtro posterior:

```text
const ROLES_EXCLUIDOS = ['administrativo', 'sereno', 'topografo'];

const empleadosRelevantes = (empleadosActivos || [])
  .filter(emp => !ROLES_EXCLUIDOS.includes(emp.rol));
```

Luego se usa `empleadosRelevantes` en vez de `empleadosActivos` para:
- El cruce con partes del dia (paso 4)
- El calculo de `totalActivos`

Esto asegura que tanto la lista como los conteos reflejen solo los roles operativos que deben cargar parte.

