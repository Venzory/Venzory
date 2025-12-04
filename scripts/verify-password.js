const bcrypt = require('bcryptjs');

// This is the exact hash stored in the database
const storedHash = '$2b$10$RROuz7y27IVt8xoCwdOSzugQlE9r8VWsdmpXuzdD6mclbxhrJ/sIq';
const password = 'admin123';

async function verify() {
  console.log('Testing password verification...');
  console.log('Password:', password);
  console.log('Hash:', storedHash);
  
  const result = await bcrypt.compare(password, storedHash);
  console.log('Match:', result);
  
  if (!result) {
    console.log('\n--- Generating new hash ---');
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash:', newHash);
    const newVerify = await bcrypt.compare(password, newHash);
    console.log('New hash verification:', newVerify);
  }
}

verify();

