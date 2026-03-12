

# Plan: Registro de Pagos en Certificados

## Qué se va a hacer
Agregar un sistema de pagos por certificado que permita registrar cobros parciales o totales, mostrando el saldo pendiente (total - pagos) tanto en la tarjeta del certificado como en el detalle.

## Cambios

### 1. Migración de base de datos
Crear tabla `certificado_pagos`:
- `id` (uuid, PK)
- `certificado_id` (uuid, FK a certificados, NOT NULL)
- `fecha` (date, NOT NULL)
- `monto` (numeric, NOT NULL)
- `descripcion` (text, nullable) — para indicar método de pago, nro de transferencia, etc.
- `created_at` (timestamptz)

RLS: mismas políticas que `certificados` (admin + capataz full, maquinista read).

### 2. `src/hooks/useCertificados.ts`
- Agregar interfaz `CertificadoPago`
- Agregar query para obtener pagos por certificado (`fetchPagos`)
- Agregar mutations: `createPago`, `deletePago`
- Agregar query para obtener pagos de todos los certificados de la obra (para mostrar saldo en cards)

### 3. `src/pages/Certificados.tsx`
- **Tarjeta del certificado**: mostrar "Pagado" y "Saldo" debajo de Subtotal/IVA/Total
- **Diálogo de ver certificado**: agregar sección "Pagos" debajo de los totales con:
  - Lista de pagos existentes (fecha, monto, descripción, botón eliminar)
  - Formulario inline para registrar nuevo pago (fecha, monto, descripción)
  - Línea de "Saldo pendiente" = total - suma de pagos
- **KPIs**: actualizar "Pendiente de Cobro" para considerar pagos parciales

### Flujo del usuario
1. Crea/emite un certificado con total $X
2. Va al detalle del certificado → sección "Pagos"
3. Agrega pagos parciales con fecha, monto y descripción
4. El saldo se actualiza automáticamente
5. En la tarjeta se ve cuánto fue pagado y cuánto queda

