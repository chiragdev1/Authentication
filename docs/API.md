# API Reference

Everything a client needs in order to use the Authentication API.

- **Base URL (local):** `http://localhost:8080`
- **All endpoints** are under `/auth`.
- **Request bodies** are JSON (`Content-Type: application/json`), except avatar upload, which is `multipart/form-data`.

---

## Contents

- [Basics](#basics): response format, authentication, errors
- [Frontend pages the emails link to](#frontend-pages-the-emails-link-to)
- **Endpoints**
  - [Sign up](#post-authsign-up) · [Verify email](#post-authverify-emailtoken) · [Sign in](#post-authsign-in) · [Refresh](#post-authrefresh) · [Log out](#post-authlogout)
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
| `access_token` | Proves who the user is on every request | Short (`ACCESS_TOKEN_EXPIRY`, e.g. 15 min) |
| `refresh_token` | Gets a new access token when the old one expires | Longer (`REFRESH_TOKEN_EXPIRY`, e.g. 1 day) |

What this means for a browser client:

- Send cookies with every request: `fetch(url, { credentials: 'include' })`, or `axios` with `withCredentials: true`.
- When a protected endpoint returns **`401`**, call [`POST /auth/refresh`](#post-authrefresh) once, then retry the original request. If refresh also fails, send the user to sign in.
- **In production, the frontend and API must be on the same site**, e.g. `app.example.com` and `api.example.com`. The cookies are `SameSite=Lax`, so browsers won't send them from a different site. Locally, `localhost:3000` → `localhost:8080` works, because ports don't count as different sites.
- **"Signed out" takes effect gradually.** When a session is ended (logout, password reset or change), its refresh token stops working immediately. An access token that was already issued keeps working until it expires (`ACCESS_TOKEN_EXPIRY`, e.g. up to 15 min).

Endpoints marked **🔒 Auth required** need a valid `access_token` cookie, and the user's email must be verified.

### Validation errors

Invalid input returns **`400`** with every problem listed in the message, as `field: problem`:

```json
{
  "success": false,
  "message": "Invalid input fields: email: Invalid email address, password: Too small: expected string to have >=6 characters"
}
```

### Common errors

| Status | Meaning |
|---|---|
| `400` | Invalid input (see above). |
| `401` | Not signed in, the session has expired, or the credentials are wrong. |
| `403` | Signed in correctly, but the email isn't verified yet. |
| `404` | The link or token is invalid or has expired. |
| `500` | Server error. Usually `Internal Server Error`, sometimes a more specific message (e.g. `Could not save refresh token in db`). Safe to retry. |

> **Known issue:** a JSON body that is malformed or larger than 50 KB currently returns `500` instead of `400`/`413`.

---

## Frontend pages the emails link to

The API sends emails with links to **your frontend** (`FRONTEND_URL`), not to the API. Your frontend needs these pages:

| Page | Linked from | What it should do |
|---|---|---|
| `/verify-email?token=…` | Verification email | Ask for the user's password, then call [Verify email](#post-authverify-emailtoken). |
| `/reset-password?token=…` | Password reset email | Ask for a new password, then call [Reset password](#post-authreset-passwordtoken). |
| `/sign-in` | "Account already exists" email | Your sign-in page. |
| `/forgot-password` | "Account already exists" email | Your forgot-password page. |

---

## Endpoints

### `POST /auth/sign-up`

Creates an account and sends a verification email.

**Body**

| Field | Type | Rules |
|---|---|---|
| `firstName` | string | Required, 2–45 characters |
| `lastName` | string \| null | Optional, up to 45 characters |
| `age` | integer | Optional, positive |
| `email` | string | Required, valid email. Spaces are trimmed and it's stored in lowercase. |
| `password` | string | Required, 6–72 characters |

```json
{ "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com", "password": "s3cret-pass" }
```

**Response: `201`**

```json
{ "success": true, "message": "Check your email to finish creating your account", "data": null }
```

> **The response is the same whether or not the email is already registered.** This stops anyone using sign-up to find out who has an account. The difference is explained by email instead: new users get a verification link, and existing users get a note telling them how to sign in.
> **Frontend:** after sign-up, always show a "check your inbox" screen.

**Errors:** `400` for invalid input.

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
| `password` | string | Required, at least 6 characters |

**Response: `200`** (sets the `access_token` and `refresh_token` cookies)

```json
{ "success": true, "message": "User signed in successfully", "data": { "id": "7a95b874-…" } }
```

**Errors**

| Status | Message | What to show |
|---|---|---|
| `400` | `Invalid input fields: …` | Fix the form. |
| `401` | `Invalid email or password` | Same message for an unknown email or a wrong password. |
| `403` | `Please verify your email before signing in, check your inbox for the verification link` | The email isn't verified. If the last link had expired, a new one has just been sent. |

---

### `POST /auth/refresh`

Gets a new access token using the `refresh_token` cookie. **Both cookies are replaced**, and the old refresh token stops working.

**Body:** none.

**Response: `200`** (sets new cookies)

```json
{ "success": true, "message": "Refresh token validated successfully", "data": { "id": "7a95b874-…" } }
```

**Errors**

| Status | Message |
|---|---|
| `401` | `Refresh token not provided` / `Invalid or expired refresh token` / `Invalid refresh token payload`. Send the user to sign in. |
| `403` | `Please verify your email before signing in` |

> **Frontend:** if two refresh calls run at the same time, the second one fails because the first has already replaced the token. Make sure only one refresh runs at a time, and have other requests wait for it.

---

### `POST /auth/logout`

Ends the current session and clears both cookies. Works even after the access token has expired.

**Body:** none.

**Response: `200`**

```json
{ "success": true, "message": "User logged out successfully", "data": null }
```

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
| `401` | `Token not provided` / `Invalid or expired token` / `Invalid token payload` / `User not found`. Try [refresh](#post-authrefresh). |
| `403` | `Please verify your email before signing in` |

---

### `POST /auth/upload-avatar`

🔒 **Auth required.** Uploads or replaces the user's profile picture.

**Body:** `multipart/form-data` with **exactly one file in a field named `avatar`** and no other fields.

| Rule | Limit |
|---|---|
| Formats | JPEG, PNG, WebP (checked from the file's contents, not its name) |
| Max size | 2 MB |

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
| `413` | `Avatar must be at most 2 MB` |
| `401` / `403` | Same as [`GET /auth/me`](#get-authme) |
| `502` | `Failed to upload image`. The image service is unavailable; try again. |

---

### `POST /auth/forgot-password`

Sends a password reset email. The link is valid for 15 minutes.

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
| `newPassword` | string | Required, 6–72 characters |

**Response: `200`**

```json
{ "success": true, "message": "Password reset successfully", "data": { "id": "7a95b874-…" } }
```

> **Every device is signed out.** The user has to sign in again with the new password.

**Errors**

| Status | Message |
|---|---|
| `400` | `Invalid input fields: …` |
| `404` | `Invalid or expired reset password token`. Ask the user to request a new link. |

---

### `POST /auth/change-password`

🔒 **Auth required.** Changes the password of the signed-in user.

**Body**

| Field | Type | Rules |
|---|---|---|
| `currentPassword` | string | Required |
| `newPassword` | string | Required, 6–72 characters, different from `currentPassword` |

**Response: `200`** (sets new cookies)

```json
{ "success": true, "message": "Password changed successfully", "data": { "id": "7a95b874-…" } }
```

> **Other devices are signed out**, and this one stays signed in.

**Errors**

| Status | Message |
|---|---|
| `400` | `Invalid input fields: …` / `Current password is incorrect` |
| `401` / `403` | Same as [`GET /auth/me`](#get-authme) |

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
