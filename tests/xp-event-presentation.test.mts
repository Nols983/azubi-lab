import assert from "node:assert/strict";
import test from "node:test";
import { formatHintUsage, presentXpEvent } from "../src/app/lib/xp-event-presentation.ts";

const base = {
  id: "event-1",
  xpAmount: 75,
  awardedAt: "2026-09-24T10:00:00.000Z",
} as const;

test("Lab XP rows resolve canonical titles and singular/plural hint details", () => {
  assert.deepEqual(presentXpEvent({
    ...base,
    sourceType: "lab",
    canonicalTitle: "Nur das lokale Netzwerk funktioniert",
    uniqueHintsUsed: 0,
  }), {
    ...base,
    xpLabel: "+75 XP",
    label: "Lab: Nur das lokale Netzwerk funktioniert",
    detail: undefined,
  });
  assert.equal(presentXpEvent({
    ...base,
    sourceType: "lab",
    xpAmount: 50,
    canonicalTitle: "Webseiten lassen sich nicht öffnen",
    uniqueHintsUsed: 1,
  }).detail, "1 Hinweis verwendet");
  assert.equal(presentXpEvent({
    ...base,
    sourceType: "lab",
    xpAmount: 25,
    canonicalTitle: "Webseiten lassen sich nicht öffnen",
    uniqueHintsUsed: 2,
  }).detail, "2 Hinweise verwendet");
  assert.equal(formatHintUsage(1), "1 Hinweis verwendet");
  assert.equal(formatHintUsage(3), "3 Hinweise verwendet");
});

test("other canonical XP sources retain clear human-readable labels without raw keys", () => {
  const cases = [
    ["lesson", "IPv4 Grundlagen · Was ist eine IP-Adresse?", "Lektion: IPv4 Grundlagen · Was ist eine IP-Adresse?"],
    ["module_quiz", "DNS", "Abschlussquiz: DNS"],
    ["challenge", "DNS-Störung dokumentieren", "Challenge: DNS-Störung dokumentieren"],
  ] as const;
  for (const [sourceType, canonicalTitle, expected] of cases) {
    const item = presentXpEvent({ ...base, sourceType, canonicalTitle });
    assert.equal(item.label, expected);
    assert.equal(item.label.includes("event-1"), false);
  }
  assert.deepEqual(presentXpEvent({
    ...base,
    sourceType: "practice_quiz",
    practiceCategories: ["Netzwerke", "Troubleshooting"],
  }), {
    ...base,
    xpLabel: "+75 XP",
    label: "Übungsquiz",
    detail: "Netzwerke, Troubleshooting",
  });
});

test("Lab fallback labels never expose raw source keys and zero-XP rows are rejected", () => {
  const item = presentXpEvent({ ...base, sourceType: "lab" });
  assert.equal(item.label, "Lab: Troubleshooting-Lab");
  assert.throws(() => presentXpEvent({ ...base, sourceType: "lab", xpAmount: 0 }), RangeError);
});
