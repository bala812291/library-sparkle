
# Project rules

- Circulation, fines, reservations and librarian promotion go through security-definer SQL functions (issue_book, return_book, record_fine_payment, etc.); those tables have read-only RLS for clients. Why: atomic, race-safe, tamper-proof.
- Lists read from `*_view` / `books_catalog` views (security_invoker) so inventory counts are computed, never stored. Why: no drifting counts.
- Staff-only pages wrap content in `RequireRole`; RLS is the real guard. Why: UI hint plus DB enforcement.
- Shared UI lives in `src/components/kit.tsx`; filters persist via `useSticky`. Why: consistent pages.
- Book covers live in the private `book-covers` bucket; display via signed URLs (`useCovers`). Why: public buckets are blocked.
