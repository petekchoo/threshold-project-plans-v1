# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

## Active

- Complete PRJ-06 Slice 2.1 under `plans/PRJ-06-project-scoped-locking.md`: replace the global schedule mutex with deterministic one-hop project locks, pass the `PRJ06-CON-*` multi-session matrix, and preserve the preview/fingerprint contract before beginning Slice 3.

## Next

- Deliver Slice 3 of project schedule shifting: connect project date edits to the authoritative preview and confirmation flow, including complete conflict recovery and accessible responsive behavior.
- Selectively incorporate Instinct's external feedback before beginning project templates. Inventory each recommendation, compare it with Threshold's confirmed product rules and current implementation, record an explicit adopt/adapt/defer/reject decision with rationale, and implement only the approved changes with appropriate requirement mapping and verification.
- Design and deliver reusable project templates for common or repeating work such as private dinners and menu launches. Define which project fields, activity details, relative date offsets, dependencies, project-relative timing rules, and assignments belong in a template; support template maintenance and atomic creation of an editable dated project with its complete activity graph. Reuse the project schedule-shifting model for date materialization and add unit, database, and core-journey coverage.
- Extend scheduling unit coverage as later project-rescheduling slices and dependency behaviors are implemented (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Add end-to-end coverage for the core journeys (`QA-05`).

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
