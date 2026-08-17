import { lookup } from "dns/promises";
import { isIP } from "net";

// Private/reserved ranges a server-side fetch must never be allowed to
// reach — this list is what stands between "ingest a public web page" and
// SSRF against cloud metadata endpoints (169.254.169.254) or internal
// services (databases, MinIO, other containers on the same Docker network).
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local — includes cloud metadata (169.254.169.254)
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
];

function ipv4ToInt(ip: string): number {
  return (
    ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
  );
}

function isPrivateIpv4(ip: string): boolean {
  const target = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (target & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" || // loopback
    normalized.startsWith("fe80:") || // link-local
    normalized.startsWith("fc") || // unique local fc00::/7
    normalized.startsWith("fd") ||
    normalized.startsWith("::ffff:127.") || // IPv4-mapped loopback
    normalized.startsWith("::ffff:169.254.")
  );
}

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // not a recognizable IP — fail closed
}

/**
 * Resolves `url`'s hostname and throws if it points at a private/internal
 * address. Callers must re-check every redirect hop too (see
 * documents.service.ts's fetchAndExtractUrl) — validating only the
 * original URL is not enough, since a public URL can 302 to an internal
 * one (the classic SSRF-via-redirect bypass).
 */
export async function assertPublicUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported URL scheme "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname;
  const directIpVersion = isIP(hostname);
  if (directIpVersion) {
    if (isPrivateIp(hostname)) {
      throw new Error(`URL resolves to a private/internal address`);
    }
    return;
  }

  if (hostname === "localhost") {
    throw new Error(`URL resolves to a private/internal address`);
  }

  const { address } = await lookup(hostname);
  if (isPrivateIp(address)) {
    throw new Error(`URL resolves to a private/internal address`);
  }
}
