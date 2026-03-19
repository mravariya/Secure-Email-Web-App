export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/secure_email',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    attachmentStoragePath: process.env.ATTACHMENT_STORAGE_PATH || './data/attachments',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    imapHost: process.env.IMAP_HOST,
    imapPort: parseInt(process.env.IMAP_PORT || '993', 10),
    imapUser: process.env.IMAP_USER,
    imapPass: process.env.IMAP_PASS,
};
//# sourceMappingURL=config.js.map