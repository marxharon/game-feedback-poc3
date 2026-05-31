async function testPersonaAPI() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gestor@teste.com', password: '123' }),
    });
    
    if (!loginRes.ok) throw new Error('Login failed');
    const { token } = await loginRes.json();
    
    // 2. Create Persona
    const createRes = await fetch('http://localhost:3001/personas', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        name: 'Carlos Dev', 
        role: 'Desenvolvedor Junior', 
        baseText: 'Tem bom conhecimento técnico mas precisa melhorar comunicação.' 
      }),
    });
    
    if (!createRes.ok) throw new Error('Create failed');
    const createdData = await createRes.json();
    console.log('Created:', createdData);

    // 3. Get Personas
    const getRes = await fetch('http://localhost:3001/personas', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!getRes.ok) throw new Error('Get failed');
    const getData = await getRes.json();
    console.log('Fetched:', JSON.stringify(getData, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  }
}

testPersonaAPI();