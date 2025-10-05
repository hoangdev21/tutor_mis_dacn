const fetch = require('node-fetch');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGUwZDVlZTliMmMyMzU0MDZhNTA5ZmYiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTk1MDcxMjYsImV4cCI6MTc2MjA5OTEyNn0.8n9oPAG-aM3GHfGk9dDsE5yBP4Gsl7_4YCY-Qj6PgXk';

async function testAPI() {
  try {
    console.log('🧪 Testing GET /api/admin/courses...\n');
    
    const response = await fetch('http://localhost:5000/api/admin/courses?page=1&limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    console.log('✅ Status:', response.status);
    console.log('\n📦 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data?.courses?.[0]) {
      const course = data.data.courses[0];
      console.log('\n🔍 First Course Details:');
      console.log('- ID:', course._id);
      console.log('- Title:', course.title);
      console.log('- Source:', course._source);
      console.log('- Hourly Rate:', course.hourlyRate);
      console.log('\n👨‍🏫 Tutor Info:');
      console.log('- Tutor ID:', course.tutorId?._id);
      console.log('- Tutor Email:', course.tutorId?.email);
      console.log('- Tutor Profile:', course.tutorId?.profile ? 'EXISTS' : 'MISSING');
      if (course.tutorId?.profile) {
        console.log('  - Name:', course.tutorId.profile.fullName);
        console.log('  - Hourly Rate:', course.tutorId.profile.hourlyRate);
        console.log('  - Subjects:', course.tutorId.profile.subjects?.length || 0);
      }
      console.log('\n👨‍🎓 Student Info:');
      console.log('- Student ID:', course.studentId?._id);
      console.log('- Student Email:', course.studentId?.email);
      console.log('- Student Profile:', course.studentId?.profile ? 'EXISTS' : 'MISSING');
      if (course.studentId?.profile) {
        console.log('  - Name:', course.studentId.profile.fullName);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
