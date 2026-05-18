/**
 * Market trading hours for the two regions the app tracks. Used to refresh
 * quotes only while a market is open and to detect the start of a session.
 *
 * All checks are derived from `Intl` with an exchange time zone, so daylight
 * saving time is handled automatically and the UTC offsets never need to be
 * hard-coded.
 */

export type MarketRegion = "US" | "EU"

interface MarketHours {
  timeZone: string
  /** Session start, in minutes from local-exchange midnight. */
  openMinutes: number
  /** Session end, in minutes from local-exchange midnight. */
  closeMinutes: number
}

const MARKET_HOURS: Record<MarketRegion, MarketHours> = {
  // NYSE / NASDAQ regular session: 09:30–16:00 New York time.
  US: {
    timeZone: "America/New_York",
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
  },
  // Euronext continuous trading: 09:00–17:30 Paris time.
  EU: {
    timeZone: "Europe/Paris",
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60 + 30,
  },
}

const TRADING_DAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"])

/**
 * Maps a position's currency to the market region it trades on. Returns
 * `null` for currencies with no mapped exchange.
 */
export function regionForCurrency(currency: string): MarketRegion | null {
  switch (currency.trim().toUpperCase()) {
    case "USD":
    case "CAD":
      return "US"
    case "EUR":
    case "GBP":
    case "CHF":
    case "SEK":
    case "NOK":
    case "DKK":
      return "EU"
    default:
      return null
  }
}

interface ZonedTime {
  /** Short weekday name in the exchange time zone, e.g. `Mon`. */
  weekday: string
  /** Minutes elapsed since midnight in the exchange time zone. */
  minutesOfDay: number
}

function zonedTime(date: Date, timeZone: string): ZonedTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const lookup = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ""

  const hour = Number(lookup("hour")) % 24
  const minute = Number(lookup("minute"))
  return { weekday: lookup("weekday"), minutesOfDay: hour * 60 + minute }
}

/** Whether the given market region is in its regular trading session. */
export function isMarketOpen(
  region: MarketRegion,
  at: Date = new Date()
): boolean {
  const hours = MARKET_HOURS[region]
  const { weekday, minutesOfDay } = zonedTime(at, hours.timeZone)
  return (
    TRADING_DAYS.has(weekday) &&
    minutesOfDay >= hours.openMinutes &&
    minutesOfDay < hours.closeMinutes
  )
}

/**
 * Whether a symbol expressed in the given currency is currently tradable.
 * Unknown markets are always considered open so a symbol is never silently
 * dropped from the refresh.
 */
export function isCurrencyMarketOpen(
  currency: string,
  at: Date = new Date()
): boolean {
  const region = regionForCurrency(currency)
  return region === null || isMarketOpen(region, at)
}
