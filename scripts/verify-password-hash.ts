import { compare } from 'bcryptjs';

/**
 * Simple CLI helper to verify a plaintext password against a bcrypt hash.
 *
 * Usage:
 *   npx tsx scripts/verify-password-hash.ts "<hash>" "<password>"
 */
async function main() {
  const [hash, password] = process.argv.slice(2);

  if (!hash || !password) {
    console.error('Usage: npx tsx scripts/verify-password-hash.ts "<hash>" "<password>"');
    process.exit(1);
  }

  const isValid = await compare(password, hash);

  console.log(
    JSON.stringify(
      {
        hash,
        passwordLength: password.length,
        isValid,
      },
      null,
      2,
    ),
  );

  process.exit(isValid ? 0 : 2);
}

main().catch((error) => {
  console.error('Failed to compare password hash:', error);
  process.exit(1);
});

