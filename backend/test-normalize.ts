async function testNormalize() {
  try {
    const loginRes = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gestor@teste.com', password: '123' }),
    });
    
    if (!loginRes.ok) throw new Error('Login failed');
    const { token } = await loginRes.json();
    
    const createRes = await fetch('http://localhost:3001/personas', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        name: 'Maria QA', 
        role: 'Analista de Testes', 
        baseText: 'Encontra muitos bugs mas não descreve direito nos tickets. As vezes é um pouco grossa com os devs.' 
      }),
    });
    
    if (!createRes.ok) throw new Error('Create failed');
    const createdData = await createRes.json();
    console.log('Created:', JSON.stringify(createdData, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  }
}

testNormalize();