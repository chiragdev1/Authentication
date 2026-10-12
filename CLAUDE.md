# CLAUDE.md

Guidance for AI assistants working in this repository. Read this before making changes.

## Project

Authentication REST API: Express 5 + TypeScript (ESM, `nodenext`), PostgreSQL 17 via Drizzle ORM, Zod validation, JWT in `httpOnly` cookies with a `sessions` table, bcrypt, Resend for email, Multer + sharp + ImageKit for avatars, express-rate-limit + Redis. Tests: Vitest + Supertest. Package manager: **pnpm**.

- Human docs: `README.md` (setup), `docs/API.md` (endpoint contract)
- Project history: `DEVLOG.md` (timeline), `LEARNINGS.md` (mistakes → rules)

## Commands

```bash
pnpm build          # type check + compile; run before every commit
pnpm dev            # watch mode on PORT (default 8080)
pnpm test           # integration tests against <db>_test (created + migrated automatically)
pnpm db:up          # start Postgres and Redis in Docker
pnpm db:generate    # create a migration after editing src/db/schema.ts
pnpm db:migrate     # apply migrations
```

`src/config/env.ts` validates every environment variable at startup and exits with the list of problems. Read config through its `env` export, never `process.env`. `imagekit.ts` creates its client on first use, so a missing ImageKit key only breaks avatar uploads; without `REDIS_URL`, rate limits are per process.

Verify changes with `pnpm build` and `pnpm test`. Add a test for any behaviour or security change. Tests mock `mail.ts`, `breached-password.ts` and `imagekit.ts`, and rate limits are lifted under `NODE_ENV=test` (`tests/rate-limit.test.ts` covers the limiter). For anything the mocks hide (real emails, ImageKit), also run the flow against a local server on a spare port (`PORT=8081 node dist/index.js`) so the user's dev server on 8080 is left alone, and clean up test users and uploaded files afterwards.

## Layout

- `src/app/auth/routes.ts`: route → middleware → `authController.handleX.bind(authController)`
- `src/app/auth/controller.ts`: `AuthController` class, one `handleX` method per endpoint
- `src/app/auth/models.ts`: Zod schemas named `<thing>PayloadModel`
- `src/app/auth/middleware.ts`: `authenticateToken` (checks the access token's session is live; sets `req.user` and `req.sessionId`)
- `src/app/auth/utils/session.ts`: create, rotate and revoke sessions; set and clear auth cookies
- `src/app/middlewares/`: cross-cutting Express middleware (error handler, uploads, rate limits, JSON-only)
- `src/config/env.ts`: validated environment
- `src/utils/`: `ApiError`, `ApiResponse`, `parseOrThrow`, `password.ts`, `breached-password.ts`, `mail.ts`, `imagekit.ts` (third-party clients live here)
- `tests/`: Vitest + Supertest integration tests
- `src/db/schema.ts` → migrations in `drizzle/`

## Conventions

**Handlers.** Express 5 forwards rejected promises, so handlers `throw` instead of calling `next(err)`. Follow the existing order: validate → query → check → act → respond.

```ts
const {email, password} = await parseOrThrow(somePayloadModel, req.body)
// with url params, spread the body first so it can't override them:
const {token} = await parseOrThrow(model, {...req.body, token: req.params.token})
```

- **Errors:** `throw ApiError.badRequest/unauthorized/forbidden/notFound/conflict/internal(msg)`, or `new ApiError(status, msg)` for other codes (413, 502). Never `res.status().json()` an error directly.
- **Success:** `return ApiResponse.ok(res, message, data)` / `ApiResponse.created(...)`.
- **Signed-in user:** `(req.user as any)?.id`; the current session is `req.sessionId`.
- **Database writes:** use `.returning({id: usersTable.id})` and check the row, throwing `ApiError.internal` if it's missing.
- **Imports:** relative and ending in `.js` (ESM), e.g. `'../../utils/api-error.js'`.
- **Style:** match the surrounding file. In the controller: single quotes, no semicolons at the end of statements (some import lines have them), and `if(` with no space. Comments are lowercase and explain *why*, not what.

## Security rules (do not regress)

- **Hash every token before storing it:** `hashToken()` (SHA-256, in `session.ts`) for random tokens (refresh, verification, reset), and `hashPassword()`/`verifyPassword()` from `utils/password.ts` for passwords (bcrypt cost 12; never call bcrypt directly). Use `createTempToken()` (bottom of `controller.ts`) for new tokens.
- **New passwords** use `newPasswordModel` (8 chars to 72 *bytes*) and go through `isPasswordBreached()` before hashing.
- **Sessions:** every token carries `sid`. Anything that should sign people out revokes rows in `sessions` (`revokeSession`, `revokeAllSessions`), which ends access tokens immediately. Never add a refresh token column back to `users`.
- **No account enumeration.** Sign-up, sign-in and forgot-password return the same response, in about the same time, whether or not the account exists (sign-in runs `verifyDummyPassword` for unknown emails; forgot-password does its work after responding). Explain differences by email, never in the response. Rate limits answer the same `429` for every key.
- **Unverified users get no session:** sign-in, `/refresh` and `authenticateToken` return 403. Verifying requires the signup password.
- **Let the database decide races.** Use unique constraints with `onConflictDoNothing`, conditional `UPDATE … WHERE … RETURNING` for check-then-act (e.g. email cooldowns, using up a reset token, rotating a refresh token), and `SELECT … FOR UPDATE` in a transaction when replacing a stored value. Never make a network call (email, ImageKit, Have I Been Pwned) inside a transaction.
- **Bodies are JSON only** (`requireJsonBody`); add a path to `MULTIPART_PATHS` only for a real file upload. CORS allows `FRONTEND_URL` only.
- **New public routes need a rate limit** in `rateLimits` (`rate-limit.ts`).
- **Emails are fire-and-forget:** `sendX(...).catch(error => console.error(...))`. A failed email must never fail the request.
- **Uploads:** authenticate before parsing. Trust the file's magic bytes, not the client's mimetype, then re-encode with sharp (strips metadata). Use random filenames (no user IDs in public URLs). Clean up uploaded files on every failure path.
- Never log passwords, tokens or secrets.

## Workflow

- **Schema changes:** edit `schema.ts` → `pnpm db:generate` → review the SQL → `pnpm db:migrate`. A change isn't done until the migration is applied, and the migration folder must be committed with it.
- **API changes:** update `docs/API.md` in the same change. Breaking changes need a `BREAKING CHANGE:` footer in the commit.
- **Commits:** Conventional Commits (`feat(auth): …`, `fix(auth): …`), with a body explaining *why* for any behaviour or security change. Only commit when the user asks.
- **After notable changes:** add a dated entry to `DEVLOG.md` (above the `---` before "Lessons") and update its "Next up". Add any mistake or lesson to `LEARNINGS.md` under its topic, in the format *what went wrong → fix → **Rule:***.

## Known gaps

- The per-email sign-in limit (5 failures / 15 min) can be used to lock a user out; accepted trade-off.
- `/auth/upload-avatar` accepts `multipart/form-data`, which a same-site form could send (low impact).
