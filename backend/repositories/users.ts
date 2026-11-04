import { db } from '../db';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';

export class UserRepository {
  async findByUsername(username: string) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || null;
  }

  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  async create(username: string, passwordHash: string) {
    const result = await db
      .insert(users)
      .values({ username, passwordHash })
      .returning();
    return result[0];
  }
}

export const userRepository = new UserRepository();
