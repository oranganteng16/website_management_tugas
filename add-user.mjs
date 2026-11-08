import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  // Add rshndle@gmail.com
  const existing = await prisma.user.findUnique({ where: { email: 'rshndle@gmail.com' } });
  if (!existing) {
    const hashed = await bcrypt.hash('mamahampuniaku2011', 10);
    await prisma.user.create({
      data: {
        name: 'Rishndle',
        email: 'rshndle@gmail.com',
        password: hashed,
        role: 'owner',
      }
    });
    console.log('User rshndle@gmail.com created successfully');
  } else {
    console.log('User rshndle@gmail.com already exists');
  }

  // Remove old users
  const deleted = await prisma.user.deleteMany({
    where: { email: { in: ['owner@app.com', 'user@app.com'] } }
  });
  console.log('Deleted', deleted.count, 'old users');

  const count = await prisma.user.count();
  console.log('Remaining users:', count);
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
