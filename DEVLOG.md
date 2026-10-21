# Dev Log: CKAuth

**Stack:** TypeScript · Express 5 · PostgreSQL 17 (Docker) · Drizzle ORM · Zod · JWT · bcrypt · Resend · Multer + ImageKit

Newest entries go at the bottom, under a dated heading.

---

## 26–27 Sep 2026 · Foundations
- Set up the repo: pnpm, a strict `tsconfig`, an Express app and an HTTP server on port 8080.
- Added Postgres in Docker, Drizzle and the first `users` table: UUID id, names, `age`, a unique `email`, `email_verified`, and `password` + `salt`.
- Built **sign-up** and **sign-in** with Zod validation. Passwords were first hashed with a hand-rolled HMAC-SHA256 plus salt, and an early version logged the raw password to the console.

## 28 Sep 2026 · Sessions
- Added **JWT access and refresh tokens** stored in httpOnly cookies, an `authenticateToken` middleware, and a `refresh_token` column.
- Created `ApiError` and `ApiResponse` for consistent errors and responses.

## 30 Sep 2026 · First hardening pass
- **Switched to bcrypt** and dropped the `salt` column.
- Added a central error-handler middleware.
- Sign-up now relies on `onConflictDoNothing` on email, which makes simultaneous duplicate sign-ups safe.
- Cookie options and expiry now follow the JWT's expiry time.

## 2–4 Oct 2026 · Email verification
- Integrated Resend with HTML and plain-text templates.
- Verification tokens are random 32 bytes, **stored only as a SHA-256 hash**, and expire after 15 minutes.

## 7–8 Oct 2026 · Full account lifecycle
- Added logout, refresh, `/me`, forgot/reset password and change password, plus welcome and reset emails.
- **Refresh tokens are now stored hashed.** A password reset signs out all sessions; a password change signs out other devices.
- Forgot-password gives the same response whether or not the account exists.
- Email links now point to `FRONTEND_URL`. A `jwtid` claim makes every token unique.
- Sign-in only resends the verification email if the last link has expired.

## 9 Oct 2026 · Avatars
- `POST /auth/upload-avatar`: authenticate first, then Multer keeps the file in memory.
  - Max 2 MB, one file only, JPEG/PNG/WebP.
  - The **real file type is checked from its bytes**, so the client's claimed type isn't trusted.
- Upload to ImageKit first, then lock the user's row and update it.
  - The new file is deleted if saving to the database fails.
  - The old avatar is deleted after the switch.
  - No unused files are left behind, even with two uploads at once.
- Filenames are random UUIDs with a `user:<id>` tag, so URLs don't expose user IDs.
- Added `.env.sample` with placeholders and un-ignored it in git.

## 9 Oct 2026 · Security pass (BREAKING CHANGE)
- **Signup no longer reveals which emails are registered:** it always returns `201 "check your email"`. Existing verified users get an "account already exists" email, at most once every 15 minutes.
- **Closed the pre-account takeover gap:**
  - Sign-in requires a verified email.
  - Verifying requires the signup password, and a wrong password cancels the link.
  - Verifying signs out any earlier sessions.
  - `/me` and `/refresh` reject unverified users.

## 9 Oct 2026 · Documentation
- Added `README.md` (setup, environment variables, how auth works, known limitations), `docs/API.md` (every endpoint with requests, responses, errors and typical flows for frontend developers) and `CLAUDE.md` (conventions and security rules for AI assistants).
- Writing the docs turned up two gaps: **no CORS configuration**, and **malformed JSON returns 500** instead of 400.

## 21 Oct 2026 · Frontend, hosting and CI/CD
- **CKAuth web app** in `frontend/`: React 19 + Vite + Tailwind 4 + React Router. Pages for every flow (sign-up, verify with password, sign-in, forgot/reset, dashboard with avatar upload and change password).
  - One `api()` wrapper: every call goes to `/api/...` with cookies, and protected calls refresh once on 401, with a single refresh shared by concurrent requests.
  - Tokens from email links are read once, then removed from the address bar and history.
- **Production layout: one origin, `ckauth.chiragdev.com`.** `/api/*` goes to Express and everything else to the SPA. The cookies stay first-party and CORS isn't needed. Security headers: CSP, HSTS, and `Referrer-Policy: no-referrer` so email tokens never leak.
- **Shared VPS.** The Hostinger KVM 2 will host other sites too, so a shared **edge Caddy** (`deploy/edge/`) owns 80/443 and imports one site file per project. CKAuth's `db` is on a private network, and only `api`/`web` join the shared `edge` network, under project-prefixed aliases.
- **Docker Compose stack** (`deploy/compose.yml`): Postgres with no public port, the API, and the web container. Migrations run with Drizzle's runtime migrator (`src/db/migrate.ts`), so `drizzle-kit` stays out of the image.
- **Independent deploys.** `api.yml` and `web.yml` run on their own paths (build check on PRs; on `main`, push to GHCR tagged with the SHA) and share `deploy.yml`, which runs `deploy/deploy.sh <service> <sha>` over SSH with a pinned host key. Steps: migrate (api only) → restart that service only → wait for health → record the tag → validate and reload the edge → smoke test. Running a workflow by hand with a SHA rolls back that service alone.
- `deploy/setup-vps.sh` prepares a fresh Ubuntu VPS: Docker, ufw, fail2ban and unattended upgrades. It creates two users, `chirag` (admin, sudo with a password) and `deploy` (CI only, no sudo), and turns on key-only SSH with root login off. `docs/VPS-ACCESS.md` is a first-time walkthrough for SSH keys, the `ssh vps` alias, a read-only GitHub deploy key on the VPS, and the CI key.
- **Containers run without root powers:** the API as `node` and the web container as `nobody` on :8080. All have `cap_drop: ALL`, `no-new-privileges` and read-only filesystems. The edge keeps only `NET_BIND_SERVICE`.
- The domain moved to **`ckauth.chiragdev.com`**.
- **Renamed the product to CKAuth** (emails, package names, docs). **`EMAIL_FROM` is now required:** there's no longer a fallback to a hard-coded `dsaden.com` address, so changing the mail domain is purely a config change (documented step by step).
- `deploy/backup.sh`: nightly `pg_dump` with 14-day retention. `/opt/ckauth` and `/opt/edge` are shared by `chirag` and `deploy` through the `deploy` group (setgid folders), so both can work there.
- `docs/DEPLOYMENT.md` rewritten as a first-timer's guide: 10 setup steps, each with what/why/check, then operations (rollback, settings, changing the email domain, secret rotation, migrations, restore, adding sites) and troubleshooting tables.
- Tested end to end through the real frontend client and the Vite `/api` proxy: 24 checks, including 3 concurrent 401s sharing a single refresh. The runtime migrator built the full schema on an empty database.
- Local fix: `main`'s dev database had picked up two migrations from the `microservice-architecture` branch (`sessions` table, `refresh_token` dropped). They were rolled back by hand.

## 21 Oct 2026 · Load testing, rate limiting and hashing off the main thread
- **Load-tested** on 2 pinned cores (KVM 2-like), with a stubbed Resend, using returning-user sessions and real client IPs via `X-Forwarded-For`. Before the fixes:
  - 500 people online was fine.
  - **2,000 people online collapsed** (p95 12 s).
  - **32 password-guessing bots took the app down** for real users (p50 28 s).
  - The API only ever used one core.
- **Rate limiting** (ported from the `microservice-architecture` design): `express-rate-limit` with a Redis store.
  - Per IP, per email (failures only) and per user, on every endpoint that checks a password, sends an email or takes a single-use token.
  - Identical 429s for known and unknown emails.
  - Fails open if Redis is down.
  - Redis added to both compose files, with no persistence and a 48 MB cap.
- **Native `bcrypt`** in place of `bcryptjs`. Hashing runs on libuv's thread pool, so it uses both cores and stops stalling other requests. The hash format is unchanged.
- **Keep-alive fix:** Node now keeps idle connections for 125 s (`headersTimeout` 126 s) and Caddy's upstream pool closes them at 60 s, so Caddy never reuses a socket Node has closed. Before, that race would have caused random 502s on POSTs.
- **CPU and memory caps** on every container. CKAuth is capped at ~1.4 GB RAM, and the API at 1.5 vCPU.
- **After the fixes:**
  - 2,000 people online: p95 ~100 ms.
  - Sign-in ~42/s (was 17), sign-up ~39/s (was 16).
  - One attacker: blocked, and real users keep p95 46 ms.
  - Botnet with real emails: real users slow to ~0.8 s (was 28 s).
  - Memory: the API idles at ~270 MB, ~200 MB of it from importing `drizzle-orm@1.0.0-rc.4`'s node-postgres driver.
- **Closed a sign-in timing leak** found by the load test. Unknown emails answered in ~16 ms and real accounts in ~60 ms, because bcrypt was skipped, which revealed who's registered. Sign-in now compares against a dummy hash (random, made at startup, at the same cost as real hashes): 54.4 ms vs 54.5 ms, with identical bodies.
- The API now sets `trust proxy` (so `req.ip` is the real client behind Caddy, ready for rate limiting) and drops `X-Powered-By`.

## 21 Oct 2026 · VPS SSH hardening fix
- **SSH password logins were still on.** `setup-vps.sh` wrote its settings to `99-hardening.conf`, which Hostinger's `50-cloud-init.conf` overrode, because `sshd` keeps the first value it reads. Fixed on the VPS by renaming the file to `00-hardening.conf`; the server now offers `publickey` only.
- `setup-vps.sh` now writes `00-hardening.conf`, removes any old `99-` file, and fails unless `sshd -T` shows password and root logins off.
- Installed the GitHub Actions key for `deploy`. `docs/VPS-ACCESS.md` Part 3 now uses `ssh -t` with the key in the command, because the old piped version couldn't prompt for `sudo`.

## 21 Oct 2026 · Edge proxy up
- Started the shared edge Caddy on the VPS; it got the Let's Encrypt certificate for `ckauth.chiragdev.com` (502 until the first deploy, as expected).
- **`ACME_EMAIL` was ignored.** Compose's `.env` only fills `${...}` in `compose.yml`; it isn't passed to the container, so Caddy fell back to `admin@chiragdev.com`. `deploy/edge/compose.yml` now passes it through, and the docs no longer suggest `you@example.com` (Let's Encrypt rejects it).
- Decided on one shared sending domain, `mail.chiragdev.com`, for every project on the VPS (Resend's free plan verifies one domain); receiving stays off.

---

## Lessons
Mistakes and the rules learned from them are kept topic by topic in [LEARNINGS.md](LEARNINGS.md).

## Next up
- First production deploy to the VPS (follow `docs/DEPLOYMENT.md`).
- Move the sender to a CKAuth-branded domain (`EMAIL_FROM` only, see "Changing the email domain").
- Investigate `drizzle-orm` rc's ~200 MB import cost (upgrade when a fixed release ships).
- Cloudflare (WAF/Turnstile) in front, for botnet-scale credential stuffing.
- Automated off-server database backups.
- Return 400, not 500, for malformed JSON bodies.
- Possibly let a password reset also mark the email as verified.
