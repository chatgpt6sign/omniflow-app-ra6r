CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" text NOT NULL,
  "amount" decimal(10, 2) NOT NULL,
  "category" text NOT NULL DEFAULT 'other',
  "billing_cycle" text NOT NULL DEFAULT 'monthly',
  "next_billing_date" text NOT NULL,
  "last_billing_date" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "icon" text,
  "color" text,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "budget_settings" (
  "id" text DEFAULT gen_random_uuid() PRIMARY KEY,
  "monthly_limit" decimal(10, 2) NOT NULL DEFAULT 500,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
