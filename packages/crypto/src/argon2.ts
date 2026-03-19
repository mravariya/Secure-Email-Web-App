import * as argon2 from 'argon2';

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  hashLength: 32,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { ...OPTIONS });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function hashToken(token: string): Promise<string> {
  return argon2.hash(token, { ...OPTIONS });
}
