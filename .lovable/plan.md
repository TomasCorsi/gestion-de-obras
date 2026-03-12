

# Plan: Fix certificado edit loading and service section ordering

## Problems identified

### 1. First edit opens empty
In `openEditCertificado` (line 332), the function correctly fetches saved items and calls `setItemsDraft(draft)`. However, it also calls `setTipoCert(cert.tipo)` which triggers the `useEffect` at line 415. That effect checks `if (editingCertId)` and **overwrites** the draft with `buildDraftForTipo(tipoCert)` — fresh items with quantity 0.

On the second open, `tipoCert` is already the same value so the effect doesn't re-fire, and the draft survives.

### 2. Service subcategories reorder
`CertificadoServiceGrid` derives subcategory order from `items.forEach` insertion into a `Set`. The DB returns items ordered by `created_at`, but when items are deleted and re-inserted on save (the update mutation deletes all items then re-inserts), the `created_at` order may no longer match the original visual order, causing subcategories to appear shuffled.

## Solution

### File: `src/pages/Certificados.tsx`

**Fix 1 — Prevent useEffect from overwriting edit draft:**
- Add a ref flag `skipTipoEffect` that is set to `true` inside `openEditCertificado` before calling `setTipoCert`.
- In the `useEffect` at line 415, check this flag — if true, reset it and skip the draft rebuild.

**Fix 2 — Preserve subcategory order in service section:**
- When building the draft in `openEditCertificado` and `openDuplicarCertificado`, the items already come ordered from the DB. No change needed there.
- The real fix is in the save path: items need stable ordering.

### File: `src/hooks/useCertificados.ts`

**Fix 3 — Preserve item order on save:**
- In `updateCertificado` mutation, after deleting and re-inserting items, ensure the insertion order matches the array order so `created_at` preserves the visual sequence. This already happens since items are inserted in array order with `now()` default — but if multiple rows get the same timestamp, order is ambiguous.
- Add an explicit ordering approach: the `certificado_items` table doesn't have an `orden` column, so we rely on `created_at`. To guarantee order, insert items sequentially or use a small delay. Simpler: just fetch items with a deterministic order.

### File: `src/components/certificados/CertificadoServiceGrid.tsx`

**Fix 4 — Stable subcategory ordering:**
- When deriving subcategories from items, preserve the order items appear in the array (which reflects the user's arrangement) rather than using a `Set` which may reorder on re-render.

## Changes summary

1. **`src/pages/Certificados.tsx`**: Add `useRef` flag to skip the tipoCert useEffect when opening an existing certificate for editing. This prevents the draft from being overwritten.

2. **`src/components/certificados/CertificadoServiceGrid.tsx`**: Use an ordered array (preserving first-seen order) instead of `Set` when deriving initial subcategories, ensuring stable group ordering.

