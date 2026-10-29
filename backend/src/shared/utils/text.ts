export function truncate(text: string, maxLength: number): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  return singleLine.length <= maxLength ? singleLine : `${singleLine.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Picks `count` items spread evenly across `items` (keeps order). */
export function sampleEvenly<T>(items: readonly T[], count: number): T[] {
  if (count <= 0) return [];
  if (items.length <= count) return [...items];
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)] as T);
}

/**
 * Multer decodes multipart filenames as latin1, which garbles UTF-8 names such as
 * "Bài giảng.pdf". This restores them when the string is clearly mis-decoded latin1.
 */
export function normalizeUploadedFilename(rawName: string): string {
  let name = rawName;
  const looksLikeLatin1 = [...rawName].every((char) => char.charCodeAt(0) <= 0xff);
  if (looksLikeLatin1) {
    const decoded = Buffer.from(rawName, 'latin1').toString('utf8');
    if (!decoded.includes('\uFFFD')) name = decoded;
  }

  const baseName = name.replace(/\\/g, '/').split('/').pop()?.trim() ?? '';
  const safe = baseName.slice(-255);
  return safe.length > 0 ? safe : 'document.pdf';
}
