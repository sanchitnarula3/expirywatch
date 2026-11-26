import assert from "node:assert/strict";
import test from "node:test";
import {
  daysUntilExpiry,
  milestoneForCron,
  milestoneForImmediateUpload,
} from "../src/lib/expiry-reminders";

const now = new Date("2026-11-26T18:30:00Z");

test("calculates remaining days from the UTC calendar day", () => {
  assert.equal(daysUntilExpiry("2026-12-03", now), 7);
  assert.equal(daysUntilExpiry("2026-11-26", now), 0);
  assert.equal(daysUntilExpiry("2026-11-24", now), -2);
});

test("cron catches up once in the seven-day window and at later milestones", () => {
  assert.equal(milestoneForCron(8), null);
  assert.equal(milestoneForCron(7), 7);
  assert.equal(milestoneForCron(3), 7);
  assert.equal(milestoneForCron(1), 1);
  assert.equal(milestoneForCron(0), 0);
  assert.equal(milestoneForCron(-4), 0);
});

test("immediate upload sends only exact presentation milestones", () => {
  assert.equal(milestoneForImmediateUpload(7), 7);
  assert.equal(milestoneForImmediateUpload(6), null);
  assert.equal(milestoneForImmediateUpload(1), 1);
  assert.equal(milestoneForImmediateUpload(0), 0);
  assert.equal(milestoneForImmediateUpload(-1), null);
});
