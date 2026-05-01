import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { buildPath } from '@/lib/url';

const TEAM_ID_RE = /\/teams\/([a-f0-9-]+)/;
const WEBSITE_ID_RE = /\/websites\/([a-f0-9-]+)/;
const LINK_ID_RE = /\/links\/([a-f0-9-]+)/;
const PIXEL_ID_RE = /\/pixels\/([a-f0-9-]+)/;
const BOARD_ID_RE = /\/boards\/([a-f0-9-]+)/;

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, teamId] = pathname.match(TEAM_ID_RE) || [];
  const [, websiteId] = pathname.match(WEBSITE_ID_RE) || [];
  const [, linkId] = pathname.match(LINK_ID_RE) || [];
  const [, pixelId] = pathname.match(PIXEL_ID_RE) || [];
  const [, boardId] = pathname.match(BOARD_ID_RE) || [];
  const [queryParams, setQueryParams] = useState(Object.fromEntries(searchParams));

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

  useEffect(() => {
    setQueryParams(Object.fromEntries(searchParams));
  }, [searchParams.toString()]);

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
