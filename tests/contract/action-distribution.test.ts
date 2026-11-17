import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface ActionStep {
  uses?: string;
  run?: string;
  env?: Record<string, string>;
}
const raw = readFileSync("action.yml", "utf8");
const expression = (value: string): string => `$${"{"}{ ${value} }}`;
const action = parse(raw) as {
  runs: { using: string; steps: ActionStep[] };
  outputs: Record<string, { value: string }>;
};

describe("clean-tag Action distribution", () => {
  it("bootstraps exact source with pinned setup actions and a frozen install", () => {
    expect(action.runs.using).toBe("composite");
    for (const step of action.runs.steps.filter((step) => step.uses)) {
      expect(step.uses).toMatch(/@[0-9a-f]{40}$/);
    }
    expect(raw).toContain(`${expression("github.action_path")}/package.json`);
    expect(raw).toContain("pnpm install --frozen-lockfile --ignore-scripts");
    expect(raw).toContain("pnpm build");
    expect(raw.indexOf("pnpm build")).toBeLessThan(raw.indexOf("/dist/action/index.js"));
  });
  it("passes every untrusted input through env and maps real step outputs", () => {
    for (const step of action.runs.steps) expect(step.run ?? "").not.toContain("${{ inputs.");
    expect(action.runs.steps.at(-1)?.env?.["INPUT_ARGS"]).toBe(expression("inputs.args"));
    expect(action.outputs["findings-json"]?.value).toBe(
      expression("steps.ackit.outputs.findings-json"),
    );
    expect(action.outputs["sarif-path"]?.value).toBe(expression("steps.ackit.outputs.sarif-path"));
  });
  it("dogfood has no preparatory install/build that could hide missing runtime", () => {
    const workflow = parse(readFileSync(".github/workflows/ackit-action-dogfood.yml", "utf8")) as {
      jobs: { "action-smoke": { steps: ActionStep[] } };
    };
    const steps = workflow.jobs["action-smoke"].steps;
    const index = steps.findIndex((step) => step.uses === "./");
    expect(index).toBeGreaterThan(0);
    for (const step of steps.slice(0, index)) {
      expect(step.run ?? "").not.toMatch(/pnpm (?:install|build)/);
    }
  });
});
