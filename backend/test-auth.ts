async function testAuth() {
  try {
    const loginRes = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gestor@teste.com', password: '123' }),
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    console.log('Login success:', loginData);
    
    const token = loginData.token;
    
    const protectedRes = await fetch('http://localhost:3001/protected', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!protectedRes.ok) {
      console.error('Protected route failed:', await protectedRes.text());
      return;
    }
    
    const protectedData = await protectedRes.json();
    console.log('Protected route success:', protectedData);
  } catch (err) {
    console.error('Test error:', err);
  }
}

testAuth();