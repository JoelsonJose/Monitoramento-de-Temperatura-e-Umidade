
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function getEncryptionKey(secret) {
  if (!secret || secret.length < 32) {
    throw new Error('OTP_ENCRYPTION_KEY deve possuir pelo menos 32 caracteres');
  }

  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptSecret(plainText, secret = process.env.OTP_ENCRYPTION_KEY) {
  if (typeof plainText !== 'string' || !plainText) {
    throw new TypeError('O conteúdo para criptografia deve ser um texto válido');
  }

  const key = getEncryptionKey(secret);
  const iv = randomBytes(12);

  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

export function decryptSecret(encryptedText, secret = process.env.OTP_ENCRYPTION_KEY) {
  if (typeof encryptedText !== 'string') {
    throw new TypeError('O conteúdo criptografado deve ser um texto válido');
  }

  const parts = encryptedText.split('.');

  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Formato de conteúdo criptografado inválido');
  }

  const [, ivText, authTagText, encryptedData] = parts;

  const key = getEncryptionKey(secret);
  const iv = Buffer.from(ivText, 'base64url');
  const authTag = Buffer.from(authTagText, 'base64url');
  const data = Buffer.from(encryptedData, 'base64url');

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error('Dados de criptografia inválidos');
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(data),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}
