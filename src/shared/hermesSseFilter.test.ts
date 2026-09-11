import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { filterHermesSseChunk, flushHermesSseCarry } = require(
  "../../electron/ai/hermesSseFilter.cjs",
) as {
  filterHermesSseChunk: (
    text: string,
    carry?: string,
  ) => { out: string; carry: string };
  flushHermesSseCarry: (carry: string) => string;
};

const TOOL = 'data: {"tool":"x","toolCallId":"1","status":"running"}';
const CHOICES = 'data: {"choices":[{"delta":{"content":"hi"}}]}';

describe("filterHermesSseChunk", () => {
  it("drops complete Hermes tool-status lines and keeps OpenAI chunks", () => {
    const { out, carry } = filterHermesSseChunk(`${CHOICES}\n${TOOL}\n`);
    expect(out).toBe(`${CHOICES}\n`);
    expect(carry).toBe("");
  });

  it("holds a split tool-status line until it is complete, then drops it", () => {
    const first = filterHermesSseChunk(`${TOOL.slice(0, 20)}`);
    expect(first.out).toBe("");
    expect(first.carry).toBe(TOOL.slice(0, 20));

    const second = filterHermesSseChunk(`${TOOL.slice(20)}\n${CHOICES}\n`, first.carry);
    expect(second.out).toBe(`${CHOICES}\n`);
    expect(second.carry).toBe("");
  });

  it("holds a split OpenAI chunk and emits it once complete", () => {
    const first = filterHermesSseChunk(`${CHOICES.slice(0, 12)}`);
    expect(first.out).toBe("");
    const second = filterHermesSseChunk(`${CHOICES.slice(12)}\n`, first.carry);
    expect(second.out).toBe(`${CHOICES}\n`);
  });

  it("flushes a trailing OpenAI line without a final newline", () => {
    expect(flushHermesSseCarry(CHOICES)).toBe(CHOICES);
    expect(flushHermesSseCarry(TOOL)).toBe("");
  });
});
