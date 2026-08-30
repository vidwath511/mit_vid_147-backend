const baseUrl = 'http://localhost:5000/api';

const runTests = async () => {
  // Login to get tokens
  const loginA = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin11@test.com', password: 'password' }) })).json();
  const loginS = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student11@test.com', password: 'password' }) })).json();

  const tokenAdmin = loginA.token;
  const tokenStudent = loginS.token;

  // Admin creates two exams: one published, one draft
  const exam1 = await (await fetch(`${baseUrl}/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ title: 'Available Exam', duration: 60, totalMarks: 100, passingMarks: 50, status: 'published' }) })).json();
  const exam2 = await (await fetch(`${baseUrl}/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ title: 'Draft Exam', duration: 60, totalMarks: 100, passingMarks: 50, status: 'draft' }) })).json();
  
  const publishedExamId = exam1.exam.id;
  const draftExamId = exam2.exam.id;

  // Add a question to the published exam
  const qRes = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionText: 'Q1', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A' }) })).json();
  await fetch(`${baseUrl}/exams/${publishedExamId}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` }, body: JSON.stringify({ questionIds: [qRes.question.id] }) });

  console.log('--- 1. Student can get available exams ---');
  let getAvail = await (await fetch(`${baseUrl}/student/exams`, { headers: { 'Authorization': `Bearer ${tokenStudent}` } })).json();
  console.log('Available exams count:', getAvail.exams.length, 'Titles:', getAvail.exams.map(e => e.title));

  console.log('\n--- 2. Student cannot see inactive exams ---');
  console.log('Includes draft exam?', getAvail.exams.some(e => e.id === draftExamId));

  console.log('\n--- 3. Admin is blocked from student exam routes ---');
  let adminAccess = await fetch(`${baseUrl}/student/exams`, { headers: { 'Authorization': `Bearer ${tokenAdmin}` } });
  console.log('Admin access status:', adminAccess.status);

  console.log('\n--- 4. Student can view a single available exam ---');
  let getSingle = await (await fetch(`${baseUrl}/student/exams/${publishedExamId}`, { headers: { 'Authorization': `Bearer ${tokenStudent}` } })).json();
  console.log('Success:', getSingle.success, 'Exam ID:', getSingle.exam.id);

  console.log('\n--- 9. Student cannot start an unavailable exam ---');
  let startDraft = await fetch(`${baseUrl}/student/exams/${draftExamId}/start`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent}` } });
  console.log('Start draft status:', startDraft.status, await startDraft.json());

  console.log('\n--- 5, 6, 7. Student starts an available exam ---');
  let startExam = await fetch(`${baseUrl}/student/exams/${publishedExamId}/start`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent}` } });
  const startData = await startExam.json();
  console.log('Start success:', startData.success, 'Attempt ID:', startData.attemptInfo.attemptId, 'Status:', startData.attemptInfo.status);

  console.log('\n--- 10. Response data does not expose correctAnswer ---');
  console.log('Question fields returned:', Object.keys(startData.questions[0]));
  console.log('Contains correctAnswer?', 'correctAnswer' in startData.questions[0]);

  console.log('\n--- 8. Starting the same exam again does not create a duplicate active attempt ---');
  let startAgain = await fetch(`${baseUrl}/student/exams/${publishedExamId}/start`, { method: 'POST', headers: { 'Authorization': `Bearer ${tokenStudent}` } });
  const againData = await startAgain.json();
  console.log('Start again attempt ID matches?', againData.attemptInfo.attemptId === startData.attemptInfo.attemptId);
  console.log('Message:', againData.message);
};

runTests().catch(console.error);
