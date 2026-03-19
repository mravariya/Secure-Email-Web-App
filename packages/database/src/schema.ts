import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  bigint,
  inet,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    totpSecretEncrypted: text('totp_secret_encrypted'),
    totpEnabled: boolean('totp_enabled').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({ indexes: [uniqueIndex('users_email_idx').on(t.email)] })
);

export const userKeys = pgTable('user_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  publicKey: text('public_key').notNull(),
  encryptedPrivateKey: text('encrypted_private_key').notNull(),
  keySalt: varchar('key_salt', { length: 64 }).notNull(),
  algorithm: varchar('algorithm', { length: 32 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const mailboxes = pgTable('mailboxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const emailThreads = pgTable(
  'email_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mailboxId: uuid('mailbox_id')
      .notNull()
      .references(() => mailboxes.id, { onDelete: 'cascade' }),
    threadExternalId: varchar('thread_external_id', { length: 255 }),
    subjectNormalized: varchar('subject_normalized', { length: 512 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({ indexes: [index('email_threads_mailbox_idx').on(t.mailboxId)] })
);

export const emails = pgTable(
  'emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mailboxId: uuid('mailbox_id')
      .notNull()
      .references(() => mailboxes.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id').references(() => emailThreads.id, {
      onDelete: 'set null',
    }),
    messageId: varchar('message_id', { length: 512 }).unique(),
    inReplyTo: varchar('in_reply_to', { length: 512 }),
    references: text('references'),
    folder: varchar('folder', { length: 64 }).notNull().default('inbox'),
    fromAddress: varchar('from_address', { length: 255 }).notNull(),
    toAddresses: text('to_addresses'), // JSON array
    ccAddresses: text('cc_addresses'),
    bccAddresses: text('bcc_addresses'),
    subjectEncrypted: text('subject_encrypted'),
    subjectPlain: varchar('subject_plain', { length: 512 }), // for threading/search if not E2E subject
    sentAt: timestamp('sent_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow(),
    isRead: boolean('is_read').default(false),
    isStarred: boolean('is_starred').default(false),
    spamScore: decimal('spam_score', { precision: 5, scale: 4 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    indexes: [
      index('emails_mailbox_folder_received_idx').on(
        t.mailboxId,
        t.folder,
        t.receivedAt
      ),
      index('emails_thread_idx').on(t.threadId),
      uniqueIndex('emails_message_id_idx').on(t.messageId),
      index('emails_mailbox_read_idx').on(t.mailboxId, t.isRead),
    ],
  })
);

export const emailBodies = pgTable('email_bodies', {
  id: uuid('id').primaryKey().defaultRandom(),
  emailId: uuid('email_id')
    .notNull()
    .references(() => emails.id, { onDelete: 'cascade' })
    .unique(),
  bodyEncrypted: text('body_encrypted').notNull(),
  bodyIv: varchar('body_iv', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const emailMetadata = pgTable(
  'email_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    emailId: uuid('email_id')
      .notNull()
      .references(() => emails.id, { onDelete: 'cascade' })
      .unique(),
    senderSearchHash: varchar('sender_search_hash', { length: 64 }),
    subjectSearchHash: varchar('subject_search_hash', { length: 64 }),
    dateIndex: timestamp('date_index', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    indexes: [
      index('email_metadata_date_idx').on(t.dateIndex),
      index('email_metadata_sender_idx').on(t.senderSearchHash),
      index('email_metadata_subject_idx').on(t.subjectSearchHash),
    ],
  })
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    emailId: uuid('email_id')
      .notNull()
      .references(() => emails.id, { onDelete: 'cascade' }),
    storagePath: varchar('storage_path', { length: 512 }).notNull(),
    filenameEncrypted: text('filename_encrypted'),
    contentTypeEncrypted: text('content_type_encrypted'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    checksum: varchar('checksum', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({ indexes: [index('attachments_email_idx').on(t.emailId)] })
);

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    payloadEncrypted: text('payload_encrypted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({ indexes: [index('contacts_user_idx').on(t.userId)] })
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    deviceInfo: varchar('device_info', { length: 255 }),
    ipAddress: inet('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    indexes: [
      index('sessions_user_idx').on(t.userId),
      index('sessions_expires_idx').on(t.expiresAt),
      index('sessions_refresh_hash_idx').on(t.refreshTokenHash),
    ],
  })
);

export const outboundQueue = pgTable('outbound_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  emailId: uuid('email_id')
    .notNull()
    .references(() => emails.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  attempts: bigint('attempts', { mode: 'number' }).default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 32 }).notNull(), // email_verification, password_reset
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }),
    body: text('body'),
    data: jsonb('data'), // { emailId, threadId, ... }
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({ indexes: [index('notifications_user_read_idx').on(t.userId, t.readAt)] })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserKey = typeof userKeys.$inferSelect;
export type NewUserKey = typeof userKeys.$inferInsert;
export type Mailbox = typeof mailboxes.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;
export type EmailBody = typeof emailBodies.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
