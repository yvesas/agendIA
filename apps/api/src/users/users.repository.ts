import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/database.module';
import { type NewUser, type User, users } from '../db/schema/users';

export type UpdatableUserFields = Partial<Pick<NewUser, 'name' | 'email' | 'passwordHash'>>;

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row;
  }

  async findById(id: string): Promise<User | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  async create(input: NewUser): Promise<User> {
    const [row] = await this.db.insert(users).values(input).returning();

    if (!row) {
      throw new Error('User insert returned no rows');
    }

    return row;
  }

  async update(id: string, patch: UpdatableUserFields): Promise<User | undefined> {
    const [row] = await this.db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return row;
  }

  async deleteById(id: string): Promise<boolean> {
    const rows = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return rows.length > 0;
  }
}
