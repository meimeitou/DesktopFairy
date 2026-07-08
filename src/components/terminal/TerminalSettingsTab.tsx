import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettings } from "../../shared/settings";
import type { SshHost, SshCredential, SshAuthMethod, CursorStyle } from "../../shared/terminalSettings";

const api = window.electronAPI;

interface Props {
  isActive: boolean;
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onConnectSsh: (hostId: string) => void;
  onQuickConnect: (host: SshHost) => void;
  initialSection?: Section;
}

interface HostForm {
  name: string;
  host: string;
  port: number;
  user: string;
  authMethod: SshAuthMethod;
  // 引用 SshCredential.id；空串表示不绑定凭据（agent + 默认私钥）。
  credentialId: string;
  group: string;
  proxyJump: string;
  proxyJumpAuthMethod: SshAuthMethod;
  proxyJumpCredentialId: string;
}

const EMPTY_FORM: HostForm = {
  name: "",
  host: "",
  port: 22,
  user: "",
  authMethod: "auto",
  credentialId: "",
  group: "",
  proxyJump: "",
  proxyJumpAuthMethod: "auto",
  proxyJumpCredentialId: "",
};

interface CredForm {
  name: string;
  password: string;
  privateKeyPath: string;
  note: string;
}

const EMPTY_CRED_FORM: CredForm = {
  name: "",
  password: "",
  privateKeyPath: "",
  note: "",
};

type Section = "appearance" | "ssh" | "credentials";
type FormMode = "add" | "edit" | "quick" | "duplicate";
type CredFormMode = "add" | "edit";
type TestStatus = "testing" | "ok" | "fail";

const UNGROUPED = "未分组";

export default function TerminalSettingsTab({
  isActive,
  settings,
  onChange,
  onConnectSsh,
  onQuickConnect,
  initialSection = "appearance",
}: Props) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HostForm>(EMPTY_FORM);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, TestStatus>>({});
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // 凭据管理 state
  const [credFormMode, setCredFormMode] = useState<CredFormMode | null>(null);
  const [editingCredId, setEditingCredId] = useState<string | null>(null);
  const [credForm, setCredForm] = useState<CredForm>(EMPTY_CRED_FORM);
  // 列表中密码临时显示/隐藏状态（按 credId 记录）
  const [revealedCreds, setRevealedCreds] = useState<Record<string, boolean>>({});
  // 弹窗中密码显示/隐藏
  const [showCredPassword, setShowCredPassword] = useState(false);

  const { terminal, sshHosts, sshCredentials } = settings;

  // 凭据解析：credentialId → { password, privateKeyPath }
  // 供 ssh:test / ssh:create 调用前在 renderer 侧解析（main 进程不感知凭据库）
  const resolveCredential = useCallback(
    (id?: string): { password?: string; privateKeyPath?: string } => {
      if (!id) return {};
      const c = sshCredentials.find((x) => x.id === id);
      if (!c) return {};
      return { password: c.password, privateKeyPath: c.privateKeyPath };
    },
    [sshCredentials],
  );

  // 按 group 聚合：空 group 归入 "未分组"。
  // 始终保证"未分组"在第一位（即使无主机也作为默认组可见），
  // 让用户清楚看到默认容器，新建主机的归属也直观。
  const groups = useMemo(() => {
    const map = new Map<string, SshHost[]>();
    for (const h of sshHosts) {
      const g = h.group?.trim() || UNGROUPED;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(h);
    }
    if (!map.has(UNGROUPED)) map.set(UNGROUPED, []);
    const entries = Array.from(map.entries());
    const ungroupedIdx = entries.findIndex(([g]) => g === UNGROUPED);
    if (ungroupedIdx > 0) {
      const [ungrouped] = entries.splice(ungroupedIdx, 1);
      entries.unshift(ungrouped);
    }
    return entries;
  }, [sshHosts]);

  const updateTerminal = (patch: Partial<typeof terminal>) => {
    onChange({ terminal: { ...terminal, ...patch } });
  };

  // 统一提交：按 formMode 分支处理 add / edit / quick
  // - add: 追加到 sshHosts 并持久化
  // - edit: 替换 sshHosts 中 editingId 对应项并持久化
  // - quick: 构造临时 SshHost（不持久化）直接触发连接
  const handleSubmit = () => {
    if (!form.name.trim() || !form.host.trim() || !form.user.trim()) return;
    const hasJump = !!form.proxyJump.trim();
    const baseHost: SshHost = {
      name: form.name.trim(),
      host: form.host.trim(),
      port: form.port || 22,
      user: form.user.trim(),
      authMethod: form.authMethod,
      // 凭据引用：agent 模式下 credentialId 仍保留（用户可同时绑 agent + 兜底密码）
      credentialId: form.credentialId || undefined,
      group: form.group.trim() || undefined,
      proxyJump: form.proxyJump.trim() || undefined,
      proxyJumpAuthMethod: hasJump ? form.proxyJumpAuthMethod : undefined,
      proxyJumpCredentialId: hasJump && form.proxyJumpCredentialId ? form.proxyJumpCredentialId : undefined,
    };

    if (formMode === "quick") {
      const tempHost: SshHost = {
        ...baseHost,
        id: `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
      onQuickConnect(tempHost);
    } else if (formMode === "edit" && editingId) {
      const updated: SshHost = { ...baseHost, id: editingId };
      onChange({ sshHosts: sshHosts.map((h) => (h.id === editingId ? updated : h)) });
    } else if (formMode === "add" || formMode === "duplicate") {
      const newHost: SshHost = {
        ...baseHost,
        id: `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
      onChange({ sshHosts: [...sshHosts, newHost] });
    }
    setForm(EMPTY_FORM);
    setFormMode(null);
    setEditingId(null);
  };

  const handleEditHost = (host: SshHost) => {
    setForm({
      name: host.name,
      host: host.host,
      port: host.port,
      user: host.user,
      authMethod: host.authMethod,
      credentialId: host.credentialId ?? "",
      group: host.group ?? "",
      proxyJump: host.proxyJump ?? "",
      proxyJumpAuthMethod: host.proxyJumpAuthMethod ?? "auto",
      proxyJumpCredentialId: host.proxyJumpCredentialId ?? "",
    });
    setEditingId(host.id);
    setFormMode("edit");
  };

  // 复制主机：预填全部字段（含认证、跳板机），名称追加「 副本」后缀，
  // editingId 保持 null —— 提交时生成新 ID 追加到 sshHosts，原主机不受影响。
  const handleDuplicateHost = (host: SshHost) => {
    setForm({
      name: `${host.name} 副本`,
      host: host.host,
      port: host.port,
      user: host.user,
      authMethod: host.authMethod,
      credentialId: host.credentialId ?? "",
      group: host.group ?? "",
      proxyJump: host.proxyJump ?? "",
      proxyJumpAuthMethod: host.proxyJumpAuthMethod ?? "auto",
      proxyJumpCredentialId: host.proxyJumpCredentialId ?? "",
    });
    setEditingId(null);
    setFormMode("duplicate");
  };

  const handleDeleteHost = (id: string) => {
    const host = sshHosts.find((h) => h.id === id);
    if (!host) return;
    if (!window.confirm(`确定删除主机「${host.name}」吗？`)) return;
    onChange({ sshHosts: sshHosts.filter((h) => h.id !== id) });
  };

  // 新增分组：分组由主机的 group 字段聚合而来，没有独立实体。
  // 这里 prompt 分组名后预填到 add 表单的 group 字段，分组随首个主机一起创建。
  const handleAddGroup = () => {
    const name = window.prompt("输入新分组名称");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed === UNGROUPED) {
      window.alert(`「${UNGROUPED}」是保留名，请用其他名称`);
      return;
    }
    if (groups.some(([g]) => g === trimmed)) {
      window.alert(`分组「${trimmed}」已存在`);
      return;
    }
    setForm({ ...EMPTY_FORM, group: trimmed });
    setFormMode("add");
  };

  const handleCancelForm = () => {
    setForm(EMPTY_FORM);
    setFormMode(null);
    setEditingId(null);
  };

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const startRenameGroup = (name: string) => {
    setRenamingGroup(name);
    setRenameValue(name);
  };

  const cancelRenameGroup = () => {
    setRenamingGroup(null);
    setRenameValue("");
  };

  const commitRenameGroup = (oldName: string) => {
    const newName = renameValue.trim();
    setRenamingGroup(null);
    setRenameValue("");
    if (!newName || newName === oldName) return;
    onChange({
      sshHosts: sshHosts.map((h) =>
        h.group === oldName ? { ...h, group: newName } : h,
      ),
    });
  };

  const handleTestHost = async (host: SshHost) => {
    setTestStatus((prev) => ({ ...prev, [host.id]: "testing" }));
    try {
      // renderer 侧解析 credentialId → 实际 password/privateKeyPath
      const target = resolveCredential(host.credentialId);
      const jump = resolveCredential(host.proxyJumpCredentialId);
      const result = await api.invoke("ssh:test", {
        host: host.host,
        port: host.port,
        user: host.user,
        authMethod: host.authMethod,
        password: target.password,
        privateKeyPath: target.privateKeyPath,
        proxyJump: host.proxyJump,
        proxyJumpAuthMethod: host.proxyJumpAuthMethod,
        proxyJumpPassword: jump.password,
        proxyJumpPrivateKeyPath: jump.privateKeyPath,
      });
      setTestStatus((prev) => ({
        ...prev,
        [host.id]: result?.ok ? "ok" : "fail",
      }));
      // 5 秒后清除状态
      setTimeout(() => {
        setTestStatus((prev) => {
          const next = { ...prev };
          delete next[host.id];
          return next;
        });
      }, 5000);
    } catch {
      setTestStatus((prev) => ({ ...prev, [host.id]: "fail" }));
      setTimeout(() => {
        setTestStatus((prev) => {
          const next = { ...prev };
          delete next[host.id];
          return next;
        });
      }, 5000);
    }
  };

  const handleImportConfig = async () => {
    const result = await api.invoke("file:select", {
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "SSH Config", extensions: ["config", "*"] }],
    });
    if (!Array.isArray(result) || result.length === 0) return;
    const files: Array<{ name: string; path: string; content: string }> = [];
    for (const f of result) {
      if (!f?.path) continue;
      // file:read 返回 { kind: 'text', text, name, size }（强制 kind: 'text' 跳过图片探测）
      const read = await api.invoke("file:read", { path: f.path, kind: "text" });
      const name = (read?.name as string) || f.path.split("/").pop() || f.path;
      const content = typeof read?.text === "string" ? read.text : "";
      if (content) files.push({ name, path: f.path, content });
    }
    if (files.length === 0) return;
    const parsed = await api.invoke("ssh:import_configs", { files });
    if (!parsed?.hosts?.length) {
      window.alert("未从所选文件中解析到任何 SSH 主机");
      return;
    }
    // 去重合并：以 host|user|port 为键
    const existingKeys = new Set(sshHosts.map((h) => `${h.host}|${h.user}|${h.port}`));
    const newHosts = parsed.hosts.filter(
      (h: SshHost) => !existingKeys.has(`${h.host}|${h.user}|${h.port}`),
    );
    if (newHosts.length === 0) {
      window.alert("导入的主机均已存在，已跳过");
      return;
    }
    onChange({ sshHosts: [...sshHosts, ...newHosts] });
    window.alert(
      `已导入 ${newHosts.length} 个主机（跳过 ${parsed.hosts.length - newHosts.length} 个重复）`,
    );
  };

  // —— 凭据 CRUD ——
  const credTitle = credFormMode === "edit" ? "编辑凭据" : "添加凭据";

  const handleCancelCredForm = () => {
    setCredForm(EMPTY_CRED_FORM);
    setCredFormMode(null);
    setEditingCredId(null);
    setShowCredPassword(false);
  };

  const handleSubmitCred = () => {
    const name = credForm.name.trim();
    if (!name) return;
    // 密码与私钥至少填一个
    if (!credForm.password && !credForm.privateKeyPath.trim()) {
      window.alert("密码和私钥路径至少填写一项");
      return;
    }
    const cred: SshCredential = {
      id: editingCredId || `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      password: credForm.password || undefined,
      privateKeyPath: credForm.privateKeyPath.trim() || undefined,
      note: credForm.note.trim() || undefined,
    };
    if (credFormMode === "edit" && editingCredId) {
      onChange({ sshCredentials: sshCredentials.map((c) => (c.id === editingCredId ? cred : c)) });
    } else {
      onChange({ sshCredentials: [...sshCredentials, cred] });
    }
    handleCancelCredForm();
  };

  const handleEditCred = (cred: SshCredential) => {
    setCredForm({
      name: cred.name,
      password: cred.password ?? "",
      privateKeyPath: cred.privateKeyPath ?? "",
      note: cred.note ?? "",
    });
    setEditingCredId(cred.id);
    setCredFormMode("edit");
  };

  const handleDeleteCred = (id: string) => {
    const cred = sshCredentials.find((c) => c.id === id);
    if (!cred) return;
    // 扫描引用：sshHosts + sshRecent
    const refCount =
      sshHosts.filter((h) => h.credentialId === id || h.proxyJumpCredentialId === id).length +
      settings.sshRecent.filter((e) => e.host.credentialId === id || e.host.proxyJumpCredentialId === id).length;
    const msg = refCount > 0
      ? `凭据「${cred.name}」被 ${refCount} 处主机引用，删除后这些主机将无法连接。确定删除？`
      : `确定删除凭据「${cred.name}」吗？`;
    if (!window.confirm(msg)) return;
    // 删除凭据，并解除主机侧 + 最近连接侧的引用（置空 credentialId）
    onChange({
      sshCredentials: sshCredentials.filter((c) => c.id !== id),
      sshHosts: sshHosts.map((h) => ({
        ...h,
        credentialId: h.credentialId === id ? undefined : h.credentialId,
        proxyJumpCredentialId: h.proxyJumpCredentialId === id ? undefined : h.proxyJumpCredentialId,
      })),
      sshRecent: settings.sshRecent.map((e) => ({
        ...e,
        host: {
          ...e.host,
          credentialId: e.host.credentialId === id ? undefined : e.host.credentialId,
          proxyJumpCredentialId: e.host.proxyJumpCredentialId === id ? undefined : e.host.proxyJumpCredentialId,
        },
      })),
    });
  };

  const handlePickCredKeyFile = async () => {
    const result = await api.invoke("file:select", {
      properties: ["openFile"],
      filters: [{ name: "All Files", extensions: ["*"] }],
    });
    if (Array.isArray(result) && result.length > 0 && result[0]?.path) {
      setCredForm((f) => ({ ...f, privateKeyPath: result[0].path }));
    }
  };

  // 凭据类型徽标文字
  const credKindLabel = (c: SshCredential) => {
    if (c.password && c.privateKeyPath) return "密码+私钥";
    if (c.password) return "密码";
    if (c.privateKeyPath) return "私钥";
    return "—";
  };

  // 表单弹窗 Esc 关闭（凭据弹窗也覆盖）
  useEffect(() => {
    if (formMode === null && credFormMode === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (formMode !== null) handleCancelForm();
        else handleCancelCredForm();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [formMode, credFormMode]);

  const formTitle =
    formMode === "edit" ? "编辑主机" : formMode === "quick" ? "快速连接" : formMode === "duplicate" ? "复制主机" : "添加主机";
  const submitLabel = formMode === "edit" ? "保存" : formMode === "quick" ? "连接" : formMode === "duplicate" ? "添加" : "添加";

  return (
    <div className={`terminal-settings-tab${isActive ? " active" : ""}`}>
      <div className="terminal-settings-tabstrip">
        <button
          type="button"
          className={`terminal-tabstrip-btn${activeSection === "appearance" ? " active" : ""}`}
          onClick={() => setActiveSection("appearance")}
        >
          终端外观
        </button>
        <button
          type="button"
          className={`terminal-tabstrip-btn${activeSection === "ssh" ? " active" : ""}`}
          onClick={() => setActiveSection("ssh")}
        >
          SSH 主机
        </button>
        <button
          type="button"
          className={`terminal-tabstrip-btn${activeSection === "credentials" ? " active" : ""}`}
          onClick={() => setActiveSection("credentials")}
        >
          凭据
        </button>
      </div>

      <main className="terminal-settings-content">
        {activeSection === "appearance" && (
          <section className="settings-section terminal-appearance-section">
            <div className="terminal-appearance-grid">
              <div className="field-row">
                <label>字号</label>
                <input
                  type="number"
                  min={8}
                  max={32}
                  value={terminal.fontSize}
                  onChange={(e) => updateTerminal({ fontSize: Number(e.target.value) })}
                />
              </div>

              <div className="field-row">
                <label>光标样式</label>
                <select
                  value={terminal.cursorStyle}
                  onChange={(e) => updateTerminal({ cursorStyle: e.target.value as CursorStyle })}
                >
                  <option value="block">方块</option>
                  <option value="beam">竖线</option>
                  <option value="underline">下划线</option>
                </select>
              </div>

              <div className="field-row">
                <label>字体</label>
                <input
                  type="text"
                  value={terminal.fontFamily}
                  onChange={(e) => updateTerminal({ fontFamily: e.target.value })}
                />
              </div>

              <div className="field-row">
                <label>回滚行数</label>
                <input
                  type="number"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={terminal.scrollback}
                  onChange={(e) => updateTerminal({ scrollback: Number(e.target.value) })}
                />
              </div>
            </div>
          </section>
        )}

        {activeSection === "ssh" && (
          <section className="settings-section">
            <div className="ssh-section-actions">
              <button
                type="button"
                className="link-btn"
                onClick={handleAddGroup}
              >
                + 新增分组
              </button>
              <button
                type="button"
                className="ssh-primary-btn"
                onClick={() => { setForm(EMPTY_FORM); setFormMode("add"); }}
              >
                + 添加主机
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => { setForm(EMPTY_FORM); setFormMode("quick"); }}
              >
                快速连接
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={handleImportConfig}
              >
                导入 SSH Config
              </button>
            </div>

            {groups.map(([groupName, hosts]) => {
              const collapsed = collapsedGroups[groupName];
              const isUngrouped = groupName === UNGROUPED;
              return (
                <div key={groupName} className="ssh-group">
                  <div
                    className={`ssh-group-header${collapsed ? " collapsed" : ""}${isUngrouped ? " is-ungrouped" : ""}`}
                    onClick={() => toggleGroup(groupName)}
                  >
                    <span className="toggle-arrow">▼</span>
                    {renamingGroup === groupName ? (
                      <input
                        className="ssh-group-rename-input"
                        autoFocus
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRenameGroup(groupName);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelRenameGroup();
                          }
                        }}
                        onBlur={() => commitRenameGroup(groupName)}
                      />
                    ) : (
                      <span
                        className="ssh-group-name"
                        onDoubleClick={
                          isUngrouped
                            ? undefined
                            : (e) => {
                                e.stopPropagation();
                                startRenameGroup(groupName);
                              }
                        }
                        title={isUngrouped ? "默认分组" : "双击重命名分组"}
                      >
                        {groupName}
                      </span>
                    )}
                    <span className="ssh-group-count">({hosts.length})</span>
                    {!isUngrouped && renamingGroup !== groupName && (
                      <button
                        type="button"
                        className="ssh-group-rename-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenameGroup(groupName);
                        }}
                        title="重命名分组"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className={`ssh-group-hosts${collapsed ? " collapsed" : ""}`}>
                    {hosts.map((host) => {
                      const status = testStatus[host.id];
                      return (
                        <div key={host.id} className="ssh-host-item">
                          <div className="ssh-host-info">
                            <span className="ssh-host-name">{host.name}</span>
                            <span className="ssh-host-detail">
                              {host.user}@{host.host}:{host.port}
                              {host.proxyJump ? ` via ${host.proxyJump}` : ""}
                            </span>
                          </div>
                          <div className="ssh-host-actions">
                            <button
                              type="button"
                              className="ssh-host-connect-btn"
                              onClick={() => onConnectSsh(host.id)}
                            >
                              连接
                            </button>
                            <button
                              type="button"
                              className={`ssh-host-icon-btn test-btn ${status || ""}`}
                              onClick={() => handleTestHost(host)}
                              disabled={status === "testing"}
                              title={status === "testing" ? "测试中" : status === "ok" ? "连接正常" : status === "fail" ? "连接失败" : "测试连接"}
                            >
                              {status === "testing" ? "···" : status === "ok" ? "✓" : status === "fail" ? "✗" : "测试"}
                            </button>
                            <button
                              type="button"
                              className="ssh-host-icon-btn"
                              onClick={() => handleEditHost(host)}
                              title="编辑"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                              type="button"
                              className="ssh-host-icon-btn"
                              onClick={() => handleDuplicateHost(host)}
                              title="复制"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                            <button
                              type="button"
                              className="ssh-host-icon-btn danger"
                              onClick={() => handleDeleteHost(host.id)}
                              title="删除"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {activeSection === "credentials" && (
          <section className="settings-section">
            <div className="ssh-section-actions">
              <button
                type="button"
                className="ssh-primary-btn"
                onClick={() => {
                  setCredForm(EMPTY_CRED_FORM);
                  setEditingCredId(null);
                  setCredFormMode("add");
                }}
              >
                + 添加凭据
              </button>
            </div>

            {sshCredentials.length === 0 ? (
              <div className="ssh-credential-empty">
                还没有凭据。添加一个密码或私钥路径，可在多台 SSH 主机间复用。
              </div>
            ) : (
              <div className="ssh-credential-list">
                {sshCredentials.map((cred) => {
                  const refCount =
                    sshHosts.filter((h) => h.credentialId === cred.id || h.proxyJumpCredentialId === cred.id).length +
                    settings.sshRecent.filter((e) => e.host.credentialId === cred.id || e.host.proxyJumpCredentialId === cred.id).length;
                  return (
                    <div key={cred.id} className="ssh-credential-item">
                      <div className="ssh-credential-info">
                        <div className="ssh-credential-row">
                          <span className="ssh-credential-name">{cred.name}</span>
                          <span className="ssh-credential-badge">{credKindLabel(cred)}</span>
                          {refCount > 0 && (
                            <span className="ssh-credential-ref">{refCount} 处引用</span>
                          )}
                        </div>
                        <div className="ssh-credential-value">
                          {cred.password && (
                            <>
                              <span className="ssh-credential-value-label">密码</span>
                              <span className="ssh-credential-value-text">
                                {revealedCreds[cred.id] ? cred.password : "••••••"}
                              </span>
                              <button
                                type="button"
                                className="ssh-credential-toggle"
                                onClick={() =>
                                  setRevealedCreds((prev) => ({ ...prev, [cred.id]: !prev[cred.id] }))
                                }
                                title={revealedCreds[cred.id] ? "隐藏" : "显示"}
                              >
                                {revealedCreds[cred.id] ? "🙈" : "👁"}
                              </button>
                            </>
                          )}
                          {cred.privateKeyPath && (
                            <>
                              <span className="ssh-credential-value-label">私钥</span>
                              <span className="ssh-credential-value-text mono">{cred.privateKeyPath}</span>
                            </>
                          )}
                        </div>
                        {cred.note && <div className="ssh-credential-note">{cred.note}</div>}
                      </div>
                      <div className="ssh-credential-actions">
                        <button
                          type="button"
                          className="ssh-host-icon-btn"
                          onClick={() => handleEditCred(cred)}
                          title="编辑"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          type="button"
                          className="ssh-host-icon-btn danger"
                          onClick={() => handleDeleteCred(cred.id)}
                          title="删除"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {formMode !== null && (
        <div className="ssh-modal-overlay" onClick={handleCancelForm}>
          <div className="ssh-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ssh-modal-header">
              <span className="ssh-modal-title">{formTitle}</span>
              <button
                type="button"
                className="ssh-modal-close"
                onClick={handleCancelForm}
                title="关闭"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="ssh-modal-body">
              <div className="ssh-form-group">
                <span className="ssh-form-group-label">基本信息</span>
                <div className="field-row">
                  <label>名称</label>
                  <input
                    type="text"
                    value={form.name}
                    placeholder="我的服务器"
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="ssh-form-row-2">
                  <div className="field-row ssh-form-host">
                    <label>主机</label>
                    <input
                      type="text"
                      value={form.host}
                      placeholder="example.com 或 IP"
                      onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                    />
                  </div>
                  <div className="field-row ssh-form-port">
                    <label>端口</label>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={form.port}
                      onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <label>用户名</label>
                  <input
                    type="text"
                    value={form.user}
                    placeholder="root"
                    onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                  />
                </div>
                <div className="field-row">
                  <label>分组</label>
                  <input
                    type="text"
                    list="ssh-group-list"
                    value={form.group}
                    placeholder="未分组"
                    onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                  />
                  <datalist id="ssh-group-list">
                    {groups.map(([g]) => g !== UNGROUPED && <option key={g} value={g} />)}
                  </datalist>
                </div>
              </div>

              <div className="ssh-form-group">
                <span className="ssh-form-group-label">认证</span>
                <div className="field-row">
                  <label>认证方式</label>
                  <select
                    value={form.authMethod}
                    onChange={(e) => setForm((f) => ({ ...f, authMethod: e.target.value as SshAuthMethod }))}
                  >
                    <option value="auto">自动（推荐）</option>
                    <option value="password">密码</option>
                    <option value="privateKey">私钥文件</option>
                    <option value="agent">SSH Agent</option>
                  </select>
                </div>
                {form.authMethod !== "agent" && (
                  <div className="field-row">
                    <label>凭据</label>
                    <select
                      value={form.credentialId}
                      onChange={(e) => setForm((f) => ({ ...f, credentialId: e.target.value }))}
                    >
                      <option value="">（无，靠 Agent / 默认私钥）</option>
                      {sshCredentials
                        .filter((c) => {
                          // password 模式：只列有密码的；privateKey 模式：只列有私钥的；auto 模式：全列
                          if (form.authMethod === "password") return !!c.password;
                          if (form.authMethod === "privateKey") return !!c.privateKeyPath;
                          return true;
                        })
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.password && c.privateKeyPath ? "（密码+私钥）" : c.password ? "（密码）" : "（私钥）"}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setActiveSection("credentials")}
                      title="去凭据 tab 管理"
                    >
                      管理
                    </button>
                  </div>
                )}
                {form.authMethod !== "agent" && !form.credentialId && (
                  <div className="ssh-form-hint">
                    未选择凭据时，{form.authMethod === "auto" ? "将依赖 SSH Agent 或 ~/.ssh/ 默认私钥" : "连接将失败"}。可在「凭据」tab 创建凭据。
                  </div>
                )}
              </div>

              <div className="ssh-form-group">
                <span className="ssh-form-group-label">高级</span>
                <div className="field-row">
                  <label>跳板机</label>
                  <input
                    type="text"
                    value={form.proxyJump}
                    placeholder="user@jump-host:port（可选）"
                    onChange={(e) => setForm((f) => ({ ...f, proxyJump: e.target.value }))}
                  />
                </div>
                {form.proxyJump.trim() && (
                  <>
                    <div className="field-row">
                      <label>跳板认证方式</label>
                      <select
                        value={form.proxyJumpAuthMethod}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            proxyJumpAuthMethod: e.target.value as SshAuthMethod,
                          }))
                        }
                      >
                        <option value="auto">自动（推荐）</option>
                        <option value="password">密码</option>
                        <option value="privateKey">私钥文件</option>
                        <option value="agent">SSH Agent</option>
                      </select>
                    </div>
                    {form.proxyJumpAuthMethod !== "agent" && (
                      <div className="field-row">
                        <label>跳板凭据</label>
                        <select
                          value={form.proxyJumpCredentialId}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, proxyJumpCredentialId: e.target.value }))
                          }
                        >
                          <option value="">（无，靠 Agent / 默认私钥）</option>
                          {sshCredentials
                            .filter((c) => {
                              if (form.proxyJumpAuthMethod === "password") return !!c.password;
                              if (form.proxyJumpAuthMethod === "privateKey") return !!c.privateKeyPath;
                              return true;
                            })
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}{c.password && c.privateKeyPath ? "（密码+私钥）" : c.password ? "（密码）" : "（私钥）"}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setActiveSection("credentials")}
                          title="去凭据 tab 管理"
                        >
                          管理
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="ssh-modal-footer">
              <button type="button" className="link-btn" onClick={handleCancelForm}>
                取消
              </button>
              <button type="button" className="ssh-modal-submit" onClick={handleSubmit}>
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {credFormMode !== null && (
        <div className="ssh-modal-overlay" onClick={handleCancelCredForm}>
          <div className="ssh-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ssh-modal-header">
              <span className="ssh-modal-title">{credTitle}</span>
              <button
                type="button"
                className="ssh-modal-close"
                onClick={handleCancelCredForm}
                title="关闭"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="ssh-modal-body">
              <div className="ssh-form-group">
                <span className="ssh-form-group-label">凭据信息</span>
                <div className="field-row">
                  <label>名称</label>
                  <input
                    type="text"
                    value={credForm.name}
                    placeholder="例如：公司跳板机密钥"
                    onChange={(e) => setCredForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field-row">
                  <label>密码</label>
                  <input
                    type={showCredPassword ? "text" : "password"}
                    value={credForm.password}
                    placeholder="（可选）留空则不使用密码"
                    onChange={(e) => setCredForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setShowCredPassword((v) => !v)}
                    title={showCredPassword ? "隐藏" : "显示"}
                  >
                    {showCredPassword ? "隐藏" : "显示"}
                  </button>
                </div>
                <div className="field-row">
                  <label>私钥路径</label>
                  <input
                    type="text"
                    value={credForm.privateKeyPath}
                    placeholder="（可选）如 ~/.ssh/id_ed25519"
                    onChange={(e) => setCredForm((f) => ({ ...f, privateKeyPath: e.target.value }))}
                  />
                  <button type="button" className="link-btn" onClick={handlePickCredKeyFile}>
                    选择
                  </button>
                </div>
                <div className="field-row">
                  <label>备注</label>
                  <input
                    type="text"
                    value={credForm.note}
                    placeholder="（可选）"
                    onChange={(e) => setCredForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <div className="ssh-form-hint">
                  密码和私钥路径至少填写一项。一个凭据可同时持有两者（适配「自动」认证模式）。
                </div>
              </div>
            </div>
            <div className="ssh-modal-footer">
              <button type="button" className="link-btn" onClick={handleCancelCredForm}>
                取消
              </button>
              <button type="button" className="ssh-modal-submit" onClick={handleSubmitCred}>
                {credFormMode === "edit" ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
