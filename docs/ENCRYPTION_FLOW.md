# Encryption Flow — Zero-Knowledge Email

## 1. Key Lifecycle

### 1.1 Account Creation (Client-Side)

1. User submits email + password.
2. Client generates:
   - **RSA-OAEP or ECDH key pair** (e.g. 4096-bit RSA or P-384) for email encryption.
   - **AES-256-GCM** symmetric key for session/material encryption.
3. **Key derivation** (client):
   - `key = Argon2id(password, salt, { timeCost, memoryCost })` → 256-bit.
   - Optional: separate salt for "key encryption key" (KEK).
4. **Private key protection**:
   - Encrypt private key with KEK (AES-256-GCM).
   - Store `encrypted_private_key` + `key_salt` (and algorithm) on server; private key never leaves client in plaintext.
5. **Server stores**: `public_key`, `encrypted_private_key`, `key_salt`, `algorithm`. Server never sees password or plaintext private key.

### 1.2 Login and Key Unlock (Client-Side)

1. User logs in; server returns encrypted private key blob + key_salt.
2. Client derives KEK from password + key_salt (same Argon2 params).
3. Client decrypts private key in memory; used only for decrypting emails/attachments in this session.
4. Optional: cache decrypted private key in memory only (never to disk in plaintext); clear on logout.

---

## 2. Sending an Email (End-to-End)

```text
[Compose] → [Resolve recipients] → [Fetch recipient public keys] → [Encrypt] → [Upload] → [Queue SMTP]
```

1. **Resolve recipients**: Look up contacts or external addresses.
2. **Fetch public keys**: For each recipient, call `GET /api/users/:id/public-key` or lookup by email. If no public key (external user), use **server-side encryption** or **password-based** fallback (optional; otherwise send "unencrypted" warning).
3. **Encrypt in browser**:
   - Generate random **session key** (e.g. 256-bit).
   - Encrypt email body (HTML/plain) with session key (AES-256-GCM).
   - Encrypt session key for each recipient with their **public key** (RSA-OAEP or ECDH).
   - Attachments: encrypt each with a dedicated key; encrypt that key for each recipient.
4. **Payload to server**:
   - Encrypted body (base64 or raw).
   - Per-recipient encrypted session keys (and attachment keys).
   - Encrypted subject (optional; same session key or subject-specific key).
   - Metadata: from, to, cc, bcc, timestamp (server needs for SMTP).
5. **Server**: Stores encrypted body and keys; enqueues SMTP job. Worker builds MIME (with encrypted part or link) and sends via SMTP.

### 2.1 Hybrid Model (Proton-style)

- For **internal users** (same platform): E2E with recipient public key.
- For **external users**: Option A) Send link + one-time decrypt page; Option B) Server-side encryption with stored key (less zero-knowledge); Option C) Plaintext over TLS only (document clearly).

---

## 3. Receiving an Email

1. **IMAP worker** fetches raw message; parses headers and body.
2. **Server**:
   - Decrypts nothing. Optionally encrypts the **raw** body with a **server-side key** (storage encryption at rest) so DB/backups are encrypted — separate from E2E.
   - Stores: encrypted body (E2E or storage-encrypted), metadata (from, to, subject encrypted, date, message-id, thread refs).
3. **Client**:
   - Requests email by `email_id`.
   - Receives encrypted body + per-recipient encrypted session keys.
   - Decrypts session key with **own private key** (already unlocked), then decrypts body and attachments.
   - Renders in UI.

---

## 4. Attachments

- **Upload**: Client encrypts file with random key; encrypts that key for self (and for recipients if composing); uploads ciphertext + encrypted key(s). Server stores in S3/local with `storage_path`, `filename_encrypted`, `size_bytes`, `checksum`.
- **Download**: Client fetches ciphertext; decrypts with private key (or session key); presents file.

---

## 5. Contacts

- Stored as `payload_encrypted` (JSON: name, email, etc.) encrypted with user's key (derived from password or session key). Server cannot read contacts.

---

## 6. Algorithms (Reference)

| Purpose | Algorithm |
|---------|-----------|
| Password hash | Argon2id |
| Key derivation | Argon2id → 256-bit KEK |
| Asymmetric | RSA-OAEP 4096 or ECDH P-384 |
| Symmetric | AES-256-GCM |
| Subject/body (E2E) | AES-256-GCM with random IV per message |

All crypto in browser via **WebCrypto API** or **OpenPGP.js** (OpenPGP.js for PGP compatibility if needed).
