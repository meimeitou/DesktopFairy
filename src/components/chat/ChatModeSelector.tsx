import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@cherrystudio/ui";
import { Book, Pencil, Play, Thermometer, type LucideIcon } from "lucide-react";

import type { ChatMode } from "../../shared/chatMode";
import { CHAT_MODE_CARDS, getChatModeCard } from "../../shared/chatMode";
import "./ChatModeSelector.css";

interface Props {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const MODE_ICON: Record<ChatMode, LucideIcon> = {
  normal: Thermometer,
  plan: Book,
  "auto-edit": Pencil,
  "full-auto": Play,
};

/** 对话模式选择：Cherry 同款 DropdownMenu 单选列表（图标 + 名称 + 一行说明）。 */
export default function ChatModeSelector({ mode, onChange, disabled = false }: Props) {
  const current = getChatModeCard(mode);

  const handleSelect = (next: string) => {
    if (next === mode) return;
    if (next === "full-auto" && mode !== "full-auto") {
      const ok = window.confirm(
        "全自动模式将跳过所有工具审批（文件编辑、命令执行、网络请求均不再确认）。\n继续开启？"
      );
      if (!ok) return;
    }
    onChange(next as ChatMode);
  };

  const TriggerIcon = MODE_ICON[current.mode] ?? Thermometer;

  return (
    <div className="chat-mode-selector">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="chat-tool-btn"
            disabled={disabled}
            title={`当前模式：${current.title}`}
          >
            <TriggerIcon size={16} className="chat-mode-icon" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="chat-mode-menu">
          <DropdownMenuRadioGroup value={mode} onValueChange={handleSelect}>
            {CHAT_MODE_CARDS.map((card) => {
              const Icon = MODE_ICON[card.mode] ?? Thermometer;
              return (
                <DropdownMenuRadioItem key={card.mode} value={card.mode} disabled={disabled}>
                  <Icon size={16} className="chat-mode-item-icon" />
                  <span className="chat-mode-item-title">{card.title}</span>
                  <span className="chat-mode-item-desc">{card.description}</span>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
