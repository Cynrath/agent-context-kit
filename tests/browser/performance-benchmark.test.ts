import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Synthetic 500+ turn benchmark — runs in Node without jsdom via lightweight fake DOM.
// Measures Conversation Performance Engine scripting cost and validates pinned survival.
// Distinguishes synthetic metrics from live Chrome trace (which requires performance_start_trace).

const ACKIT_COLLAPSED_ATTR = "data-ackit-collapsed";
const ACKIT_PINNED_ATTR = "data-ackit-pinned";
const TURN_COUNT = 500;

// --- Minimal fake DOM for adapter ---
class FakeElement {
  tagName: string;
  attributes: Map<string, string> = new Map();
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  textContent: string | null = null;
  className = "";

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name.startsWith("data-")) {
      const dsKey = name.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      this.dataset[dsKey] = value;
    }
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name.startsWith("data-")) {
      const dsKey = name.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      delete this.dataset[dsKey];
    }
  }
  appendChild(child: FakeElement): void {
    child.parentElement = this;
    this.children.push(child);
  }
  insertBefore(newNode: FakeElement, ref: FakeElement | null): void {
    newNode.parentElement = this;
    if (!ref) {
      this.children.push(newNode);
      return;
    }
    const idx = this.children.indexOf(ref);
    if (idx === -1) this.children.push(newNode);
    else this.children.splice(idx, 0, newNode);
  }
  remove(): void {
    if (!this.parentElement) return;
    const idx = this.parentElement.children.indexOf(this);
    if (idx !== -1) this.parentElement.children.splice(idx, 1);
    this.parentElement = null;
  }
  contains(node: FakeElement | null): boolean {
    if (!node) return false;
    let cur: FakeElement | null = node;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }
  closest(selector: string): FakeElement | null {
    let cur: FakeElement | null = this;
    while (cur) {
      if (matchesSelector(cur, selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  querySelector(selector: string): FakeElement | null {
    const all = this.querySelectorAll(selector);
    return all[0] ?? null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (el: FakeElement) => {
      for (const child of el.children) {
        if (matchesSelector(child, selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  getBoundingClientRect(): {
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
    x: number;
    y: number;
    toJSON: () => object;
  } {
    // For media heuristic: treat as large if inside recent turns fixture we set attribute
    const w = this.tagName === "IMG" ? 500 : 100;
    const h = this.tagName === "IMG" ? 400 : 100;
    return {
      width: w,
      height: h,
      top: 0,
      left: 0,
      right: w,
      bottom: h,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }
  dispatchEvent(_e: unknown): boolean {
    return true;
  }
  focus(): void {}
  // For input events
  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }
}

function matchesSelector(el: FakeElement, selector: string): boolean {
  // Support only selectors used by adapter
  // #thread
  if (selector === "#thread") return el.getAttribute("id") === "thread";
  // [data-turn-id-container]
  if (selector === "[data-turn-id-container]")
    return el.getAttribute("data-turn-id-container") !== null;
  // section[data-testid^="conversation-turn-"]
  if (selector === 'section[data-testid^="conversation-turn-"]') {
    return (
      el.tagName === "SECTION" &&
      (el.getAttribute("data-testid")?.startsWith("conversation-turn-") ?? false)
    );
  }
  if (selector === 'section[data-testid^="conversation-turn-"][data-turn]') {
    return (
      el.tagName === "SECTION" &&
      (el.getAttribute("data-testid")?.startsWith("conversation-turn-") ?? false) &&
      el.getAttribute("data-turn") !== null
    );
  }
  if (selector === "[data-message-author-role]")
    return el.getAttribute("data-message-author-role") !== null;
  if (selector === 'div[contenteditable="true"][data-testid="composer"]') return false;
  if (selector === 'div[contenteditable="true"]')
    return el.getAttribute("contenteditable") === "true";
  if (selector === "textarea") return el.tagName === "TEXTAREA";
  if (selector === 'button[data-testid="stop-button"]')
    return el.tagName === "BUTTON" && el.getAttribute("data-testid") === "stop-button";
  if (selector === '[data-testid="generating"]')
    return el.getAttribute("data-testid") === "generating";
  if (selector === '.result-streaming, [data-streaming="true"]') return false;
  if (selector === "pre") return el.tagName === "PRE";
  if (selector === "img, video, iframe, canvas, embed")
    return ["IMG", "VIDEO", "IFRAME", "CANVAS", "EMBED"].includes(el.tagName);
  if (selector === ".ackit-placeholder") return el.className === "ackit-placeholder";
  if (selector === ".ackit-placeholder-code") return el.className === "ackit-placeholder-code";
  if (selector === ".ackit-placeholder-media") return el.className === "ackit-placeholder-media";
  if (selector === '[data-ackit-collapsed="true"]')
    return el.getAttribute("data-ackit-collapsed") === "true";
  if (selector === 'section[data-ackit-collapsed="true"]')
    return el.tagName === "SECTION" && el.getAttribute("data-ackit-collapsed") === "true";
  if (selector === '[data-ackit-pinned="true"]' || selector === "[data-ackit-pinned='true']")
    return el.getAttribute("data-ackit-pinned") === "true";
  if (selector === ".ackit-placeholder, .ackit-placeholder-code, .ackit-placeholder-media") {
    return ["ackit-placeholder", "ackit-placeholder-code", "ackit-placeholder-media"].includes(
      el.className,
    );
  }
  if (selector === "[data-ackit-style]") return el.getAttribute("data-ackit-style") !== null;
  // fallback: simple attribute equality
  const m = selector.match(/^\[([^\]=]+)(?:=["']?([^"']+)["'])?\]$/);
  if (m) {
    const attr = m[1] ?? "";
    const val = m[2];
    const got = el.getAttribute(attr);
    if (val === undefined) return got !== null;
    return got === val;
  }
  return false;
}

class FakeDocument {
  body: FakeElement = new FakeElement("body");
  documentElement: FakeElement = new FakeElement("html");
  activeElement: FakeElement | null = null;
  createElement(tag: string): FakeElement {
    return new FakeElement(tag);
  }
  getElementById(id: string): FakeElement | null {
    // Search body and documentElement
    const walk = (el: FakeElement): FakeElement | null => {
      if (el.getAttribute("id") === id) return el;
      for (const c of el.children) {
        const found = walk(c);
        if (found) return found;
      }
      return null;
    };
    return walk(this.body) ?? walk(this.documentElement);
  }
  querySelector(selector: string): FakeElement | null {
    // Check body then documentElement
    if (selector === "#thread") {
      return this.getElementById("thread");
    }
    const fromBody = this.body.querySelector(selector);
    if (fromBody) return fromBody;
    // Also check documentElement children (for completeness)
    return null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    return this.body.querySelectorAll(selector);
  }
}

// Global fakes
let fakeDoc: FakeDocument;
let originalDocument: unknown;
let originalWindow: unknown;
let originalMutationObserver: unknown;
let originalHTMLElement: unknown;

function installFakeDom(): void {
  originalDocument = (globalThis as unknown as { document: unknown }).document;
  originalWindow = (globalThis as unknown as { window: unknown }).window;
  originalMutationObserver = (globalThis as unknown as { MutationObserver: unknown })
    .MutationObserver;
  originalHTMLElement = (globalThis as unknown as { HTMLElement: unknown }).HTMLElement;

  fakeDoc = new FakeDocument();
  // Wire documentElement scrollHeight
  Object.defineProperty(fakeDoc.documentElement, "scrollHeight", {
    value: 10000,
    writable: true,
    configurable: true,
  });

  (globalThis as unknown as { document: unknown }).document = fakeDoc as unknown as Document;
  (globalThis as unknown as { window: unknown }).window = {
    scrollY: 0,
    innerHeight: 800,
    clearTimeout: (id: number) => clearTimeout(id),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
    getSelection: () => null,
    dispatchEvent: () => true,
  } as unknown as Window;
  (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = class {
    observe(): void {}
    disconnect(): void {}
  } as unknown as typeof MutationObserver;
  (globalThis as unknown as { HTMLElement: unknown }).HTMLElement =
    FakeElement as unknown as typeof HTMLElement;

  Object.defineProperty(globalThis, "location", {
    value: { hostname: "chatgpt.com", href: "https://chatgpt.com/c/123" },
    writable: true,
    configurable: true,
  });
}

function uninstallFakeDom(): void {
  (globalThis as unknown as { document: unknown }).document = originalDocument as Document;
  (globalThis as unknown as { window: unknown }).window = originalWindow as Window;
  (globalThis as unknown as { MutationObserver: unknown }).MutationObserver =
    originalMutationObserver as typeof MutationObserver;
  (globalThis as unknown as { HTMLElement: unknown }).HTMLElement =
    originalHTMLElement as typeof HTMLElement;
}

function buildFixture(totalTurns = TURN_COUNT): FakeElement {
  // Reset body
  fakeDoc.body.children = [];
  const thread = fakeDoc.createElement("div");
  thread.setAttribute("id", "thread");
  fakeDoc.body.appendChild(thread);
  // Add to documentElement as well for scroll
  fakeDoc.documentElement.children = [fakeDoc.body];

  for (let i = 0; i < totalTurns; i++) {
    const turn = fakeDoc.createElement("section");
    turn.setAttribute("data-testid", `conversation-turn-${i}`);
    turn.setAttribute("data-turn", String(i));
    const role = fakeDoc.createElement("div");
    role.setAttribute("data-message-author-role", i % 2 === 0 ? "user" : "assistant");
    role.textContent = `Message ${i}`;
    turn.appendChild(role);

    // For last 20, add large pre/img to exercise second pass (they remain visible but code/media collapsed)
    if (i >= totalTurns - 20) {
      if (i % 3 === 0) {
        const pre = fakeDoc.createElement("pre");
        pre.textContent = Array.from({ length: 35 }, (_, n) => `line ${n} code`).join("\n");
        turn.appendChild(pre);
      }
      if (i % 5 === 0) {
        const img = fakeDoc.createElement("img");
        turn.appendChild(img);
      }
    }

    thread.appendChild(turn);
  }
  // Keep documentElement out of query path to avoid double-count
  fakeDoc.documentElement.children = [];
  return thread;
}

describe("Browser Companion — Conversation Performance benchmark (synthetic 500-turn, Node fake DOM)", () => {
  beforeEach(() => {
    installFakeDom();
    buildFixture();
  });

  afterEach(() => {
    uninstallFakeDom();
  });

  it("detects 500 turns and compact reduces visible count with reversible placeholder", async () => {
    const { createChatGptAdapter } = await import(
      "../../extensions/browser/src/adapters/chatgpt/index.js"
    );
    const adapter = createChatGptAdapter();

    // Force near-bottom (mock is 10000 - (0+800)=9200 -> not near bottom! Need to set small scrollHeight)
    // For fake, documentElement scrollHeight is 10000, window scrollY 0, innerHeight 800 => bottomDistance 9200 >400 not near bottom => compact would be no-op.
    // So we patch isNearBottom by making scrollHeight small: 500
    Object.defineProperty(fakeDoc.documentElement, "scrollHeight", {
      value: 500,
      writable: true,
      configurable: true,
    });

    expect(adapter.detect()).toBe(true);
    const health = adapter.healthCheck();
    expect(health.ok).toBe(true);

    const all = adapter.enumerateTurns();
    expect(all.length).toBe(TURN_COUNT);

    const keepRecent = 10;
    const t0 = performance.now();
    performance.mark("ackit-compact-start");
    const result = adapter.compact({ keepRecent });
    performance.mark("ackit-compact-end");
    performance.measure("ackit-compact", "ackit-compact-start", "ackit-compact-end");
    const t1 = performance.now();
    const compactMs = t1 - t0;
    const measures = performance.getEntriesByName("ackit-compact");
    const measureMs = measures[0]?.duration ?? compactMs;

    // compacted includes turn collapses (490) plus code/media collapses inside visible recent 10 (5 extra = 495)
    expect(result.compacted).toBe(495);

    const collapsedAll = fakeDoc.querySelectorAll(`[${ACKIT_COLLAPSED_ATTR}="true"]`);
    expect(collapsedAll.length).toBe(495);
    // Count only section turns collapsed
    const collapsedTurns = fakeDoc.querySelectorAll(`section[${ACKIT_COLLAPSED_ATTR}="true"]`);
    expect(collapsedTurns.length).toBe(TURN_COUNT - keepRecent);

    // Visible = keepRecent (code/media placeholders don't hide turns themselves in this fake)
    const visibleCount = TURN_COUNT - collapsedTurns.length;
    expect(visibleCount).toBe(keepRecent);

    // Nodes never removed — reversible
    const totalTurnNodes = fakeDoc.querySelectorAll(
      'section[data-testid^="conversation-turn-"][data-turn]',
    ).length;
    expect(totalTurnNodes).toBe(TURN_COUNT);

    const placeholders = fakeDoc.querySelectorAll(".ackit-placeholder");
    expect(placeholders.length).toBe(TURN_COUNT - keepRecent);

    // Restore
    const t2 = performance.now();
    performance.mark("ackit-restore-start");
    adapter.restore();
    performance.mark("ackit-restore-end");
    performance.measure("ackit-restore", "ackit-restore-start", "ackit-restore-end");
    const restoreMs = performance.now() - t2;
    const restoreMeasure = performance.getEntriesByName("ackit-restore")[0]?.duration ?? restoreMs;

    expect(fakeDoc.querySelectorAll(`[${ACKIT_COLLAPSED_ATTR}="true"]`).length).toBe(0);
    expect(
      fakeDoc.querySelectorAll(
        ".ackit-placeholder, .ackit-placeholder-code, .ackit-placeholder-media",
      ).length,
    ).toBe(0);

    const metrics = {
      fixtureTurns: TURN_COUNT,
      detectedTurns: all.length,
      keepRecent,
      compacted: result.compacted,
      alreadyCompacted: result.alreadyCompacted,
      skippedFocused: result.skippedFocused,
      visibleAfterCompact: visibleCount,
      domTurnNodesAfterCompact: totalTurnNodes,
      placeholderCount: placeholders.length,
      scriptingMsCompact: Number(compactMs.toFixed(2)),
      measureMsCompact: Number(measureMs.toFixed(2)),
      scriptingMsRestore: Number(restoreMs.toFixed(2)),
      measureMsRestore: Number(restoreMeasure.toFixed(2)),
      styleLayoutMs: "N/A (Node fake DOM)",
      paintMs: "N/A (Node fake DOM)",
      longTasks: "N/A (use live Chrome performance_start_trace for real trace)",
      browser: "Node fake DOM (synthetic)",
      traceConfig: "performance.mark/measure around compact/restore, 500-turn ChatGPT fixture",
    };
    expect(metrics.scriptingMsCompact).toBeGreaterThanOrEqual(0);
    expect(metrics.scriptingMsCompact).toBeLessThan(2000);
    // eslint-disable-next-line no-console
    console.log("[ACKit benchmark]", JSON.stringify(metrics));

    performance.clearMarks();
    performance.clearMeasures();
  });

  it("pinned turns survive auto-compaction until unpinned", async () => {
    const { createChatGptAdapter } = await import(
      "../../extensions/browser/src/adapters/chatgpt/index.js"
    );
    const adapter = createChatGptAdapter();
    Object.defineProperty(fakeDoc.documentElement, "scrollHeight", {
      value: 500,
      writable: true,
      configurable: true,
    });

    const turns = adapter.enumerateTurns();
    const toPin = [turns[10]!, turns[20]!];
    for (const t of toPin) {
      t.element.setAttribute(ACKIT_PINNED_ATTR, "true");
      t.element.style.outline = "2px dashed #4a8";
    }

    const result = adapter.compact({ keepRecent: 10 });
    // Baseline 495 includes 5 code/media extra; pinning 2 saves 2 turns
    expect(result.compacted).toBe(493);
    for (const t of toPin) {
      expect(t.element.getAttribute(ACKIT_COLLAPSED_ATTR)).not.toBe("true");
      expect(t.element.getAttribute(ACKIT_PINNED_ATTR)).toBe("true");
    }

    for (const t of toPin) {
      t.element.removeAttribute(ACKIT_PINNED_ATTR);
      t.element.style.outline = "";
    }
    adapter.restore();
    const result2 = adapter.compact({ keepRecent: 10 });
    expect(result2.compacted).toBe(495);
  });

  it("is no-op while streaming", async () => {
    const { createChatGptAdapter } = await import(
      "../../extensions/browser/src/adapters/chatgpt/index.js"
    );
    const adapter = createChatGptAdapter();
    Object.defineProperty(fakeDoc.documentElement, "scrollHeight", {
      value: 500,
      writable: true,
      configurable: true,
    });

    // Add stop button to fake doc body (isStreaming checks document.querySelector)
    const stop = fakeDoc.createElement("button");
    stop.setAttribute("data-testid", "stop-button");
    fakeDoc.body.appendChild(stop);
    expect(adapter.isStreaming()).toBe(true);
    const r1 = adapter.compact({ keepRecent: 10 });
    expect(r1.compacted).toBe(0);
  });
});
