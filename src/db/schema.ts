import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

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

  refreshToken: text('refresh_token'),

  accountExistsMailSentAt: timestamp('account_exists_mail_sent_at'),

  avatarUrl: text('avatar_url'),
  avatarFileId: varchar('avatar_file_id', {length: 255}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate( ()=> new Date())
  
});
