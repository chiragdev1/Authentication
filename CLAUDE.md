# CLAUDE.md

Guidance for AI assistants working in this repository. Read this before making changes.

## Project

Authentication REST API: Express 5 + TypeScript (ESM, `nodenext`), PostgreSQL 17 via Drizzle ORM, Zod validation, JWT in `httpOnly` cookies, Resend for email, Multer + ImageKit for avatars. Package manager: **pnpm**.

- Human docs: `README.md` (setup), `docs/API.md` (endpoint contract)
- Project history: `DEVLOG.md` (timeline), `LEARNINGS.md` (mistakes → rules)

## Commands

```bash
pnpm build          # type check + compile; run before every commit
pnpm dev            # watch mode on PORT (default 8080)
pnpm db:up          # start Postgres in Docker
pnpm db:generate    # create a migration after editing src/db/schema.ts
pnpm db:migrate     # apply migrations
```

`src/utils/mail.ts` creates the Resend client at import, so the server won't start without `RESEND_API_KEY`. `imagekit.ts` creates its client on first use, so a missing ImageKit key only breaks avatar uploads.

There is no test suite. Verify changes by building, then running the real flow against a local server: start it on a spare port (`PORT=8081 node dist/index.js`) so the user's dev server on 8080 is left alone. Clean up any test users and uploaded files afterwards.

## Layout

- `src/app/auth/routes.ts`: route → middleware → `authController.handleX.bind(authController)`
- `src/app/auth/controller.ts`: `AuthController` class, one `handleX` method per endpoint
- `src/app/auth/models.ts`: Zod schemas named `<thing>PayloadModel`
- `src/app/auth/middleware.ts`: `authenticateToken` (sets `req.user`; rejects unverified users)
- `src/app/middlewares/`: cross-cutting Express middleware (error handler, uploads)
- `src/utils/`: `ApiError`, `ApiResponse`, `mail.ts`, `imagekit.ts` (third-party clients live here)
- `src/db/schema.ts` → migrations in `drizzle/`

## Conventions

**Handlers.** Express 5 forwards rejected promises, so handlers `throw` instead of calling `next(err)`. Follow the existing order: validate → query → check → act → respond.

```ts
const validationResult = await somePayloadModel.safeParseAsync(req.body)
if(!validationResult.success) {
  throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
}
```

- **Errors:** `throw ApiError.badRequest/unauthorized/forbidden/notFound/conflict/internal(msg)`, or `new ApiError(status, msg)` for other codes (413, 502). Never `res.status().json()` an error directly.
- **Success:** `return ApiResponse.ok(res, message, data)` / `ApiResponse.created(...)`.
- **Signed-in user:** `(req.user as any)?.id`.
- **Database writes:** use `.returning({id: usersTable.id})` and check the row, throwing `ApiError.internal` if it's missing.
- **Imports:** relative and ending in `.js` (ESM), e.g. `'../../utils/api-error.js'`.
- **Style:** match the surrounding file. In the controller: single quotes, no semicolons at the end of statements (some import lines have them), and `if(` with no space. Comments are lowercase and explain *why*, not what.

## Security rules (do not regress)

- **Hash every token before storing it:** `crypto.createHash('sha256')` for random tokens (refresh, verification, reset), and bcrypt for passwords. Use `createTempToken()` (bottom of `controller.ts`) for new tokens.
- **No account enumeration.** Sign-up, sign-in and forgot-password return the same response whether or not the account exists. Explain differences by email, never in the response.
- **Unverified users get no session:** sign-in, `/refresh` and `authenticateToken` return 403. Verifying requires the signup password.
- **Let the database decide races.** Use unique constraints with `onConflictDoNothing`, conditional `UPDATE … WHERE … RETURNING` for check-then-act (e.g. email cooldowns), and `SELECT … FOR UPDATE` in a transaction when replacing a stored value. Never make a network call (email, ImageKit) inside a transaction.
- **Emails are fire-and-forget:** `sendX(...).catch(error => console.error(...))`. A failed email must never fail the request.
- **Uploads:** authenticate before parsing. Trust the file's magic bytes, not the client's mimetype. Use random filenames (no user IDs in public URLs). Clean up uploaded files on every failure path.
- Never log passwords, tokens or secrets.

## Workflow

- **Schema changes:** edit `schema.ts` → `pnpm db:generate` → review the SQL → `pnpm db:migrate`. A change isn't done until the migration is applied, and the migration folder must be committed with it.
- **API changes:** update `docs/API.md` in the same change. Breaking changes need a `BREAKING CHANGE:` footer in the commit.
- **Commits:** Conventional Commits (`feat(auth): …`, `fix(auth): …`), with a body explaining *why* for any behaviour or security change. Only commit when the user asks.
- **After notable changes:** add a dated entry to `DEVLOG.md` (above the `---` before "Lessons") and update its "Next up". Add any mistake or lesson to `LEARNINGS.md` under its topic, in the format *what went wrong → fix → **Rule:***.

## Known gaps

- No rate limiting. A design is agreed (express-rate-limit + Redis, separate limits per IP and per email) but it's on hold until the user asks.
- No CORS middleware.
- Malformed or oversized JSON bodies return 500, because `errorHandler` only recognises `ApiError` (body-parser errors carry `status` 400/413).
- Ending a session revokes the refresh token, but access tokens stay valid until they expire (there is no access-token denylist).
