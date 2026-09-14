import assert from "node:assert/strict";
import test from "node:test";

import { grossFromNetGrosze } from "../lib/vat.ts";

test("adds 23 percent VAT using integer grosze", () => {
  assert.equal(grossFromNetGrosze(5000), 6150);
  assert.equal(grossFromNetGrosze(1), 1);
  assert.throws(() => grossFromNetGrosze(10.5), RangeError);
});
