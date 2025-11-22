import { execSync } from 'child_process';

const CONTAINER_NAME = 'venzory-postgres';
const DB_USER = 'venzory';
const DATABASES = ['venzory_dev', 'venzory_test'];

function runCommand(command: string): string {
  try {
    // stdio: pipe to capture output, ignore stderr to avoid noise on checks
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    return '';
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupLocalDb() {
  console.log('🔄 Checking local Postgres setup...');

  // 1. Check if container is running
  const isRunning = runCommand(`docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`) === CONTAINER_NAME;

  if (!isRunning) {
    console.log(`⚠️  Container '${CONTAINER_NAME}' is not running.`);
    console.log('🚀 Starting container...');
    try {
      execSync('docker compose up -d postgres', { stdio: 'inherit' });
      console.log('⏳ Waiting for Postgres to be ready...');
      await sleep(5000); // Give it a moment to start
    } catch (error) {
      console.error('❌ Failed to start docker container. Make sure Docker is running.');
      process.exit(1);
    }
  } else {
    console.log(`✅ Container '${CONTAINER_NAME}' is running.`);
  }

  // Wait until postgres is accepting connections
  let ready = false;
  for (let i = 0; i < 10; i++) {
    const checkReady = runCommand(`docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER}`);
    if (checkReady.includes('accepting connections')) {
      ready = true;
      break;
    }
    console.log('...waiting for database to be ready...');
    await sleep(2000);
  }

  if (!ready) {
    console.error('❌ Postgres is not ready after waiting. Please check docker logs.');
    process.exit(1);
  }

  // 2. Create databases
  for (const dbName of DATABASES) {
    // Check if DB exists
    const checkDbCmd = `docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d venzory -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`;
    const exists = runCommand(checkDbCmd) === '1';

    if (exists) {
      console.log(`✅ Database '${dbName}' already exists.`);
    } else {
      console.log(`✨ Creating database '${dbName}'...`);
      try {
        execSync(`docker exec ${CONTAINER_NAME} createdb -U ${DB_USER} ${dbName}`);
        console.log(`✅ Created database '${dbName}'.`);
      } catch (error) {
        console.error(`❌ Failed to create database '${dbName}'.`);
      }
    }
  }

  console.log('\n🎉 Local database setup complete!');
  console.log('   Connection Strings:');
  DATABASES.forEach(db => {
    console.log(`   - ${db}: postgresql://${DB_USER}:${DB_USER}@localhost:5432/${db}`);
  });
}

setupLocalDb();

