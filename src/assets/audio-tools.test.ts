import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { getDurationSec, concatWithSilence, mixSfxOntoVoice } from "./audio-tools.js";

let tmp: string;
beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "aud-")); });
afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

describe("getDurationSec", () => {
  it("returns ~2s for sample-audio-1.mp3", async () => {
    const d = await getDurationSec("tests/fixtures/sample-audio-1.mp3");
    expect(d).toBeGreaterThan(1.9);
    expect(d).toBeLessThan(2.2);
  });
});

describe("concatWithSilence", () => {
  it("concatenates two mp3s with 0.3s gap", async () => {
    const out = join(tmp, "voice.mp3");
    await concatWithSilence(
      ["tests/fixtures/sample-audio-1.mp3", "tests/fixtures/sample-audio-2.mp3"],
      0.3,
      out,
    );
    expect(existsSync(out)).toBe(true);
    const d = await getDurationSec(out);
    // 2s + 0.3s + 3s = 5.3s, allow ±0.3s
    expect(d).toBeGreaterThan(5.0);
    expect(d).toBeLessThan(5.6);
  });
});

/** Integrated loudness (LUFS) from ffmpeg's ebur128 summary (printed on stderr). */
function integratedLufs(path: string): number {
  const res = spawnSync("ffmpeg", ["-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const matches = [...res.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  return parseFloat(matches[matches.length - 1][1]);
}

describe("mixSfxOntoVoice", () => {
  it("normalises to about -14 LUFS without changing duration (no SFX)", async () => {
    const out = join(tmp, "voice.mp3");
    await mixSfxOntoVoice("tests/fixtures/sample-audio-1.mp3", [], out);
    expect(Math.abs(integratedLufs(out) - -14)).toBeLessThan(1);
    expect(Math.abs((await getDurationSec(out)) - 2.04)).toBeLessThan(0.1);
  });

  it("normalises the voice + SFX mix to about -14 LUFS", async () => {
    const out = join(tmp, "voice.mp3");
    await mixSfxOntoVoice(
      "tests/fixtures/sample-audio-1.mp3",
      [{ path: "tests/fixtures/sample-audio-2.mp3", startSec: 0.5, volume: 0.4 }],
      out,
    );
    expect(Math.abs(integratedLufs(out) - -14)).toBeLessThan(1);
  });
});
