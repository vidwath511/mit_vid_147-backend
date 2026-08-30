const baseUrl = 'http://localhost:5000/api';

const runTests = async () => {
  // Login
  const loginA = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin11@test.com', password: 'password' }) })).json();
  const loginS1 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student11@test.com', password: 'password' }) })).json();
  const loginS2 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student22@test.com', password: 'password' }) })).json();
  // Student 3 with no exams
  await fetch(`${baseUrl}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Student 3', email: 'student33@test.com', password: 'password', role: 'student' }) });
  const loginS3 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student33@test.com', password: 'password' }) })).json();

  const tokenAdmin = loginA.token;
  const tokenStudent1 = loginS1.token;
  const tokenStudent2 = loginS2.token;
  const tokenStudent3 = loginS3.token;

  // Let's check Student 1's results (They should have 1 from the previous submit test)
  console.log('\n--- 1. Student can get their own results ---');
  const resultsRes = await fetch(`${baseUrl}/student/results`, { headers: { 'Authorization': `Bearer ${tokenStudent1}` } });
  const resultsData = await resultsRes.json();
  console.log('Results count:', resultsData.results.length);
  const firstResultAttemptId = resultsData.results[0].attemptId;

  console.log('\n--- 2. Student cannot get another student\'s result ---');
  const s2Access = await fetch(`${baseUrl}/student/results/${firstResultAttemptId}`, { headers: { 'Authorization': `Bearer ${tokenStudent2}` } });
  console.log('Status S2 accessing S1:', s2Access.status);

  console.log('\n--- 9. Student with no exams gets zeros ---');
  const s3Dash = await (await fetch(`${baseUrl}/student/dashboard`, { headers: { 'Authorization': `Bearer ${tokenStudent3}` } })).json();
  console.log('Dashboard total:', s3Dash.dashboard.totalExamsTaken, 'Avg:', s3Dash.dashboard.averageScorePercentage);

  console.log('\n--- 10. Admin blocked ---');
  const adminAccess = await fetch(`${baseUrl}/student/dashboard`, { headers: { 'Authorization': `Bearer ${tokenAdmin}` } });
  console.log('Admin Status:', adminAccess.status);

  // Let's create another exam, start it, but don't submit it to test #4
  const examRes = await (await fetch(`${baseUrl}/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ title: 'In Progress Exam', duration: 60, totalMarks: 10, passingMarks: 5, status: 'published' }) })).json();
  await fetch(`${baseUrl}/student/exams/${examRes.exam.id}/start`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent1}` } });

  console.log('\n--- 3, 4, 5, 6, 7, 8. Student dashboard statistics ---');
  const s1Dash = await (await fetch(`${baseUrl}/student/dashboard`, { headers: { 'Authorization': `Bearer ${tokenStudent1}` } })).json();
  console.log('Dashboard Data:', JSON.stringify(s1Dash.dashboard, null, 2));

};

runTests().catch(console.error);
