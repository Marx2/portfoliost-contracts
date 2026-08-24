/**
 * Uniform FX conversion (fees-and-custom-fx proposal D27).
 *
 * Rate convention everywhere: 1 EUR = rate units of the quoted currency
 * (`rates: { USD: 1.08, PLN: 4.3 }` means 1 EUR buys 1.08 USD).
 *
 * Pure functions — no IO, no dates, no fetching. Callers resolve which day's
 * table to pass; `resolveRate` walks a dated series with carry-forward.
 */
/** One day's rates vs EUR. */
export type RateTable = Readonly<Record<string, number>>;
/** Dated series, ascending by date. Dates are opaque strings (ISO or index). */
export interface DatedRates {
    date: string;
    rates: RateTable;
}
export interface ResolvedRate {
    rate: number;
    /** Date of the table actually used (carry-forward target when backfilled). */
    asOf: string;
}
export declare function isValidRate(rate: unknown): rate is number;
/** Direct EUR quote for a currency; EUR itself is the implicit 1. */
export declare function quote(rates: RateTable, ccy: string): number | undefined;
/**
 * Convert an amount between any two currencies using EUR cross rates:
 * A→B = amount × rate(B) / rate(A). Identity when from === to.
 * Returns undefined when either side lacks a valid rate.
 */
export declare function convert(amount: number, from: string, to: string, rates: RateTable): number | undefined;
/** Same-day convenience wrapper returning a concrete rate instead of amount. */
export declare function crossRate(from: string, to: string, rates: RateTable): number | undefined;
/**
 * Walk a dated series backwards from the newest entry until both currencies
 * are quotable (weekend/holiday carry-forward), up to maxStaleness entries.
 * Manual rates bypass this entirely (callers use them verbatim).
 */
export declare function resolveRate(from: string, to: string, series: readonly DatedRates[], opts?: {
    maxStaleness?: number;
}): ResolvedRate | undefined;
/**
 * Settle a fee into the wallet/transaction currency (D28 settlement view).
 * Percentage fees are materialized by the caller first (pct of notional).
 * Returns undefined when the fee currency cannot be converted.
 */
export declare function settleFee(feeAmount: number, feeCcy: string, walletCcy: string, rates: RateTable, manualRate?: number): number | undefined;
/** Round to ISO minor units (2 for most, 0 for JPY...). */
export declare function roundMinor(amount: number, minorUnits: number): number;
