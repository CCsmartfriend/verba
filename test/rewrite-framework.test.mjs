import test from "node:test";
import assert from "node:assert/strict";

import {
  isBadOutput,
  preserveInputFormatting,
  violatesHardConstraints,
} from "../worker/index.ts";
import { detectContentLanguage } from "../src/utils/language.ts";

const avoidNegativeContrast = [
  "Do not use Chinese negative-contrast patterns such as not-but.",
];

test("a natural unchanged draft is a valid selective edit", () => {
  const text = "这段话已经很自然。句子清楚，语气也符合样本。";
  assert.equal(isBadOutput(text, text, "mine"), false);
});

test("an unchanged draft is rejected when it breaks an explicit boundary", () => {
  const text = "AI改变的不是效率，而是一个人能做到的事情范围。";
  assert.equal(isBadOutput(text, text, "mine", avoidNegativeContrast), true);
  assert.match(
    violatesHardConstraints(text, avoidNegativeContrast),
    /否定转折/,
  );
});

test("format repair never collapses separate source paragraphs", () => {
  const input = [
    "**标题：一次测试**",
    "第一段有一个观点。",
    "第二段补充原因。",
    "第三段给出结论。",
  ].join("\n\n");
  const collapsed =
    "**标题：一次测试**\n\n第一段换了说法。第二段补充原因。第三段给出结论。";
  const repaired = preserveInputFormatting(input, collapsed, "样本一。\n\n样本二。");
  assert.ok(repaired.split(/\n{2,}/).length >= 4);
});

test("repeated stock pivots are rejected", () => {
  const output = "关键在于行动。核心在于坚持。";
  assert.match(violatesHardConstraints(output, []), /重复使用/);
});

test("profiles can be separated by sample language", () => {
  assert.equal(detectContentLanguage("This is an English writing sample."), "en");
  assert.equal(detectContentLanguage("这是一篇中文写作样本。"), "zh");
});
