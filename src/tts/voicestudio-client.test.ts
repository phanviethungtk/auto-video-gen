import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { VoiceStudioClient } from "./voicestudio-client.js";

const opts = {
  endpoint: "http://localhost:3900/v1",
  model: "voxcpm2",
  voice: "Giong SORATA",
  language: "vi",
  speed: 1.0,
  timeoutMs: 5000,
};

let tmpDir: string;

beforeEach(() => {
  nock.cleanAll();
  tmpDir = mkdtempSync(join(tmpdir(), "vs-test-"));
});

afterEach(() => {
  nock.cleanAll();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("VoiceStudioClient", () => {
  it("posts an OpenAI-style speech request and writes the mp3", async () => {
    nock("http://localhost:3900")
      .post(
        "/v1/audio/speech",
        (b: any) =>
          b.input === "Xin chào" &&
          b.model === "voxcpm2" &&
          b.voice === "Giong SORATA" &&
          b.language === "vi" &&
          b.response_format === "mp3",
      )
      .reply(200, Buffer.from("MP3DATA"), { "content-type": "audio/mpeg" });

    const out = join(tmpDir, "out.mp3");
    await new VoiceStudioClient(opts).generate("Xin chào", out);
    expect(readFileSync(out).toString()).toBe("MP3DATA");
  });

  it("sends a Bearer token only when an API key is set", async () => {
    nock("http://localhost:3900")
      .post("/v1/audio/speech")
      .matchHeader("authorization", "Bearer vs_key")
      .reply(200, Buffer.from("OK"));

    const out = join(tmpDir, "out.mp3");
    await new VoiceStudioClient({ ...opts, apiKey: "vs_key" }).generate("hi", out);
    expect(readFileSync(out).toString()).toBe("OK");
  });

  it("retries on 503 then succeeds", async () => {
    nock("http://localhost:3900")
      .post("/v1/audio/speech").reply(503, { error: { message: "model loading" } })
      .post("/v1/audio/speech").reply(200, Buffer.from("OK"));

    const out = join(tmpDir, "out.mp3");
    await new VoiceStudioClient(opts).generate("hi", out);
    expect(readFileSync(out).toString()).toBe("OK");
  });

  it("does not retry a 400 and surfaces VoiceStudio's error message", async () => {
    nock("http://localhost:3900")
      .post("/v1/audio/speech")
      .reply(400, { error: { message: "Unknown voice profile" } });

    const out = join(tmpDir, "out.mp3");
    await expect(new VoiceStudioClient(opts).generate("hi", out)).rejects.toThrow(
      /status 400.*Unknown voice profile/,
    );
  });

  it("fails fast with a clear hint when VoiceStudio is not running", async () => {
    // Real refused connection: nothing listens on port 1 of the loopback address.
    const out = join(tmpDir, "out.mp3");
    const client = new VoiceStudioClient({ ...opts, endpoint: "http://127.0.0.1:1/v1" });
    await expect(client.generate("hi", out)).rejects.toThrow(
      /not reachable.*edge-tts/,
    );
  });
});
