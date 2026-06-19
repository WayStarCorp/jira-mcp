import { JiraApiError, JiraErrorCode } from "../errors";

/** Default attachment download size limit (10 MiB). */
export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/** Hard maximum for attachment downloads (50 MiB). */
export const HARD_MAX_BYTES = 50 * 1024 * 1024;

const MAX_REDIRECTS = 5;

/**
 * Jira Cloud Media Services — typical redirect target for `/attachment/content/{id}`.
 * Instance-agnostic Atlassian host (not tied to a site key or project).
 */
const JIRA_CLOUD_MEDIA_DOWNLOAD_HOSTS = new Set(["api.media.atlassian.com"]);

/**
 * Validates attachment content URLs against SSRF rules:
 * HTTPS only, host must match JIRA_HOST or known Jira Cloud media CDN, no private/link-local targets.
 */
export class AttachmentUrlValidator {
  private readonly allowedHost: string;

  constructor(jiraHostUrl: string) {
    const origin = new URL(jiraHostUrl);
    this.allowedHost = origin.host.toLowerCase();
  }

  /**
   * Parse and validate a download URL. Throws {@link JiraApiError} when disallowed.
   */
  public assertAllowedUrl(url: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new JiraApiError(
        "Attachment URL is not a valid URL",
        JiraErrorCode.API_ERROR,
      );
    }

    if (parsed.protocol !== "https:") {
      throw new JiraApiError(
        "Attachment URL must use HTTPS",
        JiraErrorCode.API_ERROR,
      );
    }

    const host = parsed.hostname.toLowerCase();
    assertNotPrivateOrLinkLocal(host);

    if (
      host !== this.allowedHost &&
      !JIRA_CLOUD_MEDIA_DOWNLOAD_HOSTS.has(host)
    ) {
      throw new JiraApiError(
        "Attachment URL host is not allowed",
        JiraErrorCode.API_ERROR,
      );
    }

    return parsed;
  }

  /**
   * Resolve a redirect Location against the current URL and validate the target.
   */
  public assertRedirectTarget(currentUrl: URL, location: string): URL {
    const target = new URL(location, currentUrl);
    return this.assertAllowedUrl(target.href);
  }

  public get maxRedirects(): number {
    return MAX_REDIRECTS;
  }
}

function assertNotPrivateOrLinkLocal(normalizedHost: string): void {
  if (
    normalizedHost === "localhost" ||
    normalizedHost.endsWith(".localhost") ||
    normalizedHost.endsWith(".local")
  ) {
    throwPrivateHostError();
  }

  if (isPrivateOrLinkLocalIp(normalizedHost)) {
    throwPrivateHostError();
  }
}

function throwPrivateHostError(): never {
  throw new JiraApiError(
    "Attachment URL must not target private or link-local hosts",
    JiraErrorCode.API_ERROR,
  );
}

function isPrivateOrLinkLocalIp(host: string): boolean {
  if (host.includes(":")) {
    return isPrivateOrLinkLocalIpv6(host);
  }

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    return false;
  }

  const octets = ipv4Match.slice(1, 5).map((part) => Number.parseInt(part, 10));
  if (octets.some((octet) => octet > 255)) {
    return false;
  }

  const [a, b] = octets;
  if (a === 10) {
    return true;
  }
  if (a === 127) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 0) {
    return true;
  }

  return false;
}

function isPrivateOrLinkLocalIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === "::1") {
    return true;
  }
  if (normalized.startsWith("fe80:")) {
    return true;
  }
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("::ffff:")
  ) {
    return true;
  }
  return false;
}
