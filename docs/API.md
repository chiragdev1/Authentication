# API Reference

Everything a client needs in order to use the Authentication API.

- **Base URL (local):** `http://localhost:9000` (the gateway; on this branch it is the only public port)
- **All endpoints** are under `/auth`.
- **Request bodies** are JSON (`Content-Type: application/json`), except avatar upload, which is `multipart/form-data`. Any other content type returns `415`.
- **Cross-origin calls** are allowed only from `FRONTEND_URL`, with credentials.
- **Postman:** a ready collection is in [`docs/postman/`](postman/authentication-microservices.postman_collection.json).
- **Cookie names** are `access_token` and `refresh_token`, with `COOKIE_PREFIX` in front when it is set (this branch's sample uses `ms_`). Clients never read them, so the prefix changes nothing for a frontend.

---

## Contents

- [Basics](#basics): response format, authentication, errors
- [Frontend pages the emails link to](#frontend-pages-the-emails-link-to)
- **Endpoints**
  - [Sign up](#post-authsign-up) · [Verify email](#post-authverify-emailtoken) · [Sign in](#post-authsign-in) · [Refresh](#post-authrefresh) · [Log out](#post-authlogout)
  - [Log out everywhere](#post-authlogout-all) · [List sessions](#get-authsessions) · [Revoke a session](#delete-authsessionsid)
  - [Get current user](#get-authme) · [Upload avatar](#post-authupload-avatar)
  - [Forgot password](#post-authforgot-password) · [Reset password](#post-authreset-passwordtoken) · [Change password](#post-authchange-password)
- [Typical flows](#typical-flows)

---

## Basics

### Response format

Every response has the same shape.

**Success**

```json
{
  "success": true,
  "message": "User signed in successfully",
  "data": { "id": "7a95b874-5c81-4cf8-8c88-33f6015c7aa5" }
}
```

`data` is `null` when there is nothing to return.

**Error**

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Authentication

Sessions use two **`httpOnly` cookies** that the API sets on sign-in. Your code never reads, stores or sends tokens by hand.

| Cookie | Purpose | Lifetime |
|---|---|---|
| `access_token` | Proves who the user is on every request (path `/`) | Short (`ACCESS_TOKEN_EXPIRY`, e.g. 15 min) |
| `refresh_token` | Gets a new access token when the old one expires (path `/auth`, so it isn't sent anywhere else) | Longer (`REFRESH_TOKEN_EXPIRY`, e.g. 7 days). Every refresh extends it. |

What this means for a browser client:

- Send cookies with every request: `fetch(url, { credentials: 'include' })`, or `axios` with `withCredentials: true`.
- When a protected endpoint returns **`401`**, call [`POST /auth/refresh`](#post-authrefresh) once, then retry the original request. If refresh also fails, send the user to sign in.
- **In production, the frontend and API must be on the same site**, e.g. `app.example.com` and `api.example.com`. The cookies are `SameSite=Lax`, so browsers won't send them from a different site. Locally, `localhost:3000` → `localhost:9000` works, because ports don't count as different sites.
- **Each sign-in is its own session** (one per device or browser). Signing in on a phone doesn't sign out the laptop. See [List sessions](#get-authsessions).
- **"Signed out" takes effect immediately.** When a session is ended (logout, logout everywhere, revoking it, or a password reset or change), both its refresh token and its access token stop working on the next request.

Endpoints marked **🔒 Auth required** need a valid `access_token` cookie, and the user's email must be verified.

### Validation errors

Invalid input returns **`400`** with every problem listed in the message, as `field: problem`:

```json
{
  "success": false,
  "message": "Invalid input fields: email: Invalid email address, password: Password must be at least 8 characters"
}
```

### Common errors

| Status | Meaning |
|---|---|
| `400` | Invalid input (see above). |
| `401` | Not signed in, the session has expired, or the credentials are wrong. |
| `403` | Signed in correctly, but the email isn't verified yet. |
| `404` | The link or token is invalid or has expired. |
| `409` | Another request changed the same data first (e.g. two password changes at once). Safe to retry. |
| `413` | The JSON body is larger than 50 KB, or the avatar is larger than 2 MB. |
| `415` | The body isn't JSON (or `multipart/form-data` for avatar upload). |
| `429` | `Too many requests, please try again later`. See [Rate limits](#rate-limits); the `RateLimit` and `Retry-After` headers say when to try again. |
| `500` | Server error. Usually `Internal Server Error`, sometimes a more specific message. Safe to retry. |
| `502` | `Service unavailable, please try again later`. The gateway couldn't reach the service behind it. Safe to retry. |

A body that isn't valid JSON returns `400` `Request body is not valid JSON`. An unknown route returns `404` `Route not found`.

### Password rules

New passwords (sign-up, reset, change) must be **at least 8 characters and at most 72 bytes**. Most characters are 1 byte, but accented letters take 2 and emoji take 4, so a password of emoji can hold fewer than 72 characters.

New passwords are also checked against [Have I Been Pwned](https://haveibeenpwned.com/Passwords). A password found in a known breach returns `400` `This password has appeared in a known data breach, please choose a different one`. Only the first 5 characters of the password's SHA-1 hash are sent, never the password. If the service can't be reached, the password is allowed.

### Rate limits

Limits apply per IP address and, where listed, per email or per signed-in user. A request over any limit returns `429`, with the same message whether or not the account exists.

| Endpoint | Per IP | Per email / user |
|---|---|---|
| `POST /auth/sign-in` | 100 per 15 min | 5 **failed** attempts per 15 min, per email |
| `POST /auth/sign-up` | 10 per hour | – |
| `POST /auth/forgot-password` | 10 per hour | 3 per hour, per email |
| `POST /auth/verify-email/:token` | 20 per 15 min | – |
| `POST /auth/reset-password/:token` | 20 per 15 min | – |
| `POST /auth/refresh` | 60 per minute | – |
| `POST /auth/change-password` | – | 5 per 15 min, per user |
| `POST /auth/upload-avatar` | – | 10 per hour, per user |

---

## Frontend pages the emails link to

The API sends emails with links to **your frontend** (`FRONTEND_URL`), not to the API. Your frontend needs these pages:

| Page | Linked from | What it should do |
|---|---|---|
| `/verify-email?token=…` | Verification email | Ask for the user's password, then call [Verify email](#post-authverify-emailtoken). |
| `/reset-password?token=…` | Password reset email | Ask for a new password, then call [Reset password](#post-authreset-passwordtoken). |
| `/sign-in` | "Account already exists" email | Your sign-in page. |
| `/forgot-password` | "Account already exists" and "Your password was changed" emails | Your forgot-password page. |

---

## Endpoints

### `POST /auth/sign-up`

Creates an account and sends a verification email.

**Body**

| Field | Type | Rules |
|---|---|---|
| `firstName` | string | Required, 2–45 characters |
| `lastName` | string \| null | Optional, up to 45 characters |
| `age` | integer | Optional, 1–150 |
| `email` | string | Required, valid email. Spaces are trimmed and it's stored in lowercase. |
| `password` | string | Required, see [Password rules](#password-rules) |

```json
{ "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com", "password": "s3cret-pass" }
```

**Response: `201`**

```json
{ "success": true, "message": "Check your email to finish creating your account", "data": null }
```

> **The response is the same whether or not the email is already registered.** This stops anyone using sign-up to find out who has an account. The difference is explained by email instead: new users get a verification link, and existing users get a note telling them how to sign in.
> **Frontend:** after sign-up, always show a "check your inbox" screen.

**Errors:** `400` for invalid input or a breached password.

---

### `POST /auth/verify-email/:token`

Verifies the user's email. `:token` comes from the `?token=` in the verification link.

**Body**

| Field | Type | Rules |
|---|---|---|
| `password` | string | Required. The password chosen at sign-up. |

```json
{ "password": "s3cret-pass" }
```

**Response: `200`**

```json
{ "success": true, "message": "Email verified successfully", "data": null }
```

The user can now sign in. A welcome email is sent.

**Errors**

| Status | Message | What to show |
|---|---|---|
| `400` | `Invalid input fields: …` | The password is missing. |
| `401` | `Incorrect password, this verification link has been cancelled. Sign up again or sign in to get a new link` | **The link no longer works.** Send the user to sign up or sign in, which emails them a new link. |
| `404` | `Invalid or expired email token` | The link has expired or was already used. Signing in sends a new one. |

> **Why ask for the password?** It proves that the person who owns the inbox is also the person who signed up. This stops someone registering *your* email with *their* password and getting it verified.

---

### `POST /auth/sign-in`

Signs the user in and sets the session cookies.

**Body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | Required |
| `password` | string | Required |

**Response: `200`** (sets the `access_token` and `refresh_token` cookies, and starts a new session)

```json
{ "success": true, "message": "User signed in successfully", "data": { "id": "7a95b874-…" } }
```

**Errors**

| Status | Message | What to show |
|---|---|---|
| `400` | `Invalid input fields: …` | Fix the form. |
| `401` | `Invalid email or password` | Same message for an unknown email or a wrong password. |
| `403` | `Please verify your email before signing in, check your inbox for the verification link` | The email isn't verified. If the last link had expired, a new one has just been sent. |
| `429` | `Too many requests, please try again later` | Too many failed attempts for this email, or too many requests from this IP. |

---

### `POST /auth/refresh`

Gets a new access token using the `refresh_token` cookie. **Both cookies are replaced**, and the old refresh token stops working.

**Reusing an old refresh token ends the session.** If a refresh token that was already replaced is sent again more than 10 seconds later, someone may have copied it, so the whole session is revoked and the user has to sign in again.

**Body:** none.

**Response: `200`** (sets new cookies)

```json
{ "success": true, "message": "Refresh token validated successfully", "data": { "id": "7a95b874-…" } }
```

**Errors**

| Status | Message |
|---|---|
| `401` | `Refresh token not provided` / `Invalid or expired refresh token` / `Invalid refresh token payload`. Send the user to sign in. |
| `401` | `Session was refreshed by another request, retry with the new cookie`. Another tab refreshed first; **retry the original request** instead of signing out. |
| `403` | `Please verify your email before signing in` |

> **Frontend:** make sure only one refresh runs at a time, and have other requests wait for it. If two tabs still race, the loser gets the "refreshed by another request" `401` and its session stays valid.

---

### `POST /auth/logout`

Ends the current session and clears both cookies. Works even after the access token has expired. Other devices stay signed in.

**Body:** none.

**Response: `200`**

```json
{ "success": true, "message": "User logged out successfully", "data": null }
```

---

### `POST /auth/logout-all`

🔒 **Auth required.** Ends every session of the user, on every device, including this one, and clears both cookies.

**Body:** none.

**Response: `200`**

```json
{ "success": true, "message": "Signed out of all devices", "data": null }
```

---

### `GET /auth/sessions`

🔒 **Auth required.** Lists the user's active sessions, most recently used first.

**Response: `200`**

```json
{
  "success": true,
  "message": "Sessions fetched successfully",
  "data": [
    {
      "id": "0b6f8f0e-3c1a-4d3e-9d5e-2a7c1f4b8e11",
      "userAgent": "Mozilla/5.0 (Macintosh; …)",
      "ip": "203.0.113.7",
      "createdAt": "2026-10-12T09:15:00.000Z",
      "lastUsedAt": "2026-10-12T11:40:00.000Z",
      "expiresAt": "2026-10-19T11:40:00.000Z",
      "current": true
    }
  ]
}
```

`current` is `true` for the session making the request. `lastUsedAt` changes on sign-in and on every refresh. `userAgent` and `ip` can be `null`.

---

### `DELETE /auth/sessions/:id`

🔒 **Auth required.** Ends one session, e.g. "sign out my old phone". If it is the current session, the cookies are cleared too.

**Response: `200`**

```json
{ "success": true, "message": "Session revoked successfully", "data": null }
```

**Errors**

| Status | Message |
|---|---|
| `400` | `Invalid input fields: id: Invalid session id` |
| `404` | `Session not found`. It doesn't exist, belongs to someone else, or has already ended. |

---

### `GET /auth/me`

🔒 **Auth required.** Returns the signed-in user.

**Response: `200`**

```json
{
  "success": true,
  "message": "User details fetched successfully",
  "data": {
    "id": "7a95b874-5c81-4cf8-8c88-33f6015c7aa5",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "age": null,
    "email": "ada@example.com",
    "emailVerified": true,
    "avatarUrl": "https://ik.imagekit.io/…/avatars/….png"
  }
}
```

`lastName`, `age` and `avatarUrl` can be `null`.

**Errors**

| Status | Message |
|---|---|
| `401` | `Token not provided` / `Invalid or expired access token` / `Invalid access token payload` / `Session has ended, please sign in again`. Try [refresh](#post-authrefresh). |
| `403` | `Please verify your email before signing in` |

---

### `POST /auth/upload-avatar`

🔒 **Auth required.** Uploads or replaces the user's profile picture.

**Body:** `multipart/form-data` with **exactly one file in a field named `avatar`** and no other fields.

| Rule | Limit |
|---|---|
| Formats | JPEG, PNG, WebP (checked from the file's contents, not its name) |
| Max size | 2 MB, and at most about 24 megapixels |

The image is **cropped to 512×512 and saved as WebP**. All metadata, such as the GPS location in phone photos, is removed.

```js
const form = new FormData();
form.append('avatar', fileInput.files[0]);

await fetch('/auth/upload-avatar', { method: 'POST', body: form, credentials: 'include' });
// Don't set Content-Type yourself; the browser adds the multipart boundary.
```

**Response: `200`**

```json
{ "success": true, "message": "Avatar uploaded successfully", "data": { "avatarUrl": "https://ik.imagekit.io/…/avatars/….png" } }
```

The previous avatar is deleted automatically.

**Errors**

| Status | Message |
|---|---|
| `400` | `Request must be multipart/form-data` |
| `400` | `Avatar file is required in the 'avatar' field` |
| `400` | `Avatar must be sent in the 'avatar' field` / `Only the 'avatar' file can be sent` / `Only one file can be uploaded` |
| `400` | `Only JPEG, PNG and WebP images are allowed` |
| `400` | `The image could not be read, please upload a valid JPEG, PNG or WebP file` |
| `413` | `Avatar must be at most 2 MB` |
| `401` / `403` | Same as [`GET /auth/me`](#get-authme) |
| `502` | `Failed to upload image`. The image service is unavailable; try again. |
| `502` | `Authentication service is unavailable`. The session couldn't be checked or the avatar couldn't be saved; try again. |

---

### `POST /auth/forgot-password`

Sends a password reset email. The link is valid for 15 minutes. At most one email is sent every 2 minutes per account; requests in between get the same response but send nothing, and the link already sent keeps working.

**Body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | Required |

**Response: `200`**

```json
{ "success": true, "message": "If an account with this email exists, a reset password email has been sent", "data": null }
```

> The response is the same whether or not the account exists.

**Errors:** `400` for invalid input.

---

### `POST /auth/reset-password/:token`

Sets a new password. `:token` comes from the `?token=` in the reset link.

**Body**

| Field | Type | Rules |
|---|---|---|
| `newPassword` | string | Required, see [Password rules](#password-rules) |

**Response: `200`**

```json
{ "success": true, "message": "Password reset successfully", "data": { "id": "7a95b874-…" } }
```

> **Every device is signed out.** The user has to sign in again with the new password. A "Your password was changed" email is sent.
> **Resetting also verifies the email**, since opening the link proves the user owns the inbox. A user who never verified can sign in straight after resetting.

**Errors**

| Status | Message |
|---|---|
| `400` | `Invalid input fields: …` / breached password |
| `404` | `Invalid or expired reset password token`. The link has expired or was already used; ask the user to request a new one. |

---

### `POST /auth/change-password`

🔒 **Auth required.** Changes the password of the signed-in user.

**Body**

| Field | Type | Rules |
|---|---|---|
| `currentPassword` | string | Required |
| `newPassword` | string | Required, see [Password rules](#password-rules), different from `currentPassword` |

**Response: `200`**

```json
{ "success": true, "message": "Password changed successfully", "data": { "id": "7a95b874-…" } }
```

> **Other devices are signed out**, and this one stays signed in. A "Your password was changed" email is sent.

**Errors**

| Status | Message |
|---|---|
| `400` | `Invalid input fields: …` / `Current password is incorrect` / breached password |
| `401` / `403` | Same as [`GET /auth/me`](#get-authme) |
| `409` | `The password was changed by another request, please try again` |
| `429` | Too many attempts for this user. |

---

## Internal endpoints (not public)

auth-service also serves these for other services. The gateway never routes them (`404`), and auth-service refuses any request without the `x-internal-key` header (`403` `Requests must come through the gateway`).

| Endpoint | Caller | Body | Response `data` |
|---|---|---|---|
| `POST /internal/authenticate` | media-service | `{ "accessToken": "…" }` | `{ user, sessionId }`, or the same `401`/`403` as [`GET /auth/me`](#get-authme) |
| `PUT /internal/users/:id/avatar` | media-service | `{ "url": "https://…", "fileId": "…" }` | `{ previousFileId }` (`null` if there was none); `404` if the user doesn't exist |

---

## Typical flows

### New user

```
POST /auth/sign-up                 → 201, show "check your inbox"
   (user clicks the email link → your /verify-email?token=… page)
POST /auth/verify-email/:token     → 200, with { password }
POST /auth/sign-in                 → 200, cookies set
GET  /auth/me                      → 200
```

### Session expired

```
GET  /auth/me                      → 401
POST /auth/refresh                 → 200, new cookies
GET  /auth/me                      → 200 (retry)
   (if refresh returns 401 → go to sign in)
```

### Forgot password

```
POST /auth/forgot-password         → 200, show "check your inbox"
   (user clicks the email link → your /reset-password?token=… page)
POST /auth/reset-password/:token   → 200, with { newPassword }
POST /auth/sign-in                 → 200
```
