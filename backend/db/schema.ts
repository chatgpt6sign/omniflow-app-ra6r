import { pgTable, text, integer, timestamp, decimal } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = pgTable('users', {
  id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  category: text('category').notNull().default('other'),
  billingCycle: text('billing_cycle').notNull().default('monthly'),
  nextBillingDate: text('next_billing_date').notNull(),
  lastBillingDate: text('last_billing_date').notNull(),
  status: text('status').notNull().default('active'),
  icon: text('icon'),
  color: text('color'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const budgetSettings = pgTable('budget_settings', {
  id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: text('user_id').notNull().default(''),
  monthlyLimit: decimal('monthly_limit', { precision: 10, scale: 2 }).notNull().default('500'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull().default('expense'), // income | expense
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  category: text('category').notNull().default('other'),
  description: text('description'),
  source: text('source').notNull().default('manual'), // manual | ai
  occurredAt: text('occurred_at').notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, '用户名至少 3 个字符').max(50),
  passwordHash: z.string(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  userId: z.string(),
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.string(),
  category: z.string().min(1),
  billingCycle: z.enum(['monthly', 'yearly', 'quarterly']),
  nextBillingDate: z.string().min(1),
  lastBillingDate: z.string().min(1),
  status: z.enum(['active', 'cancelled', 'paused']),
});

export const updateSubscriptionSchema = insertSubscriptionSchema.partial();

export const insertBudgetSchema = createInsertSchema(budgetSettings, {
  userId: z.string(),
  monthlyLimit: z.coerce.string(),
});

export const insertLedgerSchema = createInsertSchema(ledgerEntries, {
  userId: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.string(),
  category: z.string().min(1),
  description: z.string().optional().nullable(),
  source: z.enum(['manual', 'ai']).optional().default('manual'),
  occurredAt: z.string().min(1),
});

export const updateLedgerSchema = insertLedgerSchema.partial();

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type BudgetSetting = typeof budgetSettings.$inferSelect;
export type InsertBudgetSetting = typeof budgetSettings.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;
