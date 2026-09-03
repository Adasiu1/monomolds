import test from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../lib/format-price.ts";

test("formats integer grosze in Polish PLN", () => {
  const normalize = (value) => value.replace(/\s/g, " ");
  assert.equal(normalize(formatPrice(12999)), "129,99 zł");
  assert.equal(normalize(formatPrice(0)), "0,00 zł");
  assert.equal(normalize(formatPrice(1)), "0,01 zł");
  assert.equal(normalize(formatPrice(123456789)), "1 234 567,89 zł");
});
test("rejects invalid monetary input rather than silently rounding", () => {
  for (const value of [-1, 12.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => formatPrice(value), RangeError);
  }
});
