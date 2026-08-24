/**
 * Uniform FX conversion (fees-and-custom-fx proposal D27).
 *
 * Rate convention everywhere: 1 EUR = rate units of the quoted currency
 * (`rates: { USD: 1.08, PLN: 4.3 }` means 1 EUR buys 1.08 USD).
 *
 * Pure functions — no IO, no dates, no fetching. Callers resolve which day's
 * table to pass; `resolveRate` walks a dated series with carry-forward.
 */
export function isValidRate(rate) {
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}
/** Direct EUR quote for a currency; EUR itself is the implicit 1. */
export function quote(rates, ccy) {
    const c = ccy.toUpperCase();
    if (c === "EUR")
        return 1;
    const r = rates[c];
    return isValidRate(r) ? r : undefined;
}
/**
 * Convert an amount between any two currencies using EUR cross rates:
 * A→B = amount × rate(B) / rate(A). Identity when from === to.
 * Returns undefined when either side lacks a valid rate.
 */
export function convert(amount, from, to, rates) {
    const f = from.toUpperCase();
    const t = to.toUpperCase();
    if (f === t)
        return amount;
    const rf = quote(rates, f);
    const rt = quote(rates, t);
    if (rf === undefined || rt === undefined)
        return undefined;
    return (amount * rt) / rf;
}
/** Same-day convenience wrapper returning a concrete rate instead of amount. */
export function crossRate(from, to, rates) {
    return convert(1, from, to, rates);
}
/**
 * Walk a dated series backwards from the newest entry until both currencies
 * are quotable (weekend/holiday carry-forward), up to maxStaleness entries.
 * Manual rates bypass this entirely (callers use them verbatim).
 */
export function resolveRate(from, to, series, opts = {}) {
    const max = opts.maxStaleness ?? 7;
    let lookedAt = 0;
    for (let i = series.length - 1; i >= 0; i--) {
        const entry = series[i];
        const rate = crossRate(from, to, entry.rates);
        if (rate !== undefined)
            return { rate, asOf: entry.date };
        lookedAt++;
        if (lookedAt >= max)
            return undefined;
    }
    return undefined;
}
/**
 * Settle a fee into the wallet/transaction currency (D28 settlement view).
 * Percentage fees are materialized by the caller first (pct of notional).
 * Returns undefined when the fee currency cannot be converted.
 */
export function settleFee(feeAmount, feeCcy, walletCcy, rates, manualRate) {
    if (feeCcy.toUpperCase() === walletCcy.toUpperCase())
        return feeAmount;
    if (manualRate !== undefined) {
        if (!isValidRate(manualRate))
            return undefined;
        return feeAmount * manualRate;
    }
    const rate = crossRate(feeCcy, walletCcy, rates);
    return rate === undefined ? undefined : feeAmount * rate;
}
/** Round to ISO minor units (2 for most, 0 for JPY...). */
export function roundMinor(amount, minorUnits) {
    const f = 10 ** minorUnits;
    return Math.round(amount * f) / f;
}
