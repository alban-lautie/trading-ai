/** Formatting helpers shared across the UI. */

/** Formats an amount as a localized currency string. */
export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

/** Formats a ratio (e.g. 0.125) as a signed percentage (e.g. "+12.50%"). */
export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(ratio)
}

/** Formats an absolute P/L amount with an explicit sign. */
export function formatSignedCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    signDisplay: "exceptZero",
  }).format(value)
}

const generationDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
})

/** Formats a date as a French short date, e.g. "24 mai à 09h45". */
function formatFrenchDateTime(date: Date): string {
  const parts = generationDateFormatter.formatToParts(date)
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? ""
  return `${part("day")} ${part("month")} à ${part("hour")}h${part("minute")}`
}

/** Formats an ISO timestamp as a French short date, e.g. "24 mai à 09h45". */
export function formatGenerationDate(iso: string): string {
  return formatFrenchDateTime(new Date(iso))
}

/** Formats an epoch (ms) quote timestamp as a French short date. */
export function formatQuoteTime(epochMs: number): string {
  return formatFrenchDateTime(new Date(epochMs))
}

/** Returns a Tailwind text color class for a gain / loss / flat value. */
export function pnlColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return "text-muted-foreground"
  }
  return value > 0 ? "text-emerald-600" : "text-red-600"
}
