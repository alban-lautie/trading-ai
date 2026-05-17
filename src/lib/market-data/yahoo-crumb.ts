import "server-only"

/**
 * Yahoo Finance crumb handshake.
 *
 * The `quoteSummary` endpoint (fundamentals, analyst targets) requires a
 * cookie + crumb pair. This module performs the handshake once and caches the
 * result; every consumer is best-effort and degrades gracefully when the
 * handshake fails, so a Yahoo change never breaks the recommendation flow.
 */

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

export interface YahooSession {
  cookie: string
  crumb: string
}

let cached: YahooSession | null = null

/** Reads the Set-Cookie header(s) into a list of `name=value;…` entries. */
function readSetCookies(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof withGetter.getSetCookie === "function") {
    return withGetter.getSetCookie()
  }
  const raw = headers.get("set-cookie")
  return raw ? raw.split(/,(?=\s*[A-Za-z0-9_!%-]+=)/) : []
}

async function openSession(): Promise<YahooSession | null> {
  try {
    // fc.yahoo.com hands out the session cookie without the consent wall.
    const cookieResponse = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    })
    const cookie = readSetCookies(cookieResponse.headers)
      .map((entry) => entry.split(";")[0].trim())
      .filter(Boolean)
      .join("; ")
    if (!cookie) return null

    const crumbResponse = await fetch(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: { "User-Agent": USER_AGENT, Cookie: cookie },
        cache: "no-store",
      }
    )
    if (!crumbResponse.ok) return null

    const crumb = (await crumbResponse.text()).trim()
    if (!crumb || crumb.length > 64 || crumb.includes("<")) return null

    return { cookie, crumb }
  } catch {
    return null
  }
}

/**
 * Returns a cached Yahoo session, opening one on first use. Pass
 * `forceRefresh` to discard a stale session (e.g. after an HTTP 401).
 */
export async function getYahooSession(
  forceRefresh = false
): Promise<YahooSession | null> {
  if (cached && !forceRefresh) return cached
  cached = await openSession()
  return cached
}

export const YAHOO_USER_AGENT = USER_AGENT
