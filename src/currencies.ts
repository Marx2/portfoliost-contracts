/**
 * Display metadata for supported currencies (fees-and-custom-fx proposal D26).
 * Keys are ISO 4217 codes; the AVAILABLE set is dynamic (fx_rates in the
 * wallets module) — this catalog only supplies name/symbol/minorUnits/popular.
 */
export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  minorUnits: number
  popular: boolean
}

export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: "EUR", name: "Euro", symbol: "€", minorUnits: 2, popular: true },
  { code: "USD", name: "US Dollar", symbol: "$", minorUnits: 2, popular: true },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", minorUnits: 2, popular: true },
  { code: "GBP", name: "British Pound", symbol: "£", minorUnits: 2, popular: true },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", minorUnits: 2, popular: true },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", minorUnits: 0, popular: true },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", minorUnits: 2, popular: false },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", minorUnits: 2, popular: false },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", minorUnits: 2, popular: false },
  { code: "DKK", name: "Danish Krone", symbol: "kr", minorUnits: 2, popular: false },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", minorUnits: 2, popular: false },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", minorUnits: 2, popular: false },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", minorUnits: 2, popular: false },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", minorUnits: 2, popular: false },
] as const

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]))

export function currencyInfo(code: string): CurrencyInfo | undefined {
  return byCode.get(code.toUpperCase())
}
