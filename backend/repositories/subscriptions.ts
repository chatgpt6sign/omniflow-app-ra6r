import { db } from '../db';
import { subscriptions, budgetSettings, insertSubscriptionSchema, updateSubscriptionSchema, insertBudgetSchema } from '../db/schema';
import type { InsertSubscription, InsertBudgetSetting } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export class SubscriptionRepository {
  async findAll() {
    return db.select().from(subscriptions).orderBy(subscriptions.createdAt);
  }

  async findById(id: string) {
    const result = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return result[0] || null;
  }

  async create(data: z.infer<typeof insertSubscriptionSchema>) {
    const result = await db.insert(subscriptions).values(data as InsertSubscription).returning();
    return result[0];
  }

  async update(id: string, data: z.infer<typeof updateSubscriptionSchema>) {
    const result = await db
      .update(subscriptions)
      .set({ ...data as Partial<InsertSubscription>, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: string) {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id)).returning();
    return result.length > 0;
  }

  async getBudget() {
    const result = await db.select().from(budgetSettings).limit(1);
    return result[0] || null;
  }

  async upsertBudget(data: z.infer<typeof insertBudgetSchema>) {
    const existing = await this.getBudget();
    if (existing) {
      const result = await db
        .update(budgetSettings)
        .set({ ...data as Partial<InsertBudgetSetting>, updatedAt: new Date() })
        .where(eq(budgetSettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(budgetSettings).values(data as InsertBudgetSetting).returning();
      return result[0];
    }
  }
}

export const subscriptionRepository = new SubscriptionRepository();
