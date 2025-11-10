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
        email: 'admin@freetimechat.local',
        password: 'Admin123!',
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Login successful');

    if (loginData.data?.accessToken) {
      const token = loginData.data.accessToken;

      // Test admin projects endpoint
      console.log('\n--- Testing /api/v1/admin/projects endpoint ---');
      const projectsResponse = await fetch('http://localhost:3001/api/v1/admin/projects?take=5', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const projectsData = await projectsResponse.json();
      console.log('Projects response status:', projectsResponse.status);

      if (!projectsResponse.ok) {
        console.log('Error response:', JSON.stringify(projectsData, null, 2));
        return;
      }

      if (projectsData.data?.projects && projectsData.data.projects.length > 0) {
        const project = projectsData.data.projects[0];
        console.log('\nFirst project sample:');
        console.log('- ID:', project.id);
        console.log('- Name:', project.name);
        console.log('- totalHours field:', project.totalHours);
        console.log('- allocatedHours field:', project.allocatedHours);
        console.log('- _count:', JSON.stringify(project._count));
        console.log('\nFull project object keys:', Object.keys(project));
      } else {
        console.log('No projects found');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
