

# Fix: Borrar "Próximo service KM/HR" no se guarda

## Problema
En los formularios (`ServiceForm`, `ReparacionForm`, `MecanicoMantenimientoForm`), cuando se borra el valor de `proximo_service_km` o `proximo_service_hr`, el código hace:

```typescript
proximo_service_km: parseFloat(proximoKm) || undefined,
```

`undefined` hace que la propiedad se omita del objeto enviado a la base de datos, por lo que el valor anterior nunca se sobreescribe con `null`.

## Solución
Cambiar `undefined` por `null` en los tres formularios para estos campos:

```typescript
proximo_service_km: proximoKm ? parseFloat(proximoKm) : null,
proximo_service_hr: proximoHr ? parseFloat(proximoHr) : null,
```

Mismo cambio en:
- `src/components/mantenimiento/ServiceForm.tsx`
- `src/components/mantenimiento/ReparacionForm.tsx`
- `src/components/parte-diario/MecanicoMantenimientoForm.tsx`

