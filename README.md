# SecureMail — Privacy-First End-to-End Encrypted Email Platform

A **Tutanota/ProtonMail-style** encrypted email platform with zero-knowledge architecture: the server never sees plaintext email bodies or user private keys.

## Features

- **User registration & login** with Argon2 password hashing
- **2FA (TOTP)** and email verification
- **End-to-end encryption**: keys generated and stored client-side; only encrypted private key on server
- **Mailbox**: Inbox, Sent, Drafts, Spam, Trash
- **Compose & send** with optional E2E body encryption
- **Attachments** (upload/download, server stores encrypted)
- **Contacts** (encrypted payloads)
- **Search** by sender, subject, date
- **SMTP worker** for real outbound email (SendGrid, SES, Mailgun, self-hosted)
- **IMAP sync worker** for inbound email
- **REST API** (Fastify), **Next.js** web client, **PostgreSQL** + **Redis**

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system diagram and component responsibilities.

- **Frontend**: Next.js (React), TypeScript, TailwindCSS, WebCrypto API
- **API**: Fastify, JWT, rate limiting, RBAC-ready
- **Database**: PostgreSQL (Drizzle ORM), Redis (sessions/queues)
- **Workers**: SMTP sending, IMAP sync (BullMQ-ready for queues)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- (Optional) Redis, SMTP and IMAP credentials

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Database

Create a database and run migrations:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/secure_email"
npm run db:migrate
```

Migrations live in `packages/database/migrations/`.

### 3. Run API and Web Client

Terminal 1 — API:

```bash
npm run dev:api
```

Terminal 2 — Web client:

```bash
npm run dev
```

- Web app: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)

### 4. (Optional) Workers

- **SMTP worker** (sending): set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, then `npm run dev:smtp`.
- **IMAP worker** (receiving): set `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`, then run `workers/imap-sync` (e.g. `npm run dev --workspace=workers/imap-sync` if you add a script).

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis URL (optional) |
| `JWT_SECRET` | Secret for access/refresh tokens |
| `CORS_ORIGIN` | Allowed origin for web client |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Outbound SMTP |
| `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS` | Inbound IMAP |
| `ATTACHMENT_STORAGE_PATH` | Local path for attachments (default: `./data/attachments`) |

## Docker

```bash
docker-compose up -d postgres redis
# Then run migrations and start api + web locally, or:
docker-compose up -d
```

See [docker-compose.yml](docker-compose.yml). For production, use a proper reverse proxy (e.g. NGINX) and set `JWT_SECRET` and `CORS_ORIGIN`.

## Project Structure

```
apps/
  web-client/     # Next.js email UI
  api-server/     # Fastify API
packages/
  database/       # Drizzle schema, client, migrations
  crypto/         # Argon2 hashing (server)
  shared/         # Shared constants and types
workers/
  smtp-worker/    # Outbound SMTP
  imap-sync/      # Inbound IMAP sync
docs/
  ARCHITECTURE.md
  DATABASE_SCHEMA.md
  ENCRYPTION_FLOW.md
  API_SPECIFICATION.md
  WIREFRAME.md
```

## API Overview

- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `POST /api/v1/users/keys`, `GET /api/v1/users/me/keys`, `GET /api/v1/users/public-key?email=`
- `GET /api/v1/mailboxes`, `GET /api/v1/mailboxes/:id/emails`, `GET /api/v1/mailboxes/:id/threads`
- `POST /api/v1/emails`, `GET /api/v1/emails/:id`, `PATCH /api/v1/emails/:id`, `DELETE /api/v1/emails/:id`
- `POST /api/v1/attachments/upload`, `GET /api/v1/attachments/:id`
- `GET /api/v1/contacts`, `POST /api/v1/contacts`, `PATCH /api/v1/contacts/:id`
- `GET /api/v1/search?q=...&folder=...`
- `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`

Full spec: [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md).

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for threat model, encryption boundaries, and hardening.

## License

MIT.
