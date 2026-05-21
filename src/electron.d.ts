export {};

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      windowGetSize: () => Promise<{ width: number; height: number } | null>;
      windowSetSize: (width: number, height: number) => Promise<void>;
      windowGetPosition: () => Promise<{ x: number; y: number } | null>;
      windowSetPosition: (x: number, y: number) => Promise<void>;
    };
  }
}
