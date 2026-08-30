# Supabase development workflow

Versioned migrations in `supabase/migrations` are the source of truth for schema, functions, triggers, and row-level security policies. Dashboard edits are for inspection or emergency recovery, not routine schema changes.

## One-time setup

1. Authenticate locally with `pnpm supabase login`.
2. Link this checkout with `pnpm supabase link --project-ref <project-ref>`.
3. Pull any remote-only schema changes into a reviewed migration before making further changes.

Authentication and the linked project are machine-local. Do not commit tokens, passwords, or generated temporary files.

## Schema change loop

1. Create or update one focused migration, including any related RLS policy changes.
2. Run `pnpm db:lint` and `pnpm db:push:dry-run`.
3. Review the SQL and migration list.
4. Apply with `pnpm db:push` only when the migration is explicitly authorized.
5. Run `pnpm db:types` and commit the generated type change with the migration.
6. Run `pnpm verify` and the relevant behavioral tests.

The CLI is the canonical write path. A project-scoped Supabase MCP connection may be used for read-only inspection, logs, advisors, and verification; it should not become a second routine migration path.
