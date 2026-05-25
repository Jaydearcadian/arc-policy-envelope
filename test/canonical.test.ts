import test from "node:test";
import assert from "node:assert/strict";

import { canonicalize } from "../src/canonical.js";

test("canonicalize sorts object keys recursively", () => {
  assert.equal(canonicalize({ b: 2, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":2}');
});

test("canonicalize rejects undefined values", () => {
  assert.throws(() => canonicalize({ a: undefined }), /undefined/);
});
