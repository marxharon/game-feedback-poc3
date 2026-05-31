import { db, pool } from './src/db/db';
import { users } from './src/db/schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');
  try {
    // Clear existing users
    await db.delete(users);

    const defaultPassword = '123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await db.insert(users).values([
      {
        name: 'Gestor Teste',
        email: 'gestor@teste.com',
        passwordHash,
        role: 'MANAGER',
      },
      {
        name: 'Colaborador Um',
        email: 'colab1@teste.com',
        passwordHash,
        role: 'COLLAB',
      },
      {
        name: 'Colaborador Dois',
        email: 'colab2@teste.com',
        passwordHash,
        role: 'COLLAB',
      }
    ]);
    console.log('Seed completed successfully. Users created with password "123".');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seed();
