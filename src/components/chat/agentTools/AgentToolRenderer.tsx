import { Button } from "@cherrystudio/ui";

import { memo, useContext, useState } from "react";
import type { ChatMsg } from "../../../shared/chatMessages";
import {
  extractFilePath,
  extractStdout,
  getToolCommandLine,
  getToolInput,
  parseToolOutput,
} from "./toolUtils";
import TerminalOutput from "./TerminalOutput";
import ToolHeader from "./ToolHeader";
import { ToolCancelContext } from "./ToolCancelContext";
import { parseAskUserQuestions } from "./askUserQuestionParse";

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`agent-tool-status-badge agent-tool-status-${status}`}>
      {(status === "running" || status === "streaming") && (
        <span className="msg-tool-spinner" aria-hidden />
      )}
      {label}
    </span>
  );
}

const STATUS_LABEL: Record<string, string> = {
  streaming: "准备中",
  running: "执行中",
  awaiting_input: "等待回答",
  done: "完成",
  error: "失败",
  denied: "已拒绝",
};

function BashToolBody({ msg }: { msg: ChatMsg }) {
  const command = getToolCommandLine(msg.toolName || "bash", msg.toolArgs);
  const output = parseToolOutput(msg.toolResultPreview);
  const outObj =
    output && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;
  // merged output first; stdout/stderr kept as old-message fallback
  const text =
    typeof output === "string"
      ? output
      : typeof outObj?.output === "string"
        ? outObj.output
        : extractStdout(output);
  const stderr =
    outObj && typeof outObj.stderr === "string" ? outObj.stderr : "";

  return (
    <div className="agent-tool-body">
      <div className="agent-tool-section-label">命令</div>
      {command ? (
        <TerminalOutput content={command} commandMode />
      ) : (
        <p className="agent-tool-permission-empty">（无命令参数）</p>
      )}
      {(text || stderr || msg.toolStatus === "running") && (
        <>
          <div className="agent-tool-section-label">输出</div>
          <TerminalOutput content={text || stderr || "…"} />
        </>
      )}
    </div>
  );
}

function TerminalToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "Terminal", msg.toolArgs);
  const command = typeof input.command === "string" ? input.command : "";
  const output = parseToolOutput(msg.toolResultPreview);
  const outObj =
    output && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;
  const outText =
    typeof output === "string"
      ? output
      : typeof outObj?.output === "string"
        ? outObj.output
        : typeof outObj?.error === "string"
          ? outObj.error
          : "";
  const exitCode =
    typeof outObj?.exitCode === "number" ? outObj.exitCode : undefined;
  const isDone = msg.toolStatus === "done";

  return (
    <div className="agent-tool-body">
      {command && (
        <>
          <div className="agent-tool-section-label">命令</div>
          <TerminalOutput content={command} commandMode />
        </>
      )}
      {(outText ||
        msg.toolStatus === "running" ||
        msg.toolStatus === "streaming") && (
        <>
          <div className="agent-tool-section-label">输出</div>
          <TerminalOutput content={outText || "…"} />
        </>
      )}
      {isDone && exitCode !== undefined && (
        <div className="agent-tool-exit-line">
          <span
            className={`agent-tool-exit-badge${
              exitCode === 0 ? " agent-tool-exit-ok" : " agent-tool-exit-err"
            }`}
          >
            exit: {exitCode}
          </span>
        </div>
      )}
    </div>
  );
}

function SshExecToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "ssh_exec", msg.toolArgs);
  const host = typeof input.targetLabel === "string" ? input.targetLabel : typeof input.host === "string" ? input.host : typeof input.hostId === "string" ? input.hostId : "";
  const command = typeof input.command === "string" ? input.command : "";
  const output = parseToolOutput(msg.toolResultPreview);
  const outObj =
    output && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;
  const outText =
    typeof output === "string"
      ? output
      : typeof outObj?.output === "string"
        ? outObj.output
        : typeof outObj?.error === "string"
          ? outObj.error
          : "";
  const exitCode =
    typeof outObj?.exitCode === "number" ? outObj.exitCode : undefined;
  const isDone = msg.toolStatus === "done";

  return (
    <div className="agent-tool-body">
      {host && (
        <div className="agent-tool-section-label">主机：{host}</div>
      )}
      {command && (
        <TerminalOutput content={command} commandMode />
      )}
      {(outText ||
        msg.toolStatus === "running" ||
        msg.toolStatus === "streaming") && (
        <>
          <div className="agent-tool-section-label">输出</div>
          <TerminalOutput content={outText || "…"} />
        </>
      )}
      {isDone && exitCode !== undefined && (
        <div className="agent-tool-exit-line">
          <span
            className={`agent-tool-exit-badge${
              exitCode === 0 ? " agent-tool-exit-ok" : " agent-tool-exit-err"
            }`}
          >
            exit: {exitCode}
          </span>
        </div>
      )}
    </div>
  );
}

function ReadToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "", msg.toolArgs);
  const path = extractFilePath(input);
  const output = parseToolOutput(msg.toolResultPreview);
  const text =
    extractStdout(output) || (typeof output === "string" ? output : "");

  return (
    <div className="agent-tool-body">
      {path && (
        <>
          <div className="agent-tool-section-label">文件</div>
          <div className="agent-tool-file-path">{path}</div>
        </>
      )}
      {text && (
        <>
          <div className="agent-tool-section-label">内容</div>
          <TerminalOutput content={text} tone="code" />
        </>
      )}
    </div>
  );
}

function GenericToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "", msg.toolArgs);
  const output = parseToolOutput(msg.toolResultPreview);
  const hasInput = Object.keys(input).length > 0;
  const outputText =
    typeof output === "string"
      ? output
      : output
        ? JSON.stringify(output, null, 2)
        : msg.toolMessage || "";

  return (
    <div className="agent-tool-body">
      {hasInput && (
        <>
          <div className="agent-tool-section-label">参数</div>
          <TerminalOutput content={JSON.stringify(input, null, 2)} tone="code" />
        </>
      )}
      {outputText &&
        msg.toolStatus !== "running" &&
        msg.toolStatus !== "streaming" && (
          <>
            <div className="agent-tool-section-label">结果</div>
            <TerminalOutput content={outputText} tone="code" />
          </>
        )}
    </div>
  );
}

function SkillToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "", msg.toolArgs);
  const output = parseToolOutput(msg.toolResultPreview);
  const content =
    output &&
    typeof output === "object" &&
    typeof (output as Record<string, unknown>).content === "string"
      ? String((output as Record<string, unknown>).content)
      : extractStdout(output) || (typeof output === "string" ? output : "");

  return (
    <div className="agent-tool-body">
      {typeof input.skill === "string" && input.skill && (
        <>
          <div className="agent-tool-section-label">技能</div>
          <div className="agent-tool-file-path">{String(input.skill)}</div>
        </>
      )}
      {content && (
        <>
          <div className="agent-tool-section-label">说明</div>
          <TerminalOutput content={content} tone="code" />
        </>
      )}
    </div>
  );
}

function SkillsToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "", msg.toolArgs);
  const output = parseToolOutput(msg.toolResultPreview);
  const outputText =
    typeof output === "string"
      ? output
      : output
        ? JSON.stringify(output, null, 2)
        : msg.toolMessage || "";

  return (
    <div className="agent-tool-body">
      {typeof input.action === "string" && input.action && (
        <>
          <div className="agent-tool-section-label">操作</div>
          <div className="agent-tool-file-path">{String(input.action)}</div>
        </>
      )}
      {outputText &&
        msg.toolStatus !== "running" &&
        msg.toolStatus !== "streaming" && (
          <>
            <div className="agent-tool-section-label">结果</div>
            <TerminalOutput content={outputText} tone="code" />
          </>
        )}
    </div>
  );
}

function AskUserQuestionBody({ msg }: { msg: ChatMsg }) {
  const questions = parseAskUserQuestions(msg);
  const output = parseToolOutput(msg.toolResultPreview);
  const answers =
    output &&
    typeof output === "object" &&
    (output as Record<string, unknown>).answers
      ? ((output as Record<string, unknown>).answers as Record<string, unknown>)
      : null;

  return (
    <div className="agent-tool-body">
      {questions.length > 0 && (
        <>
          <div className="agent-tool-section-label">问题</div>
          <ul className="agent-tool-ask-result-list">
            {questions.map((q) => {
              const answer =
                answers && typeof answers[q.question] === "string"
                  ? String(answers[q.question])
                  : "";
              return (
                <li key={q.question}>
                  <div className="agent-tool-ask-result-q">{q.question}</div>
                  {q.options.length > 0 && (
                    <div className="agent-tool-ask-result-options">
                      选项：{q.options.map((o) => o.label).join("、")}
                    </div>
                  )}
                  {answer && (
                    <div className="agent-tool-ask-result-a">答：{answer}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {!answers && msg.toolResultPreview && (
        <>
          <div className="agent-tool-section-label">结果</div>
          <TerminalOutput content={msg.toolResultPreview} tone="code" />
        </>
      )}
    </div>
  );
}

const LEGACY_TOOL_ID_MAP: Record<string, string> = {
  Read: "read",
  Write: "write",
  Edit: "edit",
  MultiEdit: "edit",
  Bash: "bash",
  Glob: "glob",
  Grep: "grep",
};

function SshHostsToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "ssh_hosts", msg.toolArgs);
  const action = typeof input.action === "string" ? input.action : "";
  const fields = (input.fields ?? {}) as Record<string, unknown>;
  const host =
    (typeof input.host === "string" && input.host) ||
    (typeof fields.name === "string" ? String(fields.name) : "");
  const fieldsJson =
    input.fields && typeof input.fields === "object"
      ? JSON.stringify(input.fields)
      : "";
  const output = parseToolOutput(msg.toolResultPreview);
  const outObj =
    output && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;
  const message =
    typeof outObj?.message === "string"
      ? outObj.message
      : typeof outObj?.error === "string"
        ? outObj.error
        : "";
  const hosts = Array.isArray(outObj?.hosts)
    ? (outObj.hosts as Record<string, unknown>[])
    : null;
  return (
    <div className="agent-tool-body">
      <div className="agent-tool-section-label">操作：{action}</div>
      {host && <div className="agent-tool-section-label">主机：{host}</div>}
      {fieldsJson && <TerminalOutput content={fieldsJson} commandMode />}
      {hosts && hosts.length > 0 && (
        <TerminalOutput
          content={hosts
            .map(
              (h) =>
                `${String(h.name)} (${String(h.user || "?")}@${String(h.host || "?")}:${String(h.port || 22)})${h.credential ? ` [${String(h.credential)}]` : ""}`,
            )
            .join("\n")}
        />
      )}
      {(message ||
        msg.toolStatus === "running" ||
        msg.toolStatus === "streaming") && (
        <>
          <div className="agent-tool-section-label">结果</div>
          <TerminalOutput content={message || "…"} />
        </>
      )}
    </div>
  );
}

function renderToolBody(msg: ChatMsg) {
  const raw = msg.toolName || "";
  const name = LEGACY_TOOL_ID_MAP[raw] || raw;
  if (name === "bash") return <BashToolBody msg={msg} />;
  if (name === "ssh_exec") return <SshExecToolBody msg={msg} />;
  if (name === "ssh_hosts") return <SshHostsToolBody msg={msg} />;
  if (name === "Skill") return <SkillToolBody msg={msg} />;
  if (name === "Skills") return <SkillsToolBody msg={msg} />;
  if (name === "AskUserQuestion") return <AskUserQuestionBody msg={msg} />;
  if (name === "read" || name === "write" || name === "edit") {
    return name === "read" ? (
      <ReadToolBody msg={msg} />
    ) : (
      <GenericToolBody msg={msg} />
    );
  }
  if (name.startsWith("mcp__")) return <GenericToolBody msg={msg} />;
  return <GenericToolBody msg={msg} />;
}

function AgentToolRenderer({ msg }: { msg: ChatMsg }) {
  const cancelTool = useContext(ToolCancelContext);
  const status = msg.toolStatus || "streaming";
  const label = STATUS_LABEL[status] || status;
  const [expanded, setExpanded] = useState(false);
  const isRunning = status === "running" || status === "streaming";
  const isFailed = status === "error" || status === "denied";
  const output = isFailed ? parseToolOutput(msg.toolResultPreview) : null;
  const errorText = isFailed
    ? msg.toolMessage || (typeof output === "string" ? output :
        output && typeof output === "object" && "error" in output && typeof output.error === "string"
          ? output.error : "")
    : "";

  const input = getToolInput(msg.toolName || "", msg.toolArgs);
  const summary =
    getToolCommandLine(msg.toolName || "", msg.toolArgs) ||
    extractFilePath(input) ||
    (typeof input.query === "string" ? input.query : "") ||
    (typeof input.url === "string" ? input.url : "") ||
    (typeof input.pattern === "string" ? input.pattern : "");

  return (
    <div
      className={`agent-tool-card agent-tool-card-${status}${
        !expanded ? " agent-tool-card-collapsed" : ""
      }`}
    >
      <div className="agent-tool-summary-row">
        <ToolHeader
          toolName={msg.toolName || "工具"}
          params={
            summary ? (
              <span className="agent-tool-inline-param" title={summary}>{summary}</span>
            ) : undefined
          }
          status={<StatusBadge status={status} label={label} />}
          collapsible
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        {isRunning && cancelTool && msg.toolCallId && (
          <div className="agent-tool-summary-actions">
            <Button variant="default" size="sm" className="agent-tool-cancel-btn" onClick={() => cancelTool(msg.toolCallId!)}>
              取消
            </Button>
          </div>
        )}
      </div>
      {errorText && (
        <p className={`agent-tool-error-text${expanded ? "" : " agent-tool-error-summary"}`} title={errorText}>
          {errorText}
        </p>
      )}
      {expanded && renderToolBody(msg)}
    </div>
  );
}

export default memo(AgentToolRenderer);