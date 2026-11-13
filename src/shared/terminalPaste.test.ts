import { describe, expect, it, vi } from "vitest";
import { Terminal } from "@xterm/xterm";
import { pasteTerminalText } from "./terminalPaste";

const command = "curl --url 'https://example.test/api' \\\n  -H 'accept: application/json' \\\n  -H 'user-agent: test'";
const normalized = command.replace(/\n/g, "\r");

function createTerminal() {
  const terminal = new Terminal();
  // paste() clears the browser textarea after emitting input. Supply only
  // that DOM surface while exercising the real parser and paste protocol.
  (terminal as unknown as { _core: { textarea: { value: string } } })._core.textarea = { value: "" };
  return terminal;
}

describe("pasteTerminalText", () => {
  it.each([
    ["same chunk", ["\x1b[?2004loutput\x1b[?2004h"]],
    ["split sequence", ["\x1b[?2004loutput\x1b[?20", "04h"]],
  ])("preserves multiline paste with queued mode switches: %s", async (_name, chunks) => {
    const terminal = createTerminal();
    const input = vi.fn();
    const subscription = terminal.onData(input);
    const confirm = vi.fn(async () => true);
    for (const chunk of chunks) terminal.write(chunk);

    await pasteTerminalText(terminal, command, confirm);

    expect(confirm).toHaveBeenCalledWith(normalized);
    expect(input).toHaveBeenCalledExactlyOnceWith(`\x1b[200~${normalized}\x1b[201~`);
    // No DOM is opened in this test; only the onData subscription needs cleanup.
    subscription.dispose();
  });

  it("respects the last mode switch when bracketed paste is disabled", async () => {
    const terminal = createTerminal();
    const input = vi.fn();
    const subscription = terminal.onData(input);
    terminal.write("\x1b[?2004h\x1b[?2004l");
    await pasteTerminalText(terminal, "echo hello", vi.fn());
    expect(input).toHaveBeenCalledExactlyOnceWith("echo hello");
    subscription.dispose();
  });

  it("does not send a rejected multiline paste", async () => {
    const terminal = { write: vi.fn(), paste: vi.fn() };
    await pasteTerminalText(terminal, command, async () => false);
    expect(terminal.write).not.toHaveBeenCalled();
    expect(terminal.paste).not.toHaveBeenCalled();
  });

  it("normalizes CRLF and CR without adding an execution newline", async () => {
    const terminal = createTerminal();
    const input = vi.fn();
    const subscription = terminal.onData(input);
    terminal.write("\x1b[?2004h");
    await pasteTerminalText(terminal, "first\r\nsecond\rthird", async () => true);
    expect(input).toHaveBeenCalledExactlyOnceWith("\x1b[200~first\rsecond\rthird\x1b[201~");
    subscription.dispose();
  });
});
