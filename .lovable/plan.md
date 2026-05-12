## Actualización masiva de precios en remitos

Aplico los precios del Excel sobre **todos los remitos existentes** que coincidan con cada par DESDE/HASTA (mapeando los números de obra a sus nombres exactos), más una regla por tipo de material para "Movimiento interno".

### Mapeo de obras (número → nombre)

| Número | Nombre |
|---|---|
| 200 | La Alameda |
| 201 | Sky Center |
| 202 | Campo el Tatu |
| 304 | Pride Center |
| 321 | Talud Ceamse Tristan Suarez |
| 331 | CANCHAS DE PADEL (GUERNICA) |
| 337 | LOTE 306 - POLO EZEIZA |

### Reglas a aplicar

| DESDE | HASTA | Precio unit. | Modo |
|---|---|---|---|
| Campo el Tatu (202) | La Alameda (200) | $4.000 | Cantidad × Precio |
| LOTE 306 - POLO EZEIZA (337) | Campo el Tatu (202) | $2.500 | Cantidad × Precio |
| Campo el Tatu (202) | CANCHAS DE PADEL (GUERNICA) (331) | $5.000 | Cantidad × Precio |
| Campo el Tatu (202) | Campo el Tatu (202) | $2.500 | Cantidad × Precio |
| Pride Center (304) | Campo el Tatu (202) | $120.000 | Viajes × Precio |
| Campo el Tatu (202) | Talud Ceamse Tristan Suarez (321) | $2.000 | Cantidad × Precio |
| Campo el Tatu (202) | Sky Center (201) | $4.000 | Cantidad × Precio |
| Sky Center (201) | Campo el Tatu (202) | $4.000 | Cantidad × Precio |
| Cualquier remito con `tipo_material = 'Movimiento interno'` | — | $2.000 | Cantidad × Precio |

### Cómo se calculan los campos

Para cada remito coincidente actualizo:
- `precio_unitario` = el valor de la regla
- `precio_calc_mode` = `'cantidad'` o `'viajes'` según corresponda
- `precio_total` = `precio_unitario × cantidad` (modo cantidad) o `precio_unitario × cantidad_viajes` (modo viajes)

### Ejecución

Una sola operación SQL con varios `UPDATE` (uno por regla) sobre la tabla `remitos`, filtrando por `desde` y `hasta` exactos en cada caso, y un `UPDATE` final por `tipo_material = 'Movimiento interno'`. Sin cambios de esquema ni de código — solo datos.

### Verificación

Después de aplicar los cambios, hago un `SELECT` resumen agrupado por DESDE/HASTA mostrando cantidad de remitos actualizados y suma de `precio_total` para confirmar.