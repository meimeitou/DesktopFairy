import { useState } from "react";
import RadioGroup from "../RadioGroup";
import type { AppSettings } from "../../shared/settings";
import {
  FILE_PROCESSOR_LABELS,
  MINERU_DEFAULT_HOST,
  OPEN_MINERU_DEFAULT_HOST,
} from "../../shared/fileProcessing";

const api = window.electronAPI;

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

type TestState = { status: "loading" | "ok" | "error"; message: string };

export default function FileProcessingSettingsSection({ settings, onChange }: Props) {
  const fp = settings.fileProcessing;
  const processorId = fp.processorId;
  const [test, setTest] = useState<TestState | null>(null);

  const update = (patch: Partial<typeof fp>) => {
    onChange({ fileProcessing: { ...fp, ...patch } });
  };
  const updateMineru = (patch: Partial<typeof fp.mineru>) => {
    update({ mineru: { ...fp.mineru, ...patch } });
  };
  const updateOpen = (patch: Partial<typeof fp.openMineru>) => {
    update({ openMineru: { ...fp.openMineru, ...patch } });
  };

  const handleTest = async () => {
    setTest({ status: "loading", message: "检测中…" });
    try {
      await api.invoke("knowledge:test_processor", { processorId });
      setTest({
        status: "ok",
        message: `${FILE_PROCESSOR_LABELS[processorId]} 连接正常`,
      });
    } catch (e) {
      setTest({
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const busy = test?.status === "loading";
  const hintClass =
    test?.status === "ok"
      ? "field-hint field-hint-ok"
      : test?.status === "error"
        ? "field-hint field-hint-error"
        : "field-hint";

  return (
    <section className="settings-section">
      <p className="field-hint">
        仅 PDF 使用这里选中的文档处理器。未配置凭证时，PDF 入库会失败并提示来此配置。
      </p>
      <div className="field">
        <label>文档处理方式</label>
        <RadioGroup
          name="fileProcessor"
          ariaLabel="文档处理方式"
          value={processorId}
          options={[
            {
              value: "mineru",
              label: FILE_PROCESSOR_LABELS.mineru,
              description: "官方云端解析，需要 API Key。",
            },
            {
              value: "open-mineru",
              label: FILE_PROCESSOR_LABELS["open-mineru"],
              description: "自托管服务，填写可访问的服务地址；API Key 可选。",
            },
          ]}
          onChange={(next) => {
            update({ processorId: next });
            setTest(null);
          }}
        />
      </div>

      {processorId === "mineru" ? (
        <>
          <div className="field">
            <label>API Key</label>
            <input
              type="password"
              value={fp.mineru.apiKey}
              autoComplete="off"
              onChange={(e) => updateMineru({ apiKey: e.target.value })}
            />
          </div>
          <div className="field">
            <label>API 地址</label>
            <input
              type="text"
              value={fp.mineru.apiHost}
              placeholder={MINERU_DEFAULT_HOST}
              onChange={(e) => updateMineru({ apiHost: e.target.value })}
            />
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>服务地址</label>
            <input
              type="text"
              value={fp.openMineru.apiHost}
              placeholder={OPEN_MINERU_DEFAULT_HOST}
              onChange={(e) => updateOpen({ apiHost: e.target.value })}
            />
          </div>
          <div className="field">
            <label>API Key（可选）</label>
            <input
              type="password"
              value={fp.openMineru.apiKey}
              autoComplete="off"
              onChange={(e) => updateOpen({ apiKey: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="field file-processing-test">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => void handleTest()}
        >
          {busy ? "检测中…" : "测试连接"}
        </button>
        {test && test.status !== "loading" && (
          <p className={hintClass}>{test.message}</p>
        )}
      </div>
    </section>
  );
}
