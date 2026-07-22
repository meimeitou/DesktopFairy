import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import type { LlmProvider } from "../providers";
import { providerNeedsApiKey } from "../providers";
import type { CliConfigWriteFile } from "./cliConfig";
import {
  buildClaudeConfig,
  buildCodexAuthConfig,
  buildCodexConfig,
  buildOpenCodeConfig,
} from "./builders";
import {
  resolveClaudeBaseUrl,
  resolveCodexBaseUrl,
  resolveOpenCodeBaseUrl,
} from "./providerMapping";
import type { CodeCliId } from "./types";
import {
  cliProviderKeyName,
  parseJsonOrEmpty,
  renderJsonFile,
} from "./values";

export interface BuildCliConfigInput {
  cliTool: CodeCliId;
  provider: LlmProvider;
  modelId: string;
  configBlob?: Record<string, unknown>;
  existingFiles?: Partial<Record<string, string>>;
}

function readExistingJson(key: string, existingFiles?: Partial<Record<string, string>>): Record<string, unknown> {
  return parseJsonOrEmpty(existingFiles?.[key] ?? "");
}

function readExistingToml(key: string, existingFiles?: Partial<Record<string, string>>): Record<string, unknown> {
  const content = existingFiles?.[key]?.trim();
  if (!content) return {};
  try {
    return (parseToml(content) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

export function buildCliConfigFiles(input: BuildCliConfigInput): CliConfigWriteFile[] {
  const { cliTool, provider, modelId, configBlob = {}, existingFiles } = input;
  const apiKey = provider.apiKey?.trim() ?? "";

  if (cliTool === "claude-code") {
    const baseUrl = resolveClaudeBaseUrl(provider);
    if (!apiKey) throw new Error("Claude Code 需要 API Key");
    if (!baseUrl) throw new Error("Claude Code 需要 Anthropic 兼容 API 地址");
    const existing = readExistingJson("claude-settings", existingFiles);
    return [
      {
        target: "claude-settings",
        content: renderJsonFile(
          buildClaudeConfig(existing, configBlob, { apiKey, baseUrl, model: modelId }),
        ),
      },
    ];
  }

  if (cliTool === "openai-codex") {
    const baseUrl = resolveCodexBaseUrl(provider);
    if (!apiKey) throw new Error("Codex 需要 API Key");
    if (!baseUrl) {
      throw new Error(
        "Codex 需要支持 OpenAI Responses API 的 Provider。DeepSeek / Z.ai / 智谱等仅支持 Chat Completions，请改用 OpenCode。",
      );
    }
    const config = readExistingToml("codex-config", existingFiles);
    const auth = readExistingJson("codex-auth", existingFiles);
    const providerName = cliProviderKeyName(provider);
    return [
      {
        target: "codex-config",
        content: `${stringifyToml(
          buildCodexConfig(config, { baseUrl, providerName, model: modelId }),
        )}\n`,
      },
      {
        target: "codex-auth",
        content: renderJsonFile(buildCodexAuthConfig(auth, apiKey)),
      },
    ];
  }

  if (cliTool === "opencode") {
    const baseUrl = resolveOpenCodeBaseUrl(provider);
    if (!apiKey && providerNeedsApiKey(provider)) throw new Error("OpenCode 需要 API Key");
    if (!baseUrl) throw new Error("OpenCode 需要有效的 API 地址");
    const existing = readExistingJson("opencode-config", existingFiles);
    return [
      {
        target: "opencode-config",
        content: renderJsonFile(
          buildOpenCodeConfig(existing, provider, {
            apiKey,
            baseUrl,
            model: modelId,
          }),
        ),
      },
    ];
  }

  throw new Error(`Unsupported CLI tool: ${cliTool}`);
}

export function buildCliLaunchCommand(cliTool: CodeCliId, modelId?: string): string {
  if (cliTool === "claude-code") {
    return modelId ? `exec claude --model ${shellQuote(modelId)}` : "exec claude";
  }
  if (cliTool === "openai-codex") {
    return modelId ? `exec codex --model ${shellQuote(modelId)}` : "exec codex";
  }
  return "exec opencode";
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9._/@:-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Provider-derived env vars to inject at launch time (in addition to the user's envVars).
 * These mirror what each CLI reads from its config file, giving a "belt and suspenders"
 * guarantee that the launched session hits the intended provider/model even if the
 * on-disk config is stale or got rewritten by another tool.
 */
export function buildCliLaunchEnv(
  cliTool: CodeCliId,
  provider: LlmProvider,
  modelId: string,
): Record<string, string> {
  const apiKey = provider.apiKey?.trim() ?? "";
  if (cliTool === "claude-code") {
    const baseUrl = resolveClaudeBaseUrl(provider);
    const env: Record<string, string> = {};
    if (baseUrl) env.ANTHROPIC_BASE_URL = baseUrl;
    if (apiKey) env.ANTHROPIC_AUTH_TOKEN = apiKey;
    if (modelId) env.ANTHROPIC_MODEL = modelId;
    return env;
  }
  if (cliTool === "openai-codex") {
    if (!apiKey) return {};
    return { OPENAI_API_KEY: apiKey };
  }
  // opencode reads its provider+model from opencode.json; no env injection needed.
  return {};
}
