/**
 * Encodes literal spaces for HTTP(S) URLs (e.g. storage paths with filenames containing spaces).
 */
export function normalizeHttpUrlSpaces(raw: string): string {
  return raw.trim().replace(/ /g, '%20');
}
