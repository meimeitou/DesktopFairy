import type { Terminal } from "@xterm/xterm";

export async function pasteTerminalText(
  terminal: Pick<Terminal, "write" | "paste">,
  text: string,
  confirmMultiline: (normalized: string) => Promise<boolean>,
): Promise<void> {
  if (!text) return;
  const normalized = text.replace(/\r\n|\n/g, "\r");
  if (normalized.includes("\r") && !(await confirmMultiline(normalized))) return;

  // write() parses asynchronously. Drain queued shell output before paste()
  // reads its bracketed-paste mode, including sequences split across chunks.
  await new Promise<void>((resolve, reject) => {
    terminal.write("", () => {
      try {
        terminal.paste(normalized);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}
