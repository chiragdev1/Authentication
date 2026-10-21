# Mistakes & Learnings

Grouped by topic. Each entry: **what went wrong → how it was fixed → the rule to keep.**
For the timeline, see [DEVLOG.md](DEVLOG.md).

---

## Passwords

- **Hand-rolled hashing.** Passwords were hashed with HMAC-SHA256 plus a salt (`19553f4`). SHA-256 is built to be fast, so leaked hashes can be brute-forced at billions of guesses per second. → Switched to bcrypt (`ca53b11`).
  **Rule:** use a deliberately slow password hash (bcrypt or argon2), never a general-purpose hash.
- **Logged the raw password.** `console.log("password", password, ...)` in sign-up (`19553f4`). Logs get shipped, stored and read by many people. → Removed.
  **Rule:** never log passwords, tokens, secrets or full request bodies on auth routes.

## Tokens & sessions

- **Refresh tokens stored as plain text** (`95f7b62`). A database leak would have handed out working sessions. → Stored as SHA-256 hashes (`5c4c505`).
  **Rule:** store every long-lived token hashed (refresh, reset, verification), the same as passwords. SHA-256 is fine here because the tokens are random, not human-chosen.
- **Cookie settings** (`95f7b62`):
  - Sign-in set cookies with options written inline (`SameSite=None`, `Secure` always on), ignoring the shared `cookieOptions`.
  - `SameSite=None` sends cookies on cross-site requests, which invites CSRF.
  - The unused `cookieOptions` paired `None` with `Secure` off in dev, a combination browsers reject.
  → One shared `cookieOptions` with `SameSite=Lax`, `Secure` in production, and expiry taken from the JWT (`ca53b11`).
  **Rule:** define cookie options in one place. Default to `httpOnly` + `SameSite=Lax` + `Secure` in production. Only use `None` for genuine cross-site setups, and only together with `Secure`.

## Account enumeration (revealing who has an account)

- **Sign-in revealed which emails exist.** It returned 404 for an unknown user and 403 for a wrong password (`2623376`). → One `401 "Invalid email or password"` for both.
- **Sign-up revealed which emails exist.** It returned `409 "email already exists"` plus the new user's `id`. → Always `201 "check your email"`, with the difference explained only by email (`83025f2`).
  **Rule:** every auth endpoint answers the same way whether or not the account exists: same status, same body, similar response time. Explain the difference by email, where only the owner can read it.

## Email verification

- **The verify link didn't match its route** (`09f6ed8`, `c50d2fb`):
  - The email linked to `GET /auth/verify-email?token=` on the API, but the route was `POST /verify-email/:token`.
  - The route also required the user to be signed in already.
  → The link now goes to a frontend page that POSTs the token; no sign-in needed.
  **Rule:** test the email link end to end. Links should open a frontend page, never trigger an action with a plain GET, because email scanners pre-open links and would use up the token.
- **A failed email failed the request.** Sign-up and sign-in waited for the email to send (`09f6ed8`), so a Resend outage meant no one could sign up. → Emails are sent in the background with `.catch()` logging, and the user can request a new link.
  **Rule:** only side effects that can be retried should be fire-and-forget, and the response must not depend on them.
- **Sign-in sent a verification email every time.** → Only when the last link has expired, checked and updated in one statement.
- **Pre-account takeover.** An attacker could sign up with someone else's email and their own password. If the owner clicked the link, the account was verified with the attacker's password. → Sign-in requires a verified email, verification requires the signup password, and verifying signs out earlier sessions (`83025f2`).
  **Rule:** a verified email proves who owns the inbox, not who chose the password. Fix this before adding "Sign in with Google" or similar logins that link accounts by email.

## Concurrency

- **Check, then insert.** "Select the email, then insert if it's not there" lets two requests at once both get through. → `onConflictDoNothing` on the unique email (`ca53b11`).
- **Rate limits on emails.** "Read the last-sent time, then send" lets requests at once both send. → One `UPDATE … WHERE expired … RETURNING` statement; only the request that gets a row back sends.
- **Replacing avatars.** Two uploads at once could both read the same old file, leaving one unused file behind. → Lock the row (`SELECT … FOR UPDATE`) in a transaction, and only after the ImageKit upload.
  **Rule:** let the database decide races (unique constraints, conditional updates, row locks), never app-level "check then act". Keep slow network calls outside transactions.

## File uploads

- **Trusting the client.** The browser-sent `mimetype` and file extension can be anything. → Check the real type from the file's first bytes. → Reject before saving, and authenticate before reading the file.
- **User ID in public URLs.** Avatar filenames were `<userId>.png`, which leaked internal IDs through public CDN URLs. → Random UUID filenames, with a `user:<id>` tag for searching in the dashboard.
- **Leftover files.** Every failure path must clean up files already uploaded to cloud storage: delete the new file if saving to the database fails, and delete the old one after a successful switch.

## Config & tooling

- **`.env.sample` was ignored by git.** The `.env.*` pattern caught it. → Added `!.env.sample`.
  **Rule:** after adding an ignore pattern, check with `git check-ignore -v <file>`.
- **A real value in the sample file.** The production sender address was in `.env.sample`. → Replaced with placeholders.
- **Migration generated but not applied.** The code expected columns the database didn't have yet. → `pnpm db:migrate` is part of "done".
- **A typo in a route handler reached a commit** (`36e8342`).
  **Rule:** run `pnpm build` (the type check) before every commit.
- **The backend `tsconfig` compiled the frontend.** With no `include`, `tsc` picked up `frontend/**`. → Added `"include": ["src"]`.
  **Rule:** a package with its own `tsconfig` inside another package needs the outer one scoped explicitly.
- **The first VPS script would have locked out the admin.** It turned off root SSH, but the only remaining user (`deploy`) had no `sudo`. → A separate `chirag` admin user with sudo; `deploy` is CI-only.
  **Rule:** before turning off a way in, make sure another way in with the same powers exists, and test it in a new terminal.
- **SSH password logins stayed on after hardening.** The script wrote `PasswordAuthentication no` to `sshd_config.d/99-hardening.conf`, but `sshd` keeps the *first* value it reads, and Hostinger's `50-cloud-init.conf` loads earlier with `yes`. The server kept accepting passwords for `chirag`; it only came to light when a failed key login fell back to a password prompt. → Renamed to `00-hardening.conf`, and the script now checks `sshd -T` (the settings in force) and fails if they're wrong.
  **Rule:** for `sshd` (unlike most config systems) the first value wins, so drop-ins that must win go first (`00-`). Verify the effective config (`sshd -T`, or the login methods `ssh -v` reports), not the file you wrote.
- **Piping data into `ssh host "sudo …"` can't work.** Without a terminal `sudo` can't prompt; with `-t`, it reads the piped data as the password. → Put the data in the command string (`ssh -t vps "echo '$(cat key.pub)' | sudo tee -a …"`), leaving stdin for the prompt.
  **Rule:** a remote `sudo` that may prompt gets `ssh -t` and nothing piped on stdin.

## Performance

- **Password hashing on the main thread capped the whole API.** `bcryptjs` is pure JavaScript, so each ~60 ms hash ran on Node's only JavaScript thread: sign-in topped out at 17/s and a burst of sign-ins delayed every other request. → Native `bcrypt`, on libuv's thread pool.
  **Rule:** CPU-heavy work (hashing, image processing, compression) must run off the main thread: a native or async thread-pool implementation, or a worker.
- **"Zero errors" hid a collapse.** At 2,000 people online every request still succeeded, with a p95 of 12 s: demand outran capacity and the queue grew. → Judge load tests on p95/p99 latency, not on error rate.
  **Rule:** a load test passes on latency targets, not on success counts.
- **A smaller thread pool made things worse.** Capping `UV_THREADPOOL_SIZE` at 1, to keep bcrypt to one core, slowed real users (p50 1.56 s vs 0.73 s), because Postgres reconnects also look up hostnames on that pool. → Kept the default of 4.
  **Rule:** measure a tuning change before keeping it. The thread pool is shared by DNS, files and crypto.
- **A load test with fake emails missed both the cost and a leak.** Bots using made-up emails never reached bcrypt, because unknown emails return early. That made the attack look cheap, and it exposed a timing difference (16 ms vs 60 ms). → Rerun against real accounts.
  **Rule:** attack simulations must use realistic inputs (real usernames in credential stuffing). Response *time* must not depend on whether an account exists.
- **Default keep-alive timeouts would have caused random 502s.** Node closes idle sockets after 5 s, while Caddy reuses upstream sockets for much longer, so a POST could land on a socket Node had just closed. → `keepAliveTimeout` 125 s in Node, upstream `keepalive 60s` in Caddy.
  **Rule:** behind a proxy, the app's idle timeout must be longer than the proxy's.

## Process

- Commit messages for behaviour or security changes need a body explaining *why*, plus a `BREAKING CHANGE:` footer when the API changes. One-liners are only for trivial commits.
- After a change, test the real flow end to end against the database and the external services, not just a successful build.
