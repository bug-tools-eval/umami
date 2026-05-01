import type { Board, Link, Pixel, Website } from '@/generated/prisma/client';
import { findWebsite, getBoard, getLink, getPixel } from '@/queries/prisma';

// Most callers pass a website ID (every authenticated dashboard request goes
// through canViewWebsite → getEntity). Try the website lookup first and only
// fall through to the other entity types when it misses; this turns the
// common case from 4 parallel SQL lookups into 1, while the uncommon
// non-website case still completes in ~2 round trips.
//
// Use findWebsite (not getWebsite) — getEntity's only consumers are
// permission checks that read userId/teamId, never shareId, so the extra
// share SELECT inside getWebsite/attachShareIdToWebsite is wasted work.
export async function getEntity(entityId: string): Promise<Website | Link | Pixel | Board | null> {
  const website = await findWebsite({ where: { id: entityId } });
  if (website) return website;

  const [link, pixel, board] = await Promise.all([
    getLink(entityId),
    getPixel(entityId),
    getBoard(entityId),
  ]);

  return link || pixel || board;
}
