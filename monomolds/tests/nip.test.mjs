import assert from "node:assert/strict";
import test from "node:test";

import { isValidPolishNip, normalizePolishNip } from "../lib/commerce/nip.ts";

test("normalizes and validates a Polish NIP", () => {
  assert.equal(normalizePolishNip("PL 526-025-09-95"), "5260250995");
  assert.equal(isValidPolishNip("PL 526-025-09-95"), true);
  assert.equal(isValidPolishNip("5260250994"), false);
});
