import { useState, useEffect, useCallback } from "react";
import "./OmpSettingsPage.css";

const api = window.electronAPI;

type SettingsTab =
  | "general"
  | "providers"
  | "extensions"
  | "skills"
  | "usage"
  | "about";

interface Props {
  onBack: () => void;
  thinkingLevel: string;
  autoCompact: boolean;
  showThinking: boolean;
  ompModel: string | null;
  ompVersion: string | null;
  onThinkingLevelChange: (level: string) => void;
  onAutoCompactChange: (v: boolean) => void;
  onShowThinkingChange: (v: boolean) => void;
}

// ─── General tab ─────────────────────────────────────────────────────────────

function GeneralTab({
  thinkingLevel,
  autoCompact,
  showThinking,
  ompModel,
  ompVersion,
  onThinkingLevelChange,
  onAutoCompactChange,
  onShowThinkingChange,
}: Omit<Props, "onBack">) {
  const [compacting, setCompacting] = useState(false);

  return (
    <div className="os-content">
      {(ompModel || ompVersion) && (
        <div className="os-section">
          <div className="os-section-title">当前状态</div>
          {ompModel && (
            <div className="os-info-row">
              <span>模型</span>
              <span className="os-info-val">{ompModel}</span>
            </div>
          )}
          {ompVersion && (
            <div className="os-info-row">
              <span>版本</span>
              <span className="os-info-val">{ompVersion}</span>
            </div>
          )}
        </div>
      )}
      <div className="os-section">
        <div className="os-section-title">思考强度</div>
        <div className="os-level-row">
          {(["off", "low", "medium", "high"] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`os-level-btn${thinkingLevel === lvl ? " active" : ""}`}
              onClick={async () => {
                onThinkingLevelChange(lvl);
                await api
                  .invoke("omp:set_thinking_level", { level: lvl })
                  .catch(() => {});
              }}
            >
              {lvl === "off"
                ? "关闭"
                : lvl === "low"
                  ? "低"
                  : lvl === "medium"
                    ? "中"
                    : "高"}
            </button>
          ))}
        </div>
      </div>
      <div className="os-section">
        <div className="os-section-title">上下文压缩</div>
        <div className="os-row">
          <span className="os-row-label">自动压缩</span>
          <button
            type="button"
            className={`os-toggle${autoCompact ? " on" : ""}`}
            onClick={async () => {
              const next = !autoCompact;
              onAutoCompactChange(next);
              await api
                .invoke("omp:set_auto_compaction", { enabled: next })
                .catch(() => {});
            }}
          />
        </div>
        <button
          type="button"
          className="os-action-btn"
          disabled={compacting}
          onClick={async () => {
            setCompacting(true);
            await api.invoke("omp:compact").catch(() => {});
            setTimeout(() => setCompacting(false), 2000);
          }}
        >
          {compacting ? "压缩中…" : "立即压缩上下文"}
        </button>
      </div>
      <div className="os-section">
        <div className="os-section-title">显示</div>
        <div className="os-row">
          <span className="os-row-label">显示思考块</span>
          <button
            type="button"
            className={`os-toggle${showThinking ? " on" : ""}`}
            onClick={() => onShowThinkingChange(!showThinking)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Authentication tab ───────────────────────────────────────────────────────

interface Provider {
  provider: string;
  displayName?: string;
  configured: boolean;
  source?: string;
  label?: string;
}

function AuthTab() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // sendRpcAndWait resolves to response.data, so result is { providers: [...] }
      const resp = (await api.invoke("omp:list_auth_status")) as {
        providers?: Provider[];
      } | null;
      if (resp == null) {
        setError("无法连接到 omp，请确认 omp 进程正在运行");
      } else {
        setProviders(resp.providers ?? []);
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSet = async (provider: string) => {
    if (!keyInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // null means the RPC failed or timed out
      const resp = await api.invoke("omp:set_api_key", {
        provider,
        apiKey: keyInput.trim(),
      });
      if (resp != null) {
        setEditingProvider(null);
        setKeyInput("");
        await load();
      } else {
        setError("保存失败，请检查 omp 是否运行");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (provider: string) => {
    if (!confirm(`移除 ${provider} 的 API Key？`)) return;
    await api.invoke("omp:remove_api_key", { provider }).catch(() => {});
    await load();
  };

  if (loading) return <div className="os-loading">加载中…</div>;

  return (
    <div className="os-content">
      {error && <div className="os-error">{error}</div>}
      {providers.length === 0 ? (
        <div className="os-empty">没有可配置的 Provider</div>
      ) : (
        <div className="os-section">
          <div className="os-section-title">API Keys</div>
          {providers.map((p) => (
            <div key={p.provider} className="os-provider-row">
              <div className="os-provider-info">
                <span className="os-provider-name">
                  {p.displayName ?? p.provider}
                </span>
                <span
                  className={`os-provider-status${p.configured ? " configured" : ""}`}
                >
                  {p.configured ? `已配置 (${p.source ?? ""})` : "未配置"}
                </span>
              </div>
              <div className="os-provider-actions">
                {editingProvider === p.provider ? (
                  <>
                    <input
                      type="password"
                      className="os-key-input"
                      placeholder="sk-..."
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSet(p.provider)
                      }
                      autoFocus
                    />
                    <button
                      type="button"
                      className="os-btn-primary"
                      disabled={saving}
                      onClick={() => handleSet(p.provider)}
                    >
                      {saving ? "…" : "保存"}
                    </button>
                    <button
                      type="button"
                      className="os-btn"
                      onClick={() => {
                        setEditingProvider(null);
                        setKeyInput("");
                      }}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="os-btn"
                      onClick={() => {
                        setEditingProvider(p.provider);
                        setKeyInput("");
                      }}
                    >
                      {p.configured ? "修改" : "设置"}
                    </button>
                    {p.configured && p.source === "stored" && (
                      <button
                        type="button"
                        className="os-btn-danger"
                        onClick={() => handleRemove(p.provider)}
                      >
                        移除
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Configuration tab ────────────────────────────────────────────────────────

function ConfigTab() {
  const [content, setContent] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    api
      .invoke("omp:get_agent_config")
      .then((resp) => {
        const r = resp as {
          success?: boolean;
          content?: string;
          path?: string;
        } | null;
        if (r?.success && r.content != null) {
          // config.yml is YAML; display as-is (no JSON pretty-print)
          setContent(r.content);
          setConfigPath(r.path ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const resp = (await api.invoke("omp:save_agent_config", { content })) as {
        success?: boolean;
        error?: string;
      } | null;
      if (resp?.success) setMessage({ type: "ok", text: "已保存" });
      else setMessage({ type: "err", text: resp?.error ?? "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="os-loading">加载中…</div>;

  return (
    <div className="os-content os-config-content">
      <div className="os-config-path">{configPath}</div>
      <textarea
        className="os-config-editor"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />
      {message && (
        <div className={`os-save-msg ${message.type}`}>{message.text}</div>
      )}
      <button
        type="button"
        className="os-btn-primary os-save-btn"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  );
}

// ─── Models config section (within Providers) ────────────────────────────────

function ModelsConfigSection() {
  const [content, setContent] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    api
      .invoke("omp:get_models_config")
      .then((resp) => {
        const r = resp as {
          success?: boolean;
          content?: string;
          path?: string;
        } | null;
        if (r?.success && r.content != null) {
          setContent(r.content);
          setConfigPath(r.path ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const resp = (await api.invoke("omp:save_models_config", {
        content,
      })) as { success?: boolean; error?: string } | null;
      if (resp?.success) setMessage({ type: "ok", text: "已保存" });
      else setMessage({ type: "err", text: resp?.error ?? "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="os-loading">加载中…</div>;

  return (
    <div className="os-config-content">
      <div className="os-config-path">{configPath}</div>
      <textarea
        className="os-config-editor"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />
      {message && (
        <div className={`os-save-msg ${message.type}`}>{message.text}</div>
      )}
      <button
        type="button"
        className="os-btn-primary os-save-btn"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  );
}

// ─── Providers tab (auth + config + models merged) ────────────────────────────

type ProvidersSection = "keys" | "agent" | "models";

function ProvidersTab() {
  const [section, setSection] = useState<ProvidersSection>("keys");

  return (
    <div className="os-providers-wrapper">
      <div className="os-sub-tabs">
        <button
          type="button"
          className={`os-sub-tab${section === "keys" ? " active" : ""}`}
          onClick={() => setSection("keys")}
        >
          API 密钥
        </button>
        <button
          type="button"
          className={`os-sub-tab${section === "agent" ? " active" : ""}`}
          onClick={() => setSection("agent")}
        >
          Agent 配置
        </button>
        <button
          type="button"
          className={`os-sub-tab${section === "models" ? " active" : ""}`}
          onClick={() => setSection("models")}
        >
          模型提供商
        </button>
      </div>
      {section === "keys" && <AuthTab />}
      {section === "agent" && <ConfigTab />}
      {section === "models" && <ModelsConfigSection />}
    </div>
  );
}

// ─── Extensions tab ───────────────────────────────────────────────────────────

interface Extension {
  name: string;
  description: string;
  dir: string;
}

function ExtensionsTab() {
  const [exts, setExts] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [installName, setInstallName] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await api.invoke("omp:list_extensions")) as Extension[];
      setExts(list ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInstall = async () => {
    const name = installName.trim();
    if (!name) return;
    setInstalling(true);
    setInstallMsg(null);
    try {
      const resp = (await api.invoke("omp:extension_install", { name })) as {
        success?: boolean;
        error?: string;
      } | null;
      if (resp?.success) {
        setInstallMsg({ type: "ok", text: `已安装 ${name}` });
        setInstallName("");
        await load();
      } else {
        setInstallMsg({ type: "err", text: resp?.error ?? "安装失败" });
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (name: string) => {
    if (!confirm(`卸载 ${name}？`)) return;
    await api.invoke("omp:extension_uninstall", { name }).catch(() => {});
    await load();
  };

  if (loading) return <div className="os-loading">加载中…</div>;

  return (
    <div className="os-content">
      <div className="os-section">
        <div className="os-section-title">安装扩展</div>
        <div className="os-row os-row-gap">
          <input
            type="text"
            className="os-key-input os-key-input-flex"
            placeholder="扩展名称 / ID"
            value={installName}
            onChange={(e) => setInstallName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInstall()}
          />
          <button
            type="button"
            className="os-btn-primary"
            disabled={installing || !installName.trim()}
            onClick={handleInstall}
          >
            {installing ? "安装中…" : "安装"}
          </button>
        </div>
        {installMsg && (
          <div className={`os-save-msg ${installMsg.type}`}>
            {installMsg.text}
          </div>
        )}
      </div>
      <div className="os-section">
        <div className="os-section-title">已安装扩展</div>
        {exts.length === 0 ? (
          <div className="os-empty">
            <div>未找到已安装的扩展</div>
            <div className="os-empty-hint">
              扩展目录：<code>~/.omp/agent/extensions/</code>
            </div>
          </div>
        ) : (
          exts.map((e) => (
            <div key={e.dir} className="os-ext-row">
              <div className="os-ext-info">
                <span className="os-ext-name">{e.name}</span>
                {e.description && (
                  <span className="os-ext-desc">{e.description}</span>
                )}
              </div>
              <button
                type="button"
                className="os-btn-danger os-btn-sm"
                onClick={() => handleUninstall(e.name)}
              >
                卸载
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Skills tab ────────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  description?: string;
  scope?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = (await api.invoke("omp:list_skills")) as
        | { skills?: Skill[] }
        | Skill[]
        | null;
      if (resp == null) {
        setError("omp 未响应，请确认 omp 已启动");
      } else {
        const list = Array.isArray(resp)
          ? resp
          : ((resp as { skills?: Skill[] }).skills ?? []);
        setSkills(list);
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (skill: Skill) => {
    const newEnabled = !skill.enabled;
    setToggling(skill.name);
    try {
      await api.invoke("omp:set_skill_enabled", {
        name: skill.name,
        enabled: newEnabled,
      });
      setSkills((prev) =>
        prev.map((s) =>
          s.name === skill.name ? { ...s, enabled: newEnabled } : s,
        ),
      );
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <div className="os-loading">加载中…</div>;

  if (error)
    return (
      <div className="os-content">
        <div className="os-error">{error}</div>
      </div>
    );

  if (skills.length === 0)
    return (
      <div className="os-content">
        <div className="os-empty">未找到技能</div>
      </div>
    );

  // Group by scope
  const grouped = skills.reduce(
    (acc, s) => {
      const scope = (s.scope as string) ?? "global";
      if (!acc[scope]) acc[scope] = [];
      acc[scope].push(s);
      return acc;
    },
    {} as Record<string, Skill[]>,
  );

  return (
    <div className="os-content">
      {Object.entries(grouped).map(([scope, scopeSkills]) => (
        <div key={scope} className="os-section">
          <div className="os-section-title">{scope}</div>
          {scopeSkills.map((skill) => (
            <div key={skill.name} className="os-row">
              <div className="os-skill-info">
                <span className="os-skill-name">{skill.name}</span>
                {skill.description && (
                  <span className="os-ext-desc">
                    {skill.description as string}
                  </span>
                )}
              </div>
              <button
                type="button"
                className={`os-toggle${skill.enabled ? " on" : ""}`}
                disabled={toggling === skill.name}
                onClick={() => handleToggle(skill)}
                title={skill.enabled ? "关闭" : "开启"}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Usage tab ────────────────────────────────────────────────────────────────

function UsageTab() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .invoke("omp:get_state")
      .then((s) => {
        setStats(s as Record<string, unknown>);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="os-loading">加载中…</div>;

  const model = stats?.model as { provider?: string; id?: string } | undefined;

  return (
    <div className="os-content">
      <div className="os-section">
        <div className="os-section-title">当前会话</div>
        {stats ? (
          <>
            {model?.id && (
              <div className="os-info-row">
                <span>模型</span>
                <span className="os-info-val">
                  {model.provider
                    ? `${model.provider} / ${model.id}`
                    : model.id}
                </span>
              </div>
            )}
            <div className="os-info-row">
              <span>思考强度</span>
              <span className="os-info-val">
                {(stats.thinkingLevel as string) || "—"}
              </span>
            </div>
            <div className="os-info-row">
              <span>自动压缩</span>
              <span className="os-info-val">
                {stats.autoCompactionEnabled ? "开启" : "关闭"}
              </span>
            </div>
            <div className="os-info-row">
              <span>流式状态</span>
              <span className="os-info-val">
                {stats.isStreaming ? "运行中" : "空闲"}
              </span>
            </div>
            <div className="os-info-row">
              <span>会话名称</span>
              <span className="os-info-val">
                {(stats.sessionName as string) || "—"}
              </span>
            </div>
            <div className="os-info-row">
              <span>会话文件</span>
              <span className="os-info-val os-info-path">
                {(stats.sessionFile as string) ?? "—"}
              </span>
            </div>
          </>
        ) : (
          <div className="os-empty">无数据</div>
        )}
      </div>
    </div>
  );
}

// ─── About tab ─────────────────────────────────────────────────────────────────

function AboutTab({ ompVersion }: { ompVersion: string | null }) {
  return (
    <div className="os-content">
      <div className="os-section">
        <div className="os-section-title">版本信息</div>
        <div className="os-info-row">
          <span>omp</span>
          <span className="os-info-val">{ompVersion ?? "—"}</span>
        </div>
      </div>
      <div className="os-section">
        <div className="os-section-title">链接</div>
        <div className="os-about-links">
          <a
            className="os-about-link"
            href="https://github.com/earendil-works/omp"
            target="_blank"
            rel="noreferrer"
          >
            omp GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main settings page ───────────────────────────────────────────────────────

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "通用" },
  { id: "providers", label: "提供商" },
  { id: "extensions", label: "扩展" },
  { id: "skills", label: "技能" },
  { id: "usage", label: "用量" },
  { id: "about", label: "关于" },
];

export default function OmpSettingsPage({
  onBack,
  thinkingLevel,
  autoCompact,
  showThinking,
  ompModel,
  ompVersion,
  onThinkingLevelChange,
  onAutoCompactChange,
  onShowThinkingChange,
}: Props) {
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <div className="os-page">
      <div className="os-nav">
        <div className="os-nav-header">
          <div className="os-nav-title">设置</div>
        </div>
        <ul className="os-nav-list">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`os-nav-btn${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="os-nav-footer">
          <button type="button" className="os-back-btn" onClick={onBack}>
            ‹ 返回聊天
          </button>
        </div>
      </div>
      <div className="os-body">
        {tab === "general" && (
          <GeneralTab
            thinkingLevel={thinkingLevel}
            autoCompact={autoCompact}
            showThinking={showThinking}
            ompModel={ompModel}
            ompVersion={ompVersion}
            onThinkingLevelChange={onThinkingLevelChange}
            onAutoCompactChange={onAutoCompactChange}
            onShowThinkingChange={onShowThinkingChange}
          />
        )}
        {tab === "providers" && <ProvidersTab />}
        {tab === "extensions" && <ExtensionsTab />}
        {tab === "skills" && <SkillsTab />}
        {tab === "usage" && <UsageTab />}
        {tab === "about" && <AboutTab ompVersion={ompVersion} />}
      </div>
    </div>
  );
}
