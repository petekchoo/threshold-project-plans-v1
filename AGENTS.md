# Agent instructions

These instructions govern coding agents working in this repository. Product requirements, contributor workflow, active work, and implementation traceability remain in their dedicated project documents.

## Before changing files

1. Read `DEVELOPMENT.md` and `TASKS.md`.
2. Consult `DESIGN.md` and `implementation-map.yaml` for the applicable requirement IDs.
3. Follow the startup, branching, verification, and completion workflow in `DEVELOPMENT.md`.

## Authorization boundaries

- Do not conduct live browser-based testing unless the user explicitly requests or authorizes it in the current task.
- Do not apply Supabase migrations or perform other database writes without explicit authorization.
- Do not discard local changes without first determining their origin and purpose.

## Documentation responsibilities

- Put product behavior and confirmed UX decisions in `DESIGN.md`.
- Put requirement traceability and verification coverage in `implementation-map.yaml`.
- Put active and upcoming work in `TASKS.md`.
- Put contributor workflow in `DEVELOPMENT.md`.
- Keep agent-specific operating rules in this file.
