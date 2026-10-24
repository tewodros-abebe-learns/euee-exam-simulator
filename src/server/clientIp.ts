/**
 * Who is calling, for rate limiting purposes.
 *
 * The AI endpoint is the only thing standing between a stranger and the
 * deployment's Gemini quota, and it is limited per client. Taking the *first*
 * entry of `x-forwarded-for` (or trusting a hop count) lets anyone prepend
 * `X-Forwarded-For: 1.2.3.4` and get a fresh bucket on every request.
 *
 * The rules here are deliberately boring:
 *   1. `x-real-ip`, when the platform sets it (Vercel does), is authoritative —
 *      the platform overwrites it, so it cannot be supplied by the client.
 *   2. Otherwise use the **last** `x-forwarded-for` entry: that is the address
 *      the nearest proxy appended, not one the caller wrote.
 *   3. Otherwise fall back to the socket address.
 *
 * A value that is not an IP address at all is discarded rather than trusted,
 * so a junk header can never create an unbounded set of "clients".
 */

export type HeaderValue = string | string[] | undefined;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isValidIpv4(value: string): boolean {
  const match = IPV4.exec(value);
  if (!match) return false;
  return match.slice(1).every((part) => {
    const octet = Number(part);
    return octet >= 0 && octet <= 255;
  });
}

/** Accepts plain dotted IPv4 and anything with a colon (IPv6, incl. mapped). */
export function isPlausibleIp(value: string): boolean {
  if (!value) return false;
  const candidate = value.trim();
  if (!candidate) return false;
  if (candidate.includes(':')) return /^[0-9a-fA-F:.%\][[]+$/.test(candidate) && candidate.length <= 45;
  return isValidIpv4(candidate);
}

function firstHeaderName(headers: Record<string, HeaderValue>, name: string): string {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? '';
  return typeof raw === 'string' ? raw : '';
}

/**
 * @param headers lowercase-keyed request headers
 * @param fallback the socket address, used when no usable header is present
 */
export function resolveClientIp(
  headers: Record<string, HeaderValue>,
  fallback: string = 'unknown'
): string {
  const realIp = firstHeaderName(headers, 'x-real-ip').trim();
  if (isPlausibleIp(realIp)) return realIp;

  const forwarded = firstHeaderName(headers, 'x-forwarded-for');
  if (forwarded) {
    const entries = forwarded
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    // The last hop is the one our own infrastructure appended.
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (isPlausibleIp(entries[index])) return entries[index];
    }
  }

  return isPlausibleIp(fallback) ? fallback : 'unknown';
}
