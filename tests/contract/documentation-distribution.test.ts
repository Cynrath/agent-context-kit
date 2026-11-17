import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("maintained documentation distribution", () => {
  it("README local Markdown links resolve to maintained files or directories", () => {
    const markdown = readFileSync("README.md", "utf8");
    for (const match of markdown.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?\)/g)) {
      const target = (match[1] ?? "").split("#")[0] ?? "";
      if (!target || /^[a-z]+:/i.test(target)) continue;
      expect(existsSync(path.resolve(decodeURIComponent(target))), target).toBe(true);
    }
  });
  it("every Docs7 navigation route has an actual page inside docs", () => {
    const config = JSON.parse(readFileSync("docs/docs.json", "utf8")) as {
      navigation: { groups: { pages: string[] }[] };
    };
    const root = path.resolve("docs");
    const routes = config.navigation.groups.flatMap((group) => group.pages);
    expect(routes.length).toBeGreaterThan(0);
    expect(new Set(routes).size).toBe(routes.length);
    for (const route of routes) {
      const absolute = path.resolve(root, route);
      expect(absolute.startsWith(`${root}${path.sep}`), route).toBe(true);
      expect(
        [".md", ".mdx"].some((suffix) => existsSync(absolute + suffix)),
        route,
      ).toBe(true);
    }
  });
  it("Context7 indexing points to existing current documentation", () => {
    const config = JSON.parse(readFileSync("context7.json", "utf8")) as {
      projectTitle: string;
      description: string;
      folders: string[];
      rules: string[];
      excludeFolders: string[];
    };
    expect(config.projectTitle.length).toBeLessThanOrEqual(100);
    expect(config.description.length).toBeLessThanOrEqual(500);
    for (const rule of config.rules) expect(rule.length).toBeLessThanOrEqual(255);
    for (const folder of config.folders) expect(existsSync(folder), folder).toBe(true);
    expect(config.excludeFolders).toContain("docs/tasks");
    expect(config.excludeFolders).toContain("docs/rebuild");
  });
});
