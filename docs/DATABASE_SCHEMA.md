# Database Schema — Secure Email Platform

## Entity Relationship Overview

- **Users** → **UserKeys** (1:1 encrypted key material)
- **Users** → **Mailboxes** (1:1)
- **Mailboxes** → **Emails** (1:N)
- **Emails** → **EmailBodies** (1:1 encrypted), **EmailMetadata** (1:1), **EmailThreads** (N:1)
- **Emails** ↔ **Attachments** (N:N via junction)
- **Users** → **Contacts** (1:N encrypted)
- **Users** → **Sessions** (1:N)
- **EncryptionKeys** stores per-user public keys and encrypted private key blobs

## Tables

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL (Argon2) |
| email_verified_at | TIMESTAMPTZ | NULL |
| totp_secret_encrypted | TEXT | NULL |
| totp_enabled | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### user_keys (encryption keys — zero knowledge)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id), UNIQUE |
| public_key | TEXT | NOT NULL (armored) |
| encrypted_private_key | TEXT | NOT NULL (client-encrypted) |
| key_salt | VARCHAR(64) | for key derivation hint |
| algorithm | VARCHAR(32) | e.g. RSA-OAEP, ECDH |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### mailboxes
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id), UNIQUE per user |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### email_threads
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| mailbox_id | UUID | FK mailboxes(id) |
| thread_external_id | VARCHAR(255) | e.g. Message-ID thread root |
| subject_normalized | VARCHAR(512) | for threading |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### emails
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| mailbox_id | UUID | FK mailboxes(id) |
| thread_id | UUID | FK email_threads(id), NULL |
| message_id | VARCHAR(512) | UNIQUE (Message-ID) |
| in_reply_to | VARCHAR(512) | NULL |
| references | TEXT | NULL |
| folder | VARCHAR(64) | inbox, sent, drafts, spam, trash |
| from_address | VARCHAR(255) | NOT NULL |
| to_addresses | TEXT | JSON array |
| cc_addresses | TEXT | JSON array |
| bcc_addresses | TEXT | JSON array |
| subject_encrypted | TEXT | encrypted subject |
| sent_at | TIMESTAMPTZ | NULL |
| received_at | TIMESTAMPTZ | DEFAULT now() |
| is_read | BOOLEAN | DEFAULT false |
| is_starred | BOOLEAN | DEFAULT false |
| spam_score | DECIMAL(5,4) | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### email_bodies (encrypted content)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email_id | UUID | FK emails(id), UNIQUE |
| body_encrypted | BYTEA / TEXT | encrypted HTML/plain |
| body_iv | VARCHAR(64) | if AES-GCM |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### email_metadata (searchable — encrypted or hashed per design)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email_id | UUID | FK emails(id), UNIQUE |
| sender_search_hash | VARCHAR(64) | optional blinded index |
| subject_search_hash | VARCHAR(64) | optional blinded index |
| date_index | DATE | for range queries |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### attachments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email_id | UUID | FK emails(id) |
| storage_path | VARCHAR(512) | S3 key or local path |
| filename_encrypted | TEXT | encrypted original name |
| content_type_encrypted | TEXT | optional |
| size_bytes | BIGINT | NOT NULL |
| checksum | VARCHAR(64) | SHA-256 of ciphertext |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### contacts
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id) |
| payload_encrypted | TEXT | encrypted { name, email, ... } |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### sessions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id) |
| refresh_token_hash | VARCHAR(255) | NOT NULL |
| device_info | VARCHAR(255) | NULL |
| ip_address | INET | NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### outbound_queue (or use BullMQ Redis — schema optional)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email_id | UUID | FK emails(id) |
| status | VARCHAR(32) | pending, sent, failed |
| attempts | INT | DEFAULT 0 |
| last_error | TEXT | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| processed_at | TIMESTAMPTZ | NULL |

## Indexes

- users: `UNIQUE(email)`
- user_keys: `UNIQUE(user_id)`
- mailboxes: `UNIQUE(user_id)`
- emails: `(mailbox_id, folder, received_at DESC)`, `(thread_id)`, `UNIQUE(message_id)`, `(mailbox_id, is_read)`
- email_bodies: `UNIQUE(email_id)`
- email_metadata: `(email_id)`, `(date_index)`, `(sender_search_hash)`, `(subject_search_hash)`
- attachments: `(email_id)`
- contacts: `(user_id)`
- sessions: `(user_id)`, `(expires_at)`, `(refresh_token_hash)`

## Encryption Boundaries

- **Plaintext on server**: user email (login), folder names, from/to/cc/bcc (for delivery and threading), timestamps, sizes.
- **Encrypted on server**: subject (subject_encrypted), body (body_encrypted), attachment contents and filenames, contact payloads, TOTP secret, private key blob.
