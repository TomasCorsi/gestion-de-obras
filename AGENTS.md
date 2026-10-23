# Architecture rules
- Machine receipts use a header and ordered child lines, saved through a security-invoker transactional function; this prevents partial saves and keeps all machines grouped in editing and exports.
- Keep a top-level error boundary and a visible startup loading state so rejected imports cannot leave the application empty.
- During the broken-PWA cleanup release, serve the cleanup worker at `/sw.js` without registering an app-shell worker from the app; keep manifest installability and local drafts intact. Rebuild offline/push registration separately after cleanup to avoid reviving stale caches.
- Accounting entries (contab_asientos) are born as drafts and can only be confirmed/reversed by privileged DB functions, enforced by triggers; this keeps the ledger immutable once confirmed.
- Fiscal records (contab_terceros) must link to an existing cliente/proveedor and store only tax data; contact data is read from the operational master, and each comprobante snapshots its fiscal data, so masters are never duplicated.
