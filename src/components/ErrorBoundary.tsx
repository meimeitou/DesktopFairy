import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * 兜底渲染：任何 chunk/模块求值失败都会让 lazy 进口 reject，若不接住，
 * #root 变空——宠物窗口是透明的，结果就是屏幕上多一块看不见但挡点击的区域。
 * 这里至少把错误画出来，让人知道窗口里发生了什么。
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="app-error-fallback" role="alert">
        <strong>界面加载失败</strong>
        <p>{error.message || String(error)}</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    );
  }
}
