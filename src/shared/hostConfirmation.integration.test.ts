import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { applyToolEvent, emptyAgentSessionState } from "./agentSession";

const require = createRequire(import.meta.url);
const { executeAgentTool } = require("../../electron/agentTools.cjs");
const { dispatchUserAnswer, dispatchToolApproval, clearAllToolApprovals } = require("../../electron/agentToolApproval.cjs");

it("keeps SSH permission visible after the internal host question is answered", async () => {
  const host = { id: "h1", name: "dev", host: "dev.example.test", user: "user", port: 22 };
  const requestId = "host-confirmation-regression";
  const toolCallId = "ssh-operation";
  let granted = false;
  let state = applyToolEvent(emptyAgentSessionState(), {
    requestId, toolCallId, toolName: "ssh_exec", toolArgs: "{}", status: "streaming",
  });
  let approvalId = "";
  let reachedApproval: () => void;
  const approvalReady = new Promise<void>((resolve) => { reachedApproval = resolve; });
  const execution = executeAgentTool({ id: toolCallId, function: {
    name: "ssh_exec", arguments: JSON.stringify({ hostId: host.id, command: "pwd" }),
  } }, {
    requestId,
    agentConfig: { chatMode: "normal" },
    allowedToolNames: new Set(["ssh_exec"]),
    hostRuntime: {
      topicId: "topic", defaultHostId: null,
      searchSavedHosts: () => [host], listSavedHosts: () => [host],
      isGranted: () => granted, ensureGrant: () => { granted = true; },
      fingerprintOf: () => "user@dev.example.test:22",
      describeHost: () => "dev", forceApproval: () => true,
    },
    safeSend: (_channel: string, event: Parameters<typeof applyToolEvent>[1]) => {
      state = applyToolEvent(state, event);
      if (event.status === "awaiting_input") queueMicrotask(() => {
        const question = JSON.parse(event.toolArgs).questions[0];
        dispatchUserAnswer(event.approvalId, { [question.question]: question.options[0].label });
      });
      if (event.status === "awaiting_approval") {
        approvalId = event.approvalId;
        reachedApproval();
      }
    },
  });
  try {
    await approvalReady;
    const question = state.messages.find((message) => message.toolName === "AskUserQuestion");
    const operation = state.messages.find((message) => message.toolCallId === toolCallId);
    expect(question?.toolStatus).toBe("done");
    expect(operation?.toolName).toBe("ssh_exec");
    expect(operation?.toolStatus).toBe("awaiting_approval");
    expect(operation?.toolApprovalId).toBe(approvalId);
    expect(question?.toolCallId).not.toBe(toolCallId);
  } finally {
    // Reject the actual operation: the test never makes an SSH connection.
    dispatchToolApproval(approvalId, false);
    await execution;
    clearAllToolApprovals();
  }
});
