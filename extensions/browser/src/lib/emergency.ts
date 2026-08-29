// Emergency Disconnect and Safe Mode logic — shared between service worker and content scripts.

export const DISABLED_SITES_KEY = "ackit:browser:disabledSites";

export type DisconnectReason = "emergency" | "site-disable" | "circuit-breaker";

export function createAbortController(): AbortController {
  return new AbortController();
}

// Content-script side: track observers/timers/listeners to stop on disconnect.
export class LifecycleTracker {
  private observers: MutationObserver[] = [];
  private timers: number[] = [];
  private listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];
  private cleaned = false;

  trackObserver(observer: MutationObserver): void {
    this.observers.push(observer);
  }

  trackTimer(id: number): void {
    this.timers.push(id);
  }

  trackListener(target: EventTarget, type: string, handler: EventListener): void {
    target.addEventListener(type, handler);
    this.listeners.push({ target, type, handler });
  }

  disconnect(): void {
    if (this.cleaned) return;
    this.cleaned = true;
    for (const o of this.observers) {
      try {
        o.disconnect();
      } catch {}
    }
    this.observers = [];
    for (const id of this.timers) {
      try {
        clearTimeout(id);
        clearInterval(id);
      } catch {}
    }
    this.timers = [];
    for (const l of this.listeners) {
      try {
        l.target.removeEventListener(l.type, l.handler);
      } catch {}
    }
    this.listeners = [];
  }
}

export class CircuitBreaker {
  private errors: number[] = [];
  constructor(
    private readonly threshold: number = 5,
    private readonly windowMs: number = 30_000,
  ) {}

  recordError(): boolean {
    const now = Date.now();
    this.errors.push(now);
    // prune outside window
    this.errors = this.errors.filter((t) => now - t < this.windowMs);
    return this.errors.length >= this.threshold;
  }

  recordSuccess(): void {
    // do not reset on success; only window expiry prunes
  }

  shouldTrip(): boolean {
    const now = Date.now();
    this.errors = this.errors.filter((t) => now - t < this.windowMs);
    return this.errors.length >= this.threshold;
  }

  reset(): void {
    this.errors = [];
  }
}
