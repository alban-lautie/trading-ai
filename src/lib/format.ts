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

/** Returns a Tailwind text color class for a gain / loss / flat value. */
export function pnlColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return "text-muted-foreground"
  }
  return value > 0 ? "text-emerald-600" : "text-red-600"
}
