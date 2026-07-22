import { describe, expect, it } from "vitest";
import {
  buildClaudeConfig,
  buildCodexAuthConfig,
  buildCodexConfig,
  buildOpenCodeConfig,
} from "./builders";
import { getCliConfigTargets, isValidConfigTargetForTool } from "./cliConfig";
import { buildCliConfigFiles } from "./adapters";
import type { LlmProvider } from "../providers";

const sampleProvider: LlmProvider = {
  id: "test-provider",
  name: "Test Provider",
  type: "openai",
  apiHost: "https://api.example.com/v1",
  apiKey: "sk-test",
  enabled: true,
  isSystem: false,
  models: ["gpt-4o"],
};

describe("codeCli builders", () => {
  it("buildClaudeConfig injects anthropic env", () => {
    const result = buildClaudeConfig({}, {}, {
      apiKey: "sk-test",
      baseUrl: "https://api.anthropic.com",
      model: "claude-sonnet-4-20250514",
    });
    const env = result.env as Record<string, string>;
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe("sk-test");
    expect(env.ANTHROPIC_BASE_URL).toBe("https://api.anthropic.com");
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-20250514");
  });

  it("buildCodexConfig sets responses wire_api", () => {
    const result = buildCodexConfig(
      {},
      {
        baseUrl: "https://api.example.com/v1",
        providerName: "Test",
        model: "gpt-4o",
      },
    );
    expect(result.model).toBe("gpt-4o");
    expect(result.model_provider).toMatch(/^cherry-/);
    const providers = result.model_providers as Record<string, Record<string, string>>;
    const key = result.model_provider as string;
    expect(providers[key].wire_api).toBe("responses");
    expect(providers[key].base_url).toBe("https://api.example.com/v1");
  });

  it("buildCodexAuthConfig stores OPENAI_API_KEY", () => {
    const result = buildCodexAuthConfig({}, "sk-codex");
    expect(result.OPENAI_API_KEY).toBe("sk-codex");
  });

  it("buildOpenCodeConfig picks npm package from provider type", () => {
    const openai = buildOpenCodeConfig(
      {},
      { id: "p1", name: "My Provider", type: "openai" },
      { apiKey: "sk-test", baseUrl: "https://api.example.com/v1", model: "gpt-4o" },
    );
    const openaiProv = (openai.provider as Record<string, Record<string, unknown>>)[
      "cherry-My-Provider"
    ];
    expect(openai.$schema).toBe("https://opencode.ai/config.json");
    expect(openai.model).toMatch(/^cherry-/);
    expect(openaiProv.npm).toBe("@ai-sdk/openai-compatible");

    const responses = buildOpenCodeConfig(
      {},
      { id: "p2", name: "Responses", type: "openai-response" },
      { apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
    );
    expect(
      (responses.provider as Record<string, Record<string, unknown>>)["cherry-Responses"].npm,
    ).toBe("@ai-sdk/openai");

    const anthropic = buildOpenCodeConfig(
      {},
      { id: "p3", name: "Claude", type: "anthropic" },
      { apiKey: "sk-ant", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4" },
    );
    expect(
      (anthropic.provider as Record<string, Record<string, unknown>>)["cherry-Claude"].npm,
    ).toBe("@ai-sdk/anthropic");

    const ollama = buildOpenCodeConfig(
      {},
      { id: "p4", name: "Local", type: "ollama" },
      { apiKey: "", baseUrl: "http://localhost:11434/v1", model: "llama3" },
    );
    const ollamaProv = (ollama.provider as Record<string, Record<string, unknown>>)[
      "cherry-Local"
    ];
    expect(ollamaProv.npm).toBe("@ai-sdk/openai-compatible");
    expect((ollamaProv.options as Record<string, unknown>).apiKey).toBeUndefined();
  });
});

describe("cliConfig targets", () => {
  it("allows only known targets per tool", () => {
    expect(getCliConfigTargets("claude-code")).toEqual(["claude-settings"]);
    expect(isValidConfigTargetForTool("openai-codex", "codex-auth")).toBe(true);
    expect(isValidConfigTargetForTool("claude-code", "codex-auth")).toBe(false);
  });
});

describe("buildCliConfigFiles", () => {
  it("returns claude settings file draft", () => {
    const files = buildCliConfigFiles({
      cliTool: "claude-code",
      provider: sampleProvider,
      modelId: "gpt-4o",
    });
    expect(files).toHaveLength(1);
    expect(files[0].target).toBe("claude-settings");
    expect(files[0].content).toContain("ANTHROPIC_AUTH_TOKEN");
  });

  it("returns codex config and auth files", () => {
    const files = buildCliConfigFiles({
      cliTool: "openai-codex",
      provider: {
        ...sampleProvider,
        apiHost: "https://api.openai.com/v1",
      },
      modelId: "gpt-4o",
    });
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.target)).toEqual(["codex-config", "codex-auth"]);
    expect(files[0].content).toContain('base_url = "https://api.openai.com/v1"');
  });

  it("returns codex config for responses-capable providers", () => {
    const files = buildCliConfigFiles({
      cliTool: "openai-codex",
      provider: {
        ...sampleProvider,
        apiHost: "https://api.openai.com",
      },
      modelId: "gpt-4o",
    });
    expect(files).toHaveLength(2);
    expect(files[0].content).toContain('wire_api = "responses"');
    expect(files[0].content).toContain('base_url = "https://api.openai.com/v1"');
  });

  it("rejects chat-completions-only provider for codex", () => {
    expect(() =>
      buildCliConfigFiles({
        cliTool: "openai-codex",
        provider: {
          ...sampleProvider,
          apiHost: "https://api.deepseek.com",
        },
        modelId: "deepseek-chat",
      }),
    ).toThrow(/Responses API/);
  });
});
