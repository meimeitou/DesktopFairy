import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  okText?: string;
  danger?: boolean;
  content?: React.ReactNode;
}

interface ConfirmState extends Required<Omit<ConfirmOptions, "content">> {
  content?: React.ReactNode;
}

/**
 * window.confirm 的库 Modal 替代：返回 Promise<boolean>，
 * 可在事件回调 / 异步流程里 await，不必把后续逻辑拆进 JSX。
 * 同一时刻只保留一个待决确认（后到覆盖先到，先到 resolve false）。
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    resolveRef.current?.(false);
    const { promise, resolve } = Promise.withResolvers<boolean>();
    resolveRef.current = resolve;
    setState({
      title: opts.title,
      okText: opts.okText ?? "确定",
      danger: opts.danger ?? true,
      content: opts.content,
    });
    return promise;
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setState(null);
  }, []);

  const dialog = state ? (
    <ConfirmDialog
      open
      title={state.title}
      okText={state.okText}
      danger={state.danger}
      onOk={() => settle(true)}
      onClose={() => settle(false)}
    >
      {state.content}
    </ConfirmDialog>
  ) : null;

  return { confirm, dialog };
}
