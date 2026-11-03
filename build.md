# Stackz — Build Status

Where the project stands, what is left, and what is needed to launch the Season 0 waitlist.
For product, brand and technical rules, read [`skill.md`](skill.md) first.

Repo: https://github.com/damilolaoxox/stackz

---

## 1. What has been built

All of this is merged into `main`, and CI (format, typecheck, tests, build) passes.

### Waitlist site — `apps/web` (React + Vite + TypeScript)

- **Hero:**
  - falling-piece rain
  - the block-built headline "THE BOARD IS THE BET."
  - the NEXT preview and HUD
  - a live AI Tetris board with the POT counter and P1/P2 backing bar
  - the landed-block floor with the timecode
- **Waitlist ticket:**
  - X handle field, with the profile picture appearing automatically
  - the four task power bars (GO → charging → CONFIRM → DONE)
  - wallet field
  - Cloudflare Turnstile check
  - the ADMIT ONE stub with a barcode. No numbers appear anywhere.
- **After joining:** the shareable card, plus Share on X, Copy image, Download and "Not you?".
- **The match:** two live AI boards; P2 takes garbage rows and tops out.
- **Characters:** a conveyor of block characters.
- **Footer:** links and the cropped wordmark.
- **Game engine:** real Tetris with a 7-bag randomiser, AI placement, ghost piece, line clears, garbage rows and top-out/restart. It has unit tests.
- **Sound:**
  - an intro and a seamless music loop that start on the first click
  - the hero board moves in time with the beat
  - a click sound on buttons and links, never while typing
  - a SOUND ON/OFF toggle
- Works at 375px wide, touch targets are at least 44px, and reduced motion is respected.
- Hosting config is in `render.yaml`: the static site with its rewrite for `/privacy` and its headers, and the API.

### API — `apps/api` (Hono on Node, for Render)

| Endpoint                                | Purpose                                                   |
| --------------------------------------- | --------------------------------------------------------- |
| `GET /healthz`                          | Health check for Render                                   |
| `GET /x/avatar?handle=`                 | Profile picture lookup through unavatar.io, cached        |
| `GET /tasks/:handle`                    | Restores someone's task progress                          |
| `POST /tasks/go`, `POST /tasks/confirm` | Task timers. The server enforces the 8-second minimum.    |
| `POST /waitlist`                        | Join: checks Turnstile and that all four tasks are done   |
| `GET /card/:handle.png`                 | Generated 1200×630 share card, cached in Supabase Storage |
| `GET /s/:handle`                        | Share page that gives X the card as the link preview      |

- Input validation, rate limits, CORS restricted to the site, and security headers.
- The spot number is never exposed publicly.
- There is an in-memory mode (`STORE=memory`) for local development without Supabase.

### Shared, database and infrastructure

- **`packages/shared`:** input validation, API types, brand colours and the character generator.
- **`supabase/migrations`:**
  - `waitlist_entries` and `task_progress` tables, with row-level security on and no public access
  - a `cards` storage bucket
- **`render.yaml`:** the Render blueprint. It deploys only from the `live` branch.
- **`.github/workflows/ci.yml`:** checks every push and PR.
- **`.github/workflows/migrate.yml`:** applies database migrations to production, only from `live`.
- **`tools/sfx`:** the generator for the site's sounds.

---

## 2. Local development

```sh
pnpm install
pnpm dev            # API on http://localhost:8787, site on http://localhost:5173
```

- No env files to copy. The API loads `apps/api/.env.example` (local defaults: in-memory store, Turnstile test secret), then `apps/api/.env` on top if it exists. The site falls back to the Turnstile test key.
- `pnpm dev:api` and `pnpm dev:web` still start one side each.
- Turnstile retries after an error. With the local test key it falls back to Cloudflare's dummy token, so a browser extension can't block joining locally. Production keys never fall back.
- The site needs port 5173, because the API only allows that origin. If another app holds it, Vite now stops with an error instead of quietly moving to 5174 (which broke CORS).
- Vite ignores `postcss.config.*` files in parent folders. A stray Tailwind config in a home folder used to make every stylesheet fail to load.
- If `pnpm` itself fails on Windows, `corepack pnpm …` works.

---

## 3. What is left to build

| Item           | Notes                                     |
| -------------- | ----------------------------------------- |
| Community link | Hidden until `VITE_COMMUNITY_URL` is set. |

### Done since the last update

- **X account: [@playstackz](https://x.com/playstackz).** It's the default in `apps/web/src/lib/config.ts` (`VITE_X_HANDLE` can still override it). Follow opens X's one-click follow page; like, comment and repost open the profile, where the pinned post sits on top. No X API: CONFIRM counts once `TASK_MIN_SECONDS` (8 s, enforced by the API) have passed since GO. **Pin the launch post on @playstackz** so the tasks make sense.
- **NFT supply: 1,500.** Shown on the Characters section.

- **Privacy page** at `/privacy` (`apps/web/src/components/Privacy.tsx`). It describes only what the code does. **The owner should read it before launch**, and it must be updated whenever the site starts collecting or sharing something new.
- **Admin review.** The API has `/admin` routes, switched on by setting `ADMIN_TOKEN` (32+ characters; off and 404 when unset). Review from a terminal:

  ```sh
  # in apps/api/.env: ADMIN_TOKEN=<same value as Render>, ADMIN_API_URL=https://api.<domain>
  pnpm admin list                 # pending entries, with wallet and GO→CONFIRM seconds per task
  pnpm admin list all --limit 50
  pnpm admin approve alice bob
  pnpm admin reject spammer
  pnpm admin reset alice          # back to pending
  ```

- **Shared rate limits.** Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (an Upstash Redis database) and every API instance shares the same counts. Without them, counts stay in memory, which is fine on one instance. If Redis is unreachable, requests are allowed and an error is logged. Covered by tests with a fake Redis; not yet tried against a real Upstash database.

**Later, not part of the waitlist:** the real-time game, the betting and the NFT minting.

---

## 4. What is needed to launch

### Decisions and accounts (owner)

- [ ] Domain name (last)
- [x] X account: @playstackz
- [ ] Pin the launch post on @playstackz
- [ ] Community link (optional)
- [ ] Token name and chain (an EVM chain)
- [x] NFT supply: 1,500
- [ ] Season 0 dates
- [ ] **Legal advice on betting.** Crowd betting with a token that can be cashed out may count as regulated gambling in Nigeria and elsewhere. Don't build real-money betting until this is confirmed.

### Supabase

- [ ] Create the project.
- [ ] In GitHub → Settings → Environments, create `production` and add the secret `SUPABASE_DB_URL` (the database connection string).
- [ ] The migration runs automatically the first time `main` is promoted to `live`.
- [ ] Keep the service-role key for Render's `stackz-api`. Never put it in the web app.

### Hosting: everything on Render

The site (`stackz-web`, a free static site) and the API (`stackz-api`, Starter plan) are both in `render.yaml` and deploy only from `live`. The domain is bought from a registrar (Render doesn't sell domains). The site goes on the root domain and the API on `api.<domain>`. Do these in order:

1. [ ] **Buy the domain** at a registrar.
2. [ ] **Supabase:** done (section above), including the `SUPABASE_DB_URL` GitHub secret, so the migration runs when `live` is created.
3. [ ] **Turnstile:** in Cloudflare → Turnstile, add a widget with hostnames `<domain>` and `stackz-web.onrender.com`. Keep the site key and the secret key.
4. [ ] **Create `live` from `main`** (owner's go-ahead only): `git push origin main:live`. The Blueprint needs the branch to exist.
5. [ ] **Render → New → Blueprint**, pick this repo. It creates `stackz-web` and `stackz-api` and asks for the `sync: false` values:

| Service      | Variable                                             | Value                                                                                  |
| ------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `stackz-web` | `VITE_API_URL`                                       | `https://api.<domain>`                                                                 |
| `stackz-web` | `VITE_TURNSTILE_SITE_KEY`                            | Turnstile site key                                                                     |
| `stackz-web` | `VITE_COMMUNITY_URL`                                 | Optional; leave empty to hide the link                                                 |
| `stackz-api` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`          | From the Supabase project                                                              |
| `stackz-api` | `TURNSTILE_SECRET_KEY`                               | Turnstile secret key                                                                   |
| `stackz-api` | `ALLOWED_ORIGINS`                                    | `https://<domain>` (no trailing slash)                                                 |
| `stackz-api` | `SITE_URL`                                           | `https://<domain>`                                                                     |
| `stackz-api` | `PUBLIC_API_URL`                                     | `https://api.<domain>`                                                                 |
| `stackz-api` | `UNAVATAR_API_KEY`                                   | Recommended. The free tier is rate-limited per IP, and every lookup comes from Render. |
| `stackz-api` | `ADMIN_TOKEN`                                        | Optional. Turns on admin review (`pnpm admin`). Generate with `openssl rand -hex 32`.  |
| `stackz-api` | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional. Only needed before running more than one API instance.                       |

6. [ ] **Custom domains in Render:** on `stackz-web` add `<domain>` (Render adds `www` and redirects it to the root); on `stackz-api` add `api.<domain>`.
7. [ ] **DNS at the registrar** (delete any `AAAA` records first; Render is IPv4 only):

| Type  | Host  | Value                             |
| ----- | ----- | --------------------------------- |
| A     | `@`   | `216.24.57.1`                     |
| CNAME | `www` | the site's `onrender.com` address |
| CNAME | `api` | the API's `onrender.com` address  |

If the domain's DNS is on Cloudflare instead: use a CNAME on `@` to the site's `onrender.com` address, set every record to **DNS only** (grey cloud), and set SSL/TLS to **Full**.

8. [ ] **Verify** both domains in Render (Settings → Custom Domains → Verify). Render issues the HTTPS certificates itself.
9. [ ] **Rebuild the site** if `VITE_API_URL` changed after its first build: `stackz-web` → Manual Deploy → Clear build cache & deploy. `VITE_*` values are baked in at build time.
10. [ ] **Test on the real domain:** `https://api.<domain>/healthz`, the site, `/privacy`, the avatar, the four tasks, Turnstile, joining, the card, and the X share preview.

---

## 5. Rules to keep

- **Branches:** all work goes to `main`. `live` is what Render and Supabase deploy from. Never push or promote to `live` without the owner's go-ahead.
- **Secrets:** they live only in Render's settings, never in the repo or the web bundle.
- **Wallets:** never ask for a seed phrase, a private key or a wallet signature. The waitlist takes a public address only.
- **Placeholders:** don't invent values for the token, chain or dates. Leave the placeholders in place.
- **OneDrive (local note):** if the repo sits in OneDrive, local `pnpm typecheck` can falsely fail with "No inputs were found". Run the checks in a copy outside OneDrive. CI is not affected.
