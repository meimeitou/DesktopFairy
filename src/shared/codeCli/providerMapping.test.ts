import { describe, expect, it } from "vitest";
import type { LlmProvider } from "../providers";
import {
  providerSupportsCodex,
  resolveCodexBaseUrl,
  resolveOpenCodeBaseUrl,
  resolveOpenCodeNpmPackage,
  filterProvidersForCliTool,
} from "./providerMapping";

function makeProvider(overrides: Partial<LlmProvider> = {}): LlmProvider {
  return {
    id: "custom",
    name: "Custom",
    type: "openai",
    apiHost: "https://api.example.com/v1",
    apiKey: "sk-test",
    enabled: true,
    isSystem: false,
    models: ["gpt-4o"],
    ...overrides,
  };
}

describe("resolveCodexBaseUrl", () => {
  it("appends /v1 for Codex when settings host has no version segment", () => {
    const provider = makeProvider({ apiHost: "https://api.openai.com" });
    expect(resolveCodexBaseUrl(provider)).toBe("https://api.openai.com/v1");
  });

  it("preserves /v1 from settings for Codex", () => {
    const provider = makeProvider({ apiHost: "https://openrouter.ai/api/v1" });
    expect(resolveCodexBaseUrl(provider)).toBe("https://openrouter.ai/api/v1");
  });

  it("rejects DeepSeek for Codex (chat-completions only)", () => {
    const provider = makeProvider({ apiHost: "https://api.deepseek.com" });
    expect(providerSupportsCodex(provider)).toBe(false);
    expect(resolveCodexBaseUrl(provider)).toBe("");
  });

  it("keeps DeepSeek available for OpenCode with settings URL unchanged", () => {
    const provider = makeProvider({ apiHost: "https://api.deepseek.com" });
    expect(resolveOpenCodeBaseUrl(provider)).toBe("https://api.deepseek.com");
  });

  it("filters codex providers separately from opencode", () => {
    const providers = [
      makeProvider({ id: "openai", apiHost: "https://api.openai.com/v1" }),
      makeProvider({ id: "deepseek", apiHost: "https://api.deepseek.com" }),
      makeProvider({ id: "or", apiHost: "https://openrouter.ai/api/v1" }),
    ];
    expect(filterProvidersForCliTool("openai-codex", providers).map((p) => p.id)).toEqual([
      "openai",
      "or",
    ]);
    expect(filterProvidersForCliTool("opencode", providers).map((p) => p.id)).toEqual([
      "openai",
      "deepseek",
      "or",
    ]);
  });
});

describe("resolveOpenCodeNpmPackage", () => {
  it("maps provider types to AI SDK packages", () => {
    expect(resolveOpenCodeNpmPackage("openai")).toBe("@ai-sdk/openai-compatible");
    expect(resolveOpenCodeNpmPackage("ollama")).toBe("@ai-sdk/openai-compatible");
    expect(resolveOpenCodeNpmPackage("openai-response")).toBe("@ai-sdk/openai");
    expect(resolveOpenCodeNpmPackage("anthropic")).toBe("@ai-sdk/anthropic");
  });
});

describe("resolveOpenCodeBaseUrl by type", () => {
  it("adds /v1 for ollama openai-compatible endpoint", () => {
    expect(
      resolveOpenCodeBaseUrl(
        makeProvider({ type: "ollama", apiHost: "http://localhost:11434", apiKey: "" }),
      ),
    ).toBe("http://localhost:11434/v1");
  });

  it("normalizes anthropic host to include /v1", () => {
    expect(
      resolveOpenCodeBaseUrl(
        makeProvider({
          type: "anthropic",
          apiHost: "https://api.anthropic.com",
          apiKey: "sk-ant",
        }),
      ),
    ).toBe("https://api.anthropic.com/v1");
  });

  it("normalizes openai-response host to include /v1", () => {
    expect(
      resolveOpenCodeBaseUrl(
        makeProvider({ type: "openai-response", apiHost: "https://api.openai.com" }),
      ),
    ).toBe("https://api.openai.com/v1");
  });
});
