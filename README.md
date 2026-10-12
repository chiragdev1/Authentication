# Authentication Service (microservices)

A production-minded authentication API built with **Express 5**, **TypeScript** and **PostgreSQL**, split into services behind an API gateway.
It handles the full account lifecycle: sign-up with email verification, cookie-based sessions with refresh tokens, password reset and change, and profile avatars stored on ImageKit.

> **This is the `microservice-architecture` branch**, a trial of the monolith on `main` split into services. It runs as a **separate application**: its own service ports (9000–9002), its own Docker Compose project (`authentication-microservices`) with Postgres on **5433** and Redis on **6380**, its own cookie names (`ms_` prefix) and its own env file (`.env.microservices`), so it can run next to the monolith (8080, Postgres 5432, Redis 6379) without touching it.

> **Building a frontend against this API?** Go straight to the **[API reference](docs/API.md)**. The public API is the same as the monolith's; only the port changed.

---

## Architecture

```
                         ┌──────────────────────────────┐
 browser ──► :9000  ───► │ gateway                      │  helmet · CORS · JSON-only · routing
                         └──────┬───────────────┬───────┘  adds x-internal-key + X-Forwarded-For
                     /auth/*    │               │  /auth/upload-avatar
                                ▼               ▼
              ┌──────────────────────┐   ┌──────────────────────┐
              │ auth-service  :9001  │◄──┤ media-service  :9002 │──► ImageKit
              │ users + sessions     │   │ multer · sharp       │
              │ JWT · rate limits    │   │ POST /internal/authenticate
              └───┬──────────────┬───┘   │ PUT  /internal/users/:id/avatar
                  │              │       └──────────────────────┘
          Postgres│              │ BullMQ "email" queue (Redis :6380)
   auth_microservices :5433      ▼
                         ┌──────────────────────────┐
                         │ notification-service     │──► Resend
                         │ queue worker, no port    │
                         └──────────────────────────┘
```

| Service | Owns | Why it is its own service |
|---|---|---|
| **gateway** | The only public port. Security headers, CORS, the JSON-only check, and routing by path. Streams bodies through without parsing them. | Browser-facing checks happen once, at the edge. |
| **auth-service** | The `users` and `sessions` tables, tokens, cookies, every `/auth/*` endpoint except avatar upload, and their rate limits. | Users and sessions change together in transactions (a reset revokes every session), so they stay in one database. |
| **notification-service** | Email templates and Resend. Consumes jobs from the `email` queue. | Emails were already fire-and-forget; a queue adds retries, and a Resend outage can no longer slow auth-service down. |
| **media-service** | Avatar upload: multer, sharp re-encoding, ImageKit. | The heaviest work (image decoding) scales and fails on its own. |

**How the services trust each other.** Services listen on `127.0.0.1` and refuse any request without the shared `INTERNAL_API_KEY` header. The gateway adds that header to everything it forwards, overwriting any value a client sends. The gateway never routes `/internal/*`, and it rejects `..` path segments, so a client can't reach those routes through it.

**Email flow.** auth-service puts a job on the BullMQ queue (`packages/shared/src/email-jobs.ts` is the contract both sides compile against), and notification-service sends it. The job holds the address and the link, including a live verification or reset token, so how long jobs are kept in Redis matters.

**Avatar flow.** media-service asks auth-service to check the session (`/internal/authenticate`) *before* reading the file. It then re-encodes and uploads, and asks auth-service to swap the pointer (`/internal/users/:id/avatar`, which uses `SELECT … FOR UPDATE`). If auth-service rejects the swap, the new file is deleted. After a timeout or a 5xx, the swap may still have happened, so the file is kept and a warning is logged.

## Features

- **Sign-up and sign-in** with Zod validation, bcrypt password hashing (cost 12) and a check against known-breached passwords.
- **Email verification** with single-use links that expire after 15 minutes, sent through [Resend](https://resend.com) from a queue with its own worker.
- **Sessions per device**, with short-lived access tokens and refresh tokens that are replaced on every use, both in `httpOnly` cookies. Users can list their sessions, end one, or sign out everywhere, and ending a session takes effect immediately, in every service.
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
| Runtime | Node.js, TypeScript, Express 5, pnpm workspaces |
| Gateway | `http-proxy-middleware`, `helmet`, `cors` |
| Database | PostgreSQL 17 (Docker), Drizzle ORM |
| Messaging | BullMQ on Redis |
| Validation | Zod |
| Auth | JSON Web Tokens (`jsonwebtoken`), `bcrypt` |
| Rate limits | `express-rate-limit` with Redis |
| Email | Resend |
| File uploads | Multer (in-memory), `sharp`, ImageKit |
| Tests | Vitest, Supertest |

---

## Getting started

### Prerequisites

- **Node.js 22+** (developed on Node 24)
- **pnpm**: run `corepack enable` to use the version pinned in `package.json`
- **Docker**, for PostgreSQL and Redis
- A **Resend** API key (for emails) and an **ImageKit** private key (for avatars)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.microservices.sample .env.microservices
```

Then fill in the values. Every service reads this one file at the repo root and validates only the variables it uses; if one is missing or invalid, that service prints which and exits. `.env` belongs to the monolith on `main` and is not read here.

| Variable | Used by | Required | Description |
|---|---|---|---|
| `NODE_ENV` | all | No | `development` or `production`. In production, cookies are sent over HTTPS only. |
| `INTERNAL_API_KEY` | gateway, auth, media | Yes | Shared secret between the gateway and services. At least 32 characters. |
| `GATEWAY_PORT` | gateway | No | Public port. Default: `9000`. |
| `AUTH_SERVICE_PORT` / `MEDIA_SERVICE_PORT` | auth / media | No | Defaults: `9001` / `9002`. |
| `AUTH_SERVICE_URL` / `MEDIA_SERVICE_URL` | gateway, media | No | Where to reach the services. Defaults: `http://127.0.0.1:9001` / `:9002`. |
| `SERVICE_HOST` | auth, media | No | Interface the internal services listen on. Default: `127.0.0.1`. |
| `DATABASE_URL` | auth | Yes | PostgreSQL connection string. The sample points at this branch's container on port `5433`. |
| `REDIS_URL` | auth, notification (required); media (optional) | Yes | Email queue and rate-limit counts. The sample points at this branch's container on port `6380`. |
| `ACCESS_TOKEN_SECRET_KEY` / `REFRESH_TOKEN_SECRET_KEY` | auth | Yes | JWT secrets, at least 32 characters and **different from each other**. |
| `ACCESS_TOKEN_EXPIRY` / `REFRESH_TOKEN_EXPIRY` | auth | No | Defaults: `15m` / `7d`. The refresh expiry is how long an unused session lasts. |
| `APP_NAME` | notification | No | Name shown in emails. Default: `DSADEN`. |
| `RESEND_API_KEY` / `EMAIL_FROM` | notification | Yes | Resend key and a sender on a domain the key is allowed to send from. |
| `EMAIL_CONCURRENCY` | notification | No | Emails sent at once. Default: `5`. |
| `COOKIE_PREFIX` | gateway, auth, media | No | Prepended to the cookie names. Browsers share cookies across ports, so the sample sets `ms_` to keep this app's cookies from overwriting the monolith's on `localhost`. Default: none (`access_token`, `refresh_token`). |
| `FRONTEND_URL` | gateway, auth, notification | In production | Email links point here, and it is the only origin allowed by CORS. Default: `http://localhost:3000`. |
| `IMAGEKIT_PRIVATE_KEY` | media | For avatars | Without it, only avatar uploads fail (`502`). |
| `IMAGEKIT_FOLDER` | media | No | Upload folder. Default: `/avatars`; the sample uses `/avatars-microservices`. |
| `TRUST_PROXY` | auth, media | Behind a proxy | Proxies in front of the **gateway**. Default: `0`. Services add one for the gateway itself. |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Create the database and run migrations

```bash
pnpm db:up        # starts this branch's PostgreSQL (5433) and Redis (6380); main's containers are a different compose project
pnpm db:create    # creates auth_microservices if it doesn't exist (the container already creates it on first start)
pnpm db:migrate   # creates the tables
```

### 4. Run the services

```bash
pnpm dev
```

This builds `packages/shared`, then runs every service in watch mode. The gateway is at `http://localhost:9000`:

```bash
curl http://localhost:9000/
# {"message":"Gateway is running"}
```

### Try it in Postman

Import [`docs/postman/authentication-microservices.postman_collection.json`](docs/postman/authentication-microservices.postman_collection.json). It calls the gateway, keeps the session cookies in Postman's cookie jar, and checks the expected status on every request. Set the `email` and `password` collection variables first.

Verification and reset tokens arrive by email. To test locally without a mailbox, print the newest link queued for an address:

```bash
pnpm --filter @authentication/auth-service dev:last-link postman@example.com
```

It reads the job from Redis, so it only finds jobs the queue still keeps (see `EMAIL_JOB_OPTIONS` in `services/auth-service/src/utils/mail.ts`).

---

## Deploying

The API runs on one VPS with Docker Compose, and the frontend runs on Vercel. Both use hostnames under the same domain, for example:

```
browser ──https──> auth.example.com       Vercel (frontend)
        ──https──> api.auth.example.com   VPS: nginx → gateway → auth / media / notification
                                               Postgres and Redis, reachable only from the services
```

The cookies are `SameSite=Lax`, so **both hostnames must share a registrable domain** (`example.com`). A `*.vercel.app` frontend can't sign in to an `example.com` API.

Everything is in [`deploy/`](deploy): `compose.yml`, `nginx/api.conf.template` and `.env.sample`. One `Dockerfile` at the root builds an image that every service runs from. Only nginx publishes ports (80 and 443). Docker writes its own firewall rules and ignores `ufw`, so a published database port would be open to the internet even with a firewall. nginx is on its own network with the gateway, so it can't reach the services or the databases. A `certbot` container renews the Let's Encrypt certificate, and nginx reloads every 6 hours to pick it up.

### 1. DNS and accounts

- An `A` record (and `AAAA` for IPv6) for `api.auth.example.com` pointing at the VPS.
- Resend: verify the domain in `EMAIL_FROM` (SPF and DKIM records).
- The frontend's record comes later, from Vercel.

### 2. Prepare the server (Ubuntu/Debian)

```bash
# docker engine and the compose plugin, from Docker's apt repository: https://docs.docker.com/engine/install/ubuntu/
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443 && sudo ufw enable

git clone <repo-url> authentication && cd authentication
git checkout microservice-architecture
cp deploy/.env.sample deploy/.env
chmod 600 deploy/.env
```

Fill in `deploy/.env`. Generate each secret with `openssl rand -hex 32`, using a different one for each. Service URLs, `REDIS_URL`, `NODE_ENV=production` and `TRUST_PROXY=1` are set in `compose.yml`.

### 3. Get the first certificate (once)

nginx won't start without a certificate, so the first one is issued with certbot's own temporary server on port 80, before nginx runs. The DNS record from step 1 must already point at the server.

```bash
cd deploy
docker compose run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
  -d api.auth.example.com --email you@example.com --agree-tos --no-eff-email
```

After this, the `certbot` container renews it through nginx on its own.

### 4. Start it

```bash
docker compose up -d --build
docker compose ps                  # migrate shows "exited (0)"; everything else is running
docker compose logs nginx          # no "cannot load certificate" errors
curl https://api.auth.example.com/ # {"message":"Gateway is running"}
docker compose run --rm --entrypoint certbot certbot renew --dry-run --webroot -w /var/www/certbot   # renewal works through nginx
```

On every start, `migrate` applies any new migrations before auth-service starts.

### Updating

```bash
git pull && cd deploy && docker compose up -d --build
```

### Operating it

```bash
docker compose logs -f auth-service
docker compose exec postgres psql -U postgres auth_microservices
docker compose exec postgres pg_dump -U postgres auth_microservices > backup-$(date +%F).sql   # run from cron, keep copies off the server
```

### Frontend on Vercel

Add `auth.example.com` as the project's domain in Vercel and create the `CNAME` record it gives you. The frontend calls `https://api.auth.example.com` directly with `credentials: 'include'`. Don't proxy the API through Vercel rewrites: Vercel's servers would become the client address, so every user would share one rate limit. `FRONTEND_DOMAIN` in `deploy/.env` must match the Vercel domain, because it is the only CORS origin and the base of every email link.

---

## Scripts

Run from the repo root.

| Command | What it does |
|---|---|
| `pnpm dev` | Builds `shared`, then runs every package in watch mode. After changing `shared`, restart the services that use it. |
| `pnpm build` | Compiles every package in dependency order. Also the type check. |
| `pnpm start` | Runs every compiled service. |
| `pnpm test` | Builds `shared`, then runs each package's tests. auth-service uses a separate `auth_microservices_test` database, created and migrated automatically. |
| `pnpm db:up` / `pnpm db:down` | Starts / stops this branch's PostgreSQL and Redis containers (compose project `authentication-microservices`). |
| `pnpm db:create` | Creates the database named in `DATABASE_URL`. |
| `pnpm db:generate` / `pnpm db:migrate` | Creates / applies migrations for auth-service. |
| `pnpm drizzle:studio` | Opens Drizzle Studio on auth-service's database. |

Run one package with a filter, e.g. `pnpm --filter @authentication/auth-service test`.

**Changing the database schema:** edit `services/auth-service/src/db/schema.ts` → `pnpm db:generate` → review the SQL in `services/auth-service/drizzle/` → `pnpm db:migrate` → commit the schema and the migration together.

---

## Project structure

```
packages/shared/src/            # @authentication/shared, imported as '@authentication/shared/<module>'
├── api-error.ts, api-response.ts, parse-or-throw.ts, error-handler.ts
├── load-env.ts                 # reads .env.microservices, validates a service's env model
├── internal-auth.ts            # x-internal-key header + requireInternalKey middleware
├── rate-limit.ts               # createRateLimiterFactory (Redis store), ipKey, userKey
├── email-jobs.ts               # the email queue's name and job contract (Zod)
└── request.ts                  # req.user / req.sessionId types
services/
├── gateway/src/                # app.ts (routing), proxy.ts, require-json.ts
├── auth-service/
│   ├── src/app/auth/           # routes, controller, models, middleware, utils (JWT, sessions)
│   ├── src/app/internal/       # /internal/authenticate, /internal/users/:id/avatar
│   ├── src/app/middlewares/    # rate limits
│   ├── src/utils/mail.ts       # puts email jobs on the queue
│   ├── src/db/                 # schema + client
│   ├── drizzle/                # SQL migrations
│   └── scripts/create-database.js
├── notification-service/src/   # worker.ts (queue consumer), mail.ts (templates + Resend)
└── media-service/src/          # routes, controller, auth-client.ts, middlewares (authenticate, upload-multer), imagekit.ts
docs/API.md                     # API reference
Dockerfile                      # one image for every service (build stage also runs migrations)
deploy/                         # production compose file, nginx config, .env.sample
```

Each package has its own `tests/`.

**Email design:** every email is built from the components in `services/notification-service/src/templates/`. Each kind has its own accent colour and icon, there is a dark-mode version for clients that support it, and each email has a plain-text part. To see them in a browser, run `pnpm --filter @authentication/notification-service preview` and open the files in `services/notification-service/preview/`.

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

Cookies are `httpOnly` and `SameSite=Lax`, and `Secure` in production. Frontend code never reads or stores tokens itself. **Deploy the frontend and the gateway on the same site** (e.g. `app.example.com` and `api.example.com`); browsers don't send `Lax` cookies across different sites.

## Security notes

- Passwords are hashed with bcrypt at cost 12; older, cheaper hashes are upgraded at sign-in. New passwords are checked against Have I Been Pwned.
- Refresh, verification and reset tokens are stored as SHA-256 hashes, so a database leak does not expose working tokens.
- Sign-up, sign-in and forgot-password give the same response, in about the same time, whether or not an account exists.
- Only JSON bodies are accepted (plus multipart for avatars), and CORS allows only `FRONTEND_URL`, so other websites can't make a signed-in browser call the API. `helmet` sets the standard security headers. All of this happens in the gateway, so the services refuse requests that didn't come through it.
- Uploaded avatars are checked by their file contents, then re-encoded, which drops metadata such as GPS location. Files are stored under random names, so URLs don't expose user IDs.

### Known limitations

- **The per-email sign-in limit can be used to lock someone out** for 15 minutes by failing 5 times with their email. This is the usual trade-off of per-account limits.
- **Avatar upload accepts `multipart/form-data`**, which a form on a sibling subdomain could send. Changing an avatar is low impact, but a custom header requirement would close it.
- **One shared internal key.** Every service can call every other service's internal routes. Per-service keys, or mTLS, would limit what a compromised service could do.
- **An avatar can be left unused in ImageKit** when auth-service doesn't answer the pointer swap. It's logged, and it is the safer failure: deleting the file could leave a user pointing at a missing image.

---

## Further reading

- **[docs/API.md](docs/API.md):** every endpoint, with requests, responses and errors.
- **[DEVLOG.md](DEVLOG.md):** how the project was built, step by step.
- **[LEARNINGS.md](LEARNINGS.md):** mistakes made along the way, and the rules learned from them.
