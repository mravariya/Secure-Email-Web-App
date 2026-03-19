# API Specification — Secure Email Platform

Base URL: `/api/v1`. All JSON. Authentication: `Authorization: Bearer <access_token>` unless noted.

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register (body: email, password); returns user + need email verification |
| POST | /auth/login | Login (email, password); returns access_token, refresh_token, expires_in |
| POST | /auth/refresh | Refresh (refresh_token in body or cookie); returns new access_token |
| POST | /auth/logout | Invalidate refresh token |
| POST | /auth/verify-email | Verify email (token from link) |
| POST | /auth/forgot-password | Request reset (email) |
| POST | /auth/reset-password | Reset with token + new password |
| GET  | /auth/me | Current user profile (protected) |
| POST | /auth/2fa/enable | Start TOTP setup; returns secret + QR |
| POST | /auth/2fa/verify | Verify TOTP and enable |
| POST | /auth/2fa/disable | Disable 2FA (password + TOTP) |

---

## Users & Keys (Zero-Knowledge)

| Method | Path | Description |
|--------|------|-------------|
| POST | /users/keys | Upload key bundle (public_key, encrypted_private_key, key_salt, algorithm) — called after register |
| GET  | /users/me/keys | Get own key bundle (encrypted_private_key for unlock in client) |
| GET  | /users/public-key | Query param `?email=` — get public key for address (for composing) |

---

## Mailboxes

| Method | Path | Description |
|--------|------|-------------|
| GET  | /mailboxes | List mailbox (inbox, sent, drafts, spam, trash) |
| GET  | /mailboxes/:id/emails | List emails (folder, pagination: limit, offset; sort by date) |
| GET  | /mailboxes/:id/threads | List threads (optional folder filter) |
| GET  | /mailboxes/:id/threads/:threadId | Emails in thread |

---

## Emails

| Method | Path | Description |
|--------|------|-------------|
| POST | /emails | Create draft or send (see body below) |
| GET  | /emails/:id | Get single email (metadata + encrypted body + attachment refs) |
| PATCH| /emails/:id | Update (is_read, is_starred, folder move) |
| DELETE| /emails/:id | Soft delete (move to trash or hard delete from trash) |
| POST | /emails/send | Send existing draft (id + optional changes) |

**POST /emails body (compose/send):**
- to, cc, bcc: string[]
- subject: string (client sends encrypted subject or plain for server threading)
- body_encrypted: string (base64)
- session_keys_encrypted: { [recipientEmail]: string } (encrypted session key per recipient)
- attachment_ids: uuid[] (from previous uploads)
- draft_id?: uuid (if updating draft)
- send_now: boolean (false = save as draft)

---

## Attachments

| Method | Path | Description |
|--------|------|-------------|
| POST | /attachments/upload | Multipart: file; response: attachment_id, storage_path (encrypted client-side before upload optional) |
| GET  | /attachments/:id | Get encrypted blob + metadata (filename_encrypted, size); client decrypts |
| GET  | /attachments/:id/download | Same; Content-Disposition download |

---

## Contacts

| Method | Path | Description |
|--------|------|-------------|
| GET  | /contacts | List (returns encrypted payloads; client decrypts) |
| POST | /contacts | Create (payload_encrypted) |
| PATCH| /contacts/:id | Update (payload_encrypted) |
| DELETE| /contacts/:id | Delete |

---

## Search

| Method | Path | Description |
|--------|------|-------------|
| GET  | /search | Query params: q, folder, from, to, date_from, date_to, limit, offset. Returns email IDs + metadata (subject may be encrypted). |

---

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET  | /notifications | List in-app notifications |
| PATCH| /notifications/:id/read | Mark read |
| POST | /notifications/push/subscribe | Web push subscription (payload: subscription JSON) |

---

## WebSockets (Optional)

- **URL**: `/ws` (authenticated via query token or first message).
- **Events**: `new_email`, `email_updated`, `notification` — client subscribes to mailbox channel.

---

## Rate Limits (Examples)

- auth: 10 req/min per IP for login/register.
- emails send: 100/hour per user.
- attachments: 50 uploads/hour, max 25 MB per file.
- search: 60 req/min per user.

---

## Errors

- 400 Bad Request: validation errors (body).
- 401 Unauthorized: missing or invalid token.
- 403 Forbidden: RBAC.
- 404 Not Found: resource missing.
- 429 Too Many Requests: rate limit; Retry-After header.
- 500: generic server error (no crypto or internal details).

Standard envelope: `{ "error": { "code": "VALIDATION_ERROR", "message": "..." }, "details": [] }`.
