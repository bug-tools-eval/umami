import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { buildPath } from '@/lib/url';

const PATH_ID_PATTERNS = {
  teams: /\/teams\/([a-f0-9-]+)/,
  websites: /\/websites\/([a-f0-9-]+)/,
  links: /\/links\/([a-f0-9-]+)/,
  pixels: /\/pixels\/([a-f0-9-]+)/,
  boards: /\/boards\/([a-f0-9-]+)/,
};

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { teamId, websiteId, linkId, pixelId, boardId } = useMemo(
    () => ({
      teamId: getPathId(pathname, 'teams'),
      websiteId: getPathId(pathname, 'websites'),
      linkId: getPathId(pathname, 'links'),
      pixelId: getPathId(pathname, 'pixels'),
      boardId: getPathId(pathname, 'boards'),
    }),
    [pathname],
  );
  const queryParams = useMemo(() => Object.fromEntries(searchParams), [search]);

  const updateParams = useCallback(
    (params?: Record<string, string | number>) => {
      return buildPath(pathname, { ...queryParams, ...params });
    },
    [pathname, queryParams],
  );

  const replaceParams = useCallback(
    (params?: Record<string, string | number>) => {
      return buildPath(pathname, params);
    },
    [pathname],
  );

  const renderUrl = useCallback(
    (path: string, params?: Record<string, string | number> | false) => {
      return buildPath(
        teamId ? `/teams/${teamId}${path}` : path,
        params === false ? {} : { ...queryParams, ...params },
      );
    },
    [teamId, queryParams],
  );

  return {
    router,
    pathname,
    searchParams,
    query: queryParams,
    teamId,
    websiteId,
    linkId,
    pixelId,
    boardId,
    updateParams,
    replaceParams,
    renderUrl,
  };
}

function getPathId(pathname: string, segment: keyof typeof PATH_ID_PATTERNS) {
  const [, id] = pathname.match(PATH_ID_PATTERNS[segment]) || [];

  return id;
}
