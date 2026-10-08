/** Canonical place paths and query deep links open the same explorer. */
export function placeIdFromPath(pathname) {
  return String(pathname ?? '').match(/^\/(?:zh|en|fr)\/places\/([a-z0-9_-]{1,180})\.html$/i)?.[1] ?? null;
}
