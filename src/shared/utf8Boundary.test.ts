import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);
const { createUtf8BoundaryMiddleware } = require("../../electron/utf8Boundary.cjs") as {
  createUtf8BoundaryMiddleware: () => (chunk: Buffer | Uint8Array | string) => Buffer;
};

describe("createUtf8BoundaryMiddleware", () => {
  it("holds a split CJK character until the next chunk", () => {
    const fix = createUtf8BoundaryMiddleware();
    // 中 = E4 B8 AD
    const first = fix(Buffer.from([0xe4, 0xb8]));
    expect(first.length).toBe(0);
    const second = fix(Buffer.from([0xad, 0x61])); // 中 + 'a'
    expect(second.toString("utf8")).toBe("中a");
  });

  it("holds a split 4-byte emoji until complete", () => {
    const fix = createUtf8BoundaryMiddleware();
    // 😀 = F0 9F 98 80
    expect(fix(Buffer.from([0xf0, 0x9f])).length).toBe(0);
    expect(fix(Buffer.from([0x98])).length).toBe(0);
    expect(fix(Buffer.from([0x80])).toString("utf8")).toBe("😀");
  });

  it("emits a complete CJK character that ends on a chunk boundary", () => {
    const fix = createUtf8BoundaryMiddleware();
    expect(fix(Buffer.from([0xe4, 0xb8])).length).toBe(0);
    expect(fix(Buffer.from([0xad])).toString("utf8")).toBe("中");
  });

  it("passes through complete ASCII immediately", () => {
    const fix = createUtf8BoundaryMiddleware();
    expect(fix(Buffer.from("ok", "utf8")).toString("utf8")).toBe("ok");
  });
});
