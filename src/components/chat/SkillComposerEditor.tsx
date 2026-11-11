import { useEffect, useLayoutEffect, useId, useRef, useState, type RefObject, type TextareaHTMLAttributes } from "react";
import type { SelectedHost } from "../../shared/hostSelection";
import type { SlashCommand } from "../../shared/slashCommands";
import { addSelectedSkill, rankSkillCommands, skillQueryAt } from "../../shared/skillInvocation";
import { hostMention, referenceParts, retainedReferences, withMissingReferences } from "../../shared/composerReferences";
import InlineReferences from "./InlineReferences";
import SlashCommandMenu from "./SlashCommandMenu";
import "./SlashCommandMenu.css";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  input: string;
  onInputChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  commands?: SlashCommand[];
  selectedSkillIds?: string[];
  onSelectedSkillIdsChange?: (ids: string[]) => void;
  skillErrors?: Record<string, string>;
  selectedHosts?: SelectedHost[];
  onSelectedHostsChange?: (hosts: SelectedHost[]) => void;
  hostErrors?: Record<string, string>;
  onCommand?: (cmd: SlashCommand) => void;
};

export default function SkillComposerEditor({
  input, onInputChange, textareaRef, commands = [], selectedSkillIds = [],
  onSelectedSkillIdsChange, skillErrors, selectedHosts = [], onSelectedHostsChange, hostErrors, onCommand, onKeyDown, disabled, ...props
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [caret, setCaret] = useState(input.length);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [active, setActive] = useState({ key: "", index: 0, source: "keyboard" as "keyboard" | "pointer" });
  const caretPosition = Math.min(caret, input.length);
  const insideReference = referenceParts(input, selectedSkillIds, selectedHosts).some(
    (part) => part.reference && caretPosition > part.start && caretPosition <= part.end,
  );
  const query = insideReference ? null : skillQueryAt(input, caretPosition);
  const queryKey = query ? `${query.trigger}:${query.start}:${query.end}:${query.query}` : "";
  const filtered = query ? rankSkillCommands(commands, query) : [];
  const open = !disabled && focused && !!query && dismissed !== queryKey;
  const activeIndex = active.key === queryKey ? Math.min(active.index, Math.max(0, filtered.length - 1)) : 0;

  useLayoutEffect(() => {
    const migrated = withMissingReferences(input, selectedSkillIds, selectedHosts);
    if (migrated !== input) onInputChange(migrated);
  }, [input, selectedSkillIds, selectedHosts, onInputChange]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const highlights = highlightsRef.current;
    if (!textarea || !highlights) return;
    const sync = () => {
      highlights.style.width = `${textarea.clientWidth}px`;
      highlights.style.height = `${textarea.clientHeight}px`;
      highlights.scrollTop = textarea.scrollTop;
      highlights.scrollLeft = textarea.scrollLeft;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [textareaRef, input]);

  const changeInput = (text: string) => {
    const retained = retainedReferences(text, selectedSkillIds, selectedHosts);
    if (retained.skillIds.length !== selectedSkillIds.length) onSelectedSkillIdsChange?.(retained.skillIds);
    if (retained.hosts.length !== selectedHosts.length) onSelectedHostsChange?.(retained.hosts);
    onInputChange(text);
  };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (e: MouseEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) setDismissed(queryKey);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open, queryKey]);

  const select = (cmd: SlashCommand) => {
    if (!query) return;
    setDismissed(queryKey);
    if (cmd.group === "skill" || cmd.group === "host") {
      if (cmd.group === "host" && cmd.host) {
        const next = selectedHosts.some((h) => h.id === cmd.id)
          ? selectedHosts.map((h) => h.id === cmd.id ? cmd.host! : h)
          : [...selectedHosts, cmd.host];
        onSelectedHostsChange?.(next);
      } else {
        onSelectedSkillIdsChange?.(addSelectedSkill(selectedSkillIds, cmd.id));
      }
      const mention = cmd.group === "host" && cmd.host ? hostMention(cmd.host) : `@${cmd.id}`;
      const inserted = `${mention} `;
      onInputChange(input.slice(0, query.start) + inserted + input.slice(query.end));
      const position = query.start + inserted.length;
      setCaret(position);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(position, position);
      });
    } else {
      onCommand?.(cmd);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="skill-composer" ref={hostRef}>
      {hostErrors && Object.keys(hostErrors).length > 0 && (
        <div className="skill-selection-error" role="alert">{Object.values(hostErrors).join(" ")}</div>
      )}
      {skillErrors && Object.keys(skillErrors).length > 0 && (
        <div className="skill-selection-error" role="alert">{Object.values(skillErrors).join(" ")}</div>
      )}
      {open && query && (
        <SlashCommandMenu title={query.trigger === "/" ? "选择指令或技能" : commands.some((c) => c.group === "host") ? "选择机器或技能" : "选择技能"} commands={filtered} activeIndex={activeIndex} menuId={menuId}
          scrollActiveIntoView={active.key !== queryKey || active.source === "keyboard"}
          onActiveIndexChange={(index) => setActive({ key: queryKey, index, source: "pointer" })} onSelect={select} />
      )}
      <div className="skill-composer-input">
      <div ref={highlightsRef} className="skill-composer-highlights" aria-hidden="true">
        <InlineReferences text={input} skillIds={selectedSkillIds} hosts={selectedHosts} skillErrors={skillErrors} hostErrors={hostErrors} />
        {"\n"}
      </div>
      <textarea {...props} ref={textareaRef} value={input} disabled={disabled}
        role="combobox" aria-label={props["aria-label"] || "消息"} aria-autocomplete="list"
        aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-activedescendant={open && filtered.length ? `${menuId}-${activeIndex}` : undefined}
        onFocus={(e) => { setFocused(true); setCaret(e.currentTarget.selectionStart); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        onSelect={(e) => { setCaret(e.currentTarget.selectionStart); props.onSelect?.(e); }}
        onChange={(e) => { setCaret(e.currentTarget.selectionStart); setDismissed(null); changeInput(e.target.value); }}
        onScroll={(e) => {
          if (highlightsRef.current) {
            highlightsRef.current.scrollTop = e.currentTarget.scrollTop;
            highlightsRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
          props.onScroll?.(e);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (open && e.key === "Escape") { e.preventDefault(); setDismissed(queryKey); return; }
          if (open && filtered.length && !e.shiftKey) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive({ key: queryKey, index: (activeIndex + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length, source: "keyboard" });
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); select(filtered[activeIndex]); return; }
          }
          if ((e.key === "Backspace" || e.key === "Delete") && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
            const position = e.currentTarget.selectionStart;
            const part = referenceParts(input, selectedSkillIds, selectedHosts).find((part) => part.reference &&
              (e.key === "Backspace" ? part.end === position : part.start === position));
            if (part) {
              e.preventDefault();
              changeInput(input.slice(0, part.start) + input.slice(part.end));
              setCaret(part.start);
              requestAnimationFrame(() => textareaRef.current?.setSelectionRange(part.start, part.start));
              return;
            }
          }
          onKeyDown?.(e);
        }} />
      </div>
    </div>
  );
}
