import { put } from '@vercel/blob';
import sharp from 'sharp';

const MAX_SIZE = 5 * 1024 * 1024;
const EXT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};
const ALLOWED_TYPES = Object.values(EXT_TYPES);

export async function uploadImage(fileBuffer, originalName = '', folder = 'products', mimeType = '') {
  const ext = (String(originalName).match(/\.[a-z0-9]+$/i)?.[0] || '').toLowerCase();
  const mime = String(mimeType || '').split(';')[0].trim().toLowerCase();
  const resolved = ALLOWED_TYPES.includes(mime) ? mime : EXT_TYPES[ext];
  if (!resolved) {
    throw new Error('Format non supporté (JPG, PNG, WebP, GIF)');
  }
  if (fileBuffer.length > MAX_SIZE) {
    throw new Error('Fichier trop volumineux (max 5MB)');
  }

  const optimized = await sharp(fileBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const blob = await put(filename, optimized, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: 'image/jpeg',
  });

  return blob.url;
}
