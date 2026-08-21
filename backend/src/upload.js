import { put } from '@vercel/blob';
import sharp from 'sharp';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadImage(fileBuffer, originalName, folder = 'products') {
  if (!ALLOWED_TYPES.includes(fileBuffer.type || '')) {
    throw new Error('Format non supporté (JPG, PNG, WebP, GIF)');
  }
  if (fileBuffer.length > MAX_SIZE) {
    throw new Error('Fichier trop volumineux (max 5MB)');
  }

  const optimized = await sharp(fileBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const ext = '.jpg';
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const blob = await put(filename, optimized, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: 'image/jpeg',
  });

  return blob.url;
}