# CLAUDE.md

Guidance for AI assistants working in this repository. Read this before making changes.

## Project

Authentication REST API split into services: a pnpm workspace with Express 5 + TypeScript (ESM, `nodenext`), PostgreSQL 17 via Drizzle ORM, Zod validation, JWT in `httpOnly` cookies with a `sessions` table, bcrypt, BullMQ on Redis for email, Resend, Multer + sharp + ImageKit for avatars, express-rate-limit + Redis. Tests: Vitest + Supertest. Package manager: **pnpm**.

**This branch (`microservice-architecture`) is a separate application from the monolith on `main`.** Never use main's ports (8080), Postgres (5432), Redis (6379), compose project (`authentication`) or `.env`. This branch uses gateway **9000**, auth-service **9001**, media-service **9002**, compose project `authentication-microservices` with Postgres **5433** (`auth_microservices`, tests `auth_microservices_test`) and Redis **6380**, cookie prefix `ms_`, and `.env.microservices`. Test setups pin `COOKIE_PREFIX=''`.

- Human docs: `README.md` (setup, architecture), `docs/API.md` (endpoint contract)
- Project history: `DEVLOG.md` (timeline), `LEARNINGS.md` (mistakes → rules)

## Commands

Run from the repo root:

```bash
pnpm build          # builds every package in dependency order (type check); run before every commit
pnpm dev            # builds shared, then every service in watch mode
pnpm test           # builds shared, then every package's tests; auth-service uses auth_microservices_test
pnpm db:up          # start this branch's Postgres (5433) and Redis (6380); separate compose project from main
pnpm db:create      # create the database in DATABASE_URL
pnpm db:generate    # create a migration after editing services/auth-service/src/db/schema.ts
pnpm db:migrate     # apply migrations
pnpm --filter @authentication/<package> <script>   # one package
```

Each service has its own `src/config/env.ts`, built with `loadEnv()` from shared, which reads `.env.microservices` at the repo root and exits listing any problems. Read config through that `env` export, never `process.env`. `imagekit.ts` creates its client on first use, so a missing ImageKit key only breaks avatar uploads. The email queue is also created on first use.

Verify changes with `pnpm build` and `pnpm test`. Add a test for any behaviour or security change. Rate limits are lifted under `NODE_ENV=test` (`packages/shared/tests/rate-limit.test.ts` covers the limiter). Tests call a service's app directly, wrapped so the `x-internal-key` header is added; use the bare app to test refusals. What each package mocks:

- auth-service: `utils/mail.ts` (the queue producer) and `breached-password.ts`
- media-service: `utils/auth-client.ts` and `utils/imagekit.ts`
- notification-service: `mail.ts`
- gateway: nothing; it proxies to throwaway echo servers

For anything the mocks hide (queue, real emails, ImageKit, service-to-service calls), run every service from its own folder (`node dist/index.js`; pnpm and dotenv resolve paths from there) and drive the flow through the gateway on 9000. Use `delivered@resend.dev` as the email; `pnpm --filter @authentication/auth-service dev:last-link <email>` prints the newest verification or reset link from the queue. Keep `docs/postman/` in step with the routes. Afterwards, delete the test users, the uploaded files (folder `IMAGEKIT_FOLDER`), and the `bull:email:*` keys in Redis (6380), since jobs hold live tokens.

## Layout

- `packages/shared/src/`: `@authentication/shared`, imported as `'@authentication/shared/<module>'` (no `.js`): `api-error`, `api-response`, `parse-or-throw`, `error-handler`, `load-env`, `internal-auth`, `cookies` (auth cookie names with `COOKIE_PREFIX`), `rate-limit`, `email-jobs` (queue contract), `request` (`req.user` types). Built to `dist/`; services import the build, so rebuild shared after changing it.
- `services/gateway/src/`: `app.ts` (helmet, CORS, `rejectDotSegments`, `requireJsonBody`, routing), `proxy.ts` (adds `x-internal-key`, `X-Forwarded-For`, JSON 502s)
- `services/auth-service/src/`
  - `app/auth/routes.ts`: route → middleware → `authController.handleX.bind(authController)`
  - `app/auth/controller.ts`: `AuthController` class, one `handleX` method per endpoint
  - `app/auth/models.ts`: Zod schemas named `<thing>PayloadModel`
  - `app/auth/middleware.ts`: `authenticateToken` and `findSessionUser` (checks the access token's session is live)
  - `app/auth/utils/session.ts`: create, rotate and revoke sessions; set and clear auth cookies
  - `app/internal/`: `/internal/authenticate` and `/internal/users/:id/avatar`, for other services
  - `app/middlewares/rate-limit.ts`: `rateLimits` for auth routes
  - `utils/mail.ts`: `sendX()` functions that put email jobs on the queue
  - `db/schema.ts` → migrations in `services/auth-service/drizzle/`
- `services/notification-service/src/`: `worker.ts` (validates jobs against `emailJobModel`, dispatches), `mail.ts` (Resend), `templates/components.ts` (table-based layout, button, callout, steps, details; inline styles, `escapeHtml` every dynamic value), `templates/emails.ts` (one function per email returning subject, html and text). `pnpm --filter @authentication/notification-service preview` writes them to `preview/` (gitignored).
- `services/media-service/src/`: `routes.ts`, `controller.ts` (`AvatarController`), `middlewares/` (authenticate through auth-service, upload-multer, rate-limit), `utils/auth-client.ts`, `utils/imagekit.ts`
- Each package has its own `tests/`
- `Dockerfile` (root) + `deploy/`: production on one VPS. `deploy/compose.yml` runs every service from the one image. nginx (`deploy/nginx/api.conf.template`, certificates from the `certbot` container) is the only container with published ports; it must overwrite `X-Forwarded-For` with `$remote_addr`, never append to it, because the services trust it (`TRUST_PROXY=1`). The services use `SERVICE_HOST=0.0.0.0` on an unpublished `backend` network in place of loopback. Secrets live in `deploy/.env` (gitignored, from `.env.sample`); infrastructure values are set in `compose.yml`. Never publish Postgres or Redis ports there: Docker bypasses `ufw`. A new service or package needs its `package.json` and `dist` copied in the Dockerfile's runtime stage.

## Conventions

**Handlers.** Express 5 forwards rejected promises, so handlers `throw` instead of calling `next(err)`. Follow the existing order: validate → query → check → act → respond.

```ts
const {email, password} = await parseOrThrow(somePayloadModel, req.body)
// with url params, spread the body first so it can't override them:
const {token} = await parseOrThrow(model, {...req.body, token: req.params.token})
```

- **Errors:** `throw ApiError.badRequest/unauthorized/forbidden/notFound/conflict/internal(msg)`, or `new ApiError(status, msg)` for other codes (413, 502). Never `res.status().json()` an error directly.
- **Success:** `return ApiResponse.ok(res, message, data)` / `ApiResponse.created(...)`.
- **Signed-in user:** `(req.user as any)?.id`; the current session is `req.sessionId` (in auth-service and media-service).
- **Service boundaries:** only auth-service touches the database. Other services call its `/internal` routes through a small client (see `media-service/src/utils/auth-client.ts`) that passes 4xx through and turns everything else into `502`. Shared code goes in `packages/shared` only if two services use it.
- **Database writes:** use `.returning({id: usersTable.id})` and check the row, throwing `ApiError.internal` if it's missing.
- **Imports:** relative and ending in `.js` (ESM), e.g. `'../../db/index.js'`; shared code as `'@authentication/shared/api-error'`.
- **Style:** match the surrounding file. In the controller: single quotes, no semicolons at the end of statements (some import lines have them), and `if(` with no space. Comments are lowercase and explain *why*, not what.

## Security rules (do not regress)

- **Hash every token before storing it** in the database: `hashToken()` (SHA-256, in `session.ts`) for random tokens (refresh, verification, reset), and `hashPassword()`/`verifyPassword()` from `utils/password.ts` for passwords (bcrypt cost 12; never call bcrypt directly). Use `createTempToken()` (bottom of `controller.ts`) for new tokens.
- **New passwords** use `newPasswordModel` (8 chars to 72 *bytes*) and go through `isPasswordBreached()` before hashing.
- **Sessions:** every token carries `sid`. Anything that should sign people out revokes rows in `sessions` (`revokeSession`, `revokeAllSessions`), which ends access tokens immediately. Never add a refresh token column back to `users`.
- **No account enumeration.** Sign-up, sign-in and forgot-password return the same response, in about the same time, whether or not the account exists (sign-in runs `verifyDummyPassword` for unknown emails; forgot-password does its work after responding). Explain differences by email, never in the response. Rate limits answer the same `429` for every key.
- **Unverified users get no session:** sign-in, `/refresh` and `authenticateToken` return 403. Verifying requires the signup password.
- **Internal trust:** every service except the gateway listens on `SERVICE_HOST` (loopback) and runs `requireInternalKey` before its routes. The gateway overwrites `x-internal-key` on everything it forwards, routes only `/auth/*`, and must never route `/internal/*`. A new public route needs a gateway route (`proxyTo`) to the service that owns it, more specific prefixes first. Services trust `TRUST_PROXY + 1` proxies.
- **Email jobs carry live tokens** (verification and reset links) in Redis. Keep them short-lived, never log job data, and change the job contract only in `email-jobs.ts`.
- **Let the database decide races.** Use unique constraints with `onConflictDoNothing`, conditional `UPDATE … WHERE … RETURNING` for check-then-act (e.g. email cooldowns, using up a reset token, rotating a refresh token), and `SELECT … FOR UPDATE` in a transaction when replacing a stored value. Never make a network call (email queue, ImageKit, Have I Been Pwned, another service) inside a transaction. When a call to another service fails ambiguously (timeout, 5xx), assume it may have succeeded.
- **Bodies are JSON only** (`requireJsonBody`, in the gateway); add a path to `MULTIPART_PATHS` only for a real file upload. CORS allows `FRONTEND_URL` only (gateway).
- **New public routes need a rate limit** in the owning service's `rateLimits` (`middlewares/rate-limit.ts`), built with `createRateLimiterFactory`.
- **Emails are fire-and-forget:** `sendX(...).catch(error => console.error(...))`. `sendX` only puts a job on the queue. A failed email must never fail the request.
- **Uploads:** authenticate (through auth-service) before parsing. Trust the file's magic bytes, not the client's mimetype, then re-encode with sharp (strips metadata). Use random filenames (no user IDs in public URLs). Clean up uploaded files on every failure path.
- Never log passwords, tokens or secrets.

## Workflow

- **Schema changes:** edit `services/auth-service/src/db/schema.ts` → `pnpm db:generate` → review the SQL → `pnpm db:migrate`. A change isn't done until the migration is applied, and the migration folder must be committed with it.
- **API changes:** update `docs/API.md` in the same change (internal endpoints too). Breaking changes need a `BREAKING CHANGE:` footer in the commit.
- **Commits:** Conventional Commits (`feat(auth): …`, `fix(auth): …`), with a body explaining *why* for any behaviour or security change. Only commit when the user asks.
- **After notable changes:** add a dated entry to `DEVLOG.md` (above the `---` before "Lessons") and update its "Next up". Add any mistake or lesson to `LEARNINGS.md` under its topic, in the format *what went wrong → fix → **Rule:***.

## Known gaps

- The per-email sign-in limit (5 failures / 15 min) can be used to lock a user out; accepted trade-off.
- `/auth/upload-avatar` accepts `multipart/form-data`, which a same-site form could send (low impact).
- One `INTERNAL_API_KEY` for all services; per-service keys or mTLS would limit a compromised service.
- An avatar can be left unused in ImageKit when auth-service doesn't confirm the swap (logged).
