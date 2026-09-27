/**
 * Hostname syntax rules, shared by the hosts-file writer and the site manager.
 *
 * This lives in its own module so there is exactly one definition of "is this
 * a valid domain". Previously the rule sat as a private method on `HostsFile`,
 * which meant `SiteManager` could not validate before storing: a user could
 * save "not a domain!", it would be persisted, handed to Caddy as a route, and
 * then silently dropped by the hosts sync, leaving a domain that resolved to
 * nothing.
 */

/** One DNS label: alphanumeric ends, hyphens allowed inside, max 63 chars. */
const LABEL = "[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?";
const HOSTNAME = new RegExp(`^${LABEL}(\\.${LABEL})*$`, "i");

/** True if `domain` is a syntactically valid hostname: no scheme, port, or path. */
export function isValidHostname(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  return HOSTNAME.test(domain);
}

/**
 * Returns the entries of `domains` that are not valid hostnames.
 *
 * Callers reject the whole set rather than silently dropping bad entries, so
 * the user finds out instead of assuming a mapping was created.
 */
export function invalidHostnames(domains: string[]): string[] {
  return domains.filter((d) => !isValidHostname(d));
}
