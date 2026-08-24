/**
 * Display metadata for supported currencies (fees-and-custom-fx proposal D26).
 * Keys are ISO 4217 codes; the AVAILABLE set is dynamic (fx_rates in the
 * wallets module) — this catalog only supplies name/symbol/minorUnits/popular.
 */
export interface CurrencyInfo {
    code: string;
    name: string;
    symbol: string;
    minorUnits: number;
    popular: boolean;
}
export declare const CURRENCIES: readonly CurrencyInfo[];
export declare function currencyInfo(code: string): CurrencyInfo | undefined;
