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
- The API now sets `trust proxy` (so `req.ip` is the real client behind Caddy, ready for rate limiting) and drops `X-Powered-By`.

---

## Lessons
Mistakes and the rules learned from them are kept topic by topic in [LEARNINGS.md](LEARNINGS.md).

## Next up
- Rate limiting (design ready: Redis store, separate limits per IP and per email).
- First production deploy to the VPS (follow `docs/DEPLOYMENT.md`).
- Move the sender to a CKAuth-branded domain (`EMAIL_FROM` only, see "Changing the email domain").
- Automated off-server database backups.
- Return 400, not 500, for malformed JSON bodies.
- Possibly let a password reset also mark the email as verified.
