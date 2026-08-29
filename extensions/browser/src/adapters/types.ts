export interface TurnInfo {
  id: string;
  index: number;
  element: HTMLElement;
  role: string | null;
}

export interface AdapterHealth {
  ok: boolean;
  reason?: string;
}

export interface CompactResult {
  compacted: number;
  alreadyCompacted: number;
  skippedFocused: number;
}

export interface NavItem {
  id: string;
  index: number;
  label: string;
  role: string | null;
}

export interface SiteAdapter {
  readonly id: "chatgpt" | "claude" | "gemini" | "github";
  detect(): boolean;
  healthCheck(): AdapterHealth;
  findComposer(): HTMLElement | null;
  insertText(text: string): boolean;
  isStreaming(): boolean;
  enumerateTurns(): TurnInfo[];
  compact(opts: { keepRecent: number }): CompactResult;
  restore(): void;
  navigator(): NavItem[];
  pause(): void;
  disconnect(): void;
  destroy(): void;
}
