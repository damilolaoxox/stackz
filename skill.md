---
name: stackz
description: Context for building Stackz, a real-time multiplayer Tetris game with crowd betting, its own in-game token and a block-character NFT collection. Use for any Stackz work; the current focus is the Season 0 waitlist site.
---

# Stackz

## What we are building

Stackz is real-time multiplayer Tetris. Players compete live, the crowd backs a player with the Stackz in-game token, and the winning side splits the pot. There is also an NFT collection of block-built characters that holders use as their in-game avatar.

- Reference project: github.com/Spagero763/gambit (Blokaz). It is a reference only. Do not copy its branding, and never add Celo, MiniPay or stablecoin code. Stackz uses its own in-game token only.
- Token name, ticker, chain, NFT supply and mint price are not decided yet. Leave clear placeholders such as `[TOKEN]` and `[SUPPLY]`; never invent values.

## Current focus: the Season 0 waitlist

Build the waitlist site first. Game, betting and minting come later. Do not build them unless asked.

### Page sections, in order

1. **Hero**
   - **Header:** STACKZ wordmark, nav links "The match" and "Characters", and a "Join the waitlist" button.
   - **Falling-piece rain:** three depth layers of falling tetrominoes. The near layer drops in row-by-row steps and some pieces snap-rotate mid-fall.
   - **Headline:** "THE BOARD IS THE BET.", built from bevelled blocks that fall into place on load. "BET" is yellow, and a red block drops in as the full stop.
   - **HUD:** a NEXT piece preview, then "LEVEL 00 · SEASON 0 · TICKETS OPEN".
   - **Subline:** "Real-time Tetris where the crowd puts tokens on every match. Play it, back it, or both."
   - **One button:** "Join the waitlist".
   - **Live AI board on the right:** a real Tetris game (see Live boards below), with a rolling POT counter and an animated P1/P2 backing bar.
   - **Bottom of the hero:**
     - a pile of landed blocks whose upper rows fade into the dark
     - a light sweep that runs across the bottom row on a loop
     - the caption "SCENE 01 · THE DROP", with a live timecode on the right.
2. **LEVEL 01 · Waitlist**
   - **Heading:** "Join the waitlist."
   - **Layout:** a ticket card with a perforated yellow stub that shows ADMIT ONE, SEASON 0 and a block barcode. No ticket number and no digits anywhere on it: we don't reveal how many people have joined.
   - **Steps:**
     - **01 · Your X username:** an `@` input, with a square box beside it where the user's X profile picture appears automatically. Helper text: "Your name on the list. We only use your public username and profile picture."
     - **02 · Complete all four tasks:** the counter shows `n/4`. The tasks are:
       1. Follow Stackz on X
       2. Like the pinned post
       3. Comment on the pinned post
       4. Repost the pinned post
     - **03 · Add your wallet:** an EVM `0x` address, typed or pasted. Helper text "Public address only. We never ask for a seed phrase or a signature." Never ask the user to connect a wallet.
   - **Submit button:** "Join the waitlist".
3. **LEVEL 02 · The match**
   - **Heading:** "Two boards. One pot."
   - **Visual:** two live AI boards. P2 keeps receiving garbage rows and eventually tops out.
4. **LEVEL 03 · Characters**
   - **Heading:** "Your face on the board."
   - **Visual:** an endless conveyor of collection characters.
5. **Footer:** links to X, Community and Privacy, above a huge cropped STACKZ wordmark with pieces landing on it.
6. **After joining:**
   - **Copy:** "You're on the list", the heading "Your spot is pending.", "Your Stackz card. Share it and bring your friends into Season 0." and "We'll reach out on X when Season 0 opens."
   - **Shareable card (1200×630, rendered by the API):** their X profile picture in a yellow block frame (or their 16×16 block character, picked from their handle, if it can't be fetched), "PLAYER" and @handle, the four tasks as full power bars, and a tilted ADMIT ONE stamp: a ring of red tetrominoes around "S0" in block letters with ON THE LIST underneath, with a few blocks missing like uneven ink. No spot number: it stays internal.
   - **Buttons:** Share on X, Copy image, Download, and a "Not you?" link.

### Task power bars (required behaviour)

Each task row has a 10-block bar and a button. A task moves through three states:

| State      | Bar                                                                   | Button                                                            |
| ---------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `idle`     | grey, empty                                                           | **GO**: opens the X intent in a new tab, then moves to `charging` |
| `charging` | blocks light up left to right, low saturation, about 0.35 s per block | blinking **CONFIRM**                                              |
| `done`     | bright flash sweep, then full saturation                              | **DONE**, disabled                                                |

- Every task starts on GO.
- Task colours: Follow yellow, Like blue, Comment red, Repost green `#4FB477`.
- CONFIRM only counts once at least `TASK_MIN_SECONDS` (default 8) have passed since GO. The server enforces this, not just the UI.
- Verification is time-gated honour: we do not call the paid X API for each check. Keep it that way unless told otherwise.
- Handle ownership is honour-based too (no X login, no wallet connection). Anyone can type any handle; `status` (pending, approved, rejected) is how the team weeds out fakes before Season 0.

### Live boards

The boards are a real Tetris simulation, never a looping animation.

- Pieces come from a 7-bag randomiser.
- The AI picks each placement by scoring aggregate height, lines cleared, holes and bumpiness, plus a skill-based random factor.
- The active piece rotates, slides one column per tick and drops row by row. A ghost piece shows where it will land.
- Full rows flash, then clear, and a LINES counter goes up.
- The board on garbage mode gets grey garbage rows. On top-out it greys over, shows TOPPED OUT, then restarts.
- Use one reusable component with props for cell size, row count, tick speed, skill, garbage mode and label.

## Brand

- **Look:** flat bevelled Tetris blocks on warm black. It should feel cinematic and arcade-like, never "AI-made".
- **Never use:** gradient washes, glows, neon, emoji, glassmorphism or generic SaaS layouts.
- **Every block** gets a hard bevel: `inset b b 0 rgba(255,255,255,.28), inset -b -b 0 rgba(0,0,0,.3)`, where `b` is about 12% of the cell size.
- **Palette:**

| Name                    | Hex       |
| ----------------------- | --------- |
| Ground                  | `#15130F` |
| Deep ground             | `#0E0D0A` |
| Cream                   | `#EFE7D6` |
| Yellow, the main accent | `#F2C230` |
| Cobalt                  | `#3D6BE0` |
| Tomato                  | `#E8553A` |
| Mint                    | `#4FB477` |
| Garbage grey            | `#4A443A` |

- **Type:** Archivo Black for display, Space Mono for labels and UI.
- **Wordmark:** STACKZ, with the Z in yellow.
- **Motifs to reuse:**
  - row-by-row (stepped) motion, never smooth easing for falling pieces
  - line-clear flashes
  - "LEVEL 0X" section labels
  - HUD details such as NEXT and LINES
  - offset hard shadows on cream cards
- **Characters:**
  - **Build:** a front-facing bust on a 16×16 block grid.
  - **Head:** cream, yellow, blue, tomato or mint.
  - **Eyes:** shades, stare, visor or sleepy.
  - **Mouth:** grin, flat or gold tooth.
  - **Headwear:** T-piece, crown, cap or none.
  - **Colours:** the background, hat and shirt each take a palette colour.
- **Voice:** short, confident lines that fit the game. Never reuse another project's taglines.
- **Motion:** respect `prefers-reduced-motion` by stopping the rain and conveyor and showing static boards.

## Sound

The files live in `apps/web/public/sfx/` and are generated by `tools/sfx/synth.py`.

| File              | Use                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `theme-intro.mp3` | 5.76 s (4 bars) that build up: rain hats, then lock thuds, then bass and pad, then a riser. Plays once. |
| `theme-loop.mp3`  | 23.04 s (16 bars), seamless. Plays straight after the intro and repeats.                               |
| `click.mp3`       | UI click                                                                                               |
| `lock.mp3`        | A piece locking on the hero board                                                                      |
| `line-clear.mp3`  | Lines clearing on the hero board                                                                       |
| `task-done.mp3`   | A task going from CONFIRM to DONE, and a successful join                                               |

- **Tempo follows the game:** one hero board tick (90 ms) is one 16th note, so 166.67 BPM. The hats are the rows dropping, a heavy thud lands every 24 ticks (about how often a piece locks), and a line-clear riser builds every 4 bars.
- **Starting the music:** browsers block sound until the visitor interacts. The intro starts on the first `pointerdown` anywhere on the page, never on a keydown, and a press inside a text field doesn't count.
- **Playback:** both theme files are decoded with the Web Audio API. The loop is scheduled sample-accurately after the intro with a looping `AudioBufferSourceNode`. Never use `<audio loop>`; it leaves gaps.
- **Volume:** music at 0.35. The header has a SOUND ON/OFF toggle, remembered in `localStorage`.
- **Sync:** the hero board ticks on the `AudioContext` clock once the music runs, and plays `lock` and `line-clear` from the engine's own events. The match boards stay silent.
- **Click sound, never on typing:** `click.mp3` plays only on `pointerdown` inside `button`, `a` or `[data-sfx]`, skipped for disabled controls and for anything inside `input`, `textarea`, `select` or `[contenteditable]`. There are no keyboard listeners for sound, so typing, Enter, Space and Tab never click. All of this lives in `installSoundTriggers()` in `apps/web/src/audio/sound.ts`; don't add sound triggers anywhere else.

## Stack

TypeScript everywhere, in a pnpm monorepo.

| Part                 | Choice                                                                                             | Hosted on                  |
| -------------------- | -------------------------------------------------------------------------------------------------- | -------------------------- |
| Waitlist site        | React + Vite + TypeScript. Plain CSS with CSS variables for the tokens, and no UI kit.             | Cloudflare (static assets) |
| API                  | Hono on Node, TypeScript. Validates input and is the only holder of the Supabase service-role key. | Render web service         |
| Database and storage | Supabase: Postgres with row-level security, and Storage for generated share cards                  | Supabase                   |
| Bot protection, DNS  | Cloudflare Turnstile on the join form, plus Cloudflare DNS                                         | Cloudflare                 |

- Later, real-time matches will run on the same Render service using WebSockets. Design the API so a game server can sit beside it.
- Profile picture preview: show it once the handle field loses focus, through the API, which looks it up on unavatar.io (`https://unavatar.io/x/<handle>?fallback=false`) and caches it. Fall back to the block avatar. Never block signup if the avatar fails to load.

```
stackz/
  apps/web/          React + Vite waitlist site
    public/sfx/        the site's sounds
    src/game/          Tetris engine (pure TS, unit-tested)
    src/audio/         sound engine and the click rules
    src/components/    hero, waitlist, match, characters, footer
    src/styles/        plain CSS, tokens in global.css
  apps/api/          Hono API (Render)
  packages/shared/   shared types, zod schemas, brand tokens
  supabase/migrations/
  tools/sfx/         generator for the sounds
```

## Git branches: main and live (always)

- **Repo:** https://github.com/damilolaoxox/stackz.git. Everything goes here.
- **main** is where all work goes. Every commit, feature branch and PR merges into main.
- **live** is the only branch Render, Cloudflare and Supabase deploy from. Nothing is committed straight to live.
- **Never push to `live` until the user explicitly says so.** Pushing to main is fine; promoting to live needs a fresh go-ahead every time.
- To ship (once told to), promote main into live with a fast-forward merge or a main → live PR, once main builds and its checks pass.
- Render and Cloudflare build only from `live` (`render.yaml` sets `branch: live`). Supabase migrations reach production only from `live`, through `.github/workflows/migrate.yml`.
- Hotfix: fix on main, then promote to live (with the user's go-ahead). Never patch live directly.

## Data

See `supabase/migrations/` for the source of truth.

```sql
create table waitlist_entries (
  id            uuid primary key default gen_random_uuid(),
  x_handle      text not null unique,          -- lowercased, without "@"
  x_avatar_url  text,                          -- unavatar.io URL, or null
  wallet        text not null unique,          -- lowercased EVM 0x address
  tasks         jsonb not null default '{}',   -- {follow:{go_at,done_at}, like:…, comment:…, repost:…}
  spot_number   integer generated always as identity,  -- internal only, never exposed
  status        text not null default 'pending', -- pending | approved | rejected
  created_at    timestamptz not null default now()
);

-- Task timers before signup (no waitlist row exists until the wallet is submitted).
-- Copied into waitlist_entries.tasks on join.
create table task_progress (
  handle   text not null,
  task     text not null,          -- follow | like | comment | repost
  go_at    timestamptz not null,
  done_at  timestamptz,
  primary key (handle, task)
);
-- RLS on both tables, no public policies. All reads and writes go through the API with the service role.
-- Storage bucket "cards" (public read) holds generated share cards.
```

## API (Hono on Render)

Code lives in `apps/api`. Request/response types are in `packages/shared/src/api.ts`.

| Endpoint                | What it does                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz`          | Render health check.                                                                                                                                       |
| `GET /x/avatar?handle=` | Returns `{url}`: the unavatar.io avatar URL, or null.                                                                                                      |
| `GET /tasks/:handle`    | Restores progress: state of all four tasks, `joined`, `status`, `taskMinSeconds`.                                                                          |
| `POST /tasks/go`        | Takes `{handle, task}` and records `go_at`. A repeat GO never resets the timer.                                                                            |
| `POST /tasks/confirm`   | Takes `{handle, task}`. Succeeds only if `now − go_at ≥ TASK_MIN_SECONDS`, else `409 too_early` + `retryAfterSeconds`.                                     |
| `POST /waitlist`        | Takes `{handle, wallet, turnstileToken}`. Requires all four tasks done, then returns `{handle, status, cardUrl, shareUrl}`. Never returns the spot number. |
| `GET /card/:handle.png` | The generated 1200×630 share card, cached in Supabase Storage.                                                                                             |
| `GET /s/:handle`        | Share page with the card as the X link preview (`og:image`); redirects people to the site.                                                                 |

- Validate every input with zod, using the schemas in `packages/shared`.
  - Handle: `^[A-Za-z0-9_]{1,15}$`.
  - Wallet: `^0x[a-fA-F0-9]{40}$` (EVM).
- Rate-limit by IP and by handle.
- Allow CORS only from the site's domain.
- Errors are `{error, retryAfterSeconds?, missing?}` with codes listed in `ApiErrorCode`.

## Rules

- Never ask for a seed phrase, a private key or a wallet signature on the waitlist.
- Secrets live only in Render and Cloudflare environment settings, never in the repo or the web bundle. The web app gets only `VITE_API_URL` and the Turnstile site key.
- Betting with a token that can be cashed out may be regulated gambling in Nigeria and elsewhere. Flag it, and don't build real-money betting until the team confirms legal advice.
- Keep pieces of the UI accessible: real `<button>`, `<input>` and `<label>` elements, and 44px touch targets. Hide decorative animation from screen readers with `aria-hidden`.
- Mobile first. The hero headline and the ticket must work at 375px wide.

## Placeholders still open

- Domain, X handle and the pinned-post URL
- Token name and chain (an EVM chain: wallets are EVM addresses)
- NFT supply
- Season 0 dates
