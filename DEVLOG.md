# Dev Log: Authentication Service

**Stack:** TypeScript · Express 5 · PostgreSQL 17 (Docker) · Drizzle ORM · Zod · JWT · bcrypt · Resend · Multer + sharp + ImageKit · express-rate-limit + Redis · Vitest

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

## 12 Oct 2026 · Professional review fixes (BREAKING CHANGE)
A review rated the service 7/10 and listed twelve problems. All of them are fixed:
- **Sessions table.** Each sign-in is its own row, so devices no longer sign each other out. Refresh tokens rotate with a conditional update; replaying an old one after a 10-second grace window revokes the session. New `logout-all`, `GET /sessions` and `DELETE /sessions/:id`.
- **Instant sign-out.** Access tokens carry the session id, and `authenticateToken` joins the session, so logout and password changes end access tokens straight away. Closes the "no access-token denylist" gap with no extra query.
- **Timing leaks closed.** Sign-in runs a dummy bcrypt compare for unknown emails; forgot-password does its work after responding.
- **Races closed.** A reset link can only be used once, even in parallel; two password changes at once can't both win (`409`).
- **Passwords.** Native `bcrypt` at cost 12, with older hashes upgraded at sign-in. New passwords must be at least 8 characters and at most 72 *bytes*, and are checked against Have I Been Pwned.
- **Emails.** "Your password was changed" after a reset or change. Forgot-password has a 2-minute cooldown. A completed reset also verifies the email.
- **Rate limiting** with express-rate-limit and Redis: per IP, per email (sign-in failures, forgot-password) and per user.
- **Browser hardening.** JSON-only bodies (`415` otherwise), CORS limited to `FRONTEND_URL`, `helmet`, and the refresh cookie scoped to `/auth`.
- **Avatars** are re-encoded with sharp to a 512px WebP, which strips metadata such as GPS location.
- **Config and errors.** Environment variables are validated at startup; malformed or oversized JSON returns `400`/`413` instead of `500`; `age` is capped at 150; logs show user IDs instead of email addresses.
- **First test suite** (Vitest + Supertest against a separate test database).
- The `refresh_token` column is dropped, so **everyone is signed out once** on deploy.

## 12 Oct 2026 · Split into microservices (`microservice-architecture` branch)
A trial of the monolith as a pnpm workspace, run as a **separate application** next to `main`: ports 9000–9002, its own compose project (`authentication-microservices`) with Postgres on 5433 and Redis on 6380, cookie names prefixed `ms_` (browsers share cookies across ports on `localhost`), env file `.env.microservices`. The public API is unchanged apart from the port.
- **gateway** (9000): helmet, CORS, the JSON-only check and routing, moved out of the app. It streams bodies through `http-proxy-middleware`, adds `x-internal-key` and `X-Forwarded-For`, rejects `..` path segments, never routes `/internal`, and answers `502` in JSON when a service is down.
- **auth-service** (9001): users, sessions and every `/auth/*` route except avatars. They stay together because a reset revokes every session in one transaction. Two new internal routes: `/internal/authenticate` (the same session check as `authenticateToken`, through `findSessionUser`) and `/internal/users/:id/avatar` (the `FOR UPDATE` swap that used to sit inside the upload handler).
- **notification-service**: templates and Resend behind a BullMQ `email` queue. auth-service's `mail.ts` keeps its function names but only enqueues, so the controller is untouched. The job contract is a Zod union in `packages/shared/src/email-jobs.ts`. The worker fails a job that breaks the contract without retrying it. "Password changed" mails now carry the time of the change, not the send time.
- **media-service** (9002): multer, sharp and ImageKit. It authenticates through auth-service before reading the file, deletes the new upload only when auth-service clearly refuses the swap, and keeps it after a timeout or 5xx.
- **packages/shared**: `ApiError`, `ApiResponse`, `parseOrThrow`, the error handler, `loadEnv`, `requireInternalKey`, a rate-limiter factory with per-service Redis prefixes, and the email contract.
- Tests: 40 across five packages (gateway against echo servers, media and notification with their neighbours mocked). An end-to-end run of all four processes covered sign-up → queue → verify → sign-in → real ImageKit upload → refresh → logout. Resend refused the key for `mail.dsaden.com`, so the worker logged and failed those jobs as designed.

## 12 Oct 2026 · Email redesign (microservices branch)
- The five emails were five copies of the same ~180 lines. They now share one layout and a few components (`templates/components.ts`): brand header, a card with an accent bar, an icon badge, a bulletproof button (VML for Outlook), callouts, numbered steps, a details table, and a link fallback.
- Each email has its own accent and icon: indigo for verify, green for welcome, amber for reset, blue for "account exists", red for "password changed". The security mail now shows the account and the time of the change in a table, with a "Secure my account" button.
- Dark mode for clients that support `prefers-color-scheme`, preview text padded so the body doesn't leak into the inbox preview, a "sent to" footer, and a plain-text part generated next to each html part.
- `pnpm --filter @authentication/notification-service preview` renders samples to `preview/`. Tests check that names are escaped, that every link is in both parts, and that the change time is shown.
- Sender switched to `no-reply@dsaden.com`, the domain verified in Resend (`mail.dsaden.com` was refused).

## 12 Oct 2026 · Production deployment (microservices branch)
- A multi-stage `Dockerfile` builds one image for every service. The runtime stage holds production dependencies and `dist` only. The build stage also runs `drizzle-kit migrate`.
- `deploy/compose.yml` for a single VPS: nginx is the only container with published ports, with Let's Encrypt certificates from a `certbot` container (the first issued by hand, renewals through nginx's webroot, nginx reloading every 6 hours). nginx overwrites `X-Forwarded-For` rather than appending to it, since the services trust that hop, and resolves the gateway per request so a restarted container doesn't leave it pointing at a dead address. Its body limit is raised from the 1 MB default, which would refuse 2 MB avatars. It shares an `edge` network with the gateway only. The services, Postgres and Redis are on a `backend` network with no published ports, because Docker's port publishing bypasses `ufw`. A one-off `migrate` container runs before auth-service on every `up`. Redis uses append-only persistence, so queued emails survive a restart.
- The planned setup: API at `api.auth.example.com`, frontend on Vercel at `auth.example.com`. Both are under one registrable domain, so the `SameSite=Lax` cookies work without changes. README has a "Deploying" section.
- **Email job retention.** `EMAIL_JOB_OPTIONS` was empty, so BullMQ made one attempt and kept every job, each holding a live link, in Redis forever (and with persistence, on disk). Jobs now get 5 attempts with exponential backoff from 15 s (the last try is about 4 minutes in), and finished or failed jobs are removed after 15 minutes, the life of the token they carry.

---

## Lessons
Mistakes and the rules learned from them are kept topic by topic in [LEARNINGS.md](LEARNINGS.md).

## Next up
- Microservices branch: fix the Resend key/domain pair; consider per-service internal keys; first real deploy with `deploy/compose.yml`, then backups (`pg_dump` from cron) and log shipping.
- Frontend: password field on the verify page, handle the 403 on sign-in, a single in-flight refresh with a retry on the "refreshed by another request" 401, and a sessions page.
- Start Redis (`pnpm db:up`) and set `REDIS_URL` and `TRUST_PROXY` in each environment.
- Consider an absolute session lifetime (sessions currently last as long as they keep refreshing).
- Account deletion and email change.
