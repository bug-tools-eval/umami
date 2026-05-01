import ipaddr from 'ipaddr.js';

const FORWARDED_FOR_RE = /for=(\[?[0-9a-fA-F:.]+]?)/;

export const IP_ADDRESS_HEADERS = [
  ...(process.env.CLOUD_MODE ? ['x-umami-client-ip'] : []), // Umami custom header (cloud mode only)
  'true-client-ip', // CDN
  'cf-connecting-ip', // Cloudflare
  'fastly-client-ip', // Fastly
  'x-nf-client-connection-ip', // Netlify
  'do-connecting-ip', // Digital Ocean
  'x-real-ip', // Reverse proxy
  'x-appengine-user-ip', // Google App Engine
  'x-forwarded-for',
  'forwarded',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-forwarded',
];

/**
 * Normalize IP strings to a canonical form:
 * - strips IPv4-mapped IPv6 (e.g. ::ffff:192.0.2.1 -> 192.0.2.1)
 * - keeps valid IPv4/IPv6 as-is (canonically formatted by ipaddr.js)
 */
function normalizeIp(ip?: string | null) {
  if (!ip) return ip;

  try {
    const parsed = ipaddr.parse(ip);

    if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
      return (parsed as ipaddr.IPv6).toIPv4Address().toString();
    }

    return parsed.toString();
  } catch {
    // Fallback: return original if parsing fails
    return ip;
  }
}

function resolveIp(ip?: string | null) {
  if (!ip) return ip;

  // First, try as-is
  const normalized = normalizeIp(ip);
  try {
    ipaddr.parse(normalized);
    return normalized;
  } catch {
    // try stripping port (handles IPv4:port; leaves IPv6 intact)
    const stripped = stripPort(ip);
    if (stripped !== ip) {
      const normalizedStripped = normalizeIp(stripped);
      try {
        ipaddr.parse(normalizedStripped);
        return normalizedStripped;
      } catch {
        return normalizedStripped;
      }
    }

    return normalized;
  }
}

export function getIpAddress(headers: Headers) {
  const customHeader = process.env.CLIENT_IP_HEADER;

  if (customHeader) {
    const value = headers.get(customHeader);
    if (value) return resolveIp(value);
  }

  for (const name of IP_ADDRESS_HEADERS) {
    const ip = headers.get(name);
    if (!ip) continue;

    if (name === 'x-forwarded-for') {
      return resolveIp(ip.split(',')[0]?.trim());
    }

    if (name === 'forwarded') {
      const match = ip.match(FORWARDED_FOR_RE);
      if (match) return resolveIp(match[1]);
      continue;
    }

    return resolveIp(ip);
  }

  return undefined;
}

export function stripPort(ip?: string | null) {
  if (!ip) {
    return ip;
  }

  if (ip.startsWith('[')) {
    const endBracket = ip.indexOf(']');
    if (endBracket !== -1) {
      return ip.slice(0, endBracket + 1);
    }
  }

  const idx = ip.lastIndexOf(':');
  if (idx !== -1) {
    if (ip.includes('.') || /^[a-zA-Z0-9.-]+$/.test(ip.slice(0, idx))) {
      return ip.slice(0, idx);
    }
  }

  return ip;
}
