import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn('⚠️ ENCRYPTION_KEY manquante ou invalide (doit être 64 caractères hex)');
}

/**
 * Génère une clé de chiffrement aléatoire
 * À utiliser UNE SEULE FOIS pour générer ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Chiffre des données sensibles
 */
export function encrypt(text: string): string {
  if (!text) return '';

  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('❌ Erreur encryption:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Déchiffre des données
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Erreur decryption:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Hash unidirectionnel pour données sensibles (SIREN, etc.)
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
