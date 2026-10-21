import { beforeEach, describe, expect, it } from "vitest";
import {
  stashKnowledgeReveal,
  stashTerminalCommand,
  takeKnowledgeReveals,
  takeTerminalCommands,
} from "./panelHandoff";

beforeEach(() => {
  takeTerminalCommands();
  takeKnowledgeReveals();
});

describe("panelHandoff", () => {
  it("holds terminal commands until a mounted panel takes them once", () => {
    stashTerminalCommand("ls\n");
    stashTerminalCommand("pwd\n");
    expect(takeTerminalCommands()).toEqual(["ls\n", "pwd\n"]);
    expect(takeTerminalCommands()).toEqual([]);
  });

  it("ignores an empty terminal command", () => {
    stashTerminalCommand("");
    expect(takeTerminalCommands()).toEqual([]);
  });

  it("holds knowledge reveals until the page takes them once", () => {
    stashKnowledgeReveal({ baseId: "b1", itemId: "i1" });
    expect(takeKnowledgeReveals()).toEqual([{ baseId: "b1", itemId: "i1" }]);
    expect(takeKnowledgeReveals()).toEqual([]);
  });
});
