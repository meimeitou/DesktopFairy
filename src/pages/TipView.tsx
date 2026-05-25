import { useEffect, useRef, useCallback } from "react";
import {
  buildSearchUrl,
  formatActionPrompt,
  formatQuotedText,
  type SelectionActionItem,
} from "../shared/selectionActions";
import { loadSettings } from "../shared/settings";
import "./TipView.css";

interface Props {
  text: string;
}

const api = window.electronAPI;

export default function TipView({ text }: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const settings = loadSettings();
  const enabledActions = settings.selectionActions.filter((a) => a.enabled);

  useEffect(() => {
    document.documentElement.classList.add("tip-window");
    return () => document.documentElement.classList.remove("tip-window");
  }, []);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      api.invoke("selection:resize_tip", { width, height });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabledActions.length]);

  const closeTip = () => window.close();

  const openChat = useCallback(
    async (prefill: string, autoSend?: boolean) => {
      await api.invoke("open_chat_with_payload", {
        text: prefill,
        autoSend: autoSend ?? settings.selectionAutoSend,
      });
      closeTip();
    },
    [settings.selectionAutoSend]
  );

  const handleAction = async (action: SelectionActionItem) => {
    switch (action.id) {
      case "copy":
        await api.invoke("selection:copy", text);
        closeTip();
        break;
      case "search": {
        const engine = action.searchEngine || settings.searchEngine;
        const url = buildSearchUrl(engine, text);
        await api.invoke("selection:open_url", url);
        closeTip();
        break;
      }
      case "quote":
        await openChat(formatQuotedText(text), false);
        break;
      case "ask":
        await openChat(text, settings.selectionAutoSend);
        break;
      default:
        if (action.prompt) {
          await openChat(formatActionPrompt(action.prompt, text));
        } else {
          await openChat(text);
        }
        break;
    }
  };

  if (enabledActions.length === 0) {
    return (
      <div className="tip-toolbar" ref={toolbarRef}>
        <button type="button" className="tip-action-btn" onClick={() => openChat(text)}>
          <span>💬</span>
          <span>询问</span>
        </button>
      </div>
    );
  }

  return (
    <div className="tip-toolbar" ref={toolbarRef}>
      {enabledActions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="tip-action-btn"
          title={action.name}
          onClick={() => handleAction(action)}
        >
          <span className="tip-action-icon">{action.icon}</span>
          <span className="tip-action-label">{action.name}</span>
        </button>
      ))}
    </div>
  );
}
