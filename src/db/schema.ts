import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'conversations' table to store AI chat logs.
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  message: text('message').notNull(),
  response: text('response').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define user custom settings/preferences.
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull().unique(),
  voiceEnabled: boolean('voice_enabled').default(true),
  ghostMode: boolean('ghost_mode').default(false),
  volume: integer('volume').default(80),
  language: text('language').default('en-IN'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for the 'users' table.
export const usersRelations = relations(users, ({ many, one }) => ({
  conversations: many(conversations),
  settings: one(settings, {
    fields: [users.id],
    references: [settings.userId],
  }),
}));

// Define relationships for the 'conversations' table.
export const conversationsRelations = relations(conversations, ({ one }) => ({
  author: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

// Define relationships for the 'settings' table.
export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(users, {
    fields: [settings.userId],
    references: [users.id],
  }),
}));
