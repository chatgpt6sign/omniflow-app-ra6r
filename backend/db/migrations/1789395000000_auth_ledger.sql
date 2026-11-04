-- Auth + Ledger migration for 智能记账助手
-- Adds users, ledger_entries tables and user scoping columns.

CREATE TABLE IF NOT EXISTS "users" (
  "id" text DEFAULT gen_random_uuid() PRIMARY KEY,
  "username" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" text DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" text NOT NULL,
  "type" text NOT NULL DEFAULT 'expense',
  "amount" decimal(10, 2) NOT NULL,
  "category" text NOT NULL DEFAULT 'other',
  "description" text,
  "source" text NOT NULL DEFAULT 'manual',
  "occurred_at" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Scope existing subscription/budget data per user (fresh installs create new rows with real user ids)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "user_id" text NOT NULL DEFAULT '';
ALTER TABLE "budget_settings" ADD COLUMN IF NOT EXISTS "user_id" text NOT NULL DEFAULT '';
