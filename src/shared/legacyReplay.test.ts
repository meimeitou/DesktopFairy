import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  MAX_LEGACY_EVENTS,
  pushLegacyEvent,
  markLegacyCursor,
  unseenLegacyEvents,
} = require("../../electron/ai/streamManager/legacyReplay.cjs") as {
  MAX_LEGACY_EVENTS: number;
  pushLegacyEvent: (entry: Record<string, unknown>, event: unknown) => void;
  markLegacyCursor: (
    entry: Record<string, unknown>,
    webContents: object,
  ) => void;
  unseenLegacyEvents: (
    entry: Record<string, unknown>,
    webContents: object,
  ) => unknown[];
};

describe("legacyReplay cursor", () => {
  it("returns the full buffer to a window that has never received events", () => {
    const entry: Record<string, unknown> = {};
    pushLegacyEvent(entry, { channel: "chat:stream:chunk", data: { n: 1 } });
    pushLegacyEvent(entry, { channel: "chat:stream:chunk", data: { n: 2 } });
    const wc = {};
    expect(unseenLegacyEvents(entry, wc)).toHaveLength(2);
  });

  it("skips events already marked as delivered (topic switch re-attach)", () => {
    const entry: Record<string, unknown> = {};
    const wc = {};
    pushLegacyEvent(entry, { channel: "chat:stream:chunk", data: { n: 1 } });
    markLegacyCursor(entry, wc);
    pushLegacyEvent(entry, { channel: "chat:stream:chunk", data: { n: 2 } });
    markLegacyCursor(entry, wc);

    expect(unseenLegacyEvents(entry, wc)).toEqual([]);

    pushLegacyEvent(entry, { channel: "chat:stream:chunk", data: { n: 3 } });
    const unseen = unseenLegacyEvents(entry, wc);
    expect(unseen).toHaveLength(1);
    expect(unseen[0]).toEqual({
      channel: "chat:stream:chunk",
      data: { n: 3 },
    });
  });

  it("keeps a new window at the buffer start after another window was marked", () => {
    const entry: Record<string, unknown> = {};
    const live = {};
    pushLegacyEvent(entry, { channel: "a", data: 1 });
    markLegacyCursor(entry, live);
    const fresh = {};
    expect(unseenLegacyEvents(entry, fresh)).toHaveLength(1);
  });

  it("adjusts the base when the buffer is capped", () => {
    const entry: Record<string, unknown> = {};
    const wc = {};
    for (let i = 0; i < MAX_LEGACY_EVENTS + 3; i += 1) {
      pushLegacyEvent(entry, { i });
    }
    const unseen = unseenLegacyEvents(entry, wc);
    expect(unseen).toHaveLength(MAX_LEGACY_EVENTS);
    expect((unseen[0] as { i: number }).i).toBe(3);
  });
});
