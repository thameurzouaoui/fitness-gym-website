import 'dotenv/config';
import { exec, queryOne } from '../src/db.js';
import { hashPassword } from '../src/auth.js';

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  
  const hash = await hashPassword(password);
  
  await exec(
    `INSERT INTO users (username, password, name)
     VALUES ($1, $2, 'Master Admin')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
    [username, hash]
  );
  
  console.log(`✅ Admin user created/updated: ${username} / ${password}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});