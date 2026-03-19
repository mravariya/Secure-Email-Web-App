CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "email_verified_at" timestamp with time zone,
  "totp_secret_encrypted" text,
  "totp_enabled" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "public_key" text NOT NULL,
  "encrypted_private_key" text NOT NULL,
  "key_salt" varchar(64) NOT NULL,
  "algorithm" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mailboxes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mailbox_id" uuid NOT NULL REFERENCES "mailboxes"("id") ON DELETE CASCADE,
  "thread_external_id" varchar(255),
  "subject_normalized" varchar(512),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mailbox_id" uuid NOT NULL REFERENCES "mailboxes"("id") ON DELETE CASCADE,
  "thread_id" uuid REFERENCES "email_threads"("id") ON DELETE SET NULL,
  "message_id" varchar(512) UNIQUE,
  "in_reply_to" varchar(512),
  "references" text,
  "folder" varchar(64) NOT NULL DEFAULT 'inbox',
  "from_address" varchar(255) NOT NULL,
  "to_addresses" text,
  "cc_addresses" text,
  "bcc_addresses" text,
  "subject_encrypted" text,
  "subject_plain" varchar(512),
  "sent_at" timestamp with time zone,
  "received_at" timestamp with time zone DEFAULT now(),
  "is_read" boolean DEFAULT false,
  "is_starred" boolean DEFAULT false,
  "spam_score" decimal(5, 4),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_bodies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_id" uuid NOT NULL UNIQUE REFERENCES "emails"("id") ON DELETE CASCADE,
  "body_encrypted" text NOT NULL,
  "body_iv" varchar(64),
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_metadata" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_id" uuid NOT NULL UNIQUE REFERENCES "emails"("id") ON DELETE CASCADE,
  "sender_search_hash" varchar(64),
  "subject_search_hash" varchar(64),
  "date_index" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_id" uuid NOT NULL REFERENCES "emails"("id") ON DELETE CASCADE,
  "storage_path" varchar(512) NOT NULL,
  "filename_encrypted" text,
  "content_type_encrypted" text,
  "size_bytes" bigint NOT NULL,
  "checksum" varchar(64),
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "payload_encrypted" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refresh_token_hash" varchar(255) NOT NULL,
  "device_info" varchar(255),
  "ip_address" inet,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbound_queue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_id" uuid NOT NULL REFERENCES "emails"("id") ON DELETE CASCADE,
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "attempts" bigint DEFAULT 0,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" varchar(255) NOT NULL UNIQUE,
  "type" varchar(32) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(64) NOT NULL,
  "title" varchar(255),
  "body" text,
  "data" jsonb,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_threads_mailbox_idx" ON "email_threads" ("mailbox_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_mailbox_folder_received_idx" ON "emails" ("mailbox_id", "folder", "received_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_thread_idx" ON "emails" ("thread_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "emails_message_id_idx" ON "emails" ("message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_mailbox_read_idx" ON "emails" ("mailbox_id", "is_read");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_metadata_date_idx" ON "email_metadata" ("date_index");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_email_idx" ON "attachments" ("email_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_user_idx" ON "contacts" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_refresh_hash_idx" ON "sessions" ("refresh_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read_at");
