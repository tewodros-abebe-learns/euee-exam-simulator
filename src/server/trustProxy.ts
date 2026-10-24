/**
 * Turning the TRUST_PROXY environment value into something Express accepts.
 *
 * Express's `trust proxy` setting takes a boolean, a hop count, a comma
 * separated list of trusted addresses, or a subnet name. Passing the raw
 * environment string through means `TRUST_PROXY=false` reaches proxy-addr as
 * the *text* "false", which it tries to parse as an IP and throws on — the
 * server refuses to boot. A misread of that setting is a security setting, so
 * it is parsed explicitly and anything unrecognised falls back to the safe
 * default instead of taking the process down.
 *
 * The default trusts only private peers: a request that really came through a
 * proxy (Cloud Run's front end, a load balancer, the local dev proxy) gets its
 * address from `X-Forwarded-For`, while a stranger connecting straight to the
 * server cannot choose their own rate-limit bucket with a header.
 */
export const DEFAULT_TRUST_PROXY = 'loopback, linklocal, uniquelocal';

export type TrustProxySetting = boolean | number | string;

export function parseTrustProxy(value: string | undefined): TrustProxySetting {
  if (value === undefined) return DEFAULT_TRUST_PROXY;

  const raw = value.trim();
  if (!raw) return DEFAULT_TRUST_PROXY;

  const lowered = raw.toLowerCase();
  if (lowered === 'false' || lowered === 'off' || lowered === 'no' || raw === '0') {
    return false;
  }
  if (lowered === 'true' || lowered === 'on' || lowered === 'yes') {
    return true;
  }

  // A bare number is a hop count. Express wants a number, not the string "2".
  if (/^\d+$/.test(raw)) return Number(raw);

  // Anything else is an address or subnet list, which Express parses itself.
  return raw;
}
