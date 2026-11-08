import app from '../src/app.js';

let server;
const PORT = 3001; // Port uji coba agar tidak bentrok

async function runTests() {
  console.log('====================================================');
  console.log('🧪 MENJALANKAN AUTOMATED INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.success === true, 'GET /api/health status 200 OK');

    // 2. Login gagal dengan password salah
    const failLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@app.com', password: 'wrongpassword' }),
    });
    assert(failLoginRes.status === 401, 'POST /api/auth/login dengan password salah ditolak (401)');

    // 3. Login sukses sebagai Owner
    const ownerLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@app.com', password: '123' }),
    });
    const ownerLoginData = await ownerLoginRes.json();
    assert(ownerLoginRes.status === 200 && !!ownerLoginData.token, 'POST /api/auth/login Owner sukses (200) & dapat JWT token');
    const ownerToken = ownerLoginData.token;

    // 4. Login sukses sebagai Regular User
    const userLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@app.com', password: '123' }),
    });
    const userLoginData = await userLoginRes.json();
    assert(userLoginRes.status === 200 && userLoginData.user.role === 'user', 'POST /api/auth/login Regular User sukses');
    const userToken = userLoginData.token;

    // Verify that an authenticated user can update their profile.
    const profileRes = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ name: ownerLoginData.user.name, email: ownerLoginData.user.email }),
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200 && profileData.user.email === ownerLoginData.user.email && !!profileData.token, 'PUT /api/auth/me updates profile and returns a new token');

    const registrationRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temporary Test User',
        email: `test-${Date.now()}@example.test`,
        password: 'test-password',
        role: 'owner',
      }),
    });
    const registrationData = await registrationRes.json();
    const registeredUserId = registrationData.user?.id;
    const registrationCleanupRes = registeredUserId
      ? await fetch(`${baseUrl}/api/users/${registeredUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
      : null;
    assert(registrationRes.status === 201 && registrationData.user?.role === 'user', 'POST /api/auth/register creates a standard account');
    assert(registrationCleanupRes?.status === 200, 'Temporary registration test account is removed');

    // 5. GET /api/auth/me dengan Bearer token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.email === 'owner@app.com', 'GET /api/auth/me memvalidasi token Owner');

    // 6. Akses /api/users tanpa token ditolak (401)
    const unauthUsersRes = await fetch(`${baseUrl}/api/users`);
    assert(unauthUsersRes.status === 401, 'GET /api/users tanpa token ditolak (401)');

    // 7. Regular user dilarang akses /api/users (403 Forbidden)
    const forbiddenUsersRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(forbiddenUsersRes.status === 403, 'GET /api/users dengan akun biasa ditolak (403 Forbidden)');

    // 8. Owner boleh akses /api/users (200 OK)
    const ownerUsersRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const ownerUsersData = await ownerUsersRes.json();
    assert(ownerUsersRes.status === 200 && Array.isArray(ownerUsersData.users), 'GET /api/users dengan Owner diizinkan (200 OK)');

    // 9. CRUD Task: Create Task
    const createTaskRes = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Task Uji Otomatis',
        desc: 'Deskripsi task uji integrasi end-to-end',
        deadline: '2026-12-31',
        status: 'Proses',
        priority: 'High',
      }),
    });
    const createTaskData = await createTaskRes.json();
    assert(createTaskRes.status === 201 && createTaskData.task?.name === 'Task Uji Otomatis' && createTaskData.task?.priority === 'High', 'POST /api/tasks saves task priority (201)');
    const createdTaskId = createTaskData.task?.id;

    // 10. CRUD Task: Update Task
    const updateTaskRes = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Task Uji Otomatis Updated',
        desc: 'Deskripsi diperbarui',
        deadline: '2026-12-31',
        status: 'Selesai',
        priority: 'Low',
      }),
    });
    const updateTaskData = await updateTaskRes.json();
    assert(updateTaskRes.status === 200 && updateTaskData.task?.priority === 'Low', 'PUT /api/tasks/:id updates task priority (200)');

    // 11. CRUD Task: Delete Task
    const deleteTaskRes = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(deleteTaskRes.status === 200, 'DELETE /api/tasks/:id berhasil menghapus tugas (200)');

    // 12. CRUD Report: Create Report
    const createReportRes = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Report Uji Otomatis',
        desc: 'Deskripsi laporan uji',
        deadline: '2026-11-30',
        status: 'Draft',
      }),
    });
    const createReportData = await createReportRes.json();
    assert(createReportRes.status === 201, 'POST /api/reports berhasil membuat laporan baru (201)');
    const createdReportId = createReportData.report?.id;

    // 13. CRUD Report: Delete Report
    const deleteReportRes = await fetch(`${baseUrl}/api/reports/${createdReportId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(deleteReportRes.status === 200, 'DELETE /api/reports/:id berhasil menghapus laporan (200)');

    // 14. CRUD Reminder: Create Reminder
    const createReminderRes = await fetch(`${baseUrl}/api/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Reminder Uji Otomatis',
        desc: 'Deskripsi reminder uji',
        deadline: '2026-10-31',
        status: 'Aktif',
      }),
    });
    const createReminderData = await createReminderRes.json();
    assert(createReminderRes.status === 201, 'POST /api/reminders berhasil membuat reminder baru (201)');
    const createdReminderId = createReminderData.reminder?.id;

    // 15. CRUD Reminder: Delete Reminder
    const deleteReminderRes = await fetch(`${baseUrl}/api/reminders/${createdReminderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(deleteReminderRes.status === 200, 'DELETE /api/reminders/:id berhasil menghapus reminder (200)');

    // 16. Dashboard stats
    const statsRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200 && statsData.stats?.system?.tasks >= 0, 'GET /api/dashboard/stats berhasil mengambil statistik');

    // 17. Validasi Zod: Error saat payload kosong
    const invalidTaskRes = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ name: 'A' }), // name terlalu pendek dan field lain kosong
    });
    assert(invalidTaskRes.status === 400, 'Validasi Zod menolak input data yang tidak valid (400 Bad Request)');

  } catch (err) {
    console.error('💥 Error saat menjalankan pengujian:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n====================================================');
    console.log(`📊 HASIL PENGUJIAN: ${passed} PASS, ${failed} FAIL`);
    console.log('====================================================');
    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 SELURUH PENGUJIAN INTEGRASI BERHASIL 100% TANPA ERROR!\n');
      process.exit(0);
    }
  }
}

runTests();
