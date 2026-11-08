const http = require('http');

const base = 'http://localhost:3000';

function api(path, method='GET', body=null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = { hostname:'localhost', port:3000, path, method, headers:{} };
    if (data) options.headers['Content-Type'] = 'application/json';
    const req = http.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Health
  const health = await api('/api/health');
  console.log('Health:', health.database.connected ? 'Neon' : 'Fallback');

  // Tasks
  const tasks = await api('/api/tasks');
  console.log('Tasks count:', tasks.tasks?.length || 0);
  if (tasks.tasks && tasks.tasks.length > 0) {
    console.log('Sample task:', tasks.tasks[0].name);
  }

  // Dashboard stats
  const stats = await api('/api/dashboard/stats');
  console.log('Stat keys:', Object.keys(stats.stats || {}));

  // Reports
  const reports = await api('/api/reports');
  console.log('Reports count:', reports.reports?.length || 0);

  // Reminders
  const reminders = await api('/api/reminders');
  console.log('Reminders count:', reminders.reminders?.length || 0);

  // Create a task
  const newTask = await api('/api/tasks', 'POST', {
    name: 'Test Task',
    desc: 'Test description',
    category: 'Test',
    priority: 'Medium',
    status: 'Pending',
    deadline: '2026-12-31'
  });
  console.log('Create task:', newTask.success ? 'OK' : 'FAIL');
  if (newTask.task && newTask.task.id) {
    // Update a task
    const updated = await api('/api/tasks/' + newTask.task.id, 'PUT', { name: 'Updated Task', status: 'Done' });
    console.log('Update task:', updated.success ? 'OK' : 'FAIL');

    // Delete the task
    const deleted = await api('/api/tasks/' + newTask.task.id, 'DELETE');
    console.log('Delete task:', deleted.success ? 'OK' : 'FAIL');
  }

  // Verify tasks after CRUD
  const tasksAfter = await api('/api/tasks');
  console.log('Tasks after CRUD:', tasksAfter.tasks?.length || 0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
