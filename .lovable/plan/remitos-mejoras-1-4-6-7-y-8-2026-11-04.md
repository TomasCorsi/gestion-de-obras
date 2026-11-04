# Remitos: mejoras 1, 4, 6, 7 y 8

## 1. Totales del período arriba de cada grilla
- En Viajes, Materiales y Máquinas, una franja de tarjetas que respeta los filtros activos: cantidad de remitos, total $, sin precio.
- Desplegable "Ver por cliente / por obra" con los 10 principales y su total.

## 4. Marcar remitos como «liquidado»
- Cada remito (de los tres tipos) guarda: liquidado sí/no, fecha y quién lo marcó.
- Al exportar/confirmar una liquidación de cliente u obra, botón "Marcar estos remitos como liquidados".
- Columna/insignia "Liquidado" en las grillas y filtro "Pendiente / Liquidado / Todos" (por defecto: pendientes en la liquidación).
- La liquidación avisa si incluís remitos ya liquidados. Desmarcar solo para administradores.

## 6. Foto del remito en papel
- Botón "Adjuntar foto" en los formularios de los tres tipos (cámara del celular o archivo).
- Ícono de cámara en la grilla para ver la foto. Viajes reutiliza el dato de evidencia que ya existe.
- Archivos privados, visibles solo para usuarios con acceso a remitos.

## 7. Carga simplificada desde el celular
- En pantallas chicas, el botón "Nuevo" abre un formulario a pantalla completa en pasos: tipo → fecha/N° → obra (busca por número) → máquina/material → cantidad/precio → foto → guardar.
- Botones grandes, teclado numérico para cantidades, se guarda el borrador si se corta.
- Usa las mismas validaciones y guardado que la versión de escritorio.

## 8. Alertas de remitos sin precio o sin obra
- Aviso rojo arriba de cada grilla: "X remitos sin precio · Y sin obra", con botón que aplica el filtro correspondiente.
- Resaltado de la fila afectada.
- Al guardar sin precio u obra, advertencia (permite guardar igual).
- La liquidación también avisa cuántos remitos sin precio quedan afuera del total.

## Detalles técnicos
- Migración: columnas `liquidado boolean default false`, `liquidado_at`, `liquidado_by`, en `remitos`, `remitos_materiales`, `remitos_maquinas`; `foto_url` en materiales y máquinas. Función SECURITY DEFINER `marcar_remitos_liquidados(tipo, ids[], valor)` que verifica rol admin en `user_roles` para desmarcar.
- Bucket privado `remitos-fotos` con políticas por usuario autenticado con acceso; URLs firmadas para ver.
- Totales y alertas calculados en cliente sobre los datos ya filtrados (con lotes para >1000 filas).
- Formulario móvil: nuevo componente que reutiliza las funciones de guardado existentes; borrador en localStorage.
- Pruebas: cálculo de totales/alertas y regla de liquidados (excluir/avisar).
- Sin cambios en Contabilidad ni rentabilidad.
