# Supabase development workflow

Versioned migrations in `supabase/migrations` are the source of truth for schema, functions, triggers, and row-level security policies. Dashboard edits are for inspection or emergency recovery, not routine schema changes.

## One-time setup

1. Authenticate locally with `pnpm supabase login`.
2. Link this checkout with `pnpm supabase link --project-ref <project-ref>`.
3. Pull any remote-only schema changes into a reviewed migration before making further changes.

Authentication and the linked project are machine-local. Do not commit tokens, passwords, or generated temporary files.

## Schema change loop

1. Run `docker version` and confirm both the Client and Server sections are present. Docker Desktop must be running and allowed to share this repository's folder.
2. Start the disposable local stack with `pnpm db:start`. The first run downloads the Supabase images and can take several minutes.
3. Create or update one focused migration, including any related RLS policy changes.
4. Replay migrations locally as appropriate and run `pnpm db:test`. Use explicit multi-session barriers for concurrency contracts; do not substitute timing assumptions.
5. Run `pnpm db:lint` and `pnpm db:push:dry-run`.
6. Review the SQL and migration list.
7. Apply with `pnpm db:push` only when the migration is explicitly authorized.
8. Run `pnpm db:types` and commit the generated type change with the migration.
9. Run `pnpm verify` and the relevant behavioral tests. Use `pnpm db:stop` when the local stack is no longer needed.

`pnpm db:start` excludes the optional Studio UI to reduce startup surface for command-line schema testing. Run `pnpm supabase start` directly when Studio is needed. Never use `supabase db reset --linked` as a local-test workaround; it destroys the linked database.

The CLI is the canonical write path. A project-scoped Supabase MCP connection may be used for read-only inspection, logs, advisors, and verification; it should not become a second routine migration path.
