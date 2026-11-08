@echo off
title Aplikasi Manajemen Tugas (Neon DB)
echo ========================================================
echo    APLIKASI MANAJEMEN TUGAS - FULL STACK & NEON DB
echo ========================================================
echo.
echo 1. Memeriksa konfigurasi database di .env ...
echo 2. Membuka browser: http://localhost:3000 ...
start http://localhost:3000
echo 3. Menjalankan backend server Express...
echo.
echo [TIPS] Tekan Ctrl+C di terminal ini untuk menghentikan server.
echo ========================================================
npm run dev
pause
