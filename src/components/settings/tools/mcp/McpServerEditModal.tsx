import { Button, Form, FormItem, Input, Modal, Switch } from "animal-island-ui";
import { useEffect, useState } from "react";
import Select from "../../../Select";
import HintTip from "../../../HintTip";
import type { McpServer, McpServerType } from "../../../../shared/mcpServer";
import {
  getMcpCommandPreview,
  parseArgsMultiline,
  parseEnvMultiline,
} from "../../../../shared/mcpServer";
import {
  buildServerFromValues,
  toFormValues,
  type McpFormValues,
  type McpTestResult,
} from "./mcpServerForm";

const api = window.electronAPI;

interface Props {
  open: boolean;
  server: McpServer;
  title: string;
  onClose: () => void;
  onSave: (server: McpServer) => void | Promise<void>;
}


export default function McpServerEditModal({
  open,
  server,
  title,
  onClose,
  onSave,
}: Props) {
  const [form] = Form.useForm<McpFormValues>();
  const [type, setType] = useState<McpServerType>(server.type || "stdio");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  // 弹窗每次打开重置为该 server 的初始值（cherry QuickCreate: open 时 form.reset）
  useEffect(() => {
    if (open) {
      setType(server.type || "stdio");
      setAdvancedOpen(false);
      setTestResult(null);
      setFormKey((k) => k + 1);
    }
  }, [open, server]);
  const values = form.getFieldsValue(true) as McpFormValues;
  const preview = getMcpCommandPreview({
    ...server,
    type: values.type || "stdio",
    command: values.command || "",
    args: parseArgsMultiline(values.args || ""),
    env: parseEnvMultiline(values.env || ""),
    baseUrl: values.baseUrl || "",
    headers: parseEnvMultiline(values.headers || ""),
  });

  const buildPayload = (): McpServer =>
    buildServerFromValues(server, {
      name: String(form.getFieldValue("name") || ""),
      description: String(form.getFieldValue("description") || ""),
      type: type,
      command: String(form.getFieldValue("command") || ""),
      args: String(form.getFieldValue("args") || ""),
      env: String(form.getFieldValue("env") || ""),
      baseUrl: String(form.getFieldValue("baseUrl") || ""),
      headers: String(form.getFieldValue("headers") || ""),
      timeout: String(form.getFieldValue("timeout") || ""),
      longRunning: form.getFieldValue("longRunning") === true,
    });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = (await api.invoke(
        "mcp:servers:test",
        buildPayload(),
      )) as McpTestResult;
      setTestResult(result);
    } catch (e) {
      setTestResult({
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTesting(false);
    }
  };

  const pickDirectoryForArgs = async () => {
    const dir = (await api.invoke("mcp:servers:pick_directory")) as
      | string
      | null;
    if (!dir) return;
    const current = String(form.getFieldValue("args") || "");
    const lines = parseArgsMultiline(current);
    if (lines.length === 0) {
      form.setFieldValue("args", dir);
      return;
    }
    lines[lines.length - 1] = dir;
    form.setFieldValue("args", lines.join("\n"));
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={null}
      typewriter={false}
      width={560}
      className="ssh-form-modal mcp-edit-modal"
    >
      <Form
        key={formKey}
        form={form as unknown as never}
        layout="vertical"
        colon={false}
        requiredMark
        initialValues={toFormValues(server) as unknown as Record<string, unknown>}
        onFinish={async () => {
          setSaving(true);
          try {
            await onSave(buildPayload());
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="ssh-form-group">
          <span className="ssh-form-group-label">基本信息</span>
          <FormItem
            label="名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: "请输入名称" }]}
          >
            <Input type="text" placeholder="如：everything" />
          </FormItem>
          <FormItem label="描述" name="description">
            <Input type="text" placeholder="可选" />
          </FormItem>
          <FormItem label="传输类型" name="type">
            <Select
              value={type}
              onChange={(key) => setType(key as McpServerType)}
              options={[
                { key: "stdio", label: "stdio（本地进程）" },
                { key: "sse", label: "SSE（远程）" },
                { key: "streamableHttp", label: "Streamable HTTP（远程）" },
              ]}
              aria-label="传输类型"
            />
          </FormItem>
        </div>

        <div className="ssh-form-group">
          <span className="ssh-form-group-label">连接</span>
          {type === "stdio" ? (
            <>
              <FormItem
                label="命令"
                name="command"
                rules={[
                  { required: true, whitespace: true, message: "请输入命令" },
                ]}
              >
                <Input type="text" placeholder="npx 或 uvx" />
              </FormItem>
              <FormItem
                label={
                  <span className="mcp-form-label-row">
                    参数
                    <HintTip tip="每行一个参数。需要目录时，点右侧按钮写入最后一行。" />
                  </span>
                }
                name="args"
              >
                <textarea
                  className="agent-mcp-textarea"
                  rows={4}
                  placeholder={"-y\n@modelcontextprotocol/server-everything"}
                />
              </FormItem>
              <div className="mcp-form-inline-action">
                <Button
                  type="link"
                  size="small"
                  htmlType="button"
                  onClick={() => void pickDirectoryForArgs()}
                >
                  选择目录（写入最后一行参数）
                </Button>
              </div>
            </>
          ) : (
            <>
              <FormItem
                label="URL"
                name="baseUrl"
                rules={[
                  { required: true, whitespace: true, message: "请输入 URL" },
                ]}
              >
                <Input
                  type="text"
                  placeholder={
                    type === "sse"
                      ? "http://localhost:3000/sse"
                      : "http://localhost:3000/mcp"
                  }
                />
              </FormItem>
              <p className="field-hint field-hint--after warn">
                远程 MCP 暂不支持智能体运行时，请优先使用 stdio。
              </p>
            </>
          )}
        </div>

        <div className="ssh-form-group">
          <button
            type="button"
            className="mcp-form-advanced-toggle"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            高级选项 {advancedOpen ? "▲" : "▼"}
          </button>
          {advancedOpen && (
            <div className="mcp-form-advanced-body">
              {type === "stdio" ? (
                <FormItem
                  label={
                    <span className="mcp-form-label-row">
                      环境变量
                      <HintTip tip="每行一个 KEY=value，传给服务器子进程。" />
                    </span>
                  }
                  name="env"
                >
                  <textarea
                    className="agent-mcp-textarea"
                    rows={3}
                    placeholder={"MEMORY_FILE_PATH=/path/to/memory.json"}
                  />
                </FormItem>
              ) : (
                <FormItem
                  label={
                    <span className="mcp-form-label-row">
                      Headers
                      <HintTip tip="每行一个 KEY=value。" />
                    </span>
                  }
                  name="headers"
                >
                  <textarea
                    className="agent-mcp-textarea"
                    rows={3}
                    placeholder={"Authorization=Bearer token"}
                  />
                </FormItem>
              )}
              <FormItem
                label={
                  <span className="mcp-form-label-row">
                    工具超时（秒）
                    <HintTip tip="单个工具调用的超时秒数。留空则使用 60 秒。" />
                  </span>
                }
                name="timeout"
                normalize={(v) => String(v ?? "")}
              >
                <Input type="number" min={1} placeholder="60" />
              </FormItem>
              <FormItem
                label={
                  <span className="mcp-form-label-row">
                    长时间运行
                    <HintTip tip="收到 MCP 进度时重置超时，最长 10 分钟。" />
                  </span>
                }
                name="longRunning"
                valuePropName="checked"
              >
                {/* FormItem stretches its control child to full width (flex:1 1 auto);
                    the CSS override in SettingsPage.css keeps this Switch at its
                    intrinsic pill size. Must stay a DIRECT child: FormItem injects
                    checked/onChange via cloneElement on its first child. */}
                <Switch aria-label="长时间运行" className="mcp-form-switch" />
              </FormItem>
            </div>
          )}
        </div>

        <div className="agent-mcp-preview">
          <span className="agent-mcp-preview-label">预览</span>
          <pre>{preview}</pre>
        </div>

        {testResult && (
          <p
            className={`agent-mcp-test-result${testResult.ok ? " ok" : " err"}`}
          >
            {testResult.message}
            {testResult.ok && testResult.tools?.length ? (
              <>
                {" "}
                · {testResult.toolCount} 个工具
              </>
            ) : null}
          </p>
        )}

        <div className="agent-mcp-form-actions">
          <Button
            type="primary"
            size="small"
            disabled={saving}
            onClick={() => void handleTest()}
          >
            {testing ? "测试中…" : "测试连接"}
          </Button>
          <div className="agent-mcp-form-actions-spacer" />
          <Button size="small" onClick={onClose}>
            取消
          </Button>
          <Button
            type="primary"
            size="small"
            loading={saving}
            onClick={() => form.submit()}
          >
            保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
