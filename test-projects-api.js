/* eslint-disable no-console */
async function test() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantKey: 'ARAGROW-LLC',
        email: 'davidarago@aragrow.me',
        password: 'Password123!',
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (loginData.data?.accessToken) {
      const token = loginData.data.accessToken;

      // Test projects endpoint
      console.log('\n--- Testing /api/v1/projects endpoint ---');
      const projectsResponse = await fetch('http://localhost:3001/api/v1/projects?limit=1000', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const projectsData = await projectsResponse.json();
      console.log('Projects response status:', projectsResponse.status);
      console.log('Projects response:', JSON.stringify(projectsData, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
