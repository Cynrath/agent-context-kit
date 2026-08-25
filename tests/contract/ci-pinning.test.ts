import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const WORKFLOW = path.join(process.cwd(), ".github", "workflows", "ci.yml");
const RELEASE_WORKFLOW = path.join(process.cwd(), ".github", "workflows", "release.yml");

/** Supply-chain gate (REQ-SEC-004): every `uses:` must be a full commit SHA
 * with a human-readable version comment on the same or previous line. */
describe("CI workflow hardening", () => {
  const raw = readFileSync(WORKFLOW, "utf8");

  it("pins every action to a full 40-char commit SHA", () => {
    const usesLines = [...raw.matchAll(/^\s*-?\s*uses:\s*(\S+)\s*$/gm)].map(
      (match) => match[1] ?? "",
    );
    expect(usesLines.length).toBeGreaterThan(0);
    for (const ref of usesLines) {
      const [action, sha] = ref.split("@");
      expect(action, `unpinned action: ${ref}`).toBeTruthy();
      expect(sha, `action '${action}' not SHA-pinned: '${sha}'`).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("carries a version comment for each pinned action", () => {
    expect(raw).toContain("# actions/checkout@v4");
    expect(raw).toContain("# actions/setup-node@v4");
    expect(raw).toContain("# pnpm/action-setup@v4");
  });

  it("scopes permissions to contents: read and has no publish/release workflow", () => {
    expect(raw).toContain("permissions:");
    expect(raw).toMatch(/contents:\s*read/);
    expect(raw).not.toContain("release:");
    expect(raw).not.toContain("publish");
    expect(raw.toLowerCase()).not.toContain("npm publish");
  });

  it("triggers on master push/PR in addition to rebuild/** branches", () => {
    // Release-transition requirement (TASK-0004): CI must gate master pushes
    // and PRs targeting master while keeping rebuild/** coverage.
    expect(raw).toMatch(/push:\s*\n\s*branches:\s*\n\s*-\s*"master"\s*\n\s*-\s*"rebuild\/\*\*"/);
    expect(raw).toMatch(
      /pull_request:\s*\n\s*branches:\s*\n\s*-\s*"master"\s*\n\s*-\s*"rebuild\/\*\*"/,
    );
  });

  it("covers the required matrix and hardening jobs", () => {
    for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) {
      expect(raw.includes(`os: [ubuntu-latest, windows-latest, macos-latest]`)).toBe(true);
      void os;
    }
    expect(raw).toContain('node: ["22", "24"]');
    expect(raw).toContain("self-scan");
    expect(raw).toContain("package-smoke");
    expect(raw).toContain("scan --ci");
    expect(raw).toContain("smoke:package");
  });
});

/** Controlled-release gate: release.yml must stay a tags-only, OIDC-only,
 * no-long-lived-token pipeline whose ordering guarantees npm publish happens
 * strictly before GitHub Release creation (REQ-SEC-004/005, REQ-GOV-010). */
describe("release workflow hardening", () => {
  const raw = readFileSync(RELEASE_WORKFLOW, "utf8");

  it("exists and pins every action to a full 40-char commit SHA", () => {
    const usesLines = [...raw.matchAll(/^\s*-?\s*uses:\s*(\S+)\s*$/gm)].map(
      (match) => match[1] ?? "",
    );
    expect(usesLines.length).toBeGreaterThan(0);
    for (const ref of usesLines) {
      const [action, sha] = ref.split("@");
      expect(action, `unpinned action: ${ref}`).toBeTruthy();
      expect(sha, `action '${action}' not SHA-pinned: '${sha}'`).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("triggers on version tags only — never on branch pushes", () => {
    expect(raw).toMatch(/tags:\s*\n\s*-\s*"v\*\.\*\.\*"/);
    // The push trigger block must not carry a branches selector.
    const pushBlock = /on:\s*\n\s*push:\s*\n(?:.*\n)*?\s*permissions:/m.exec(raw)?.[0] ?? "";
    expect(pushBlock).not.toMatch(/branches:/);
  });

  it("grants exactly contents:write + id-token:write and nothing else", () => {
    expect(raw).toMatch(/permissions:\s*\n\s*contents:\s*write\s*\n\s*id-token:\s*write/);
    expect(raw).not.toMatch(/packages:\s*(read|write)/);
    expect(raw).not.toMatch(/deployments:\s*(?! )\S+/);
  });

  it("depends on no long-lived npm publish token or OTP secret", () => {
    expect(raw).not.toContain("NODE_AUTH_TOKEN");
    expect(raw).not.toContain("NPM_TOKEN");
    expect(raw).not.toContain("secrets.");
    expect(raw).not.toMatch(/\bOTP\b/i);
    expect(raw).toContain("--provenance");
  });

  it("gates on an anchored exact-tag regex, checkout identity, and package/version parity", () => {
    // Regression guard: the former `case` glob (`v[0-9]*.[0-9]*.[0-9]*`)
    // accepted non-exact tags such as `v0.1.1-beta` or `v1.2.3.4` because a
    // glob `*` spans dots and suffixes. Only an anchored regex is exact.
    expect(raw).not.toContain("v[0-9]*.[0-9]*.[0-9]*)");
    // The ${...} sequences below are LITERAL shell/YAML text asserted inside
    // release.yml, not template interpolations.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal bash text under test
    expect(raw).toContain('if [[ ! "${TAG_NAME}" =~ ^v[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal bash text under test
    expect(raw).toContain('"${TAG_COMMIT}" != "${HEAD_COMMIT}"');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal error message under test
    expect(raw).toContain("'${PKG_VERSION}' does not match tag");
    expect(raw).toContain("@cynrath/agent-context-kit");
  });

  it("rejects malformed tags and accepts only exact vX.Y.Z releases (behavioral)", () => {
    // Extract the actual guard regex from release.yml so this regression test
    // exercises the shipped validation instead of re-implementing it.
    const guard = raw.match(/if \[\[ ! "\$\{TAG_NAME\}" =~ (.+?) \]\]; then/);
    expect(guard, "release.yml must gate TAG_NAME on an anchored regex").not.toBeNull();
    const tagRule = new RegExp(guard?.[1] ?? "(?!)");
    const accepted = ["v0.1.1", "v1.0.0", "v12.34.56"];
    const rejected = ["v0.1.1foo", "v0.1.1-beta", "v0.1", "0.1.1", "v1.2.3.4", "v1a.2.3"];
    for (const tag of accepted) {
      expect(tagRule.test(tag), `exact tag '${tag}' must pass the shape gate`).toBe(true);
    }
    for (const tag of rejected) {
      expect(tagRule.test(tag), `malformed tag '${tag}' must fail the shape gate`).toBe(false);
    }
    // The failure branch must be loud and blocking.
    expect(raw).toMatch(/::error::tag/);
    expect(raw).toContain("is not an exact vX.Y.Z release tag");
  });

  it("runs gates and registry-absence check BEFORE npm publish", () => {
    const order = (marker: string): number => {
      const index = raw.indexOf(marker);
      expect(index, `release.yml missing marker '${marker}'`).toBeGreaterThan(-1);
      return index;
    };
    const tests = order("run: pnpm test");
    const smoke = order("run: pnpm run smoke:package");
    const absence = order("Confirm exact version is absent from the npm registry");
    const publish = order("run: npm publish --access public --provenance");
    expect(tests).toBeLessThan(publish);
    expect(smoke).toBeLessThan(publish);
    expect(absence).toBeLessThan(publish);
  });

  it("creates the GitHub Release only AFTER publish + registry + npx verification", () => {
    const publish = raw.indexOf("run: npm publish --access public --provenance");
    const verify = raw.indexOf("Verify registry metadata, shasum, and dist-tag");
    const npxSmoke = raw.indexOf("Real registry npx consumer smoke");
    const release = raw.indexOf("gh release create");
    expect(publish).toBeGreaterThan(-1);
    expect(npxSmoke).toBeGreaterThan(publish);
    expect(verify).toBeGreaterThan(publish);
    expect(release).toBeGreaterThan(npxSmoke);
    expect(release).toBeGreaterThan(verify);
  });

  it("keeps GitHub Release creation as the strictly-last job step (failed publish aborts first)", () => {
    const releaseStep = raw.indexOf(
      "- name: Create GitHub Release (strictly after successful publish + verification)",
    );
    expect(releaseStep).toBeGreaterThan(-1);
    expect(releaseStep).toBe(raw.lastIndexOf("- name:"));
    // Sequential steps under `set -euo pipefail` mean any earlier failure
    // (publish, registry verify, npx smoke) aborts the job before this step.
    expect(raw).toContain("set -euo pipefail");
  });

  it("prevents duplicate simultaneous releases via a concurrency group", () => {
    expect(raw).toMatch(/concurrency:\s*\n\s*group:\s*release-/);
    expect(raw).toMatch(/cancel-in-progress:\s*false/);
  });

  it("parses as strict YAML with tags-only push semantics (startup-failure guard)", () => {
    // An unparseable workflow makes GitHub fall back to default triggers and
    // record startup failures on EVERY push; this assertion keeps the file
    // machine-valid before it can reach master.
    const doc = parse(raw) as {
      on?: {
        push?: { tags?: string[]; branches?: string[] };
        pull_request?: unknown;
        workflow_dispatch?: unknown;
      };
      jobs?: Record<string, unknown>;
      permissions?: Record<string, string>;
    };
    expect(doc.on?.push?.tags).toContain("v*.*.*");
    expect(doc.on?.push?.branches).toBeUndefined();
    // Master/PR pushes and manual dispatches must never be able to publish.
    expect(doc.on?.pull_request).toBeUndefined();
    expect(doc.on?.workflow_dispatch).toBeUndefined();
    expect(Object.keys(doc.jobs ?? {})).toEqual(["release"]);
    expect(doc.permissions).toEqual({ contents: "write", "id-token": "write" });
  });
});
