import { useEffect, useMemo, useState } from "react";
import type { AppSettings } from "../../shared/settings";
import type { SshHost, SshAuthMethod, CursorStyle } from "../../shared/terminalSettings";

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
  password: string;
  privateKeyPath: string;
  group: string;
  proxyJump: string;
}

const EMPTY_FORM: HostForm = {
  name: "",
  host: "",
  port: 22,
  user: "",
  authMethod: "auto",
  password: "",
  privateKeyPath: "",
  group: "",
  proxyJump: "",
};

type Section = "appearance" | "ssh";
type FormMode = "add" | "edit" | "quick";
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

  const { terminal, sshHosts } = settings;

  // 按 group 聚合：空 group 归入 "未分组"
  const groups = useMemo(() => {
    const map = new Map<string, SshHost[]>();
    for (const h of sshHosts) {
      const g = h.group?.trim() || UNGROUPED;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(h);
    }
    return Array.from(map.entries());
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
    const isAuto = form.authMethod === "auto";
    const baseHost: SshHost = {
      name: form.name.trim(),
      host: form.host.trim(),
      port: form.port || 22,
      user: form.user.trim(),
      authMethod: form.authMethod,
      // auto 模式下保留所有非空凭据，由 ssh2 依次尝试；其他模式只保留对应字段
      password: (isAuto || form.authMethod === "password") ? form.password || undefined : undefined,
      privateKeyPath: (isAuto || form.authMethod === "privateKey") ? form.privateKeyPath || undefined : undefined,
      group: form.group.trim() || undefined,
      proxyJump: form.proxyJump.trim() || undefined,
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
    } else if (formMode === "add") {
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
      password: host.password ?? "",
      privateKeyPath: host.privateKeyPath ?? "",
      group: host.group ?? "",
      proxyJump: host.proxyJump ?? "",
    });
    setEditingId(host.id);
    setFormMode("edit");
  };

  const handleDeleteHost = (id: string) => {
    onChange({ sshHosts: sshHosts.filter((h) => h.id !== id) });
  };

  const handleCancelForm = () => {
    setForm(EMPTY_FORM);
    setFormMode(null);
    setEditingId(null);
  };

  // 表单弹窗打开时 Esc 关闭
  useEffect(() => {
    if (formMode === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancelForm();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [formMode]);

  const handlePickKeyFile = async () => {
    const result = await api.invoke("file:select", {
      properties: ["openFile"],
      filters: [{ name: "All Files", extensions: ["*"] }],
    });
    if (Array.isArray(result) && result.length > 0 && result[0]?.path) {
      setForm((f) => ({ ...f, privateKeyPath: result[0].path }));
    }
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
      const result = await api.invoke("ssh:test", {
        host: host.host,
        port: host.port,
        user: host.user,
        authMethod: host.authMethod,
        password: host.password,
        privateKeyPath: host.privateKeyPath,
        proxyJump: host.proxyJump,
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

  const formTitle =
    formMode === "edit" ? "编辑主机" : formMode === "quick" ? "快速连接" : "添加主机";
  const submitLabel = formMode === "edit" ? "保存" : formMode === "quick" ? "连接" : "添加";

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
            {sshHosts.length === 0 && formMode === null && (
              <div className="ssh-empty-state">
                <p className="ssh-empty-text">暂无保存的 SSH 主机</p>
                <button
                  type="button"
                  className="ssh-empty-cta"
                  onClick={() => { setForm(EMPTY_FORM); setFormMode("add"); }}
                >
                  + 添加第一个主机
                </button>
              </div>
            )}

            {groups.map(([groupName, hosts]) => {
              const collapsed = collapsedGroups[groupName];
              const isUngrouped = groupName === UNGROUPED;
              return (
                <div key={groupName} className="ssh-group">
                  {!isUngrouped && (
                    <div
                      className={`ssh-group-header${collapsed ? " collapsed" : ""}`}
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
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            startRenameGroup(groupName);
                          }}
                          title="双击重命名分组"
                        >
                          {groupName}
                        </span>
                      )}
                      <span className="ssh-group-count">({hosts.length})</span>
                      {renamingGroup !== groupName && (
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
                  )}
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

            <div className="ssh-section-actions">
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
                {(form.authMethod === "auto" || form.authMethod === "password") && (
                  <div className="field-row">
                    <label>密码</label>
                    <input
                      type="password"
                      value={form.password}
                      placeholder={form.authMethod === "auto" ? "留空则不使用密码" : ""}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                )}
                {(form.authMethod === "auto" || form.authMethod === "privateKey") && (
                  <div className="field-row">
                    <label>私钥路径</label>
                    <input
                      type="text"
                      value={form.privateKeyPath}
                      placeholder={form.authMethod === "auto" ? "留空则不使用私钥，如 ~/.ssh/id_ed25519" : "~/.ssh/id_rsa"}
                      onChange={(e) => setForm((f) => ({ ...f, privateKeyPath: e.target.value }))}
                    />
                    <button type="button" className="link-btn" onClick={handlePickKeyFile}>
                      选择
                    </button>
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
    </div>
  );
}
