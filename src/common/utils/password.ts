import { compare, hash } from 'bcryptjs';

const SALT_ROUNDS = 10;

export function hashPassword(plainTextPassword: string) {
  return hash(plainTextPassword, SALT_ROUNDS);
}

export function comparePassword(plainTextPassword: string, passwordHash: string) {
  return compare(plainTextPassword, passwordHash);
}
