import { describe, expect, it } from "vitest";

import {
  DEFAULT_SELECTION_ACTIONS,
  mergeSelectionActions,
} from "./selectionActions";

describe("mergeSelectionActions", () => {
  it("内置动作丢弃已废弃的 emoji 图标，恢复默认 lucide 图标", () => {
    // 历史版本默认 icon 是 emoji，NamedIcon 不认识会全部回退成同一个图标
    const saved = DEFAULT_SELECTION_ACTIONS.map((a) => ({ ...a, icon: "💬" }));
    const merged = mergeSelectionActions(saved);
    expect(merged.map((a) => a.icon)).toEqual(
      DEFAULT_SELECTION_ACTIONS.map((a) => a.icon),
    );
  });

  it("保留用户自定义字段（名称、prompt、开关）", () => {
    const merged = mergeSelectionActions([
      {
        id: "translate",
        name: "译",
        enabled: false,
        isBuiltIn: true,
        icon: "Globe",
        prompt: "custom {{text}}",
      },
    ]);
    const t = merged.find((a) => a.id === "translate");
    expect(t).toMatchObject({
      name: "译",
      enabled: false,
      prompt: "custom {{text}}",
      icon: "Globe",
    });
  });
});
