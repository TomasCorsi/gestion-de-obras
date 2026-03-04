

# Anticipo solo en seccion Obra

## Problema

El anticipo se aplica actualmente sobre el total general (obra + servicio) en los certificados mixtos, tanto en la UI como en el PDF. Debe aplicarse unicamente sobre la seccion de obra.

## Cambios

### 1. `src/pages/Certificados.tsx` — UI de totales mixto

**Linea ~1319**: El anticipo en la seccion mixta ya usa `obraSubtotal` correctamente para el calculo. Sin embargo, revisar que el anticipo no se reste del total general sino solo de la parte obra. Actualmente `totalFinal = totalSub + totalIva` no descuenta el anticipo. Se debe restar el anticipo del total final:

```
const anticipoMonto = Math.round(obraSubtotal * (anticipoPorcentaje / 100));
const totalFinal = totalSub - anticipoMonto + totalIva;
```

**Lineas ~525-535** (calculo global para tipo "obra" puro): Cambiar `avanceAcumuladoTotal` para que solo considere items de obra (no servicio). Actualmente `avanceActualTotal` suma todos los items — para tipo "obra" puro esto esta bien, pero el `anticipoMonto` global debe basarse solo en items de obra.

### 2. `src/utils/generateCertificadoPDF.ts` — PDF mixto

**Linea ~663**: Cambiar el calculo de anticipo de `totalSub` a `obraSubtotal`:

```typescript
const anticipoMonto = Math.round(obraSubtotal * (certificado.anticipo_porcentaje / 100));
```

Y ajustar el total final para que descuente el anticipo.

### 3. Vista de certificado (detalle/lectura)

Verificar la seccion de vista de certificados (~linea 1733) donde se muestra el anticipo para certificados mixtos guardados, y asegurar que tambien use solo el subtotal de obra.

### Archivos a modificar
1. `src/pages/Certificados.tsx` — calculo anticipo en UI (creacion/edicion y vista)
2. `src/utils/generateCertificadoPDF.ts` — calculo anticipo en PDF mixto

