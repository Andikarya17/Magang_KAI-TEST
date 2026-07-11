async function testLogin() {
  try {
    const res = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nipp: 'ADMIN-001',
        password: 'admin123'
      })
    });
    const data = await res.json();
    console.log("Login result:", data);
  } catch (error) {
    console.error("Login error:", error);
  }
}

testLogin();
