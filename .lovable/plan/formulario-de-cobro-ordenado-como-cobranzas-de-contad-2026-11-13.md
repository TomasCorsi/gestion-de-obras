# Formulario de cobro ordenado como "Cobranzas" de CONTAD

Se toma la pantalla de CONTAD como referencia de orden y nombres (no de colores ni estética). El cobro sigue siendo uno solo y se carga en el momento.

## Cómo queda el formulario
```text
+ Recibo ------------+ + Cliente ---------------------+ + Forma de pago ---+ + Asiento --+
| Fecha              | | Nombre (buscador)            | | Cheque  Efectivo | | Fecha      |
| Número / Provisorio| | CUIT · Pos. IVA · Domicilio  | | Efvo.+Cheq e-check| | Nº (al     |
+--------------------+ | (solo lectura, de la ficha)  | | Dep. Bco  Tarjeta| |  guardar)  |
                       +------------------------------+ | Otros            | +------------+
+ Se recibe: (o) Pesos ( ) Dólares   $ ______   En concepto de: ____________________ +
+ Comprobante que cancela (opcional) · Obra · Máquina                                 +
+------------------------------------------------------------------------------------+
| Medio | Cuenta | Cheq.Nº | Bco. emisor | Vto. | CUIT cheq. | Detalle | $ | US$ | x  |
| ... un renglón por cheque / efectivo / dólares ...  [+ Agregar renglón]           |
+------------------------------------------------------------------------------------+
Totales:   $ ________    US$ ________    Diferencia con "la suma de": ____
```

1. **Recibo**: fecha y número de recibo (manual, como en CONTAD; "provisorio" opcional).
2. **Cliente**: buscador; debajo se muestran CUIT, posición IVA y domicilio tomados de la ficha, sin editarlos.
3. **Forma de pago**: elegir una opción arma los renglones iniciales (ej. "Cheque" agrega un renglón de cheque, "Efvo.+Cheq." uno de efectivo y uno de cheque). Se pueden agregar más renglones igual.
4. **Se recibe**: la suma total declarada en pesos o dólares y "en concepto de". El formulario avisa si la suma de los renglones no coincide con lo declarado.
5. **Grilla de valores**: columnas al estilo CONTAD; los datos de cheque solo se habilitan en renglones de cheque o e-check. Totales separados en $ y US$.
6. **Asiento**: muestra fecha y número del asiento generado al guardar.
7. Se agrega el medio **e-check** y el **CUIT del librador** del cheque; el listado de cheques recibidos los muestra.

Pagos a proveedores no cambia en esta etapa.

## Detalles técnicos
- Migración aditiva: `contab_pagos` suma `recibo_numero`, `recibo_provisorio`, `concepto`, `moneda_declarada`, `importe_declarado`; `contab_pago_valores` suma `cheque_cuit`; enum `contab_pago_medio` suma `echeck`.
- `contab_guardar_cobro_valores` guarda los nuevos campos; el asiento trata `echeck` como cheque.
- Reescribir `PagoDialog` (cobros) en bloques con grilla; reutilizar selectores con buscador y datos de la ficha fiscal.
- Prueba: preset de forma de pago y diferencia entre suma declarada y renglones.
