import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ChatMsg } from "../../shared/chatMessages";

vi.hoisted(() => {
  globalThis.window = { electronAPI: {} } as unknown as typeof window;
});
vi.mock("./ChatMarkdown", () => ({ default: ({ content }: { content: string }) => <div>{content}</div> }));

import ThinkingBlock from "./ThinkingBlock";
import ToolCallBubble from "./ToolCallBubble";
import { ToolCancelContext } from "./agentTools/ToolCancelContext";

const tool: ChatMsg = {
  id: "tool-1", role: "assistant", type: "tool", content: "", timestamp: 1,
  toolCallId: "call-1", toolName: "bash", toolArgs: '{"command":"npm test"}',
  toolResultPreview: '{"stdout":"FULL OUTPUT"}',
};

describe("compact agent display", () => {
  it.each([true, false])("hides reasoning initially (streaming=%s)", (streaming) => {
    const html = renderToStaticMarkup(<ThinkingBlock msg={{ ...tool, type: undefined, reasoning: "FULL REASONING" }} isStreaming={streaming} />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("FULL REASONING");
    expect(html).not.toContain("thinking-body");
  });

  it.each(["streaming", "running", "done", "error", "denied"] as const)("collapses %s tools without a group wrapper", (toolStatus) => {
    const html = renderToStaticMarkup(<ToolCallBubble msg={{ ...tool, toolStatus }} />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("npm test");
    expect(html).not.toContain("FULL OUTPUT");
    expect(html).not.toContain("msg-tool-group");
    expect(html).not.toContain("agent-tool-body");
  });

  it("keeps cancellation available while collapsed", () => {
    const html = renderToStaticMarkup(<ToolCancelContext.Provider value={() => {}}><ToolCallBubble msg={{ ...tool, toolStatus: "running" }} /></ToolCancelContext.Provider>);
    expect(html).toContain("取消");
    expect(html).toContain('aria-expanded="false"');
  });

  it("shows failure reason without expanding output", () => {
    const html = renderToStaticMarkup(<ToolCallBubble msg={{ ...tool, toolStatus: "error", toolMessage: "权限不足" }} />);
    expect(html).toContain("权限不足");
    expect(html).toContain("agent-tool-error-summary");
    expect(html).not.toContain("FULL OUTPUT");
  });

  it("keeps approval actions visible", () => {
    const html = renderToStaticMarkup(<ToolCallBubble msg={{ ...tool, toolStatus: "awaiting_approval", toolApprovalId: "approval-1" }} onApprove={() => {}} onDeny={() => {}} />);
    expect(html).toContain("允许");
    expect(html).not.toContain("agent-tool-card-collapsed");
  });

  it("shows questions and options immediately while awaiting an answer", () => {
    const msg: ChatMsg = {
      ...tool, toolName: "AskUserQuestion", toolStatus: "awaiting_input", toolApprovalId: "answer-1",
      toolArgs: JSON.stringify({ questions: [{ question: "选择目标环境？", options: [{ label: "本地" }, { label: "远程" }] }] }),
    };
    const html = renderToStaticMarkup(<ToolCallBubble msg={msg} onAnswer={() => {}} />);
    expect(html).toContain("选择目标环境？");
    expect(html).toContain("本地");
    expect(html).toContain("远程");
    expect(html).not.toContain("agent-tool-card-collapsed");
  });

  it("offers a password source choice while keeping manual input masked", () => {
    const msg: ChatMsg = {
      ...tool, toolName: "AskUserQuestion", toolStatus: "awaiting_input", toolApprovalId: "sudo-answer",
      toolArgs: JSON.stringify({ questions: [{ question: "sudo 密码", secret: true, secretDefaultLabel: "使用当前连接用户 user 的已保存密码", options: [] }] }),
    };
    const html = renderToStaticMarkup(<ToolCallBubble msg={msg} onAnswer={() => {}} />);
    expect(html).toContain("手动输入密码");
    expect(html).toContain("使用当前连接用户 user 的已保存密码");
    expect(html).toContain('type="password"');
  });

});
