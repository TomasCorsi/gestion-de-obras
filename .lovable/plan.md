

## Modulo de Certificados de Obra

### Que es
Un sistema para registrar y gestionar las mediciones mensuales de lo que se le certifica (cobra) a cada cliente por los servicios prestados en sus obras. Cada obra tiene sus propios conceptos (horas de maquina, m3 de tosca, viajes, gasoil, etc.) y mensualmente se cargan las cantidades para generar el certificado.

### Estructura de datos

Se necesitan 3 tablas nuevas:

**1. `certificado_conceptos` - Catalogo de conceptos por obra**
Define que servicios/items aplican a cada obra y a que precio.

| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID | PK |
| obra_id | UUID | FK a obras |
| nombre | text | Ej: "Horas Retro", "m3 Tosca", "Gasoil" |
| unidad | text | HR, M3, TN, LT, VJ (viaje), GL, UN, DIA |
| precio_unitario | numeric | Precio acordado por unidad |
| activo | boolean | Para desactivar sin borrar |
| orden | integer | Para ordenar en el certificado |

**2. `certificados` - Cabecera del certificado mensual**

| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID | PK |
| obra_id | UUID | FK a obras |
| numero | text | Ej: "CERT-001" autoincremental por obra |
| periodo | text | Ej: "2026-02" (anio-mes) |
| estado | enum | borrador, emitido, cobrado |
| fecha_emision | date | Cuando se emitio |
| subtotal | numeric | Suma de items |
| iva | numeric | 21% |
| total | numeric | Subtotal + IVA |
| observaciones | text | Notas opcionales |

**3. `certificado_items` - Detalle de cada linea del certificado**

| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID | PK |
| certificado_id | UUID | FK a certificados |
| concepto_id | UUID | FK a certificado_conceptos |
| descripcion | text | Nombre del concepto (copiado para historico) |
| unidad | text | Unidad (copiado) |
| cantidad | numeric | Cantidad certificada en el periodo |
| precio_unitario | numeric | Precio unitario (copiado del concepto o ajustado) |
| subtotal | numeric | cantidad x precio_unitario |

### Flujo de uso

1. **Configurar conceptos por obra**: Al entrar a una obra, en una pestana "Certificados" se definen los conceptos aplicables (ej: "Horas Retro a $45.000/HR", "Tosca a $12.000/M3"). Algunos conceptos comunes se pueden agregar desde una lista rapida.

2. **Crear certificado mensual**: Se selecciona el periodo (mes), el sistema lista todos los conceptos activos de esa obra. El usuario carga las cantidades de cada concepto para ese mes.

3. **Revisar y emitir**: Se calcula el total automaticamente. Se puede marcar como "emitido" y luego como "cobrado".

4. **Historial**: Se pueden ver todos los certificados anteriores de cada obra, comparar entre periodos.

### Donde ubicar la funcionalidad

**Opcion elegida: Nueva pagina `/certificados`** accesible desde el menu lateral, con:
- Selector de obra en la parte superior
- Vista de conceptos configurados para la obra seleccionada
- Lista de certificados emitidos con filtro por periodo
- Boton para crear nuevo certificado mensual

### Conceptos estandar predefinidos

Lista rapida de conceptos comunes que se pueden agregar con un click:
- Horas Retroexcavadora (HR)
- Horas Cargadora (HR)
- Horas Topador (HR)
- Horas Motoniveladora (HR)
- Alquiler Maquina por dia (DIA)
- Gasoil (LT)
- Tosca (M3)
- Tierra (M3)
- Cascote (M3)
- Piedra (M3/TN)
- Fresado (M3/TN)
- Suelo Cemento (M3)
- Cunetas (ML)
- Viajes (VJ/UN)

### Interfaz del formulario de certificado

Al crear un certificado nuevo:

```text
+--------------------------------------------------+
| Certificado: CERT-003  |  Obra: Ruta 40 Tramo 2  |
| Periodo: Febrero 2026  |  Estado: Borrador        |
+--------------------------------------------------+
| Concepto          | Unidad | Cantidad | P.Unit   | Subtotal    |
|-------------------|--------|----------|----------|-------------|
| Horas Retro       | HR     | 120      | $45.000  | $5.400.000  |
| Tosca             | M3     | 350      | $12.000  | $4.200.000  |
| Gasoil            | LT     | 2.500    | $1.200   | $3.000.000  |
| Viajes Cascote    | VJ     | 45       | $85.000  | $3.825.000  |
|-------------------|--------|----------|----------|-------------|
|                                       Subtotal   | $16.425.000 |
|                                       IVA 21%    | $3.449.250  |
|                                       TOTAL      | $19.874.250 |
+--------------------------------------------------+
```

### Detalle tecnico

| Componente | Archivo | Descripcion |
|---|---|---|
| Migracion DB | SQL migration | 3 tablas + enum + RLS policies |
| Hook | `src/hooks/useCertificados.ts` | CRUD certificados + conceptos |
| Pagina | `src/pages/Certificados.tsx` | Vista principal con tabs |
| Ruta | `src/App.tsx` | Nueva ruta protegida admin |
| Menu | `src/components/layout/Sidebar.tsx` | Nuevo item en navegacion |

### RLS Policies
- Admin y capataz: gestion completa
- Maquinista: solo lectura

### Orden de implementacion
1. Migracion de base de datos (3 tablas + enum + RLS)
2. Hook `useCertificados` con React Query
3. Pagina con selector de obra y gestion de conceptos
4. Formulario de certificado mensual con calculo automatico
5. Agregar ruta y entrada en menu lateral

