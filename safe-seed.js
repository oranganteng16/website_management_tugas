import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL;
const isPlaceholder = !dbUrl || dbUrl.includes('YOUR_PASSWORD') || dbUrl.includes('ep-sample');

console.log('====================================================');
console.log('🌱 SEEDING DATABASE NEON (POSTGRESQL)');
console.log('====================================================');

if (isPlaceholder) {
  console.log('\n⚠️  PERINGATAN: DATABASE_URL belum dikonfigurasi dengan akun Neon asli.');
  console.log('ℹ️  Mode lokal / fallback sudah memiliki data bawaan siap pakai:');
  console.log('   - Owner: rshndle@gmail.com');
  console.log('   - User : user@app.com  (password: 123)');
  console.log('   - 3 Tasks, 2 Reports, 2 Reminders');
  console.log('\n👉 Untuk melakukan seed ke database Neon PostgreSQL Anda:');
  console.log('   1. Masukkan connection string Neon ke file .env (atau jalankan npm run db:setup)');
  console.log('   2. Jalankan ulang: npm run db:push && npm run db:seed\n');
  process.exit(0);
}

const prisma = new PrismaClient();

async function runSeed() {
  try {
    console.log('⏳ Menghubungkan ke Neon PostgreSQL...');
    await prisma.$queryRaw`SELECT 1`;

    const hashedPassword = await bcrypt.hash('123', 10);
    const ownerPassword = await bcrypt.hash('mamahampuniaku2011', 10);

    // 1. Seed Users
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

    // 2. Seed Tasks
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
    } else {
      console.log(`ℹ️  Tabel tasks sudah berisi ${taskCount} data.`);
    }

    // 3. Seed Reports
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
    } else {
      console.log(`ℹ️  Tabel reports sudah berisi ${reportCount} data.`);
    }

    // 4. Seed Reminders
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
            userId: user.id,
          },
        ],
      });
      console.log('✓ Initial reminders berhasil di-seed');
    } else {
      console.log(`ℹ️  Tabel reminders sudah berisi ${reminderCount} data.`);
    }

    console.log('\n🎉 SEEDING NEON POSTGRESQL SELESAI DENGAN SUKSES!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Gagal melakukan seeding ke database Neon:');
    console.error(error.message);
    console.log('\n💡 Pastikan tabel sudah dibuat dengan `npm run db:push` terlebih dahulu.\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSeed();
