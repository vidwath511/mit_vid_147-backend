const baseUrl = 'http://localhost:5000/api';

const runTests = async () => {
  // Login
  const loginA = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin11@test.com', password: 'password' }) })).json();
  const loginS = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student11@test.com', password: 'password' }) })).json();
  const loginS2 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student22@test.com', password: 'password' }) })).json();

  const tokenAdmin = loginA.token;
  const tokenStudent = loginS.token;
  const tokenStudent2 = loginS2.token;

  // Create Exam & Questions
  const examRes = await (await fetch(`${baseUrl}/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ title: 'Submit Test Exam', duration: 60, totalMarks: 10, passingMarks: 5, status: 'published' }) })).json();
  const examId = examRes.exam.id;

  const q1 = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionText: 'Q1', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A', marks: 4, negativeMarks: 1 }) })).json();
  const q2 = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionText: 'Q2', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'B', marks: 4, negativeMarks: 1 }) })).json();
  const q3 = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionText: 'Q3', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'C', marks: 2, negativeMarks: 0 }) })).json();

  await fetch(`${baseUrl}/exams/${examId}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionIds: [q1.question.id, q2.question.id, q3.question.id] }) });

  // Student 1 starts exam
  const startRes = await (await fetch(`${baseUrl}/student/exams/${examId}/start`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent}` } })).json();
  const attemptId = startRes.attemptInfo.attemptId;

  // Student answers: Q1 Correct (A), Q2 Wrong (C), Q3 Unanswered
  await fetch(`${baseUrl}/attempts/${attemptId}/answers`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` }, body: JSON.stringify({ questionId: q1.question.id, selectedAnswer: 'A' }) });
  await fetch(`${baseUrl}/attempts/${attemptId}/answers`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` }, body: JSON.stringify({ questionId: q2.question.id, selectedAnswer: 'C' }) });

  console.log('--- 8. Student 2 cannot submit Student 1 attempt ---');
  let badAccess = await fetch(`${baseUrl}/attempts/${attemptId}/submit`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent2}` } });
  console.log('Status:', badAccess.status);

  console.log('--- 10. Admin blocked from submit endpoint ---');
  let adminAccess = await fetch(`${baseUrl}/attempts/${attemptId}/submit`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenAdmin}` } });
  console.log('Status:', adminAccess.status);

  console.log('--- 1, 2, 3, 4, 5. Student submits exam and gets result ---');
  let submitRes = await fetch(`${baseUrl}/attempts/${attemptId}/submit`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent}` } });
  const submitData = await submitRes.json();
  console.log('Success:', submitData.success);
  console.log('Result Data:', submitData.result);

  console.log('--- 11. correctAnswer is not exposed ---');
  console.log('Contains correctAnswer?', 'correctAnswer' in submitData.result);

  console.log('--- 6, 7, 9. Student cannot submit the same attempt twice ---');
  let submitTwice = await fetch(`${baseUrl}/attempts/${attemptId}/submit`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent}` } });
  const twiceData = await submitTwice.json();
  console.log('Status:', submitTwice.status);
  console.log('Message:', twiceData.message);
};

runTests().catch(console.error);
