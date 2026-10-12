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

---

## Lessons
Mistakes and the rules learned from them are kept topic by topic in [LEARNINGS.md](LEARNINGS.md).

## Next up
- Frontend: password field on the verify page, handle the 403 on sign-in, a single in-flight refresh with a retry on the "refreshed by another request" 401, and a sessions page.
- Start Redis (`pnpm db:up`) and set `REDIS_URL` and `TRUST_PROXY` in each environment.
- Consider an absolute session lifetime (sessions currently last as long as they keep refreshing).
- Account deletion and email change.
