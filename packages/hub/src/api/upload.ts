import { resolve, extname } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import type { MultipartFile } from '@fastify/multipart';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Saves an uploaded file to disk.
 * @param file - Multipart file from @fastify/multipart
 * @param subdir - Subdirectory within uploads/ (e.g. 'teams', 'games')
 * @param id - Base filename (without extension)
 * @param uploadsDir - Absolute path to uploads directory
 * @returns Relative URL path (e.g. '/uploads/teams/nyy.png')
 */
export async function saveUpload(
  file: MultipartFile,
  subdir: string,
  id: string,
  uploadsDir?: string,
): Promise<string> {
  if (!uploadsDir) {
    throw new Error('uploadsDir not configured');
  }

  const ext = extname(file.filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Invalid file type '${ext}'. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`);
  }

  const buffer = await file.toBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    throw new Error(`File too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max: 2MB`);
  }

  const dir = resolve(uploadsDir, subdir);
  mkdirSync(dir, { recursive: true });

  const filename = `${id}${ext}`;
  writeFileSync(resolve(dir, filename), buffer);

  return `/uploads/${subdir}/${filename}`;
}
