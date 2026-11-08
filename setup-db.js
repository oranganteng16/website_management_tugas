import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

console.log('\n=============================================================');
console.log('⚡ WIZARD SETUP KONEKSI DATABASE NEON (POSTGRESQL)');
console.log('=============================================================');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function updateEnvFile(dbUrl, directUrl) {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    const examplePath = path.join(rootDir, '.env.example');
    envContent = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';
  }

  // Update or append DATABASE_URL
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${dbUrl}"`);
  } else {
    envContent += `\nDATABASE_URL="${dbUrl}"`;
  }

  // Update or append DIRECT_URL
  if (envContent.includes('DIRECT_URL=')) {
    envContent = envContent.replace(/DIRECT_URL=.*/, `DIRECT_URL="${directUrl}"`);
  } else {
    envContent += `\nDIRECT_URL="${directUrl}"`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✓ File .env berhasil diperbarui dengan connection string baru.');
}

async function testUrl(url) {
  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
    log: ['error'],
  });

  try {
    const start = Date.now();
    await client.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    await client.$disconnect();
    return { ok: true, latency };
  } catch (err) {
    await client.$disconnect();
    return { ok: false, error: err.message };
  }
}

async function main() {
  const currentDbUrl = process.env.DATABASE_URL || '';
  const isCurrentPlaceholder = !currentDbUrl || currentDbUrl.includes('YOUR_PASSWORD') || currentDbUrl.includes('ep-sample');

  if (!isCurrentPlaceholder) {
    const sanitized = currentDbUrl.replace(/:([^@]+)@/, ':****@');
    console.log(`ℹ️  Saat ini .env sudah memiliki URL: ${sanitized}`);
    console.log('⏳ Menguji koneksi database saat ini...');
    const testResult = await testUrl(currentDbUrl);
    if (testResult.ok) {
      console.log(`✅ DATABASE NEON AKTIF & TERHUBUNG! (Latency: ${testResult.latency}ms)`);
      const answer = await ask('\nApakah Anda ingin mengganti connection string dengan yang baru? (y/N): ');
      if (answer.trim().toLowerCase() !== 'y') {
        console.log('\nOperasi dibatalkan. Konfigurasi database tetap dipertahankan.');
        rl.close();
        process.exit(0);
      }
    } else {
      console.log(`⚠️  Koneksi saat ini gagal: ${testResult.error}`);
    }
  }

  console.log('\n📌 PANDUAN MENGAMBIL CONNECTION STRING DARI NEON:');
  console.log('1. Buka browser: https://console.neon.tech');
  console.log('2. Buka project Anda -> Dashboard -> Bagian "Connection Details"');
  console.log('3. Salin teks connection string yang dimulai dengan postgresql://...');
  console.log('-------------------------------------------------------------');

  const inputUrl = await ask('\nTempelkan (Paste) Connection String Neon Anda di sini:\n> ');
  const trimmed = inputUrl.trim();

  if (!trimmed) {
    console.log('\n⚠️  Tidak ada URL yang dimasukkan.');
    console.log('Aplikasi Anda tetap dapat berjalan dalam mode lokal dengan data simulasi.');
    console.log('Jalankan: npm run dev\n');
    rl.close();
    process.exit(0);
  }

  if (!trimmed.startsWith('postgresql://') && !trimmed.startsWith('postgres://')) {
    console.log('\n❌ Format tidak valid. Connection string harus diawali dengan postgresql:// atau postgres://');
    rl.close();
    process.exit(1);
  }

  console.log('\n⏳ Menguji koneksi ke server Neon PostgreSQL Anda...');
  const testConn = await testUrl(trimmed);

  if (!testConn.ok) {
    console.log('\n❌ GAGAL MENGHUBUNGI DATABASE NEON:');
    console.log(testConn.error);
    console.log('\n💡 Kemungkinan penyebab:');
    console.log('- Password pada connection string salah.');
    console.log('- Project di Neon sedang "Paused" (buka console.neon.tech untuk mengaktifkan).');
    console.log('- Parameter sslmode belum aktif (tambahkan ?sslmode=require).');
    rl.close();
    process.exit(1);
  }

  console.log(`✅ KONEKSI BERHASIL! (Latency: ${testConn.latency}ms)`);

  let dbUrl = trimmed;
  let directUrl = trimmed;

  if (trimmed.includes('-pooler.')) {
    directUrl = trimmed.replace('-pooler.', '.');
  } else {
    // If user provided direct URL, dbUrl can use pooler if desired, or keep as is
    dbUrl = trimmed;
  }

  updateEnvFile(dbUrl, directUrl);

  process.env.DATABASE_URL = dbUrl;
  process.env.DIRECT_URL = directUrl;

  console.log('\n⏳ Menerapkan skema tabel Prisma ke Neon...');
  try {
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
    console.log('✓ Skema tabel berhasil dibuat di Neon!');
  } catch (e) {
    console.error('⚠️ Gagal mendorong skema tabel:', e.message);
  }

  console.log('\n⏳ Melakukan seeding data awal ke Neon...');
  try {
    execSync('node scripts/safe-seed.js', { stdio: 'inherit', env: process.env });
  } catch (e) {
    console.error('⚠️ Seeding gagal:', e.message);
  }

  console.log('\n=============================================================');
  console.log('🎉 SELAMAT! DATABASE NEON ANDA SELESAI DIHUBUNGKAN 100%!');
  console.log('=============================================================');
  console.log('Sekarang jalankan aplikasi:');
  console.log('   npm run dev');
  console.log('Lalu buka: http://localhost:3000\n');

  rl.close();
  process.exit(0);
}

main();
