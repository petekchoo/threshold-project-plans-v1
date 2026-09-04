# Development workflow

This repository is the durable handoff between development tasks. A new task should inspect the local checkout before making changes rather than relying on prior chat context.

Coding agents must also follow the agent-specific authorization and documentation rules in `AGENTS.md`.

## Starting a task

1. Read `DESIGN.md` for product behavior and decisions.
2. Read `implementation-map.yaml` for requirement-to-code traceability.
3. Read `TASKS.md` for active and upcoming work.
4. For every applicable requirement, read the requirement-specific plans linked from `implementation-map.yaml` and inspect the executable tests they identify.
5. Check the current branch and working-tree status before editing.
6. Fetch `origin` before branching so new work starts from current GitHub `main`.

Do not discard local changes merely because they are absent from GitHub. Determine whether they are intentional work, generated output, or temporary state first.

## Local development server

Start the application with `pnpm dev`. When using the bundled Codex Node.js runtime, ensure its `bin` directory is present in `PATH` before starting the command. Do not invoke Next.js directly with an absolute Node path: Turbopack launches child Node.js processes that must also resolve `node` through `PATH`.

Before reporting the server as ready, request `http://localhost:3000` and confirm that it returns an HTTP 200 response. If `pnpm` is available but startup or compilation reports `node: not found`, load or activate the workspace's Node.js runtime, ensure it is inherited through `PATH`, and retry. Keep runtime paths and other machine-specific configuration out of the repository.

## GitHub CLI

GitHub CLI is the standard interface for pull requests and GitHub checks.

- Verify authentication with `gh auth status`.
- Verify the repository with `gh repo view`.
- Create focused commits on a feature branch based on current `origin/main`.
- Push with `git push -u origin <branch>`.
- Open a pull request with `gh pr create` and inspect it with `gh pr view`.
- Require successful repository verification and Vercel checks before merging.
- Merge through `gh pr merge`; do not force-push or rewrite shared `main`.

GitHub authentication is machine-local and should remain in the operating system credential store. Never commit tokens or CLI credential files. If `gh` is unavailable or unauthenticated on a new machine, install it from the official GitHub CLI release and run `gh auth login`.

## Supabase CLI

Use the project-local CLI through the package scripts in `package.json`. The canonical migration, schema-check, type-generation, and credential-safety workflow is documented in `supabase/README.md`.

Supabase authentication and project linking are machine-local. Verify them with `pnpm db:status` before database work. Apply migrations only after reviewing `pnpm db:push:dry-run` and receiving explicit authorization for the database write.

## Finishing a task

1. Update `DESIGN.md`, `implementation-map.yaml`, and `TASKS.md` when their scope changes.
2. Run `pnpm verify` and the relevant tests; run `pnpm build` for deployment-affecting changes.
3. Keep commits focused and review the final diff.
4. Push completed work and confirm GitHub checks.
5. Leave local `main`, `origin/main`, and migration history synchronized when the work is complete and merged.
