import { db } from '../db';
import { ledgerEntries } from '../db/schema';
import type { InsertLedgerEntry } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import type { insertLedgerSchema, updateLedgerSchema } from '../db/schema';

export class LedgerRepository {
  async findAll(userId: string, limit = 200) {
    return db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.userId, userId))
      .orderBy(desc(ledgerEntries.occurredAt), desc(ledgerEntries.createdAt))
      .limit(limit);
  }

  async findById(id: string, userId: string) {
    const result = await db
      .select()
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.id, id), eq(ledgerEntries.userId, userId)))
      .limit(1);
    return result[0] || null;
  }

  async create(data: z.infer<typeof insertLedgerSchema>) {
    const result = await db
      .insert(ledgerEntries)
      .values(data as InsertLedgerEntry)
      .returning();
    return result[0];
  }

  async update(id: string, userId: string, data: z.infer<typeof updateLedgerSchema>) {
    const result = await db
      .update(ledgerEntries)
      .set({ ...(data as Partial<InsertLedgerEntry>), updatedAt: new Date() })
      .where(and(eq(ledgerEntries.id, id), eq(ledgerEntries.userId, userId)))
      .returning();
    return result[0] || null;
  }

  async delete(id: string, userId: string) {
    const result = await db
      .delete(ledgerEntries)
      .where(and(eq(ledgerEntries.id, id), eq(ledgerEntries.userId, userId)))
      .returning();
    return result.length > 0;
  }

  /** Monthly summary used by dashboard/AI: income, expense, balance for a month (YYYY-MM). */
  async monthlySummary(userId: string, month: string) {
    const rows = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.userId, userId));
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (!row.occurredAt.startsWith(month)) continue;
      const amount = Number(row.amount) || 0;
      if (row.type === 'income') income += amount;
      else expense += amount;
    }
    return { income, expense, balance: income - expense, count: rows.filter(r => r.occurredAt.startsWith(month)).length };
  }

  /** Recent entries for AI context. */
  async recent(userId: string, limit = 10) {
    return this.findAll(userId, limit);
  }
}

export const ledgerRepository = new LedgerRepository();
