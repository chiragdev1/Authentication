import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid('id').primaryKey().defaultRandom(),

  firstName: varchar('first_name', { length: 45 }).notNull(),
  lastName: varchar('last_name', {length: 45}),

  age: integer('age'),

  email: varchar('email', { length: 322 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),

  emailVerificationToken: varchar('email_verification_token', {length: 255}),
  emailVerificationTokenExpiry: timestamp('email_verification_token_expiry'),

  password: varchar('password', {length: 255}),

  resetPasswordToken: varchar('reset_password_token', {length: 255}),
  resetPasswordTokenExpiry: timestamp('reset_password_token_expiry'),
  resetPasswordMailSentAt: timestamp('reset_password_mail_sent_at'),

  accountExistsMailSentAt: timestamp('account_exists_mail_sent_at'),

  avatarUrl: text('avatar_url'),
  avatarFileId: varchar('avatar_file_id', {length: 255}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate( ()=> new Date())

});

// one row per signed in device; the refresh token rotates in place, and prevTokenHash remembers the one it replaced to spot reuse
export const sessionsTable = pgTable("sessions", {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, {onDelete: 'cascade'}),

  tokenHash: varchar('token_hash', {length: 64}).notNull().unique(),
  prevTokenHash: varchar('prev_token_hash', {length: 64}),

  userAgent: varchar('user_agent', {length: 255}),
  ip: varchar('ip', {length: 45}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
])
