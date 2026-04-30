## Adaptar importador de sueldos al formato real del Excel

El Excel del usuario tiene estas columnas:
- **TIPO**: "Q" (quincenal) o "M" (mensual)
- **Leg.**: Legajo (algunos tienen "-" = sin legajo)
- **SUELDO TOTAL (NEGRO+BLANCO)**: Monto total
- **PARTE BLANCO**: Porcion en blanco
- **PARTE NEGRA**: Porcion en negro (a veces vacio, a veces tiene valor)
- **OBS**: Observaciones

### Cambios en `SueldosTab.tsx`

1. **Ampliar `findCol`** para reconocer los nombres reales:
   - Legajo: agregar "leg." y "leg"
   - Blanco: agregar "parte blanco"
   - Negro: agregar "parte negra", "negro+blanco" (para el total)
   - Modalidad/Tipo: agregar "tipo"

2. **Parsear modalidad**: Convertir "Q" a "quincenal" y "M" a "mensual"

3. **Calcular negro cuando falta**: Si PARTE NEGRA esta vacia pero hay SUELDO TOTAL y PARTE BLANCO, calcular negro = total - blanco

4. **Manejar legajos "-"**: Tratar "-" como legajo vacio pero permitir la importacion (no matcheara con personal, status "not_found", pero se guarda igual)

5. **Ignorar filas con errores Excel** (#VALOR!): Saltar filas donde blanco o negro contengan "#"

### Archivos a modificar
- `src/components/personal/SueldosTab.tsx` — Solo el bloque de parsing (`findCol` y `parseRows`)
