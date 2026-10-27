import type { ChatTopic } from "../../shared/chatSession";
import type { SshHost } from "../../shared/terminalSettings";

export interface Tab {
  id: string;
  title: string;
  kind: "terminal" | "settings" | "ssh" | "host-chat";
  cwd?: string;
  launchCommand?: string;
  sshHostId?: string;
  topicId?: string;
  /** 临时主机（快速连接），不写入 settings.sshHosts */
  sshHost?: SshHost;
}

export interface SidebarItem {
  /** 'tab:<tabId>' | 'topic:<topicId>' */
  key: string;
  kind: "terminal" | "ssh" | "host-chat";
  title: string;
  /** 已打开的标签；历史对话（未打开）没有该字段 */
  tabId?: string;
  topicId?: string;
}

export interface SidebarGroup {
  /** 'local' | 'host:<hostId>' | 'quick:<user@host:port>' */
  key: string;
  /** local = 本机伪主机；host = settings.sshHosts；quick = 快速连接 */
  kind: "local" | "host" | "quick";
  /** '本机' | 主机 name | 'user@host:port' */
  label: string;
  /** 仅 kind==='host' 且主机仍存在时有值：settings.sshHosts 的 id */
  hostId?: string;
  /** 仅 kind==='quick'：重连用的临时主机对象 */
  quickHost?: SshHost;
  /** 主机 user@host:port，本机组为空串 */
  meta: string;
  items: SidebarItem[];
  lastAt: number;
}

function describeHost(h: { user: string; host: string; port: number }): string {
  return h.port === 22 ? `${h.user}@${h.host}` : `${h.user}@${h.host}:${h.port}`;
}

const LOCAL_GROUP = { key: "local", kind: "local", label: "本机", meta: "" } as const;

export function buildSidebarGroups(
  tabs: Tab[],
  topics: ChatTopic[],
  sshHosts: SshHost[],
  activityAt: Record<string, number>,
): SidebarGroup[] {
  const byKey = new Map<string, SidebarGroup>();
  const hostById = new Map(sshHosts.map((h) => [h.id, h]));
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const push = (
    group: Omit<SidebarGroup, "items" | "lastAt">,
    item: SidebarItem,
    at: number,
  ) => {
    let g = byKey.get(group.key);
    if (!g) {
      g = { ...group, items: [], lastAt: 0 };
      byKey.set(group.key, g);
    }
    g.items.push(item);
    g.lastAt = Math.max(g.lastAt, at);
  };

  const hostGroup = (hostId: string, host: SshHost | undefined) => ({
    key: `host:${hostId}`,
    kind: "host" as const,
    hostId: host ? hostId : undefined,
    label: host?.name ?? "未知主机",
    meta: host ? describeHost(host) : "",
  });

  const openedTopics = new Set<string>();
  // 无 host 的 topic 只有终端页创建的（origin === "terminal"）才进「本机」组；
  // 聊天页/智能体列表里的会话不属于终端侧栏。
  const isTerminalLocalTopic = (t: ChatTopic) =>
    !t.host && t.origin === "terminal";

  for (const tab of tabs) {
    if (tab.kind === "settings") continue;
    const item: SidebarItem = {
      key: `tab:${tab.id}`,
      kind: tab.kind,
      title: tab.title,
      tabId: tab.id,
      topicId: tab.topicId,
    };
    const at = activityAt[tab.id] ?? 0;

    if (tab.kind === "terminal") {
      push(LOCAL_GROUP, item, at);
      continue;
    }

    if (tab.kind === "ssh") {
      if (tab.sshHostId) {
        const host = hostById.get(tab.sshHostId);
        // 主机已从设置里删掉时仍列出标签（父组件会关掉它），但没有可编辑的记录。
        push(
          host
            ? hostGroup(tab.sshHostId, host)
            : { ...hostGroup(tab.sshHostId, undefined), label: tab.title },
          item,
          at,
        );
      } else if (tab.sshHost) {
        const addr = describeHost(tab.sshHost);
        push({ key: `quick:${addr}`, kind: "quick", quickHost: tab.sshHost, label: addr, meta: "" }, item, at);
      }
      continue;
    }

    // kind === "host-chat"：无 host 的是终端页本机对话
    const topic = tab.topicId ? topicById.get(tab.topicId) : undefined;
    if (!topic || !tab.topicId) continue; // topic 已不存在 → 父组件清理 effect 会关掉它
    if (!topic.host && !isTerminalLocalTopic(topic)) continue;
    openedTopics.add(tab.topicId);
    const hostId = topic.host?.hostId;
    push(hostId ? hostGroup(hostId, hostById.get(hostId)) : LOCAL_GROUP, item, at);
  }

  // 未打开的历史对话也列出来，点一下即打开。与聊天页列表一致按 orderKey 倒序，
  // 否则新建的对话会沉到本机组/主机组底部。
  for (const topic of [...topics].sort((a, b) => b.orderKey - a.orderKey)) {
    if (openedTopics.has(topic.id)) continue;
    const hostId = topic.host?.hostId;
    if (hostId && !hostById.has(hostId)) continue;
    // 既不是主机对话、也不是终端页创建的会话 → 属于聊天页，不在这里列。
    if (!hostId && !isTerminalLocalTopic(topic)) continue;
    push(
      hostId ? hostGroup(hostId, hostById.get(hostId)) : LOCAL_GROUP,
      {
        key: `topic:${topic.id}`,
        kind: "host-chat",
        title: topic.name || "新对话",
        topicId: topic.id,
      },
      topic.updatedAt ?? 0,
    );
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.key === "local") return -1;
    if (b.key === "local") return 1;
    return b.lastAt - a.lastAt;
  });
}
