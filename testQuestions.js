const baseUrl = 'http://localhost:5000/api';

const runTests = async () => {
  // 1. Create two admins and one student to get tokens
  const admin1Res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin 1', email: 'admin11@test.com', password: 'password', role: 'admin' })
  });
  const admin2Res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin 2', email: 'admin22@test.com', password: 'password', role: 'admin' })
  });
  const studentRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Student 1', email: 'student11@test.com', password: 'password', role: 'student' })
  });

  const login1 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin11@test.com', password: 'password' }) })).json();
  const login2 = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin22@test.com', password: 'password' }) })).json();
  const loginS = await (await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'student11@test.com', password: 'password' }) })).json();

  const tokenAdmin1 = login1.token;
  const tokenAdmin2 = login2.token;
  const tokenStudent = loginS.token;

  // 1. Test creating a question using an admin JWT
  console.log('--- 1. Create Question (Admin 1) ---');
  let createRes = await fetch(`${baseUrl}/questions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` },
    body: JSON.stringify({
      questionText: 'What is 2+2?',
      optionA: '3', optionB: '4', optionC: '5', optionD: '6',
      correctAnswer: 'B', marks: 2
    })
  });
  const createdData = await createRes.json();
  console.log(createdData);
  const qId = createdData.question.id;

  // 2. Test getting questions
  console.log('--- 2. Get Questions (Admin 1) ---');
  let getRes = await fetch(`${baseUrl}/questions`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin1}` }
  });
  console.log(await getRes.json());

  // 3. Test getting a single question
  console.log('--- 3. Get Single Question (Admin 1) ---');
  let getSingle = await fetch(`${baseUrl}/questions/${qId}`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin1}` }
  });
  console.log(await getSingle.json());

  // 4. Test updating a question
  console.log('--- 4. Update Question (Admin 1) ---');
  let updateRes = await fetch(`${baseUrl}/questions/${qId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin1}` },
    body: JSON.stringify({ marks: 5 })
  });
  console.log(await updateRes.json());

  // 6. Test that a student receives 403 Forbidden
  console.log('--- 6. Student Access (Forbidden) ---');
  let studentAccess = await fetch(`${baseUrl}/questions`, {
    headers: { 'Authorization': `Bearer ${tokenStudent}` }
  });
  console.log('Status:', studentAccess.status, await studentAccess.json());

  // 7. Test that one admin cannot access another admin's question
  console.log('--- 7. Admin 2 Access Admin 1 Question (Not Found) ---');
  let admin2Access = await fetch(`${baseUrl}/questions/${qId}`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin2}` }
  });
  console.log('Status:', admin2Access.status, await admin2Access.json());

  // 5. Test deleting a question
  console.log('--- 5. Delete Question (Admin 1) ---');
  let deleteRes = await fetch(`${baseUrl}/questions/${qId}`, {
    method: 'DELETE', headers: { 'Authorization': `Bearer ${tokenAdmin1}` }
  });
  console.log(await deleteRes.json());
};

runTests();
