import { useCallback, useEffect, useMemo, useState } from "react";
import Checkbox from "../Checkbox";
import HintTip, { FieldHead } from "../HintTip";
import type { AppSettings, CustomLive2DModel } from "../../shared/settings";
import {
  DEFAULT_SETTINGS,
  normalizeSpeechBubbleMaxChars,
} from "../../shared/settings";
import { notifyLive2DSpeechBubble } from "../../shared/speechBubble";
import { isLocalModelPath, modelDisplayName } from "../../shared/live2dPaths";

const api = window.electronAPI;

interface Live2DModelOption {
  name: string;
  path: string;
  source?: "bundled" | "local";
  missing?: boolean;
}

interface ValidateModelResult {
  canceled?: boolean;
  error?: string;
  warning?: string;
  name?: string;
  path?: string;
}

interface ModelCapabilities {
  expressions: string[];
  motionGroups: string[];
}

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

const SIZE_PRESETS = [
  { label: "小", width: 80, height: 160 },
  { label: "中", width: 160, height: 320 },
  { label: "大", width: 200, height: 400 },
];

const MIN_WINDOW_WIDTH = 80;
const MIN_WINDOW_HEIGHT = 160;
const MAX_WINDOW_WIDTH = 800;
const MAX_WINDOW_HEIGHT = 1200;

const SIZE_INPUT_PATTERN = /^\d*$/;

function clampWindowSize(
  width: number,
  height: number,
): { width: number; height: number } {
  return {
    width: Math.min(
      MAX_WINDOW_WIDTH,
      Math.max(MIN_WINDOW_WIDTH, Math.round(width) || MIN_WINDOW_WIDTH),
    ),
    height: Math.min(
      MAX_WINDOW_HEIGHT,
      Math.max(MIN_WINDOW_HEIGHT, Math.round(height) || MIN_WINDOW_HEIGHT),
    ),
  };
}

function SizeNumberInput({
  value,
  min,
  max,
  onChange,
  onCommit,
  deferChangeUntilCommit = false,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  deferChangeUntilCommit?: boolean;
}) {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed =
      raw === ""
        ? min
        : Math.min(max, Math.max(min, Math.round(Number(raw)) || min));
    onChange(parsed);
    onCommit?.(parsed);
    setDraft(String(parsed));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (!SIZE_INPUT_PATTERN.test(raw)) return;
        setDraft(raw);
        if (!deferChangeUntilCommit && raw !== "") {
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }
      }}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}

const EMPTY_CAPS: ModelCapabilities = { expressions: [], motionGroups: [] };

const DEFAULT_SPEECH_BUBBLE_TEST_TEXT = "你好呀(｡･∀･)ﾉﾞ";

const OFFSET_INPUT_PATTERN = /^-?\d*$/;

function formatOffsetDisplay(value: number): string {
  return value === 0 ? "" : String(value);
}

function parseOffsetInput(raw: string): number {
  if (raw === "" || raw === "-") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function OffsetNumberInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(() => formatOffsetDisplay(value));

  useEffect(() => {
    setDraft(formatOffsetDisplay(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (!OFFSET_INPUT_PATTERN.test(raw)) return;
        setDraft(raw);
        if (raw !== "" && raw !== "-") {
          onChange(parseOffsetInput(raw));
        }
      }}
      onBlur={() => {
        const next = parseOffsetInput(draft);
        onChange(next);
        setDraft(formatOffsetDisplay(next));
      }}
    />
  );
}

export default function Live2DSettingsSection({ settings, onChange }: Props) {
  const [models, setModels] = useState<Live2DModelOption[]>([]);
  const [caps, setCaps] = useState<ModelCapabilities>(EMPTY_CAPS);
  const [pickError, setPickError] = useState<string | null>(null);
  const [pickWarning, setPickWarning] = useState<string | null>(null);
  const [bubbleTestText, setBubbleTestText] = useState(
    DEFAULT_SPEECH_BUBBLE_TEST_TEXT,
  );

  const refreshModels = useCallback(() => {
    api
      .invoke("live2d:list_models")
      .then((list) => setModels(Array.isArray(list) ? list : []))
      .catch(() => setModels([]));
  }, []);

  useEffect(() => {
    refreshModels();
  }, [refreshModels, settings.customModels]);

  const displayModels = useMemo(() => {
    const bundled = models.filter((m) => m.source !== "local");
    const local = settings.customModels.map((entry) => {
      const listed = models.find((m) => m.path === entry.path);
      return {
        name: entry.name || modelDisplayName(entry.path),
        path: entry.path,
        source: "local" as const,
        missing: listed ? !!listed.missing : false,
      };
    });
    return [...bundled, ...local];
  }, [models, settings.customModels]);

  const appendCustomModel = (
    customModels: CustomLive2DModel[],
    entry: CustomLive2DModel,
  ): CustomLive2DModel[] => {
    if (customModels.some((m) => m.path === entry.path)) return customModels;
    return [...customModels, entry];
  };

  // Add a (already-validated) model path to settings + trigger a switch.
  // Bundled "/models/..." paths are not stored in customModels (they're
  // scanned from disk); only local paths are registered there.
  const registerModelPath = async (name: string, modelPath: string) => {
    const patch: Partial<AppSettings> = { modelPath };
    if (isLocalModelPath(modelPath)) {
      patch.customModels = appendCustomModel(settings.customModels, {
        name: name || modelDisplayName(modelPath),
        path: modelPath,
      });
    }
    const next = { ...settings, ...patch };
    onChange(patch);
    try {
      const r = (await api.invoke("settings:sync", next)) as {
        persisted?: boolean;
        error?: string;
      } | undefined;
      if (r && !r.persisted) {
        setPickError(
          `设置未保存到磁盘${r.error ? `：${r.error}` : "，重启后可能丢失"}`,
        );
      }
    } catch (e) {
      setPickError(
        `设置同步失败：${e instanceof Error ? e.message : String(e)}`,
      );
    }
    api.invoke("live2d:switch_model", modelPath).catch(() => {});
  };

  // Apply a validate/select result: error → surface it; otherwise register.
  // (findModel3Json already auto-picks the first match for multi-model dirs.)
  const handleValidateResult = async (result: ValidateModelResult) => {
    if (result.error) {
      setPickError(result.error);
      return;
    }
    setPickWarning(result.warning ?? null);
    if (!result.path) {
      setPickError("未选择有效的模型");
      return;
    }
    await registerModelPath(
      result.name || modelDisplayName(result.path),
      result.path,
    );
  };

  const browseLocalModel = async () => {
    setPickError(null);
    setPickWarning(null);
    try {
      const result = (await api.invoke(
        "live2d:select_model_dir",
      )) as ValidateModelResult;
      if (result.canceled) return;
      await handleValidateResult(result);
      refreshModels();
    } catch {
      setPickError("打开文件选择器失败");
    }
  };

  useEffect(() => {
    if (!settings.modelPath.trim()) {
      setCaps(EMPTY_CAPS);
      return;
    }
    api
      .invoke("live2d:inspect_model", settings.modelPath)
      .then((result) => {
        const data = result as ModelCapabilities;
        setCaps({
          expressions: Array.isArray(data?.expressions) ? data.expressions : [],
          motionGroups: Array.isArray(data?.motionGroups)
            ? data.motionGroups
            : [],
        });
      })
      .catch(() => setCaps(EMPTY_CAPS));
  }, [settings.modelPath]);

  const selectModel = (model: Live2DModelOption) => {
    if (model.missing) {
      setPickError("该模型文件已失效，请重新选择目录或从列表中移除");
      return;
    }
    setPickError(null);
    onChange({ modelPath: model.path });
    api.invoke("live2d:switch_model", model.path).catch(() => {});
  };

  /** Remove from app settings only; model files on disk are never deleted. */
  const unlistLocalModel = (model: Live2DModelOption) => {
    const label = model.name || modelDisplayName(model.path);
    if (
      !window.confirm(
        `确定从应用列表中移除「${label}」吗？\n\n仅从 DesktopFairy 配置中取消引用，不会删除磁盘上的模型文件。`,
      )
    ) {
      return;
    }
    setPickError(null);
    const nextCustom = settings.customModels.filter(
      (m) => m.path !== model.path,
    );
    const patch: Partial<AppSettings> = { customModels: nextCustom };
    if (settings.modelPath === model.path) {
      patch.modelPath = DEFAULT_SETTINGS.modelPath;
      api
        .invoke("live2d:switch_model", DEFAULT_SETTINGS.modelPath)
        .catch(() => {});
    }
    onChange(patch);
  };

  const sendCommand = (cmd: string) => {
    api.invoke("live2d:command", cmd).catch(() => {});
  };

  const testSpeechBubble = () => {
    const text = bubbleTestText.trim() || DEFAULT_SPEECH_BUBBLE_TEST_TEXT;
    notifyLive2DSpeechBubble(text, "manual");
  };

  const hasMotions = caps.motionGroups.length > 0;
  const hasExpressions = caps.expressions.length > 0;

  return (
    <section className="settings-section live2d-settings">
      <div className="field">
        <div className="live2d-model-toolbar">
          <FieldHead hint="选择桌面上的角色。本地模型请选 .model3.json，或包含它的目录。">
            模型
          </FieldHead>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void browseLocalModel()}
          >
            浏览本地
          </button>
        </div>
        {pickError && (
          <p className="field-hint field-hint--after warn">{pickError}</p>
        )}
        {pickWarning && (
          <p className="field-hint field-hint--after">{pickWarning}</p>
        )}
        {displayModels.length > 0 ? (
          <div className="model-picker">
            {displayModels.map((model) => (
              <div key={model.path} className="model-picker-item">
                <button
                  type="button"
                  className={`model-picker-btn${settings.modelPath === model.path ? " active" : ""}${model.missing ? " missing" : ""}`}
                  onClick={() => selectModel(model)}
                  title={model.path}
                  disabled={model.missing}
                >
                  {model.name}
                  <span className="model-picker-source">
                    {model.missing
                      ? "失效"
                      : model.source === "local"
                        ? "本地"
                        : "内置"}
                  </span>
                </button>
                {model.source === "local" && (
                  <button
                    type="button"
                    className="model-picker-remove-btn"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      unlistLocalModel(model);
                    }}
                    title="从应用列表移除（不删除源文件）"
                    aria-label={`从应用列表移除 ${model.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="live2d-status-line">
            未找到模型。把内置模型放到 public/models/，或浏览本地文件。
          </p>
        )}
      </div>

      <div className="field">
        <FieldHead
          htmlFor="live2d-model-path"
          hint="内置模型以 /models/ 开头。本地模型填绝对路径，失焦时校验。"
        >
          路径
        </FieldHead>
        <input
          id="live2d-model-path"
          type="text"
          value={settings.modelPath}
          onChange={(e) => onChange({ modelPath: e.target.value })}
          onBlur={() => {
            const trimmed = settings.modelPath.trim();
            if (!trimmed) return;
            setPickError(null);
            setPickWarning(null);
            api
              .invoke("live2d:validate_model_path", trimmed)
              .then(async (res) => {
                await handleValidateResult(res as ValidateModelResult);
                refreshModels();
              })
              .catch(() => setPickError("路径校验失败"));
          }}
          placeholder="/models/MyModel/MyModel.model3.json"
        />
      </div>

      <div className="field">
        <FieldHead hint="试播当前模型的动作与表情。模型未配置时按钮不可用。">
          试演
        </FieldHead>
        <div className="live2d-action-row">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => sendCommand("random_motion")}
            disabled={!hasMotions}
            title={hasMotions ? "随机播放动作" : "当前模型未配置动作"}
          >
            切换动作
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => sendCommand("next_expression")}
            disabled={!hasExpressions}
            title={
              hasExpressions
                ? `依次切换表情（共 ${caps.expressions.length} 个）`
                : "当前模型未配置表情"
            }
          >
            下一个表情
          </button>
        </div>
        {!hasMotions && !hasExpressions ? (
          <p className="live2d-status-line">当前模型没有动作或表情。</p>
        ) : hasExpressions ? (
          <ul className="live2d-cap-chips">
            {caps.expressions.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="live2d-checks">
        <div className="live2d-check">
          <Checkbox
            checked={settings.live2dReactive}
            onChange={(live2dReactive) => onChange({ live2dReactive })}
            label="拟人化反应"
          />
          <HintTip tip="聊天时切换表情。关闭后恢复随机表情。" />
        </div>
        <div className="live2d-check">
          <Checkbox
            checked={settings.live2dSpeechBubble}
            onChange={(live2dSpeechBubble) => onChange({ live2dSpeechBubble })}
            label="头顶对话框"
          />
          <HintTip tip="在角色头顶显示 AI 回复摘要等短句。" />
        </div>
      </div>

      {settings.live2dSpeechBubble && (
        <div className="live2d-bubble-extras">
          <div className="field">
            <FieldHead
              htmlFor="live2d-bubble-max"
              hint="超出的文字会被截断。范围 20–120。"
            >
              最大字数
            </FieldHead>
            <div className="field-number-row">
              <input
                id="live2d-bubble-max"
                type="number"
                min={20}
                max={120}
                value={settings.live2dSpeechBubbleMaxChars}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return;
                  onChange({
                    live2dSpeechBubbleMaxChars: normalizeSpeechBubbleMaxChars(
                      Number(raw),
                    ),
                  });
                }}
                onBlur={(e) => {
                  onChange({
                    live2dSpeechBubbleMaxChars: normalizeSpeechBubbleMaxChars(
                      Number(e.target.value),
                    ),
                  });
                }}
              />
            </div>
          </div>
          <div className="live2d-bubble-test">
            <input
              type="text"
              value={bubbleTestText}
              onChange={(e) => setBubbleTestText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") testSpeechBubble();
              }}
              placeholder={DEFAULT_SPEECH_BUBBLE_TEST_TEXT}
              aria-label="对话框测试文字"
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={testSpeechBubble}
            >
              测试
            </button>
          </div>
        </div>
      )}

      <div className="live2d-stage">
        <div className="field">
          <FieldHead hint="桌宠窗口的像素尺寸。可点预设，或自己填宽高。">
            窗口大小
          </FieldHead>
          <div className="size-presets">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`size-preset-btn${settings.windowWidth === p.width && settings.windowHeight === p.height ? " active" : ""}`}
                onClick={() => {
                  onChange({ windowWidth: p.width, windowHeight: p.height });
                  api.invoke("resize_main_window", {
                    width: p.width,
                    height: p.height,
                  });
                }}
              >
                {p.label}
                <span className="size-hint">
                  {p.width}×{p.height}
                </span>
              </button>
            ))}
          </div>
          <div className="size-inputs">
            <div className="size-input-group">
              <span>宽</span>
              <SizeNumberInput
                value={settings.windowWidth}
                min={MIN_WINDOW_WIDTH}
                max={MAX_WINDOW_WIDTH}
                deferChangeUntilCommit
                onChange={(windowWidth) => {
                  const { width: w, height: h } = clampWindowSize(
                    windowWidth,
                    settings.windowHeight,
                  );
                  onChange({ windowWidth: w, windowHeight: h });
                }}
                onCommit={(width) => {
                  const { width: w, height: h } = clampWindowSize(
                    width,
                    settings.windowHeight,
                  );
                  api.invoke("resize_main_window", { width: w, height: h });
                }}
              />
            </div>
            <span className="size-sep">×</span>
            <div className="size-input-group">
              <span>高</span>
              <SizeNumberInput
                value={settings.windowHeight}
                min={MIN_WINDOW_HEIGHT}
                max={MAX_WINDOW_HEIGHT}
                deferChangeUntilCommit
                onChange={(windowHeight) => {
                  const { width: w, height: h } = clampWindowSize(
                    settings.windowWidth,
                    windowHeight,
                  );
                  onChange({ windowWidth: w, windowHeight: h });
                }}
                onCommit={(height) => {
                  const { width: w, height: h } = clampWindowSize(
                    settings.windowWidth,
                    height,
                  );
                  api.invoke("resize_main_window", { width: w, height: h });
                }}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <FieldHead htmlFor="live2d-scale" hint="角色在窗口里的放大倍率，不改变窗口本身。">
            缩放
          </FieldHead>
          <select
            id="live2d-scale"
            value={settings.modelScale}
            onChange={(e) => onChange({ modelScale: Number(e.target.value) })}
          >
            <option value={0.5}>0.5×</option>
            <option value={0.75}>0.75×</option>
            <option value={1.0}>1×</option>
            <option value={1.5}>1.5×</option>
            <option value={2.0}>2×</option>
            <option value={2.5}>2.5×</option>
          </select>
        </div>

        <div className="field">
          <div className="live2d-offset-head">
            <FieldHead hint="相对窗口中心微调，单位像素。负值向左 / 向上，正值向右 / 向下。">
              位置
            </FieldHead>
            <button
              type="button"
              className="btn-ghost live2d-offset-reset"
              onClick={() => onChange({ modelOffsetX: 0, modelOffsetY: 0 })}
            >
              重置
            </button>
          </div>
          <div className="live2d-offset-grid">
            <div className="live2d-offset-item">
              <span>左右</span>
              <OffsetNumberInput
                value={settings.modelOffsetX}
                onChange={(modelOffsetX) => onChange({ modelOffsetX })}
              />
            </div>
            <div className="live2d-offset-item">
              <span>上下</span>
              <OffsetNumberInput
                value={settings.modelOffsetY}
                onChange={(modelOffsetY) => onChange({ modelOffsetY })}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
