# Conceptos de CAMINO REAL y notas por ítem en certificados

## 1. Carga de los 14 conceptos en la obra CAMINO REAL
Hoy la obra no tiene conceptos. Se cargan los 14 renglones de la planilla, en el mismo orden:

- Nombre, unidad y cantidad contratada tal cual figuran (ej. 619,51 M2, 2.576,76 M2).
- Unidad "U" se guarda como "UN" (formato del sistema).
- Categoría: "Ejecución de obra" (9 ítems) y "Materiales" (5 ítems: tierra negra, tosca, Hormigón H13, Hormigón H30).
- Tipo "obra", así el avance se calcula sobre la cantidad contratada.
- **Precio unitario en 0**: la planilla no trae precios. Se pueden completar después desde Certificados; si me los pasás, los cargo directamente.

## 2. Notas en cada ítem del certificado
- Agregar un campo "Nota" en cada renglón al armar/editar un certificado, en todas las grillas (por obra y por servicio), para marcar casos como "Adicional".
- La nota se guarda con el ítem, se ve al abrir el certificado, sale en el PDF debajo/al lado del concepto y en el Excel exportado.
- Los renglones con nota se muestran con una marca visible en la grilla.

## Detalles técnicos
- Carga de datos en `certificado_conceptos` para `obra_id = c66e1bc1...` (sin cambio de esquema).
- `certificado_items.observaciones` ya existe y el PDF ya la imprime; hoy solo se edita en `CertificadoServiceGrid`. Se agrega el input en la grilla de ítems de obra en `Certificados.tsx`, se muestra en la vista del certificado y se agrega la columna en el Excel.
