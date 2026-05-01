import { useMutation, useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { getClientAuthToken } from '@/lib/client';
import { SHARE_CONTEXT_HEADER, SHARE_TOKEN_HEADER } from '@/lib/constants';
import { type FetchResponse, httpDelete, httpGet, httpPost, httpPut } from '@/lib/fetch';
import { useApp } from '@/store/app';

const selector = (state: { shareToken: { token?: string } }) => state.shareToken;

async function handleResponse(res: FetchResponse): Promise<any> {
  if (!res.ok) {
    const { message, code, status } = res?.data?.error || {};

    return Promise.reject(Object.assign(new Error(message), { code, status }));
  }
  return Promise.resolve(res.data);
}

export function useApi() {
  const shareToken = useApp(selector);
  const pathname = usePathname();
  const isSharePath = pathname?.startsWith('/share');

  const shareHeaders = useMemo(
    () =>
      isSharePath && shareToken?.token
        ? { [SHARE_TOKEN_HEADER]: shareToken.token, [SHARE_CONTEXT_HEADER]: '1' }
        : {},
    [isSharePath, shareToken?.token],
  );

  const defaultHeaders = useMemo(
    () => ({
      authorization: `Bearer ${getClientAuthToken()}`,
      ...shareHeaders,
    }),
    [shareHeaders],
  );
  const basePath = process.env.basePath;

  const getUrl = useCallback(
    (url: string) => {
      return url.startsWith('http') ? url : `${basePath || ''}/api${url}`;
    },
    [basePath],
  );

  const getHeaders = useCallback(
    (headers: any = {}) => {
      return { ...defaultHeaders, ...headers };
    },
    [defaultHeaders],
  );

  return {
    get: useCallback(
      async (url: string, params: object = {}, headers: object = {}) => {
        return httpGet(getUrl(url), params, getHeaders(headers)).then(handleResponse);
      },
      [getHeaders, getUrl],
    ),

    post: useCallback(
      async (url: string, params: object = {}, headers: object = {}) => {
        return httpPost(getUrl(url), params, getHeaders(headers)).then(handleResponse);
      },
      [getHeaders, getUrl],
    ),

    put: useCallback(
      async (url: string, params: object = {}, headers: object = {}) => {
        return httpPut(getUrl(url), params, getHeaders(headers)).then(handleResponse);
      },
      [getHeaders, getUrl],
    ),

    del: useCallback(
      async (url: string, params: object = {}, headers: object = {}) => {
        return httpDelete(getUrl(url), params, getHeaders(headers)).then(handleResponse);
      },
      [getHeaders, getUrl],
    ),
    useQuery,
    useMutation,
  };
}
