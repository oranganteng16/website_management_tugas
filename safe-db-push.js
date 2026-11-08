import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
const isPlaceholder = !dbUrl || dbUrl.includes('YOUR_PASSWORD') || dbUrl.includes('ep-sample');

console.log('====================================================');
console.log('🚀 SINKRONISASI SKEMA DATABASE KE NEON POSTGRESQL');
console.log('====================================================');

if (isPlaceholder) {
  console.log('\n⚠️  STATUS: DATABASE_URL belum dikonfigurasi dengan akun Neon asli.');
  console.log('File .env Anda saat ini masih berisi URL placeholder (ep-sample).\n');
  console.log('💡 APLIKASI TETAP BERJALAN:');
  console.log('   Anda bisa langsung menjalankan aplikasi dalam mode lokal:');
  console.log('   > npm run dev  (buka http://localhost:3000)\n');
  console.log('👉 CARA MENYAMBUNGKAN DATABASE NEON ASLI:');
  console.log('1. Buka https://console.neon.tech');
  console.log('2. Buka project Anda -> Dashboard -> Bagian "Connection Details"');
  console.log('   - Salin connection string Neon Anda');
  console.log('3. Jalankan wizard otomatis kami:');
  console.log('   > npm run db:setup');
  console.log('   (atau tempel langsung ke file .env)\n');
  console.log('✓ Perintah db:push selesai (mode standby menunggu credential Neon).\n');
  process.exit(0);
}

// Auto derive DIRECT_URL jika belum diset atau placeholder
if (!directUrl || directUrl.includes('ep-sample') || directUrl.includes('YOUR_PASSWORD')) {
  if (dbUrl.includes('-pooler.')) {
    const derivedDirect = dbUrl.replace('-pooler.', '.');
    process.env.DIRECT_URL = derivedDirect;
    console.log('ℹ️  Otomatis mengatur DIRECT_URL dari host Neon (non-pooler)...');
  } else {
    process.env.DIRECT_URL = dbUrl;
  }
}

try {
  console.log('⏳ Mendorong skema tabel Prisma ke Neon PostgreSQL...');
  execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
  console.log('\n✅ SUKSES: Skema tabel berhasil dibuat & disinkronkan di Neon!');
  console.log('👉 Jalankan `npm run db:seed` untuk mengisi data awal (Owner, Tasks, dll).\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Terjadi kesalahan saat migrasi skema ke Neon:');
  console.error(error.message);
  console.log('\n💡 Pastikan database Neon Anda aktif dan credential valid.');
  process.exit(1);
}
