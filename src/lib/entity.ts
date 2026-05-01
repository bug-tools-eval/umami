import type { Board, Link, Pixel, Website } from '@/generated/prisma/client';
import { getBoard, getLink, getPixel, getWebsite } from '@/queries/prisma';

// Most callers pass a website ID (every authenticated dashboard request goes
// through canViewWebsite → getEntity). Try the website lookup first and only
// fall through to the other entity types when it misses; this turns the
// common case from 4 parallel SQL lookups into 1, while the uncommon
// non-website case still completes in ~2 round trips.
export async function getEntity(entityId: string): Promise<Website | Link | Pixel | Board | null> {
  const website = await getWebsite(entityId);
  if (website) return website;

  const [link, pixel, board] = await Promise.all([
    getLink(entityId),
    getPixel(entityId),
    getBoard(entityId),
  ]);

  return link || pixel || board;
}
