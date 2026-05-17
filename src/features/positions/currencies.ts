/**
 * Currencies a position can be denominated in. Covers the US and European
 * markets the app tracks; the codes match those mapped in `market-hours.ts`.
 */
export const CURRENCY_OPTIONS: ReadonlyArray<{
  value: string
  label: string
}> = [
  { value: "USD", label: "USD — Dollar américain" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Livre sterling" },
  { value: "CHF", label: "CHF — Franc suisse" },
  { value: "CAD", label: "CAD — Dollar canadien" },
  { value: "JPY", label: "JPY — Yen japonais" },
  { value: "SEK", label: "SEK — Couronne suédoise" },
  { value: "NOK", label: "NOK — Couronne norvégienne" },
  { value: "DKK", label: "DKK — Couronne danoise" },
]
