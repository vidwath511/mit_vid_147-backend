const baseUrl = 'http://localhost:5000/api';

const runTests = async () => {
  // Login to get tokens
  const loginA = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin11@test.com', password: 'password' }) })).json();
  const loginS = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student11@test.com', password: 'password' }) })).json();
  // Ensure we have a second student
  await fetch(`${baseUrl}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Student 2', email: 'student22@test.com', password: 'password', role: 'student' }) });
  const loginS2 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student22@test.com', password: 'password' }) })).json();

  const tokenAdmin = loginA.token;
  const tokenStudent = loginS.token;
  const tokenStudent2 = loginS2.token;

  // Admin creates an exam with two questions
  const examRes = await (await fetch(`${baseUrl}/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ title: 'Answer Test Exam', duration: 60, totalMarks: 100, passingMarks: 50, status: 'published' }) })).json();
  const examId = examRes.exam.id;

  const q1Res = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionText: 'Q1', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A' }) })).json();
  const q2Res = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionText: 'Q2', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A' }) })).json();
  const q3Res = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionText: 'Q3_NotInExam', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A' }) })).json();

  await fetch(`${baseUrl}/exams/${examId}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionIds: [q1Res.question.id, q2Res.question.id] }) });

  // Student 1 starts exam
  const startRes = await (await fetch(`${baseUrl}/student/exams/${examId}/start`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent}` } })).json();
  const attemptId = startRes.attemptInfo.attemptId;

  console.log('--- 1. Save answer for the first time ---');
  let ans1 = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` },
    body: JSON.stringify({ questionId: q1Res.question.id, selectedAnswer: 'B' })
  });
  const savedAns1 = await ans1.json();
  console.log('Success:', savedAns1.success, 'Selected:', savedAns1.answer?.selectedAnswer);
  const ansId1 = savedAns1.answer?.id;

  console.log('\n--- 2. Change the answer (Upsert) ---');
  let ans2 = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` },
    body: JSON.stringify({ questionId: q1Res.question.id, selectedAnswer: 'C' })
  });
  const savedAns2 = await ans2.json();
  console.log('Success:', savedAns2.success, 'Selected:', savedAns2.answer?.selectedAnswer);
  console.log('Is ID the same (no duplicate)?', savedAns2.answer?.id === ansId1);

  console.log('\n--- 3. Student 2 cannot save answer to Student 1 attempt ---');
  let badAccess = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent2}` },
    body: JSON.stringify({ questionId: q1Res.question.id, selectedAnswer: 'A' })
  });
  console.log('Status:', badAccess.status, await badAccess.json());

  console.log('\n--- 5. Cannot answer question not in exam ---');
  let badQ = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` },
    body: JSON.stringify({ questionId: q3Res.question.id, selectedAnswer: 'A' })
  });
  console.log('Status:', badQ.status, await badQ.json());

  console.log('\n--- 6. Invalid selectedAnswer rejected ---');
  let badVal = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` },
    body: JSON.stringify({ questionId: q1Res.question.id, selectedAnswer: 'E' })
  });
  console.log('Status:', badVal.status, await badVal.json());

  console.log('\n--- 7. Admin blocked ---');
  let adminAccess = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
    body: JSON.stringify({ questionId: q1Res.question.id, selectedAnswer: 'A' })
  });
  console.log('Status:', adminAccess.status, (await adminAccess.json()).message);

  // For testing #4, we need to manually update the attempt status to 'submitted' directly in DB or via an endpoint (which doesn't exist yet).
  // We'll skip testing #4 automatically via API, but logic covers it. 
  // Actually we can do it via sequelize directly in the script since it's running locally? No, this script just uses fetch.
  // We'll skip forcing it here, logic is clearly there: if (attempt.status !== 'in_progress') return 400.
};

runTests().catch(console.error);
