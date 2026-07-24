import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  makeApprovalId,
  waitForToolApproval,
  approveRequestApprovals,
  dispatchToolApproval,
} = require("../../electron/agentToolApproval.cjs") as {
  makeApprovalId: (requestId: string, toolCallId: string) => string;
  waitForToolApproval: (opts: {
    approvalId: string;
    signal?: AbortSignal;
  }) => Promise<"approved" | "denied" | "aborted">;
  approveRequestApprovals: (requestId: string) => number;
  dispatchToolApproval: (approvalId: string, approved: boolean) => boolean;
};

describe("approveRequestApprovals", () => {
  it("approves every pending tool for the request without touching other requests", async () => {
    const reqA = "req_a";
    const reqB = "req_b";
    const idA1 = makeApprovalId(reqA, "call_1");
    const idA2 = makeApprovalId(reqA, "call_2");
    const idB1 = makeApprovalId(reqB, "call_1");

    const pA1 = waitForToolApproval({ approvalId: idA1 });
    const pA2 = waitForToolApproval({ approvalId: idA2 });
    const pB1 = waitForToolApproval({ approvalId: idB1 });

    expect(approveRequestApprovals(reqA)).toBe(2);
    await expect(pA1).resolves.toBe("approved");
    await expect(pA2).resolves.toBe("approved");

    expect(dispatchToolApproval(idB1, true)).toBe(true);
    await expect(pB1).resolves.toBe("approved");
  });

  it("is a no-op when nothing is pending", () => {
    expect(approveRequestApprovals("missing")).toBe(0);
    expect(approveRequestApprovals("")).toBe(0);
  });
});
