// Narrow Chrome MV3 API typings — kept here to avoid broad `declare const chrome: any`.
// Mirrors the subset used by Browser Companion; do not add `any` escapes here.
// When @types/chrome is available, this file can be replaced by `/// <reference types="chrome" />`.

declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(
        keys: string | string[] | Record<string, unknown> | null,
      ): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    }
    const local: StorageArea;
    const session: StorageArea;
    const onChanged: {
      addListener(
        callback: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string,
        ) => void,
      ): void;
    };
  }
  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      windowId?: number;
    }
    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function sendMessage<T = unknown>(tabId: number, message: unknown): Promise<T>;
  }
  namespace runtime {
    interface MessageSender {
      tab?: tabs.Tab;
      id?: string;
    }
    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response: unknown) => void,
        ) => boolean | undefined,
      ): void;
    };
    function sendMessage<T = unknown>(message: unknown): Promise<T>;
    const onInstalled: {
      addListener(callback: () => void | Promise<void>): void;
    };
    const onStartup: {
      addListener(callback: () => void | Promise<void>): void;
    };
  }
  namespace sidePanel {
    function setPanelBehavior(behavior: { openPanelOnActionClick: boolean }): Promise<void>;
    function open(options: { windowId: number }): Promise<void>;
  }
  namespace action {
    const onClicked: {
      addListener(callback: (tab: tabs.Tab) => void | Promise<void>): void;
    };
  }
  namespace alarms {
    interface Alarm {
      name: string;
    }
    function create(name: string, info: { periodInMinutes?: number; when?: number }): Promise<void>;
    function clearAll(): Promise<boolean>;
    const onAlarm: {
      addListener(callback: (alarm: Alarm) => void | Promise<void>): void;
    };
  }
}

declare const chrome: typeof chrome;
