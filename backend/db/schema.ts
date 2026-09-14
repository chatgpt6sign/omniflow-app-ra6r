import { pgTable, text, integer, timestamp, decimal } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const subscriptions = pgTable('subscriptions', {
  id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
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
  monthlyLimit: decimal('monthly_limit', { precision: 10, scale: 2 }).notNull().default('500'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
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
  monthlyLimit: z.coerce.string(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type BudgetSetting = typeof budgetSettings.$inferSelect;
export type InsertBudgetSetting = typeof budgetSettings.$inferInsert;
