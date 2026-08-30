const baseUrl = 'http://localhost:5000/api';

const runTests = async () => {
  // Login to get tokens
  const login1 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin11@test.com', password: 'password' }) })).json();
  const login2 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin22@test.com', password: 'password' }) })).json();
  const loginS = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student11@test.com', password: 'password' }) })).json();

  const tokenAdmin1 = login1.token;
  const tokenAdmin2 = login2.token;
  const tokenStudent = loginS.token;

  // Create some questions first for Admin 1 and Admin 2
  const q1Res = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` }, body: JSON.stringify({ questionText: 'Q1', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A' }) })).json();
  const q2Res = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` }, body: JSON.stringify({ questionText: 'Q2', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A' }) })).json();
  const q3Res = await (await fetch(`${baseUrl}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin2}` }, body: JSON.stringify({ questionText: 'Q3', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctAnswer: 'A' }) })).json();

  const q1Id = q1Res.question.id;
  const q2Id = q2Res.question.id;
  const q3Id = q3Res.question.id; // Belongs to admin 2

  console.log('--- 1. Admin creates an exam ---');
  let createRes = await fetch(`${baseUrl}/exams`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` },
    body: JSON.stringify({ title: 'Math Exam', description: 'Test', duration: 60, totalMarks: 100, passingMarks: 50 })
  });
  const createdData = await createRes.json();
  console.log(createdData);
  const examId = createdData.exam.id;

  console.log('\n--- 2. Admin gets their exams ---');
  let getRes = await fetch(`${baseUrl}/exams`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } });
  console.log(await getRes.json());

  console.log('\n--- 3. Admin gets a single exam ---');
  let getSingle = await fetch(`${baseUrl}/exams/${examId}`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } });
  console.log(await getSingle.json());

  console.log('\n--- 4. Admin updates their exam ---');
  let updateRes = await fetch(`${baseUrl}/exams/${examId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` },
    body: JSON.stringify({ duration: 90 })
  });
  console.log(await updateRes.json());

  console.log('\n--- 5. Admin cannot access another admin\'s exam ---');
  let admin2Access = await fetch(`${baseUrl}/exams/${examId}`, { headers: { 'Authorization': `Bearer ${tokenAdmin2}` } });
  console.log('Status:', admin2Access.status, await admin2Access.json());

  console.log('\n--- 6. Admin adds their own questions to an exam ---');
  let addQ = await fetch(`${baseUrl}/exams/${examId}/questions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` },
    body: JSON.stringify({ questionIds: [q1Id, q2Id] })
  });
  console.log(await addQ.json());

  console.log('\n--- 7. Duplicate question cannot be added to the same exam ---');
  let dupAddQ = await fetch(`${baseUrl}/exams/${examId}/questions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` },
    body: JSON.stringify({ questionIds: [q1Id] })
  });
  console.log('Status:', dupAddQ.status, await dupAddQ.json());

  console.log('\n--- 8. Another admin\'s question cannot be added ---');
  let diffAdminQ = await fetch(`${baseUrl}/exams/${examId}/questions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` },
    body: JSON.stringify({ questionIds: [q3Id] }) // Admin 1 trying to add Admin 2's question
  });
  console.log('Status:', diffAdminQ.status, await diffAdminQ.json());

  console.log('\n--- 9. Get exam with its questions ---');
  let getWithQ = await fetch(`${baseUrl}/exams/${examId}/questions`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } });
  const examWithQ = await getWithQ.json();
  console.log(examWithQ);
  console.log('Questions linked:', examWithQ.exam.Questions.map(q => q.id));

  console.log('\n--- 10. Remove a question from an exam ---');
  let rmQ = await fetch(`${baseUrl}/exams/${examId}/questions/${q2Id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${tokenAdmin1}` } });
  console.log(await rmQ.json());
  
  // Verify it's still in the Question Bank
  let verifyQ = await fetch(`${baseUrl}/questions/${q2Id}`, { headers: { 'Authorization': `Bearer ${tokenAdmin1}` } });
  console.log('Is question still in DB?', (await verifyQ.json()).success);

  console.log('\n--- 11. Delete an exam ---');
  let delExam = await fetch(`${baseUrl}/exams/${examId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${tokenAdmin1}` } });
  console.log(await delExam.json());

  console.log('\n--- 12. Student is blocked from exam management routes ---');
  let studentAccess = await fetch(`${baseUrl}/exams`, { headers: { 'Authorization': `Bearer ${tokenStudent}` } });
  console.log('Status:', studentAccess.status, await studentAccess.json());
};

runTests().catch(console.error);
