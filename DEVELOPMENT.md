# Development workflow

This repository is the durable handoff between development tasks. A new task should inspect the local checkout before making changes rather than relying on prior chat context.

Coding agents must also follow the agent-specific authorization and documentation rules in `AGENTS.md`.

## Starting a task

1. Read `TASKS.md` in full for the active handoff and upcoming work.
2. Locate every applicable requirement in `implementation-map.yaml`; read those complete entries and their linked requirement-specific plans.
3. Read the relevant product rules and decisions in `DESIGN.md`, expanding to the full document only for broad or uncertain scope.
4. Inspect the executable tests identified by each applicable plan before changing implemented behavior.
5. Check the current branch and working-tree status before editing.
6. Fetch `origin` before branching. If `TASKS.md` identifies an intentional local post-merge handoff commit, branch from local `main` so that commit is carried into the next feature pull request. Otherwise, start new work from current `origin/main`.

`AGENTS.md` defines the always-read sources and routing details. The generated implementation-map section in `DESIGN.md` is for readable reference and does not need to be reread after the authoritative YAML entries unless the task is checking generation or documentation consistency.

Do not discard local changes merely because they are absent from GitHub. Determine whether they are intentional work, generated output, or temporary state first.

## Classifying behavior changes

Before editing, record the applicable classification in the task reasoning or handoff:

- `conforms`: restores or implements behavior already stated unambiguously in `DESIGN.md`.
- `clarifies`: resolves ambiguity without changing confirmed intent; update the applicable plan and clarify `DESIGN.md` when the durable rule becomes more precise.
- `changes-design`: changes confirmed product behavior; obtain user direction through the conflict gate in `AGENTS.md`, then update `DESIGN.md`, affected plans, the implementation map, and tests together.
- `no-product-impact`: internal refactoring, tooling, or contributor-process work with no observable product-behavior change.

A changed test is not, by itself, authority for changed product behavior. Tests must trace to the same design and requirement contract as the implementation.

In implementation plans, reserve **slice** for a bounded increment that delivers product behavior or an independently meaningful technical capability. Label verification, documentation, pull-request, deployment, synchronization, and cleanup work as a **release gate** or **handoff checklist**, not as another slice.

## Local development server

Start the application with `pnpm dev`. When using the bundled Codex Node.js runtime, ensure its `bin` directory is present in `PATH` before starting the command. Do not invoke Next.js directly with an absolute Node path: Turbopack launches child Node.js processes that must also resolve `node` through `PATH`.

Before reporting the server as ready, request `http://localhost:3000` and confirm that it returns an HTTP 200 response. If `pnpm` is available but startup or compilation reports `node: not found`, load or activate the workspace's Node.js runtime, ensure it is inherited through `PATH`, and retry. Keep runtime paths and other machine-specific configuration out of the repository.

For validation on a physical phone, place the phone and development Mac on the same trusted network, determine the Mac's current LAN address, and allow that address when starting Next.js:

```sh
THRESHOLD_ALLOWED_DEV_ORIGINS=<mac-lan-address> pnpm dev
```

Open the `Network` URL printed by Next.js on the phone, including port `3000`. `next.config.ts` reads the comma-separated `THRESHOLD_ALLOWED_DEV_ORIGINS` value and passes it to Next.js only in that server process. Do not commit a machine-specific address. Confirm that the server does not report a blocked cross-origin request for the phone address: without this allowance, HTML can appear while client interactions such as the mobile drawer remain unavailable.

The LAN development URL uses plain HTTP and is not a secure browser context. Client features exercised on a physical phone must not depend exclusively on secure-context APIs such as `crypto.randomUUID`; provide a compatible fallback and verify the actual LAN origin. Chrome for iOS may also inject `__gchrome_uniqueid` attributes into forms before React hydration, so the root layout removes only that browser-owned attribute before hydration rather than suppressing general mismatch diagnostics.

Browser authentication storage is origin-specific. A session established at `localhost`, a previous LAN address, or a Docker-backed run does not establish a valid session at the current LAN URL. Sign out and back in at the phone URL when data is empty or a stale session is suspected. After restarting the development server, fully reload or open a new tab to clear stale development overlays and client state.

### Build and release environments

Treat the delivery pipeline as three separate stages, and identify both the application host and Supabase backend at every stage:

1. **Local code and disposable database:** Run formatting, type, lint, unit, and traceability checks against the working tree. Replay migrations and run database integration tests only against Docker-hosted local Supabase. This stage never writes to a hosted project.
2. **Local application and hosted development:** Run both the local development server and the local production build. Browser validation uses the dedicated hosted development Supabase project, the dedicated E2E account, and the reserved replaceable fixture graph. Data-changing browser tests and development migrations still require explicit authorization and verified cleanup.
3. **Pull request, preview, and production:** GitHub Verify repeats repository checks and database integration tests against disposable Supabase in CI. A Vercel pull-request check verifies the preview deployment; do not assume its Supabase target from the word “preview.” Verify the Vercel environment-variable scope before relying on runtime behavior, and never run data-changing validation when it targets production or another shared backend. After review and successful checks, merge promotes the application through the production deployment configured with production Supabase. Production database migrations are a separate deliberate promotion requiring dry-run review, explicit authorization, and the production write guard.

Passing a build or deployment check proves compilation and deployment readiness, not safe database targeting or end-to-end behavior. Record the verified backend classification in the task handoff whenever browser or deployed-preview validation occurs.

Dedicated development-testing credentials are stored in the ignored `.env.local` file as `THRESHOLD_DEV_E2E_EMAIL` and `THRESHOLD_DEV_E2E_PASSWORD`. Development seed and browser tooling must use only these variables. The existing `THRESHOLD_E2E_EMAIL` and `THRESHOLD_E2E_PASSWORD` variables identify the separate production smoke account and must never be used to seed development. Peter has authorized agents to use the dedicated development account for Threshold local application and browser validation without asking him to perform the login manually. Read credential values programmatically, never print or quote them in tool output or handoffs, and never copy them into tracked files. This standing project instruction identifies the approved test account and avoids credential-discovery questions; follow any runtime security requirement that still calls for confirmation immediately before credential transmission. Authentication remains origin-specific, so establish a fresh session when changing between localhost and the current LAN URL.

### Local application and validation environments

“Local” can refer to the web process, browser viewport, or database. Treat them as separate choices and identify both the application host and backend before validation:

| Purpose | Application host | Browser/device | Supabase backend |
| --- | --- | --- | --- |
| Manual desktop validation | Local Next.js at `http://localhost:3000` | Desktop browser at a representative wide viewport | Dedicated development Supabase selected by the guarded ignored local environment configuration |
| Manual mobile validation | The same local Next.js process; physical devices use its allowed LAN `Network` URL | Responsive emulation at 390 × 844 unless a task specifies a physical device | The same backend as the desktop session; viewport or device choice does not select a different backend |
| Playwright desktop smoke | Local Next.js by default, or explicit `E2E_BASE_URL` | Chromium at 1440 × 900 | The backend configured for the targeted application server |
| Playwright mobile smoke | The same target as desktop smoke | Chromium at 390 × 844 | The same backend configured for the targeted application server |
| Database integration tests | No browser application required | None | Disposable Docker-hosted local Supabase started with `pnpm db:start` |

Starting Docker does not automatically reconfigure `pnpm dev` or Playwright to use local Supabase. The web application always uses the public Supabase URL and key supplied to that application process. Before browser validation, classify that URL without printing credentials or project identifiers as one of: Docker-local, dedicated development, preview/staging, or production/shared. State the classification in the task handoff.

Read-only browser smoke may run against a shared backend only with the dedicated E2E account and current-task authorization. Never run create, edit, archive, fixture, or teardown journeys against production or another shared backend. Data-changing browser tests require a disposable local fixture lifecycle or the dedicated development backend's reserved fixture graph, explicit authorization, and a verified cleanup path.

### Hosted environment selection

Local application development uses the separate hosted development Supabase project by default. `.env.local` is ignored and stores the selected environment, development and production public settings, the development database password, and dedicated E2E credentials. Never print or commit those values. `pnpm dev` runs a preflight that refuses to start unless the active browser URL and publishable key match the selected development environment.

The machine-local CLI link and browser configuration are separate but must agree for hosted database commands. Run `pnpm env:check` before linked database work; it verifies the selected environment, active browser variables, and CLI link without printing project identifiers. `pnpm db:status`, `pnpm db:lint`, `pnpm db:push:dry-run`, `pnpm db:push`, and `pnpm db:types` use the same guard. A reviewed and explicitly authorized development migration write additionally requires `THRESHOLD_ALLOW_DB_WRITE=development pnpm db:push`. Production promotion requires selecting and linking production deliberately and setting `THRESHOLD_ALLOW_DB_WRITE=production` only for the authorized command.

`pnpm db:seed:dev` resets only the reserved development fixture records and the dedicated development E2E account; it does not clear unrelated development data. Run it only after explicit authorization with `THRESHOLD_ALLOW_DB_WRITE=development pnpm db:seed:dev`. The script refuses non-development targets, verifies the app and CLI destinations match, obtains the development secret key through the authenticated CLI without persisting it, and creates relative-date fixtures suitable for manual and future browser validation.

## GitHub pull requests and checks

In Codex, use the connected GitHub integration for repository, pull-request, review, and check operations when those tools are available. The integration provides the authenticated GitHub connection directly and does not require a local `gh` executable. Outside that environment, or when the integration is unavailable, use GitHub CLI as the local fallback.

Before any GitHub operation in Codex, search both the initially available tools and the deferred tool catalog for the connected GitHub integration. Do not infer that the integration is unavailable merely because its tools are absent from the initial visible tool list. Use the connected integration whenever it supports the required operation. If connector discovery, authentication, or the required operation fails, stop and report the precise failure to the user. Because GitHub CLI is not installed by default, ask whether the user wants it installed and configured as a fallback. Do not install GitHub CLI or use browser interaction for GitHub operations without explicit user authorization.

- With the connected integration, verify access by reading the repository or pull request before performing a write.
- Only after the user authorizes installing or using the GitHub CLI fallback, verify authentication with `gh auth status` and the repository with `gh repo view`.
- Create focused commits on a feature branch based on current `origin/main`, except when `TASKS.md` identifies an intentional local post-merge handoff commit; in that case, base the branch on local `main` and carry the handoff through the feature pull request.
- Push with `git push -u origin <branch>`.
- Open and inspect the pull request through the connected integration, or with `gh pr create` and `gh pr view` when using the CLI fallback.
- Require successful repository verification and Vercel checks before merging.
- Before merging, update `TASKS.md` in the pull request with the passed release gates, pull-request identifier, pending-merge state, and next work.
- Merge through the connected integration or `gh pr merge --delete-branch`; do not force-push or rewrite shared `main`.

### Branch cleanup after merge

After GitHub confirms a pull request merged successfully:

1. Switch to `main` and fast-forward it from `origin/main`.
2. Confirm the merged branch has no commits absent from `main` before deleting it locally.
3. Delete the local merged branch with the safe, non-forcing branch-delete operation.
4. Confirm the remote feature branch was deleted; delete it explicitly if GitHub did not remove it.
5. Fetch with pruning so stale remote-tracking references disappear.
6. Confirm the working tree is clean and local `main` matches `origin/main`.

Never automatically delete a diverged branch, a branch containing commits absent from `main`, a named archive/backup branch, or a branch owned by a separate deployment remote. Inspect and preserve those branches until their unique work and purpose are resolved.

GitHub authentication is environment-local: Codex integration credentials are managed by the application, while CLI credentials should remain in the operating system credential store. Never commit tokens or CLI credential files. Install GitHub CLI and run `gh auth login` only when the connected integration is unavailable and CLI access is needed.

## Supabase CLI

Use the project-local CLI through the package scripts in `package.json`. The canonical migration, schema-check, type-generation, and credential-safety workflow is documented in `supabase/README.md`.

Before local database work, run `docker version` and require both Client and Server output. Start the disposable local stack with `pnpm db:start`; this excludes the optional Studio UI while retaining the services needed by the application, `pnpm db:test`, and `pnpm db:test:concurrency`. If Docker is absent, stopped, awaiting macOS file-sharing permission, or cannot reach its engine, resolve that prerequisite before treating database-test failures as repository defects.

Supabase authentication and project linking are machine-local. Verify them with `pnpm db:status` before database work. Apply migrations only after reviewing `pnpm db:push:dry-run` and receiving explicit authorization for the database write.

The guarded linked commands verify that the CLI link and application URL in `.env.local` identify the same selected environment. Docker database tests remain independent of both.

## Finishing a task

1. Update `DESIGN.md`, `implementation-map.yaml`, and `TASKS.md` when their scope changes.
2. Run `pnpm verify` and the relevant tests; run `pnpm build` for deployment-affecting changes.
3. Keep commits focused and review the final diff.
4. Push completed work and confirm GitHub checks.
5. Complete the post-merge branch cleanup above and leave local `main`, `origin/main`, and migration history synchronized.

Treat `TASKS.md` as the durable operational handoff as well as the work list. Refresh its active entry for material pre-merge transitions that affect readiness, including linked deployment, completion of final verification, pull-request creation, and check or review outcomes. After a successful merge and cleanup, do not open a documentation-only pull request solely to replace a pending-merge handoff with the completed merge state. Reconcile the prior merge and activate the next work in the first commit of the next implementation branch. If no subsequent work is planned, a documentation-only completion pull request may be used when preserving a final durable handoff is valuable. Before ending or restarting a Codex session, compare the active entry with the current branch, linked migration state when applicable, and GitHub pull-request/check state; record links or identifiers needed to resume without relying on chat history.

### Post-merge continuation decision

After a successful merge, branch cleanup, and synchronization of local `main`, ask the user whether they are continuing immediately into another feature or wrapping up the work session.

- **Continuing immediately:** update the completed-merge handoff locally, commit it on local `main`, and start the next feature branch from that local commit. Carry the handoff commit through the next feature pull request. Do not push the local-only handoff commit directly to `origin/main`.
- **Wrapping up:** ask whether the completed-merge handoff should be preserved through a small documentation-only pull request. Do not push directly to `origin/main` unless the user explicitly authorizes bypassing the normal pull-request and check workflow.

Before proceeding, state whether local `main` is ahead of `origin/main` and how the handoff commit will reach GitHub. Once the applicable pull request merges, remove any temporary synchronization note from `TASKS.md` and confirm local `main` matches `origin/main` again.
