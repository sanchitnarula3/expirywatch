import assert from "node:assert/strict";
import test from "node:test";
import { daysUntilExpiry, formatToday, getDocumentStatus } from "../src/lib/documents";

const today = new Date("2026-11-24T12:00:00Z");

test("classifies expiry boundaries using the README thresholds", () => {
  assert.equal(getDocumentStatus("2026-11-23", today), "expired");
  assert.equal(getDocumentStatus("2026-11-24", today), "critical");
  assert.equal(getDocumentStatus("2026-11-30", today), "critical");
  assert.equal(getDocumentStatus("2026-12-01", today), "upcoming");
  assert.equal(getDocumentStatus("2026-12-23", today), "upcoming");
  assert.equal(getDocumentStatus("2026-12-24", today), "safe");
});

test("calculates whole days until expiry", () => {
  assert.equal(daysUntilExpiry("2026-12-01", today), 7);
  assert.equal(daysUntilExpiry("2026-11-20", today), -4);
});

test("formats the current date for the dashboard", () => {
  assert.equal(formatToday(today), "Tuesday, 24 November 2026");
});
