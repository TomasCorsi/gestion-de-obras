

# Fix: Partes diarios query hitting 1000-row limit

## Problem
The `useParteDiarioAdmin` hook queries `partes_diarios` without specifying a row limit. The database defaults to returning a maximum of 1,000 rows. With 1,347 total records ordered by `fecha DESC`, older entries (like those from 02/02) are silently truncated.

This affects both the admin list view and Excel exports.

## Solution

Modify `useParteDiarioAdmin` to paginate or increase the limit. Two approaches:

### Approach: Server-side pagination with range
Use Supabase `.range()` to fetch all matching records in batches, or set an explicit higher limit when no date filters are applied.

**File: `src/hooks/useParteDiarioAdmin.ts`**
- When date filters (`fechaDesde`/`fechaHasta`) are set, the result set is naturally smaller -- no issue.
- When no date filters are set, use `.range(0, 4999)` to fetch up to 5,000 rows (covers foreseeable growth).
- Alternatively, add mandatory default date range (e.g., last 90 days) to the quick filters so the query always returns a bounded set.

### Changes
1. Add `.range(0, 4999)` to the query in `useParteDiarioAdmin.ts` to raise the effective limit to 5,000 rows.

This is a single-line change that immediately fixes the export and visibility issue.

