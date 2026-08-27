import { promises as fsp } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("VS Code icon contract", () => {
  it("icon.png is 256x256, square, and >1KB", async () => {
    const iconPath = path.join(process.cwd(), "extensions/vscode/images/icon.png");
    const buf = await fsp.readFile(iconPath);
    expect(buf.length).toBeGreaterThan(1024);
    // PNG header: 8 bytes signature + IHDR chunk
    // IHDR is at offset 8+4+4 = 16, with width at 16+8, height at 16+12
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBeGreaterThanOrEqual(128);
    expect(height).toBeGreaterThanOrEqual(128);
    expect(width).toBe(height);
    expect(width).toBe(256);
    expect(height).toBe(256);
    // Check it's a valid PNG (signature)
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
  });

  it("icon.png is not 1x1 placeholder", async () => {
    const iconPath = path.join(process.cwd(), "extensions/vscode/images/icon.png");
    const buf = await fsp.readFile(iconPath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).not.toBe(1);
    expect(height).not.toBe(1);
    expect(buf.length).not.toBe(68); // old 1x1 was 68 bytes
  });
});
