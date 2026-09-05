# Development workflow

This repository is the durable handoff between development tasks. A new task should inspect the local checkout before making changes rather than relying on prior chat context.

Coding agents must also follow the agent-specific authorization and documentation rules in `AGENTS.md`.

## Starting a task

1. Read `TASKS.md` in full for the active handoff and upcoming work.
2. Locate every applicable requirement in `implementation-map.yaml`; read those complete entries and their linked requirement-specific plans.
3. Read the relevant product rules and decisions in `DESIGN.md`, expanding to the full document only for broad or uncertain scope.
4. Inspect the executable tests identified by each applicable plan before changing implemented behavior.
5. Check the current branch and working-tree status before editing.
6. Fetch `origin` before branching so new work starts from current GitHub `main`.

`AGENTS.md` defines the always-read sources and routing details. The generated implementation-map section in `DESIGN.md` is for readable reference and does not need to be reread after the authoritative YAML entries unless the task is checking generation or documentation consistency.

Do not discard local changes merely because they are absent from GitHub. Determine whether they are intentional work, generated output, or temporary state first.

## Classifying behavior changes

Before editing, record the applicable classification in the task reasoning or handoff:

- `conforms`: restores or implements behavior already stated unambiguously in `DESIGN.md`.
- `clarifies`: resolves ambiguity without changing confirmed intent; update the applicable plan and clarify `DESIGN.md` when the durable rule becomes more precise.
- `changes-design`: changes confirmed product behavior; obtain user direction through the conflict gate in `AGENTS.md`, then update `DESIGN.md`, affected plans, the implementation map, and tests together.
- `no-product-impact`: internal refactoring, tooling, or contributor-process work with no observable product-behavior change.

A changed test is not, by itself, authority for changed product behavior. Tests must trace to the same design and requirement contract as the implementation.

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
- Merge through `gh pr merge --delete-branch`; do not force-push or rewrite shared `main`.

### Branch cleanup after merge

After GitHub confirms a pull request merged successfully:

1. Switch to `main` and fast-forward it from `origin/main`.
2. Confirm the merged branch has no commits absent from `main` before deleting it locally.
3. Delete the local merged branch with the safe, non-forcing branch-delete operation.
4. Confirm the remote feature branch was deleted; delete it explicitly if GitHub did not remove it.
5. Fetch with pruning so stale remote-tracking references disappear.
6. Confirm the working tree is clean and local `main` matches `origin/main`.

Never automatically delete a diverged branch, a branch containing commits absent from `main`, a named archive/backup branch, or a branch owned by a separate deployment remote. Inspect and preserve those branches until their unique work and purpose are resolved.

GitHub authentication is machine-local and should remain in the operating system credential store. Never commit tokens or CLI credential files. If `gh` is unavailable or unauthenticated on a new machine, install it from the official GitHub CLI release and run `gh auth login`.

## Supabase CLI

Use the project-local CLI through the package scripts in `package.json`. The canonical migration, schema-check, type-generation, and credential-safety workflow is documented in `supabase/README.md`.

Before local database work, run `docker version` and require both Client and Server output. Start the disposable local stack with `pnpm db:start`; this excludes the optional Studio UI while retaining the services needed by the application, `pnpm db:test`, and `pnpm db:test:concurrency`. If Docker is absent, stopped, awaiting macOS file-sharing permission, or cannot reach its engine, resolve that prerequisite before treating database-test failures as repository defects.

Supabase authentication and project linking are machine-local. Verify them with `pnpm db:status` before database work. Apply migrations only after reviewing `pnpm db:push:dry-run` and receiving explicit authorization for the database write.

## Finishing a task

1. Update `DESIGN.md`, `implementation-map.yaml`, and `TASKS.md` when their scope changes.
2. Run `pnpm verify` and the relevant tests; run `pnpm build` for deployment-affecting changes.
3. Keep commits focused and review the final diff.
4. Push completed work and confirm GitHub checks.
5. Complete the post-merge branch cleanup above and leave local `main`, `origin/main`, and migration history synchronized.
