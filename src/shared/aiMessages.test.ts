import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import {
  buildAgentHistoryMessages,
  type ChatMsg,
} from "./chatMessages";

const require = createRequire(import.meta.url);
const {
  toCoreMessages,
  mapUserContent,
} = require("../../electron/ai/messages.cjs") as {
  toCoreMessages: (msgs: unknown[]) => unknown[];
  mapUserContent: (content: unknown) => unknown;
};

function msg(
  role: ChatMsg["role"],
  content: string,
  overrides: Partial<ChatMsg> = {},
): ChatMsg {
  return {
    id: `m_${Math.random().toString(36).slice(2)}`,
    role,
    content,
    ...overrides,
  };
}

describe("toCoreMessages", () => {
  it("maps image_url parts to AI SDK image parts", () => {
    const out = toCoreMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "what is this?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
        ],
      },
    ]);
    expect(out).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "what is this?" },
          { type: "image", image: "data:image/png;base64,abc" },
        ],
      },
    ]);
  });

  it("keeps plain string user content", () => {
    expect(mapUserContent("hello")).toBe("hello");
  });

  it("puts assistant tool calls inside content", () => {
    const out = toCoreMessages([
      {
        role: "assistant",
        content: "calling",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "Bash", arguments: '{"cmd":"ls"}' },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        name: "Bash",
        content: '{"ok":true,"stdout":"a"}',
      },
    ]);
    expect(out[0]).toEqual({
      role: "assistant",
      content: [
        { type: "text", text: "calling" },
        {
          type: "tool-call",
          toolCallId: "call_1",
          toolName: "Bash",
          input: { cmd: "ls" },
        },
      ],
    });
    expect(out[1]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call_1",
          toolName: "Bash",
          output: { type: "json", value: { ok: true, stdout: "a" } },
        },
      ],
    });
  });

  it("wraps plain tool string results as text output", () => {
    const out = toCoreMessages([
      {
        role: "tool",
        tool_call_id: "c1",
        name: "Read",
        content: "not-json",
      },
    ]);
    expect(out[0]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "c1",
          toolName: "Read",
          output: { type: "text", value: "not-json" },
        },
      ],
    });
  });
});

describe("buildAgentHistoryMessages", () => {
  it("emits structured tool_calls + tool results", () => {
    const history = [
      msg("user", "list files"),
      msg("assistant", "sure"),
      msg("assistant", "", {
        type: "tool",
        toolCallId: "tc1",
        toolName: "Bash",
        toolArgs: '{"command":"ls"}',
        toolStatus: "done",
        toolResultPreview: '{"stdout":"a.txt"}',
      }),
      msg("assistant", "done"),
    ];
    const api = buildAgentHistoryMessages(history);
    expect(api).toEqual([
      { role: "user", content: "list files" },
      {
        role: "assistant",
        content: "sure",
        tool_calls: [
          {
            id: "tc1",
            type: "function",
            function: { name: "Bash", arguments: '{"command":"ls"}' },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "tc1",
        name: "Bash",
        content: '{"stdout":"a.txt"}',
      },
      { role: "assistant", content: "done" },
    ]);
  });

  it("skips in-flight tool messages", () => {
    const history = [
      msg("user", "go"),
      msg("assistant", "", {
        type: "tool",
        toolCallId: "tc1",
        toolName: "Bash",
        toolStatus: "running",
      }),
    ];
    expect(buildAgentHistoryMessages(history)).toEqual([
      { role: "user", content: "go" },
    ]);
  });
});
