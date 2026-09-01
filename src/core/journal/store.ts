import { promises as fsp } from "node:fs";
import path from "node:path";
import type { RepositoryRoot } from "../filesystem/root.js";
import { runSecretGateOnContent } from "../intent/gate.js";
import {
  JOURNAL_SCHEMA_ID,
  type JournalEvent,
  type JournalEventKind,
  JournalEventSchema,
} from "./types.js";

/** Journal file location (local state, ADR-0027 §6). */
export const JOURNAL_FILE = "journal.jsonl";
/** Deterministic rotation cap: keep N files including the active one. */
export const JOURNAL_MAX_FILES = 3;
/** Rotate when the active file exceeds this line count. */
export const JOURNAL_ROTATE_LINES = 5000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Sanitized local execution journal (ADR-0027 §6): append-only JSONL of
 * ACKit-observable events ONLY. Not telemetry; never uploaded; no
 * conversation/thought/tool-call capture (the closed kind list structurally
 * excludes them). Redaction at construction via the canonical secret gate;
 * journal failures never break the primary command (best-effort with a
 * visible diagnostic).
 */
export class JournalStore {
  constructor(private readonly root: RepositoryRoot) {}

  private filePath(rotation = 0): string {
    return path.join(
      this.root.canonicalPath,
      ".ackit",
      "workflow",
      rotation === 0 ? JOURNAL_FILE : `${JOURNAL_FILE}.${rotation}`,
    );
  }

  /**
   * Best-effort append: on ANY failure the error is swallowed and `false`
   * returned so callers surface a diagnostic without failing their command.
   * Sequence continues monotonically across rotations; events are redacted
   * and validated before the line is written.
   */
  async append(
    kind: JournalEventKind,
    detail: Record<string, unknown>,
    options: { taskId?: string | undefined } = {},
  ): Promise<boolean> {
    try {
      const seq = await this.nextSeq();
      const candidate: JournalEvent = {
        schemaId: JOURNAL_SCHEMA_ID,
        seq,
        occurredAt: today(),
        kind,
        ...(options.taskId !== undefined ? { taskId: options.taskId } : {}),
        detail,
      };
      const parsed = JournalEventSchema.safeParse(candidate);
      if (!parsed.success) {
        // Invalid event shapes are never persisted; the primary command
        // continues and the caller reports the skip via the return value.
        return false;
      }
      // Redaction at construction: secret-shaped detail content is replaced
      // before serialization (canonical gate — single detection source, T26).
      const redacted = JSON.parse(redactEvent(parsed.data)) as JournalEvent;
      await this.appendLine(JSON.stringify(redacted));
      return true;
    } catch {
      return false;
    }
  }

  async read(options: { limit?: number | undefined } = {}): Promise<JournalEvent[]> {
    const events: JournalEvent[] = [];
    // Read newest rotation first, then older, then sort by seq.
    for (const rotation of [0, 1, 2]) {
      let raw: string;
      try {
        raw = await fsp.readFile(this.filePath(rotation), "utf8");
      } catch {
        continue;
      }
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          const parsed: unknown = JSON.parse(trimmed);
          const result = JournalEventSchema.safeParse(parsed);
          if (result.success) events.push(result.data);
        } catch {
          // Invalid lines are skipped (never crash reads).
        }
      }
    }
    events.sort((a, b) => a.seq - b.seq);
    if (options.limit !== undefined && options.limit >= 0) {
      return options.limit === 0 ? events : events.slice(-options.limit);
    }
    return events;
  }

  /** Structural audit for `ackit journal validate`: every stored line valid. */
  async validate(): Promise<{ ok: boolean; problems: string[] }> {
    const problems: string[] = [];
    for (const rotation of [0, 1, 2]) {
      let raw: string;
      try {
        raw = await fsp.readFile(this.filePath(rotation), "utf8");
      } catch {
        continue;
      }
      for (const [index, line] of raw.split("\n").entries()) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          const parsed: unknown = JSON.parse(trimmed);
          const result = JournalEventSchema.safeParse(parsed);
          if (!result.success) {
            problems.push(
              `journal line ${rotation}:${index + 1}: invalid event (${result.error.issues.length} issue(s))`,
            );
          } else if (runSecretGateOnContent(trimmed).length > 0) {
            problems.push(`journal line ${rotation}:${index + 1}: secret-shaped content detected`);
          }
        } catch {
          problems.push(`journal line ${rotation}:${index + 1}: not valid JSON`);
        }
      }
    }
    return { ok: problems.length === 0, problems };
  }

  private async appendLine(line: string): Promise<void> {
    const active = this.filePath();
    await fsp.mkdir(path.dirname(active), { recursive: true });
    let existing = "";
    try {
      existing = await fsp.readFile(active, "utf8");
    } catch {
      existing = "";
    }
    const lineCount = existing.split("\n").filter((l) => l.trim().length > 0).length;
    if (lineCount >= JOURNAL_ROTATE_LINES) {
      await this.rotate();
      existing = "";
    }
    const prefix = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
    await fsp.writeFile(active, `${existing}${prefix}${line}\n`, "utf8");
  }

  private async rotate(): Promise<void> {
    // journal.jsonl.1 → .2, journal.jsonl → .1 (deterministic, capped).
    try {
      await fsp.rename(this.filePath(2), this.filePath(2).replace(/\.2$/, ".tmp-rot"));
    } catch {
      // no .2 yet
    }
    try {
      await fsp.rename(this.filePath(1), this.filePath(2));
    } catch {
      // no .1 yet
    }
    try {
      await fsp.rename(this.filePath(0), this.filePath(1));
    } catch {
      // no active file (impossible here)
    }
    try {
      await fsp.rm(this.filePath(2).replace(/\.2$/, ".tmp-rot"), { force: true });
    } catch {
      // cleanup best-effort
    }
  }

  private async nextSeq(): Promise<number> {
    let max = 0;
    for (const event of await this.read()) {
      max = Math.max(max, event.seq);
    }
    return max + 1;
  }
}

/** Redact an event: secret-gate the serialized detail; replace on hits. */
function redactEvent(event: JournalEvent): string {
  const serialized = JSON.stringify(event.detail);
  if (runSecretGateOnContent(serialized).length === 0) {
    return JSON.stringify(event);
  }
  const redacted = { ...event, detail: { redacted: true } };
  return JSON.stringify(redacted);
}
