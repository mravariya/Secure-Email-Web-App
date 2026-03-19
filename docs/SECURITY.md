# Security Documentation

## Zero-Knowledge Model

- **Server never sees**: user passwords (only Argon2 hashes), plaintext private keys, plaintext email bodies (when E2E is used), or decrypted attachments.
- **Client**: generates key pairs, encrypts private key with password-derived key (e.g. PBKDF2/Argon2 in browser), encrypts email body and attachments before upload.
- **Server**: stores encrypted blobs, metadata (from/to, timestamps, folder), and encrypted subject when provided.

## Authentication

- Passwords hashed with **Argon2id** (memory-hard, time-cost 3, 64 MB).
- **JWT** access tokens (short-lived, e.g. 15 min) and **refresh tokens** (e.g. 7 days); refresh tokens stored hashed in DB.
- **2FA (TOTP)** optional; TOTP secret stored encrypted or in DB with access control.
- **Rate limiting** on login/register to mitigate brute-force.

## API Security

- **Helmet** for security headers; **CORS** restricted to frontend origin.
- **CSRF**: use SameSite cookies if using cookie-based refresh; for Bearer-only, stateless requests reduce CSRF surface.
- **Input validation**: validate and sanitize all inputs; avoid raw HTML in responses (XSS).
- **Authorization**: every mailbox/email/attachment request scoped to authenticated user (mailbox ownership).

## Encryption

- **Key derivation**: client uses PBKDF2 or Argon2 (WASM) with per-user salt; server never sees derived key.
- **At-rest**: sensitive columns (encrypted_private_key, body_encrypted, payload_encrypted) are opaque to server.
- **In transit**: TLS only (HTTPS, WSS); enforce HSTS in production.

## Deployment

- Set strong **JWT_SECRET** and restrict **CORS_ORIGIN**.
- Use managed PostgreSQL/Redis with encryption at rest and private networking.
- Run workers (SMTP/IMAP) in private network; do not expose them directly.
- Prefer **secrets management** (e.g. AWS Secrets Manager) for DB and SMTP/IMAP credentials.

## OWASP Alignment

- **A01 Broken Access Control**: mailbox/email/attachment access checked by mailbox ownership.
- **A02 Cryptographic Failures**: Argon2 for passwords; E2E for body/attachments; TLS everywhere.
- **A03 Injection**: parameterized queries (Drizzle); no raw SQL with user input.
- **A07 XSS**: sanitize or escape user-generated content; CSP where possible.
- **A09 Security Logging**: log auth failures and sensitive operations (no passwords or keys).
