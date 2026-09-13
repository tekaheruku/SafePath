/**
 * Resolves a report/rating photo_url into an absolute URL the browser can
 * load. Handles two cases:
 *  - New uploads store a relative path (e.g. "/uploads/xyz.jpg"); this is
 *    resolved against the configured API origin.
 *  - Older records may have an absolute URL baked in with a "localhost"
 *    host (from before the upload endpoint returned relative paths); that
 *    host is swapped for the real API origin so old photos still load.
 */
export function resolvePhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const apiOrigin = apiUrl.replace(/\/api\/v1\/?$/, '');

  if (photoUrl.startsWith('/')) {
    return `${apiOrigin}${photoUrl}`;
  }

  try {
    const parsed = new URL(photoUrl);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return `${apiOrigin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Not a valid absolute URL; fall through and return as-is.
  }

  return photoUrl;
}
