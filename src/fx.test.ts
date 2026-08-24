import { describe, expect, it } from "vitest"
import {
  convert,
  crossRate,
  type DatedRates,
  isValidRate,
  quote,
  resolveRate,
  roundMinor,
  settleFee,
} from "./fx.js"

const day: Record<string, number> = { USD: 1.08, PLN: 4.3, GBP: 0.85, JPY: 163 }
const series: DatedRates[] = [
  { date: "2026-08-21", rates: { ...day, USD: 1.07 } },
  { date: "2026-08-22", rates: day }, // Saturday fixture
]

describe("quote", () => {
  it("EUR is the implicit 1", () => {
    expect(quote(day, "EUR")).toBe(1)
    expect(quote(day, "usd")).toBe(1.08)
  })
  it("rejects non-positive/missing", () => {
    expect(quote({ USD: 0 }, "USD")).toBeUndefined()
    expect(quote({}, "USD")).toBeUndefined()
  })
})

describe("convert / crossRate", () => {
  it("identity for same currency regardless of table", () => {
    expect(convert(123.45, "USD", "USD", {})).toBe(123.45)
    expect(convert(-50, "pln", "PLN", {})).toBe(-50)
  })

  it("crosses via EUR: 100 USD -> PLN = 100 * (4.3/1.08)", () => {
    expect(convert(100, "USD", "PLN", day)).toBeCloseTo((100 * 4.3) / 1.08, 10)
    expect(crossRate("USD", "PLN", day)).toBeCloseTo(4.3 / 1.08, 10)
  })

  it("EUR direct quotes", () => {
    expect(convert(10, "EUR", "JPY", day)).toBeCloseTo(1630, 10)
    expect(convert(1630, "JPY", "EUR", day)).toBeCloseTo(10, 10)
  })

  it("undefined when a side is missing", () => {
    expect(convert(1, "XXX", "USD", day)).toBeUndefined()
    expect(crossRate("USD", "GBP", { USD: 1 })).toBeUndefined()
  })

  it("property: round-trips to ~1 across random tables", () => {
    for (let seed = 0; seed < 200; seed++) {
      const rnd = (n: number) => ((Math.sin(seed * 12.9898 + n) * 43758.5453) % 1 + 1) % 1
      const t: Record<string, number> = {}
      for (const c of ["USD", "PLN", "GBP", "ZZZ"]) t[c] = 0.5 + rnd(c.charCodeAt(0)) * 5
      const ab = crossRate("USD", "PLN", t)!
      const ba = crossRate("PLN", "USD", t)!
      expect(ab * ba).toBeCloseTo(1, 9)
      // triangle via EUR
      const tri = crossRate("USD", "EUR", t)! * crossRate("EUR", "PLN", t)!
      expect(tri).toBeCloseTo(ab, 9)
    }
  })
})

describe("resolveRate", () => {
  it("uses newest table when quotable", () => {
    expect(resolveRate("USD", "PLN", series)!.asOf).toBe("2026-08-22")
  })
  it("carries forward over unquotable newest entry", () => {
    const s2: DatedRates[] = [...series, { date: "2026-08-23", rates: { PLN: 4.3 } }] // USD missing
    const r = resolveRate("USD", "PLN", s2)!
    expect(r.asOf).toBe("2026-08-22")
    expect(r.rate).toBeCloseTo(4.3 / 1.08, 10)
  })
  it("respects maxStaleness", () => {
    // only the OLDEST entry knows USD: default staleness (7) must fail,
    // a larger window must find d0
    const s3: DatedRates[] = [{ date: "d0", rates: { USD: 1.05, PLN: 4.2 } }]
    for (let i = 1; i <= 8; i++) s3.push({ date: `d${i}`, rates: { PLN: 4.2 } })
    expect(resolveRate("USD", "PLN", s3)).toBeUndefined()
    expect(resolveRate("USD", "PLN", s3, { maxStaleness: 20 })).toBeDefined()
  })
  it("empty series", () => {
    expect(resolveRate("USD", "PLN", [])).toBeUndefined()
  })
})

describe("settleFee", () => {
  it("same currency settles 1:1", () => {
    expect(settleFee(12.5, "USD", "USD", day)).toBe(12.5)
  })
  it("foreign fee converts at market", () => {
    expect(settleFee(10, "EUR", "USD", day)).toBeCloseTo(10.8, 10)
  })
  it("manual rate wins and must be positive", () => {
    expect(settleFee(10, "EUR", "USD", day, 1.5)).toBe(15)
    expect(settleFee(10, "EUR", "USD", day, -1)).toBeUndefined()
  })
})

describe("misc", () => {
  it("isValidRate", () => {
    expect(isValidRate(1)).toBe(true)
    expect(isValidRate(0)).toBe(false)
    expect(isValidRate(Number.NaN)).toBe(false)
    expect(isValidRate("1" as unknown)).toBe(false)
  })
  it("roundMinor", () => {
    expect(roundMinor(1.005, 2)).toBe(1.0)
    expect(roundMinor(163.457, 0)).toBe(163)
    expect(roundMinor(0.12345, 4)).toBe(0.1235)
  })
})
