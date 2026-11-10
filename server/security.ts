import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(derive);
export const randomToken = () => randomBytes(32).toString('hex');
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomToken(); const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function checkPassword(password: string, stored: string | null) {
  const [algorithm, salt, hash] = (stored ?? '').split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const actual = await scrypt(password, salt, 64) as Buffer; const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function tokenVault(key: string) {
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Set TOKEN_ENCRYPTION_KEY to 64 random hexadecimal characters on the server.');
  const secret = Buffer.from(key, 'hex');
  return {
    encrypt(value: string) {
      const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', secret, iv);
      return Buffer.concat([iv, cipher.update(value), cipher.final(), cipher.getAuthTag()]).toString('base64');
    },
    decrypt(value: string) {
      const data = Buffer.from(value, 'base64'); const decipher = createDecipheriv('aes-256-gcm', secret, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(-16));
      return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString();
    },
  };
}
