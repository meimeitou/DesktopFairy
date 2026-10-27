import { describe, it, expect } from "vitest";
import { buildSidebarGroups, type Tab } from "./terminalSidebarGroups";
import type { ChatTopic } from "../../shared/chatSession";
import type { SshHost } from "../../shared/terminalSettings";

function host(over: Partial<SshHost> = {}): SshHost {
  return {
    id: "h1",
    name: "Build Box",
    host: "10.0.0.5",
    port: 2222,
    user: "root",
    authMethod: "auto",
    ...over,
  };
}

function topic(over: Partial<ChatTopic>): ChatTopic {
  return {
    id: "t1",
    name: "",
    createdAt: 1,
    updatedAt: 1,
    orderKey: 1,
    agentId: "personal-assistant",
    chatMode: "normal",
    ...over,
  };
}

function hostTopic(id: string, hostId: string, over: Partial<ChatTopic> = {}): ChatTopic {
  return topic({
    id,
    ...over,
    host: { hostId, grants: {}, cwdByHost: {} },
  });
}

describe("buildSidebarGroups", () => {
  it("puts terminal-page topics into the 本机 group", () => {
    const groups = buildSidebarGroups(
      [],
      [topic({ id: "a", name: "随手问", origin: "terminal" })],
      [],
      {},
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: "local", kind: "local", label: "本机", meta: "" });
    expect(groups[0].items).toEqual([
      { key: "topic:a", kind: "host-chat", title: "随手问", topicId: "a" },
    ]);
  });

  it("labels a saved-host group with the host name and puts the address in meta", () => {
    const groups = buildSidebarGroups([], [hostTopic("a", "h1")], [host()], {});
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      key: "host:h1",
      kind: "host",
      hostId: "h1",
      label: "Build Box",
      meta: "root@10.0.0.5:2222",
    });
    expect(groups[0].label).not.toContain("@");
  });

  it("keeps the temp host (with its port) on quick-connect groups", () => {
    const tabs: Tab[] = [
      { id: "s1", title: "快速连接", kind: "ssh", sshHost: host({ id: "temp", name: "temp", port: 2200 }) },
    ];
    const groups = buildSidebarGroups(tabs, [], [], { s1: 5 });
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("quick");
    expect(groups[0].label).toBe("root@10.0.0.5:2200");
    expect(groups[0].quickHost?.port).toBe(2200);
  });

  it("drops hostId when the saved host no longer exists", () => {
    const tabs: Tab[] = [{ id: "s1", title: "Gone", kind: "ssh", sshHostId: "h9" }];
    const groups = buildSidebarGroups(tabs, [], [], { s1: 1 });
    expect(groups[0]).toMatchObject({ key: "host:h9", kind: "host", label: "Gone", meta: "" });
    expect(groups[0].hostId).toBeUndefined();
  });

  it("ignores chat-page conversations (no host, not terminal origin)", () => {
    const tabs: Tab[] = [
      { id: "chat", title: "小雅对话", kind: "host-chat", topicId: "x" },
    ];
    const groups = buildSidebarGroups(
      tabs,
      [topic({ id: "x", name: "小雅对话", updatedAt: 50 }), topic({ id: "y", name: "另一条", updatedAt: 40 })],
      [],
      { chat: 5 },
    );
    expect(groups).toEqual([]);
  });

  it("lists local terminals and local chats in the same 本机 group, sorted first", () => {
    const tabs: Tab[] = [
      { id: "term", title: "zsh", kind: "terminal" },
      { id: "chat", title: "旧对话", kind: "host-chat", topicId: "b" },
    ];
    const groups = buildSidebarGroups(
      tabs,
      [
        topic({ id: "b", name: "旧对话", updatedAt: 10, origin: "terminal" }),
        hostTopic("c", "h1", { updatedAt: 99 }),
      ],
      [host()],
      { term: 3 },
    );
    expect(groups.map((g) => g.key)).toEqual(["local", "host:h1"]);
    expect(groups[0].items.map((i) => i.key)).toEqual(["tab:term", "tab:chat"]);
    // 未打开的 host 对话按更新时间进入主机组，不重复出现在本机组。
    expect(groups[1].items.map((i) => i.key)).toEqual(["topic:c"]);
  });
});
