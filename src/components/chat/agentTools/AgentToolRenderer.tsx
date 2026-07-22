import { memo, useContext, useEffect, useRef, useState } from "react";
import type { ChatMsg } from "../../../shared/chatMessages";
import {
  extractFilePath,
  extractStdout,
  getToolCommandLine,
  getToolInput,
  parseToolOutput,
} from "./toolUtils";
import { TerminalStopContext } from "./TerminalStopContext";
import TerminalOutput from "./TerminalOutput";
import ToolHeader from "./ToolHeader";
import { parseAskUserQuestions } from "./askUserQuestionParse";

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
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
  const command = getToolCommandLine(msg.toolName || "Bash", msg.toolArgs);
  const output = parseToolOutput(msg.toolResultPreview);
  const stdout = extractStdout(output);
  const stderr =
    output && typeof output === "object" && typeof (output as Record<string, unknown>).stderr === "string"
      ? String((output as Record<string, unknown>).stderr)
      : "";

  return (
    <div className="agent-tool-body">
      <div className="agent-tool-section-label">命令</div>
      {command ? (
        <TerminalOutput content={command} commandMode />
      ) : (
        <p className="agent-tool-permission-empty">（无命令参数）</p>
      )}
      {(stdout || stderr || msg.toolStatus === "running") && (
        <>
          <div className="agent-tool-section-label">输出</div>
          <TerminalOutput content={stdout || stderr || "…"} />
        </>
      )}
    </div>
  );
}

function TerminalToolBody({ msg }: { msg: ChatMsg }) {
  const stopTerminal = useContext(TerminalStopContext);
  const input = getToolInput(msg.toolName || "Terminal", msg.toolArgs);
  const command = typeof input.command === "string" ? input.command : "";
  const output = parseToolOutput(msg.toolResultPreview);
  const outObj =
    output && typeof output === "object" ? (output as Record<string, unknown>) : null;
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
  const isRunning = msg.toolStatus === "running" || msg.toolStatus === "streaming";
  const isDone = msg.toolStatus === "done";

  return (
    <div className="agent-tool-body">
      {command && (
        <>
          <div className="agent-tool-section-label">命令</div>
          <TerminalOutput content={command} commandMode />
        </>
      )}
      {(outText || isRunning) && (
        <>
          <div className="agent-tool-section-label">输出</div>
          <TerminalOutput content={outText || "…"} />
        </>
      )}
      {isRunning && stopTerminal && (
        <button
          type="button"
          className="agent-tool-stop-btn"
          onClick={stopTerminal}
        >
          停止
        </button>
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
  const text = extractStdout(output) || (typeof output === "string" ? output : "");

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
          <TerminalOutput content={text} />
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
          <TerminalOutput content={JSON.stringify(input, null, 2)} />
        </>
      )}
      {outputText && msg.toolStatus !== "running" && msg.toolStatus !== "streaming" && (
        <>
          <div className="agent-tool-section-label">结果</div>
          <TerminalOutput content={outputText} />
        </>
      )}
    </div>
  );
}

function SkillToolBody({ msg }: { msg: ChatMsg }) {
  const input = getToolInput(msg.toolName || "", msg.toolArgs);
  const output = parseToolOutput(msg.toolResultPreview);
  const content =
    output && typeof output === "object" && typeof (output as Record<string, unknown>).content === "string"
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
          <TerminalOutput content={content} />
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
      {outputText && msg.toolStatus !== "running" && msg.toolStatus !== "streaming" && (
        <>
          <div className="agent-tool-section-label">结果</div>
          <TerminalOutput content={outputText} />
        </>
      )}
    </div>
  );
}

function AskUserQuestionBody({ msg }: { msg: ChatMsg }) {
  const questions = parseAskUserQuestions(msg);
  const output = parseToolOutput(msg.toolResultPreview);
  const answers =
    output && typeof output === "object" && (output as Record<string, unknown>).answers
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
          <TerminalOutput content={msg.toolResultPreview} />
        </>
      )}
    </div>
  );
}

function renderToolBody(msg: ChatMsg) {
  const name = msg.toolName || "";
  if (name === "Bash") return <BashToolBody msg={msg} />;
  if (name === "Terminal") return <TerminalToolBody msg={msg} />;
  if (name === "Skill") return <SkillToolBody msg={msg} />;
  if (name === "Skills") return <SkillsToolBody msg={msg} />;
  if (name === "AskUserQuestion") return <AskUserQuestionBody msg={msg} />;
  if (name === "Read" || name === "Write" || name === "Edit") {
    return name === "Read" ? <ReadToolBody msg={msg} /> : <GenericToolBody msg={msg} />;
  }
  if (name.startsWith("mcp__")) return <GenericToolBody msg={msg} />;
  return <GenericToolBody msg={msg} />;
}

function AgentToolRenderer({ msg }: { msg: ChatMsg }) {
  const status = msg.toolStatus || "streaming";
  const label = STATUS_LABEL[status] || status;
  const isCollapsible = status === "done";
  const [expanded, setExpanded] = useState(status !== "done");
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== "done" && status === "done") {
      setExpanded(false);
    }
    if (status === "running" || status === "streaming") {
      setExpanded(true);
    }
    prevStatus.current = status;
  }, [status]);

  const input = getToolInput(msg.toolName || "", msg.toolArgs);
  const summary =
    getToolCommandLine(msg.toolName || "", msg.toolArgs) ||
    extractFilePath(input) ||
    (typeof input.query === "string" ? input.query : "") ||
    (typeof input.url === "string" ? input.url : "") ||
    (typeof input.pattern === "string" ? input.pattern : "");

  const showBody = !isCollapsible || expanded;

  return (
    <div
      className={`agent-tool-card agent-tool-card-${status}${
        isCollapsible && !expanded ? " agent-tool-card-collapsed" : ""
      }`}
    >
      <ToolHeader
        toolName={msg.toolName || "工具"}
        params={
          summary ? <span className="agent-tool-inline-param">{summary}</span> : undefined
        }
        status={<StatusBadge status={status} label={label} />}
        collapsible={isCollapsible}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />
      {showBody && renderToolBody(msg)}
      {msg.toolMessage && (status === "error" || status === "denied") && (
        <p className="agent-tool-error-text">{msg.toolMessage}</p>
      )}
    </div>
  );
}

export default memo(AgentToolRenderer);
