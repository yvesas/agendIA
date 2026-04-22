import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/database.module';
import { type NewUser, type User, users } from '../db/schema/users';

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
}
