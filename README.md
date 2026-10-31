# Stackz

Real-time multiplayer Tetris where the crowd backs every match. This repo is a pnpm monorepo. Project context and rules live in [`skill.md`](skill.md).

```
apps/web/            React + Vite waitlist site (Cloudflare)
apps/api/            Hono API (Render)
packages/shared/     zod schemas, API types, brand tokens
supabase/migrations/ Postgres schema
```

## Branches

- `main`: all work. Commits and PRs go here.
- `live`: what Render, Cloudflare and Supabase deploy from. Only promoted from `main`, and only when the team says so.

## Local development

Requires Node 24 and pnpm (`corepack enable`).

```sh
pnpm install
cp apps/api/.env.example apps/api/.env   # STORE=memory runs without Supabase
pnpm dev:api                             # http://localhost:8787
```

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm format
```
