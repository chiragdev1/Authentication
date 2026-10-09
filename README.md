# Authentication Service

A production-minded authentication API built with **Express 5**, **TypeScript** and **PostgreSQL**.
It handles the full account lifecycle: sign-up with email verification, cookie-based sessions with refresh tokens, password reset and change, and profile avatars stored on ImageKit.

> **Building a frontend against this API?** Go straight to the **[API reference](docs/API.md)**.

---

## Features

- **Sign-up and sign-in** with Zod validation and bcrypt password hashing.
- **Email verification** with single-use links that expire after 15 minutes, sent through [Resend](https://resend.com).
- **Session handling** with short-lived access tokens and refresh tokens that are replaced on every use, both stored in `httpOnly` cookies.
- **Password management:** forgot password, reset password and change password.
- **Avatar uploads** to [ImageKit](https://imagekit.io). The real file type is checked from the file's contents, and old images are cleaned up automatically.
- **Built with security in mind:**
  - Every token is stored hashed.
  - Responses never reveal whether an email is registered.
  - Sign-in requires a verified email.
  - Database updates are safe when requests arrive at the same time.

## Tech stack

| Area | Tools |
|---|---|
| Runtime | Node.js, TypeScript, Express 5 |
| Database | PostgreSQL 17 (Docker), Drizzle ORM |
| Validation | Zod |
| Auth | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| Email | Resend |
| File uploads | Multer (in-memory), ImageKit |

---

## Getting started

### Prerequisites

- **Node.js 20+** (developed on Node 24)
- **pnpm**: run `corepack enable` to use the version pinned in `package.json`
- **Docker**, for the local PostgreSQL database
- A **Resend** API key (for emails) and an **ImageKit** private key (for avatars)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.sample .env
```

Then open `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port the API listens on. Default: `8080`. |
| `NODE_ENV` | No | `development` or `production`. In production, cookies are sent over HTTPS only. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. The sample value matches `docker-compose.yml`. |
| `ACCESS_TOKEN_SECRET_KEY` | Yes | Secret used to sign access tokens. |
| `REFRESH_TOKEN_SECRET_KEY` | Yes | Secret used to sign refresh tokens. **Must be different** from the access token secret. |
| `ACCESS_TOKEN_EXPIRY` | Yes | Access token lifetime, e.g. `15m`. |
| `REFRESH_TOKEN_EXPIRY` | Yes | Refresh token lifetime, e.g. `1d`. |
| `APP_NAME` | No | Name shown in emails. Default: `DSADEN`. |
| `RESEND_API_KEY` | Yes | Resend API key (starts with `re_`). **The server won't start without it.** |
| `EMAIL_FROM` | Yes | Sender address on a domain verified in Resend, e.g. `"YourApp <no-reply@mail.yourdomain.com>"`. |
| `FRONTEND_URL` | Yes | Base URL of your frontend. Links in emails point here. Default: `http://localhost:3000`. |
| `IMAGEKIT_PRIVATE_KEY` | For avatars | ImageKit private API key. The server starts without it; only avatar uploads fail. |

Generate strong JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start the database and run migrations

```bash
pnpm db:up        # starts PostgreSQL in Docker
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
| `pnpm db:up` / `pnpm db:down` | Starts / stops the PostgreSQL container. |
| `pnpm db:generate` | Creates a new migration after you change `src/db/schema.ts`. |
| `pnpm db:migrate` | Applies pending migrations to the database. |
| `pnpm drizzle:studio` | Opens Drizzle Studio to browse the database. |

**Changing the database schema:** edit `src/db/schema.ts` → `pnpm db:generate` → review the SQL in `drizzle/` → `pnpm db:migrate` → commit the schema and the migration together.

---

## Project structure

```
src/
├── index.ts                    # Entry point: starts the HTTP server
├── app/
│   ├── index.ts                # Express app: middleware, routes, error handler
│   ├── auth/
│   │   ├── routes.ts           # Endpoint → middleware → controller wiring
│   │   ├── controller.ts       # Request handlers (AuthController)
│   │   ├── models.ts           # Zod schemas for request bodies
│   │   ├── middleware.ts       # authenticateToken: reads the access token cookie
│   │   └── utils/              # JWT helpers, cookie options, frontend URL
│   └── middlewares/
│       ├── error-handler.ts    # Turns errors into JSON responses
│       └── upload-multer.ts    # Avatar upload parsing and validation
├── db/
│   ├── index.ts                # Drizzle database client
│   └── schema.ts               # Table definitions
└── utils/
    ├── api-error.ts            # ApiError: errors with an HTTP status
    ├── api-response.ts         # ApiResponse: consistent success responses
    ├── mail.ts                 # Email sending and templates
    └── imagekit.ts             # ImageKit upload and delete
drizzle/                        # Generated SQL migrations
docs/API.md                     # API reference
```

---

## How authentication works

1. **Sign up.** The user is created as *unverified* and receives a verification email.
2. **Verify.** The email link opens your frontend's `/verify-email?token=…` page. The user enters their password, and the frontend sends it to the API with the token. Asking for the password proves that the person who owns the inbox is the same person who signed up.
3. **Sign in.** Only verified users can sign in. The API sets two `httpOnly` cookies:
   - `access_token`: short-lived, sent with every request.
   - `refresh_token`: longer-lived, used only to get a new access token.
4. **Refresh.** When the access token expires, call `/auth/refresh`. Both tokens are replaced, and the old refresh token stops working.
5. **Log out**, or reset or change the password, to end sessions:
   - Logging out ends the current session.
   - A password reset signs out every device.
   - A password change signs out every device except the current one.

Cookies are `httpOnly` and `SameSite=Lax`, and `Secure` in production. Frontend code never reads or stores tokens itself.

Two consequences:
- **Deploy the frontend and API on the same site** (e.g. `app.example.com` and `api.example.com`). Browsers don't send `Lax` cookies across different sites.
- **Ending a session takes effect gradually.** The refresh token is revoked immediately, but an access token that was already issued stays valid until it expires (`ACCESS_TOKEN_EXPIRY`).

## Security notes

- Passwords are hashed with bcrypt. Refresh, verification and reset tokens are stored as SHA-256 hashes, so a database leak does not expose working tokens.
- Sign-up, sign-in and forgot-password give the same response whether or not an account exists, so the API can't be used to find out which emails are registered.
- Uploaded avatars are checked by their file contents, not the type the client claims. Files are stored under random names, so URLs don't expose user IDs.

### Known limitations

These are planned but not done yet:

- **No rate limiting.** Put the API behind a proxy or firewall that limits requests until this is added.
- **No CORS configuration.** Browsers can only call the API from the same origin, or through a proxy such as the frontend dev server's proxy. A frontend on another origin needs CORS added first.
- **Malformed or oversized (over 50 KB) JSON bodies return `500`** instead of `400`/`413`.
- **No automated tests yet.**

---

## Further reading

- **[docs/API.md](docs/API.md):** every endpoint, with requests, responses and errors.
- **[DEVLOG.md](DEVLOG.md):** how the project was built, step by step.
- **[LEARNINGS.md](LEARNINGS.md):** mistakes made along the way, and the rules learned from them.
