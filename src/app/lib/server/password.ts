import "server-only";

import { randomBytes, randomInt, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { PASSWORD_MIN_LENGTH } from "../password-policy.ts";

export { isPasswordLengthValid, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../password-policy.ts";

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const HASH_PREFIX = "$scrypt$N=32768,r=8,p=1$";
const DUMMY_SALT = Buffer.from("azubi-lab-auth-dummy", "utf8");
const DUMMY_DIGEST = Buffer.alloc(KEY_LENGTH);
const TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%+-=";

export function generateTemporaryPassword(length = 20) {
  if (!Number.isSafeInteger(length) || length < PASSWORD_MIN_LENGTH || length > 64) {
    throw new RangeError("Temporary password length is outside the supported range.");
  }
  return Array.from({ length }, () => TEMPORARY_PASSWORD_ALPHABET[randomInt(TEMPORARY_PASSWORD_ALPHABET.length)]).join("");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const digest = await derive(password, salt);
  return `${HASH_PREFIX}${salt.toString("base64")}$${digest.toString("base64")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const parsed = parseHash(encodedHash);
  if (!parsed) {
    await consumePasswordVerification(password);
    return false;
  }
  const actual = await derive(password, parsed.salt);
  return actual.length === parsed.digest.length && timingSafeEqual(actual, parsed.digest);
}

export async function consumePasswordVerification(password: string) {
  const actual = await derive(password, DUMMY_SALT);
  timingSafeEqual(actual, DUMMY_DIGEST);
}

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

function parseHash(encodedHash: string) {
  if (!encodedHash.startsWith(HASH_PREFIX)) return undefined;
  const [saltValue, digestValue, extra] = encodedHash.slice(HASH_PREFIX.length).split("$");
  if (!saltValue || !digestValue || extra !== undefined) return undefined;
  try {
    const salt = Buffer.from(saltValue, "base64");
    const digest = Buffer.from(digestValue, "base64");
    if (salt.length !== 16 || digest.length !== KEY_LENGTH) return undefined;
    return { salt, digest };
  } catch {
    return undefined;
  }
}
