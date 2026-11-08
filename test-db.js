import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

console.log('====================================================');
console.log('🔍 CEK KONEKSI DATABASE NEON (POSTGRESQL)');
console.log('====================================================');

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!databaseUrl || databaseUrl.includes('YOUR_PASSWORD') || databaseUrl.includes('ep-sample')) {
  console.log('\n⚠️  PERINGATAN: DATABASE_URL belum dikonfigurasi dengan credential asli Neon.');
  console.log('Silakan ikuti langkah berikut untuk menghubungkan database Neon Anda:');
  console.log('1. Buka console Neon: https://console.neon.tech');
  console.log('2. Buat Project baru atau pilih Project yang sudah ada.');
  console.log('3. Di Dashboard -> Bagian "Connection Details":');
  console.log('   - Pilih "Pooled connection" -> Salin string untuk DATABASE_URL');
  console.log('   - Nonaktifkan "Pooled connection" -> Salin string untuk DIRECT_URL');
  console.log('4. Buka file .env dan paste nilainya ke:');
  console.log('   DATABASE_URL="..."');
  console.log('   DIRECT_URL="..."');
  console.log('5. Jalankan: npm run db:push && npm run db:seed\n');
  process.exit(0);
}

console.log('DATABASE_URL terdeteksi.');
const sanitizedUrl = databaseUrl.replace(/:([^@]+)@/, ':****@');
console.log(`Target: ${sanitizedUrl}`);

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testConnection() {
  const startTime = Date.now();
  try {
    console.log('\n⏳ Mencoba ping ke server database Neon...');
    const result = await prisma.$queryRaw`SELECT NOW() as server_time, version() as version`;
    const elapsed = Date.now() - startTime;

    console.log('✅ BERHASIL TERHUBUNG KE NEON POSTGRESQL!');
    console.log(`⏱️  Latency: ${elapsed}ms`);
    console.log(`📅 Waktu Server DB: ${result[0].server_time}`);
    console.log(`🐘 Versi PostgreSQL: ${result[0].version.split(',')[0]}`);

    // Periksa tabel yang tersedia
    const usersCount = await prisma.user.count().catch(() => null);
    if (usersCount !== null) {
      console.log(`👥 Tabel "users" ada (Total: ${usersCount} users)`);
    } else {
      console.log('ℹ️  Tabel belum dimigrasi. Jalankan `npm run db:push` untuk membuat tabel.');
    }

    console.log('\n✨ Database siap digunakan untuk production!\n');
  } catch (error) {
    console.error('\n❌ GAGAL TERHUBUNG KE DATABASE NEON:');
    console.error(error.message);
    console.log('\n💡 Tips perbaikan:');
    console.log('- Pastikan connection string memiliki parameter "?sslmode=require"');
    console.log('- Pastikan password tidak mengandung karakter khusus tanpa URL encoding');
    console.log('- Pastikan project Neon Anda dalam status "Active" (bukan paused)');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
