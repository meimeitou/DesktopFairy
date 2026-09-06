import { describe, it, expect } from "vitest";
import {
  applySkillSlashCommand,
  parseSlashCommand,
  slashMenuQuery,
  withEnabledSkillId,
  buildSkillCommands,
} from "./slashCommands";

describe("slashMenuQuery", () => {
  it("returns empty string for a lone slash", () => {
    expect(slashMenuQuery("/")).toBe("");
    expect(slashMenuQuery("  /")).toBe("");
  });

  it("returns the token while the user is typing a command", () => {
    expect(slashMenuQuery("/find")).toBe("find");
    expect(slashMenuQuery("/find-skills")).toBe("find-skills");
  });

  it("closes after a trailing space so the popup does not block Enter", () => {
    expect(slashMenuQuery("/find-skills ")).toBeNull();
    expect(slashMenuQuery("/find-skills extra")).toBeNull();
  });

  it("stays closed for multiline or non-slash input", () => {
    expect(slashMenuQuery("hello")).toBeNull();
    expect(slashMenuQuery("/find\nmore")).toBeNull();
    expect(slashMenuQuery("")).toBeNull();
  });
});

describe("applySkillSlashCommand", () => {
  const ids = ["find-skills", "skill-creator"];

  it("rewrites a bare skill command", () => {
    const result = applySkillSlashCommand("/find-skills", ids);
    expect(result?.skillId).toBe("find-skills");
    expect(result?.text).toContain("「find-skills」");
    expect(result?.text).toContain("Skills 工具");
  });

  it("appends the user remainder as task requirements", () => {
    const result = applySkillSlashCommand("/find-skills 搜索 PDF 技能", ids);
    expect(result?.skillId).toBe("find-skills");
    expect(result?.text).toContain("搜索 PDF 技能");
  });

  it("returns null for unknown or builtin commands", () => {
    expect(applySkillSlashCommand("/clear", ids)).toBeNull();
    expect(applySkillSlashCommand("/nope", ids)).toBeNull();
    expect(applySkillSlashCommand("hello", ids)).toBeNull();
  });
});

describe("withEnabledSkillId", () => {
  it("appends a missing skill id", () => {
    expect(withEnabledSkillId(["find-skills"], "skill-creator")).toEqual([
      "find-skills",
      "skill-creator",
    ]);
  });

  it("does not duplicate an already enabled skill", () => {
    expect(withEnabledSkillId(["find-skills"], "find-skills")).toEqual([
      "find-skills",
    ]);
  });
});

describe("parseSlashCommand", () => {
  it("splits command and remainder", () => {
    expect(parseSlashCommand("/find-skills  foo")).toEqual({
      command: "find-skills",
      rest: "foo",
    });
  });
});

describe("buildSkillCommands", () => {
  it("inserts a trailing space so the slash menu can close after select", () => {
    const cmds = buildSkillCommands([
      {
        id: "find-skills",
        name: "Find Skills",
        description: "Find skills",
        folderName: "find-skills",
      },
    ]);
    expect(cmds[0].insertText).toBe("/find-skills ");
    expect(slashMenuQuery(cmds[0].insertText!)).toBeNull();
  });
});
