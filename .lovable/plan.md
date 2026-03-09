

# Fix: Cliente column not showing saved values

## Problem
In `RemitosSimpleGrid.tsx` line 224-229, `clienteOptions` is built from `obras` instead of `clientes`:
```typescript
const clienteOptions = obras.map((o) => ({
  value: o.nombre,
  label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
}));
```
This means the Combobox can't match existing client names stored in the DB, so they appear empty.

## Fix
Change `clienteOptions` to use the `clientes` array:
```typescript
const clienteOptions = clientes.filter(c => c.activo).map((c) => ({
  value: c.nombre,
  label: c.nombre,
}));
```

### File to edit
- `src/components/remitos/RemitosSimpleGrid.tsx` (lines 224-229)

