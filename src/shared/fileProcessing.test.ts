import { describe, expect, it } from "vitest";
import {
  normalizeFileProcessingSettings,
  processorConfigured,
} from "./fileProcessing";

describe("normalizeFileProcessingSettings", () => {
  it("defaults to mineru and official host", () => {
    const next = normalizeFileProcessingSettings(undefined);
    expect(next.processorId).toBe("mineru");
    expect(next.mineru.apiHost).toContain("mineru.net");
    expect(next.openMineru.apiHost).toContain("127.0.0.1");
  });

  it("keeps a selected open-mineru processor", () => {
    const next = normalizeFileProcessingSettings({
      processorId: "open-mineru",
      openMineru: { apiHost: "http://localhost:9000", apiKey: "k" },
    });
    expect(next.processorId).toBe("open-mineru");
    expect(next.openMineru.apiHost).toBe("http://localhost:9000");
  });
});

describe("processorConfigured", () => {
  it("requires mineru api key", () => {
    const settings = normalizeFileProcessingSettings({ processorId: "mineru" });
    expect(processorConfigured(settings)).toBe(false);
    settings.mineru.apiKey = "sk-test";
    expect(processorConfigured(settings)).toBe(true);
  });
});
