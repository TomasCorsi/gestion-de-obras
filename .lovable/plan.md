

# Plan: Drag-and-drop reordering for subcategories

## What
Add drag handles to each subcategory row so they can be reordered by dragging up/down. No external library needed — use native HTML drag-and-drop API which is lightweight and sufficient for reordering a flat list.

## Changes in `src/components/certificados/CertificadoServiceGrid.tsx`

1. **Add a `GripVertical` icon** (from lucide-react) as a drag handle on each subcategory header, before the chevron.

2. **Add drag state** — track `draggedIndex` and `dragOverIndex` via `useState`.

3. **Add drag event handlers** on each subcategory wrapper div:
   - `onDragStart` — set `draggedIndex`
   - `onDragOver` — set `dragOverIndex`, prevent default
   - `onDrop` — reorder `subCategorias` array by moving `draggedIndex` to `dragOverIndex` position, then also reorder the underlying `items` to match the new subcategory order (so save preserves order)
   - `onDragEnd` — clear drag state

4. **Visual feedback** — add a top/bottom border highlight on the `dragOverIndex` element to indicate drop position.

5. **Reorder items on drop** — when subcategories are reordered, rebuild the items array grouped by the new subcategory order so the DB save preserves the visual sequence.

## Technical details
- Native drag-and-drop avoids adding dependencies
- The drag handle (`GripVertical`) gets `draggable` and the drag events; clicking other parts of the header (input, buttons) won't trigger drag
- Items array is rebuilt on reorder: iterate new subcategory order, collect items for each group, concatenate

