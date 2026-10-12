# Authentication Service

A production-minded authentication API built with **Express 5**, **TypeScript** and **PostgreSQL**.
It handles the full account lifecycle: sign-up with email verification, cookie-based sessions with refresh tokens, password reset and change, and profile avatars stored on ImageKit.

> **Building a frontend against this API?** Go straight to the **[API reference](docs/API.md)**.

---

## Features

- **Sign-up and sign-in** with Zod validation, bcrypt password hashing (cost 12) and a check against known-breached passwords.
- **Email verification** with single-use links that expire after 15 minutes, sent through [Resend](https://resend.com).
- **Sessions per device**, with short-lived access tokens and refresh tokens that are replaced on every use, both in `httpOnly` cookies. Users can list their sessions, end one, or sign out everywhere, and ending a session takes effect immediately.
- **Password management:** forgot password, reset password and change password, with a "your password was changed" email.
- **Avatar uploads** to [ImageKit](https://imagekit.io). The real file type is checked from the file's contents, images are re-encoded to strip metadata, and old images are cleaned up automatically.
- **Rate limiting** per IP, per email and per user, shared through Redis.
- **Built with security in mind:**
  - Every token is stored hashed.
  - Responses never reveal whether an email is registered.
  - Sign-in requires a verified email.
  - Database updates are safe when requests arrive at the same time.
  - A reused refresh token is detected and ends the session.

## Tech stack

| Area | Tools |
|---|---|
| Runtime | Node.js, TypeScript, Express 5 |
| Database | PostgreSQL 17 (Docker), Drizzle ORM |
| Validation | Zod |
| Auth | JSON Web Tokens (`jsonwebtoken`), `bcrypt` |
| Security | `helmet`, `cors`, `express-rate-limit` with Redis |
| Email | Resend |
| File uploads | Multer (in-memory), `sharp`, ImageKit |
| Tests | Vitest, Supertest |

---

## Getting started

### Prerequisites

- **Node.js 20+** (developed on Node 24)
- **pnpm**: run `corepack enable` to use the version pinned in `package.json`
- **Docker**, for the local PostgreSQL database and Redis
- A **Resend** API key (for emails) and an **ImageKit** private key (for avatars)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.sample .env
```

Then open `.env` and fill in the values. Every variable is checked at startup; if one is missing or invalid, the server prints which and exits.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port the API listens on. Default: `8080`. |
| `NODE_ENV` | No | `development` or `production`. In production, cookies are sent over HTTPS only. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. The sample value matches `docker-compose.yml`. |
| `ACCESS_TOKEN_SECRET_KEY` | Yes | Secret used to sign access tokens. At least 32 characters. |
| `REFRESH_TOKEN_SECRET_KEY` | Yes | Secret used to sign refresh tokens. At least 32 characters, and **must be different** from the access token secret. |
| `ACCESS_TOKEN_EXPIRY` | No | Access token lifetime. Default: `15m`. |
| `REFRESH_TOKEN_EXPIRY` | No | Refresh token lifetime, which is also how long an unused session lasts. Default: `7d`. |
| `APP_NAME` | No | Name shown in emails. Default: `DSADEN`. |
| `RESEND_API_KEY` | Yes | Resend API key (starts with `re_`). **The server won't start without it.** |
| `EMAIL_FROM` | Yes | Sender address on a domain verified in Resend, e.g. `"YourApp <no-reply@mail.yourdomain.com>"`. |
| `FRONTEND_URL` | In production | Base URL of your frontend. Links in emails point here, and it is the only origin allowed by CORS. Default in development: `http://localhost:3000`. |
| `IMAGEKIT_PRIVATE_KEY` | For avatars | ImageKit private API key. The server starts without it; only avatar uploads fail. |
| `REDIS_URL` | In production | Redis for rate-limit counts, e.g. `redis://localhost:6379`. Without it each server process counts on its own, which is fine for local development. |
| `TRUST_PROXY` | Behind a proxy | How many reverse proxies sit in front of the API. Default: `0`. **Set it correctly**, or per-IP rate limits either lump every user together or can be dodged with a fake `X-Forwarded-For` header. |

Generate strong JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start the database and run migrations

```bash
pnpm db:up        # starts PostgreSQL and Redis in Docker
pnpm db:migrate   # creates the tables
```

### 4. Run the server

```bash
pnpm dev
```

The API is now running at `http://localhost:8080`. A quick check:

```bash
curl http://localhost:8080/
# {"message":"Express Application is running"}
```

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Compiles in watch mode and restarts the server on every change. |
| `pnpm build` | Compiles TypeScript to `dist/`. Also the project's type check. |
| `pnpm start` | Runs the compiled server from `dist/`. |
| `pnpm test` | Runs the test suite against a separate `<database>_test` database, created and migrated automatically. Emails, the breached-password check and ImageKit are mocked. |
| `pnpm db:up` / `pnpm db:down` | Starts / stops the PostgreSQL and Redis containers. |
| `pnpm db:generate` | Creates a new migration after you change `src/db/schema.ts`. |
| `pnpm db:migrate` | Applies pending migrations to the database. |
| `pnpm drizzle:studio` | Opens Drizzle Studio to browse the database. |

**Changing the database schema:** edit `src/db/schema.ts` → `pnpm db:generate` → review the SQL in `drizzle/` → `pnpm db:migrate` → commit the schema and the migration together.

---

## Project structure

```
src/
├── index.ts                    # Entry point: starts the HTTP server
├── config/
│   └── env.ts                  # Validates environment variables at startup
├── app/
│   ├── index.ts                # Express app: middleware, routes, error handler
│   ├── auth/
│   │   ├── routes.ts           # Endpoint → middleware → controller wiring
│   │   ├── controller.ts       # Request handlers (AuthController)
│   │   ├── models.ts           # Zod schemas for request bodies
│   │   ├── middleware.ts       # authenticateToken: checks the access token and its session
│   │   └── utils/              # JWT helpers, sessions, cookie options, constants
│   └── middlewares/
│       ├── error-handler.ts    # Turns errors into JSON responses
│       ├── rate-limit.ts       # Per-IP, per-email and per-user limits
│       ├── require-json.ts     # Rejects non-JSON bodies (CSRF protection)
│       └── upload-multer.ts    # Avatar upload parsing, validation and re-encoding
├── db/
│   ├── index.ts                # Drizzle database client
│   └── schema.ts               # Table definitions
└── utils/
    ├── api-error.ts            # ApiError: errors with an HTTP status
    ├── api-response.ts         # ApiResponse: consistent success responses
    ├── mail.ts                 # Email sending and templates
    ├── imagekit.ts             # ImageKit upload and delete
    ├── password.ts             # bcrypt hashing and verification
    ├── breached-password.ts    # Have I Been Pwned check
    └── parse-or-throw.ts       # Zod validation → 400
tests/                          # Vitest + Supertest integration tests
drizzle/                        # Generated SQL migrations
docs/API.md                     # API reference
```

---

## How authentication works

1. **Sign up.** The user is created as *unverified* and receives a verification email.
2. **Verify.** The email link opens your frontend's `/verify-email?token=…` page. The user enters their password, and the frontend sends it to the API with the token. Asking for the password proves that the person who owns the inbox is the same person who signed up.
3. **Sign in.** Only verified users can sign in. Each sign-in creates a row in the `sessions` table, and the API sets two `httpOnly` cookies that both name that session:
   - `access_token`: short-lived, sent with every request.
   - `refresh_token`: longer-lived, sent only to `/auth/*` and used to get a new access token.
4. **Refresh.** When the access token expires, call `/auth/refresh`. Both tokens are replaced, and the old refresh token stops working. If an old refresh token is used again later, someone kept a copy, so the session is revoked.
5. **End sessions:**
   - Logging out ends the current session; `logout-all` ends all of them, and `DELETE /auth/sessions/:id` ends one.
   - A password reset signs out every device.
   - A password change signs out every device except the current one.

Every authenticated request checks that its session is still active, so **ending a session takes effect immediately**, including for access tokens already issued.

Cookies are `httpOnly` and `SameSite=Lax`, and `Secure` in production. Frontend code never reads or stores tokens itself. **Deploy the frontend and API on the same site** (e.g. `app.example.com` and `api.example.com`); browsers don't send `Lax` cookies across different sites.

## Security notes

- Passwords are hashed with bcrypt at cost 12; older, cheaper hashes are upgraded at sign-in. New passwords are checked against Have I Been Pwned.
- Refresh, verification and reset tokens are stored as SHA-256 hashes, so a database leak does not expose working tokens.
- Sign-up, sign-in and forgot-password give the same response, in about the same time, whether or not an account exists.
- Only JSON bodies are accepted (plus multipart for avatars), and CORS allows only `FRONTEND_URL`, so other websites can't make a signed-in browser call the API. `helmet` sets the standard security headers.
- Uploaded avatars are checked by their file contents, then re-encoded, which drops metadata such as GPS location. Files are stored under random names, so URLs don't expose user IDs.

### Known limitations

- **The per-email sign-in limit can be used to lock someone out** for 15 minutes by failing 5 times with their email. This is the usual trade-off of per-account limits.
- **Avatar upload accepts `multipart/form-data`**, which a form on a sibling subdomain could send. Changing an avatar is low impact, but a custom header requirement would close it.

---

## Further reading

- **[docs/API.md](docs/API.md):** every endpoint, with requests, responses and errors.
- **[DEVLOG.md](DEVLOG.md):** how the project was built, step by step.
- **[LEARNINGS.md](LEARNINGS.md):** mistakes made along the way, and the rules learned from them.
