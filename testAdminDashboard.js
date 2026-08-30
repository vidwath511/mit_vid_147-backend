const baseUrl = 'http://localhost:5000/api';

const runTests = async () => {
  // Login
  const loginA1 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin11@test.com', password: 'password' }) })).json();
  const loginA2 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin22@test.com', password: 'password' }) })).json();
  const loginS1 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student11@test.com', password: 'password' }) })).json();

  const tokenAdmin1 = loginA1.token;
  const tokenAdmin2 = loginA2.token;
  const tokenStudent = loginS1.token;

  console.log('\n--- 1. Admin can retrieve results for their own exams ---');
  const resultsRes = await (await fetch(`${baseUrl}/admin/results`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } })).json();
  console.log('Admin 1 results count:', resultsRes.results.length);
  const firstAttemptId = resultsRes.results.length > 0 ? resultsRes.results[0].attemptId : null;

  console.log('\n--- 2 & 5. Admin cannot retrieve another admin\'s result via single endpoint ---');
  if (firstAttemptId) {
    const s1A = await fetch(`${baseUrl}/admin/results/${firstAttemptId}`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } });
    console.log('Admin 1 views their own result status:', s1A.status);

    const s2A = await fetch(`${baseUrl}/admin/results/${firstAttemptId}`, { headers: { 'Authorization': `Bearer ${tokenAdmin2}` } });
    console.log('Admin 2 views Admin 1\'s result status:', s2A.status);
  }

  console.log('\n--- 3. Filtering results by an exam works correctly ---');
  const examIdA1 = resultsRes.results.length > 0 ? resultsRes.results[0].examId : null;
  if (examIdA1) {
    const filterRes = await (await fetch(`${baseUrl}/admin/results?examId=${examIdA1}`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } })).json();
    console.log('Filtered count for Exam ID', examIdA1, ':', filterRes.results.length);
    
    console.log('\n--- 4. Admin cannot filter using another admin\'s exam ID ---');
    const filterA2 = await (await fetch(`${baseUrl}/admin/results?examId=${examIdA1}`, { headers: { 'Authorization': `Bearer ${tokenAdmin2}` } })).json();
    console.log('Admin 2 filtering Admin 1\'s exam ID count:', filterA2.results.length);
  }

  console.log('\n--- 6, 7, 8, 9, 10, 11, 12, 13, 14. Admin 1 Dashboard Analytics ---');
  const dashA1 = await (await fetch(`${baseUrl}/admin/dashboard`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } })).json();
  console.log(JSON.stringify(dashA1.dashboard, null, 2));

  console.log('\n--- 15. Empty analytics return valid zero values without crashing ---');
  // Admin 2 has no exams or results (assuming)
  const dashA2 = await (await fetch(`${baseUrl}/admin/dashboard`, { headers: { 'Authorization': `Bearer ${tokenAdmin2}` } })).json();
  console.log('Admin 2 total exams:', dashA2.dashboard.totalExams, 'Average:', dashA2.dashboard.averageScorePercentage);

  console.log('\n--- 16. Student users are blocked ---');
  const blockS = await fetch(`${baseUrl}/admin/dashboard`, { headers: { 'Authorization': `Bearer ${tokenStudent}` } });
  console.log('Student status:', blockS.status);

  console.log('\n--- 17, 18, 19. Optional Exam Performance Endpoint ---');
  if (examIdA1) {
    const perfA1 = await (await fetch(`${baseUrl}/admin/exams/${examIdA1}/analytics`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } })).json();
    console.log('Admin 1 accessing their exam analytics:', JSON.stringify(perfA1.analytics, null, 2));
    
    const perfA2 = await fetch(`${baseUrl}/admin/exams/${examIdA1}/analytics`, { headers: { 'Authorization': `Bearer ${tokenAdmin2}` } });
    console.log('Admin 2 accessing Admin 1 exam analytics status:', perfA2.status);
  }
};

runTests().catch(console.error);
