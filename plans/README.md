# Requirement-specific plans

This directory holds detailed specifications for requirements whose rules, edge cases, delivery sequence, or acceptance conditions are too elaborate for `DESIGN.md`.

## Document roles

- `DESIGN.md` remains the canonical source for durable product behavior and confirmed UX decisions.
- `implementation-map.yaml` connects each requirement ID to its product specification, requirement-specific plan, implementation, and verification coverage.
- `plans/<requirement>-<name>.md` contains the detailed contract, edge cases, acceptance matrix, delivery slices, and validation gates for that requirement.
- Executable test files contain the exact inputs and expected outputs for implemented behavior.
- `TASKS.md` identifies active and upcoming work and links the applicable requirement plan.

Requirement plans supplement `DESIGN.md`; they do not replace it. If a detailed plan changes durable product behavior, update `DESIGN.md` and the plan together.

## Required change workflow

Before changing behavior covered by a requirement-specific plan:

1. Identify the requirement ID in `implementation-map.yaml`.
2. Read every plan linked from that requirement row.
3. Inspect the executable tests named by the plan before changing code.
4. Update the plan, implementation map, and tests in the same change whenever the detailed contract or acceptance conditions change.
5. Regenerate the readable implementation map in `DESIGN.md` with `pnpm map:generate`.

Do not copy every detailed scenario into `DESIGN.md`. Keep a concise statement of the durable rule there and maintain the complete scenario matrix in its linked requirement plan.

## Authority and conflicts

Plans elaborate `DESIGN.md`; they do not override confirmed product behavior. Each mapped group declares its governing `DESIGN.md` sections, requirements with dedicated plans list them in structured `plans` fields, and executable suites are registered once in the verification catalog and referenced by ID. Validation checks these references and generates their readable traceability into `DESIGN.md`.

Classify changes using `DEVELOPMENT.md`. If a plan, test, or proposed fix conflicts with confirmed design, follow the user-notification gate in `AGENTS.md` before changing the plan or implementation.
