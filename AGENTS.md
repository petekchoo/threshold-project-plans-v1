# Agent instructions

These instructions govern coding agents working in this repository. Product requirements, contributor workflow, active work, and implementation traceability remain in their dedicated project documents.

## Before beginning any task

1. Read `DEVELOPMENT.md` and `TASKS.md` in full. They are the authoritative workflow and current-work handoff.
2. Use `implementation-map.yaml` as an index: locate the requirement IDs applicable to the task and read those entries, including their implementation, persistence, coverage, verification, and linked-plan references. Read the map preamble when changing traceability conventions or when no existing requirement clearly applies.
3. Read the portions of `DESIGN.md` governing the affected product behavior and any cross-cutting constraints the change touches. Read the full document only for broad product/design work or when the affected scope cannot be determined reliably.

Do not rely on prior chat context in place of these durable sources. This routed startup is intended to preserve requirement and handoff coverage without repeatedly loading unrelated product areas or the generated readable copy of the implementation map in `DESIGN.md`.

## Before changing files

1. Identify the applicable requirement IDs in `implementation-map.yaml`.
2. Read every requirement-specific plan linked from those map entries. Plans in `plans/` contain binding detailed rules and acceptance conditions for their named requirements.
3. Inspect the executable tests identified by each applicable plan before changing implemented behavior.
4. Classify the change as `conforms`, `clarifies`, `changes-design`, or `no-product-impact` using `DEVELOPMENT.md`.
5. Follow the startup, branching, verification, and completion workflow in `DEVELOPMENT.md`.

Edit existing files only through targeted changes. Never delete and recreate an existing file as an editing or patching workaround; if a targeted edit cannot be applied safely, stop and inspect or reformat the file before trying again.

For documentation-only workflow changes that do not alter product behavior, state that no product requirement applies and inspect the documentation sources being changed. Do not invent a product requirement ID for contributor-process work.

## Design conflict gate

The authority order is user-confirmed intent, `DESIGN.md`, requirement-specific plans, `implementation-map.yaml`, then code and executable tests. Lower-level sources may implement or clarify higher-level intent but must not silently override it.

If a requested fix, plan, test, existing behavior, or implementation approach conflicts with confirmed behavior in `DESIGN.md`, stop before changing product behavior. Tell the user which sources conflict, explain the practical consequences and available resolutions, and obtain direction. Ordinary defects that plainly fail to conform to unambiguous design do not require another approval; fix them as `conforms` changes.

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
