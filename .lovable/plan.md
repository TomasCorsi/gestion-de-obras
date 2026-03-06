

# Fix EPP PDF Layout Issues

## Problems Identified
1. **Row 4 overlap**: The `(9)` description label text is too long for its cell — at font size 7, `"Descripción breve del puesto/s de trabajo en el/los cuales se desempeña el trabajador:"` overflows into the right column `(10)`. The row height of 16mm is insufficient.
2. **Table width mismatch**: The autoTable column widths sum to ~253mm but the header boxes use `boxW` (pageW - 24 = 273mm), so the table is narrower than the form above it.

## Fix

### `src/utils/generateEntregaEPPPDF.ts`

**Row 4 (lines 112-144)**: 
- Increase row height from 16mm to 22mm
- Use `splitTextToSize` for the (9) label so it wraps within its column width instead of overflowing
- Reduce font size of the long label text to 6pt
- Position the role value below the wrapped label with proper spacing

**Table (lines 149-197)**:
- Remove fixed `cellWidth` from head styles — let autoTable use `tableWidth: boxW` so it fills the same width as the header rows
- Use `columnStyles` with proportional widths that sum to `boxW`

These two changes fix both the text overlap in row 4 and the width mismatch between the form header and the items table.

