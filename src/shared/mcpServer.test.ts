import { describe, expect, it } from "vitest";
import {
  agentHasBoundMcpFetch,
  isOfficialFetchMcpServer,
} from "./mcpServer";

describe("isOfficialFetchMcpServer", () => {
  it("matches the builtin fetch preset id", () => {
    expect(isOfficialFetchMcpServer({ id: "builtin-mcp-fetch" })).toBe(true);
  });

  it("matches custom servers that launch mcp-server-fetch", () => {
    expect(
      isOfficialFetchMcpServer({
        id: "custom-fetch",
        args: ["mcp-server-fetch"],
      }),
    ).toBe(true);
  });

  it("ignores unrelated servers", () => {
    expect(
      isOfficialFetchMcpServer({
        id: "builtin-mcp-filesystem",
        args: ["@modelcontextprotocol/server-filesystem"],
      }),
    ).toBe(false);
  });
});

describe("agentHasBoundMcpFetch", () => {
  const fetchServer = {
    id: "builtin-mcp-fetch",
    args: ["mcp-server-fetch"],
    isActive: true,
  };

  it("is true when the fetch server is bound and active", () => {
    expect(
      agentHasBoundMcpFetch(["builtin-mcp-fetch"], [fetchServer]),
    ).toBe(true);
  });

  it("is false when the fetch server is bound but disabled", () => {
    expect(
      agentHasBoundMcpFetch(["builtin-mcp-fetch"], [
        { ...fetchServer, isActive: false },
      ]),
    ).toBe(false);
  });

  it("is false when fetch is not bound", () => {
    expect(agentHasBoundMcpFetch([], [fetchServer])).toBe(false);
    expect(
      agentHasBoundMcpFetch(["builtin-mcp-memory"], [fetchServer]),
    ).toBe(false);
  });
});
