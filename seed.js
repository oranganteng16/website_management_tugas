import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding database Neon...');

  // Hash password default '123' dengan bcrypt 10 salt rounds
  const hashedPassword = await bcrypt.hash('123', 10);
  const ownerPassword = await bcrypt.hash('mamahampuniaku2011', 10);

  // 1. Seed Users (Upsert agar aman jika dijalankan berulang)
  const owner = await prisma.user.upsert({
    where: { email: 'owner@app.com' },
    update: {},
    create: {
      name: 'Owner System',
      email: 'owner@app.com',
      password: hashedPassword,
      role: 'owner',
    },
  });
  console.log(`✓ User Owner siap: ${owner.email} (ID: ${owner.id})`);

  const accountOwner = await prisma.user.upsert({
    where: { email: 'rshndle@gmail.com' },
    update: {
      name: 'Rishndle',
      password: ownerPassword,
      role: 'owner',
    },
    create: {
      name: 'Rishndle',
      email: 'rshndle@gmail.com',
      password: ownerPassword,
      role: 'owner',
    },
  });
  console.log(`✓ Akun Rishndle siap: ${accountOwner.email} (ID: ${accountOwner.id})`);

  const user = await prisma.user.upsert({
    where: { email: 'user@app.com' },
    update: {},
    create: {
      name: 'Standard User',
      email: 'user@app.com',
      password: hashedPassword,
      role: 'user',
    },
  });
  console.log(`✓ User Standard siap: ${user.email} (ID: ${user.id})`);

  // 2. Seed Tasks jika masih kosong
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          name: 'Membuat Desain UI/UX',
          desc: 'Menyelesaikan halaman dashboard modern dan tabel responsif',
          deadline: new Date('2026-06-15T00:00:00.000Z'),
          status: 'Proses',
          userId: owner.id,
        },
        {
          name: 'Setup Neon DB & Backend API',
          desc: 'Inisialisasi database Neon PostgreSQL, ORM Prisma, dan RESTful API',
          deadline: new Date('2026-06-10T00:00:00.000Z'),
          status: 'Selesai',
          userId: user.id,
        },
        {
          name: 'Optimasi Keamanan & Deployment',
          desc: 'Implementasi JWT, bcrypt, helmet, rate limiting, dan CORS',
          deadline: new Date('2026-06-20T00:00:00.000Z'),
          status: 'Pending',
          userId: owner.id,
        },
      ],
    });
    console.log('✓ Initial tasks berhasil di-seed');
  }

  // 3. Seed Reports jika masih kosong
  const reportCount = await prisma.report.count();
  if (reportCount === 0) {
    await prisma.report.createMany({
      data: [
        {
          name: 'Laporan Harian Kerja',
          desc: 'Rekapitulasi tugas harian tim dan migrasi database ke Neon',
          deadline: new Date('2026-06-12T00:00:00.000Z'),
          status: 'Draft',
          userId: owner.id,
        },
        {
          name: 'Laporan Evaluasi Sprint',
          desc: 'Analisis performa server dan koneksi database pooler',
          deadline: new Date('2026-06-25T00:00:00.000Z'),
          status: 'Terkirim',
          userId: user.id,
        },
      ],
    });
    console.log('✓ Initial reports berhasil di-seed');
  }

  // 4. Seed Reminders jika masih kosong
  const reminderCount = await prisma.reminder.count();
  if (reminderCount === 0) {
    await prisma.reminder.createMany({
      data: [
        {
          name: 'Meeting Evaluasi Mingguan',
          desc: 'Rapat koordinasi bersama stakeholder membahas progres tugas',
          deadline: new Date('2026-06-14T00:00:00.000Z'),
          status: 'Aktif',
          userId: owner.id,
        },
        {
          name: 'Review Security Audit & Backup DB',
          desc: 'Pengecekan backup rutin database Neon dan verifikasi SSL',
          deadline: new Date('2026-06-18T00:00:00.000Z'),
          status: 'Aktif',
          userId: owner.id,
        },
      ],
    });
    console.log('✓ Initial reminders berhasil di-seed');
  }

  console.log('🎉 Seeding database selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
