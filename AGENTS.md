# Agent instructions

These instructions govern coding agents working in this repository. Product requirements, contributor workflow, active work, and implementation traceability remain in their dedicated project documents.

## Before beginning any task

Read `DEVELOPMENT.md`, `TASKS.md`, `DESIGN.md`, and `implementation-map.yaml` in full. Use them as the authoritative workflow, work-state, product, and implementation-traceability references.

## Before changing files

1. Identify the applicable requirement IDs in `implementation-map.yaml`.
2. Read every requirement-specific plan linked from those map entries. Plans in `plans/` contain binding detailed rules and acceptance conditions for their named requirements.
3. Inspect the executable tests identified by each applicable plan before changing implemented behavior.
4. Follow the startup, branching, verification, and completion workflow in `DEVELOPMENT.md`.

## Authorization boundaries

- Do not conduct live browser-based testing unless the user explicitly requests or authorizes it in the current task.
- Do not apply Supabase migrations or perform other database writes without explicit authorization.
- Do not discard local changes without first determining their origin and purpose.

## Documentation responsibilities

- Put product behavior and confirmed UX decisions in `DESIGN.md`.
- Put requirement traceability and verification coverage in `implementation-map.yaml`.
- Put elaborate requirement contracts, edge cases, acceptance matrices, and validation gates in a linked file under `plans/`; follow `plans/README.md`.
- Put active and upcoming work in `TASKS.md`.
- Put contributor workflow in `DEVELOPMENT.md`.
- Keep agent-specific operating rules in this file.
