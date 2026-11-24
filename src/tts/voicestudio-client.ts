import axios, { AxiosError } from "axios";
import { writeFile } from "node:fs/promises";
import type { TtsClient } from "./tts-client.js";

export interface VoiceStudioOpts {
  endpoint: string;      // e.g. "http://localhost:3900/v1"
  model: string;         // VoiceStudio engine id, e.g. "voxcpm2"
  voice: string;         // voice profile name or id, or "default"
  language: string;      // ISO 639-1, e.g. "vi"
  speed: number;         // 0.25–4.0
  apiKey?: string;       // only needed when VoiceStudio runs on another machine
  timeoutMs: number;     // local GPU/CPU generation can take a while
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * VoiceStudio TTS client (https://github.com/debpalash/VoiceStudio).
 *
 * VoiceStudio runs locally and exposes an OpenAI-compatible endpoint:
 *   POST {endpoint}/audio/speech  → mp3 binary
 * Same shape as ElevenLabs: synchronous, no polling.
 *
 * Default model is "voxcpm2" (Apache-2.0 weights, supports Vietnamese).
 * Do NOT switch to "omnivoice" for commercial videos: its weights are CC-BY-NC.
 *
 * No SRT is returned — `srtOutPath` is ignored silently.
 */
export class VoiceStudioClient implements TtsClient {
  constructor(private cfg: VoiceStudioOpts) {}

  async generate(text: string, audioOutPath: string, _srtOutPath?: string): Promise<void> {
    await this.synthesizeWithRetry(text, audioOutPath);
  }

  private async synthesizeWithRetry(text: string, outPath: string): Promise<void> {
    const delays = [1000, 2000, 4000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        };
        if (this.cfg.apiKey) headers["Authorization"] = `Bearer ${this.cfg.apiKey}`;

        const resp = await axios.post<ArrayBuffer>(
          `${this.cfg.endpoint}/audio/speech`,
          {
            model: this.cfg.model,
            input: text,
            voice: this.cfg.voice,
            language: this.cfg.language,
            speed: this.cfg.speed,
            response_format: "mp3",
          },
          { headers, responseType: "arraybuffer", timeout: this.cfg.timeoutMs },
        );
        const buf = Buffer.from(resp.data);
        if (buf.length === 0) throw new Error("VoiceStudio returned empty audio");
        await writeFile(outPath, buf);
        return;
      } catch (e) {
        lastErr = e;
        const err = e as AxiosError;
        const status = err.response?.status;
        // Connection refused = VoiceStudio is not running → fail fast with a clear hint.
        if (err.code === "ECONNREFUSED") {
          throw new Error(
            `VoiceStudio is not reachable at ${this.cfg.endpoint}. ` +
            `Open the VoiceStudio app first, or set TTS_PROVIDER=edge-tts as a fallback.`
          );
        }
        const retryable = status === undefined || status === 429 || status >= 500;
        if (!retryable || attempt === delays.length) {
          let detail = err.message;
          if (err.response?.data) {
            try {
              const body = err.response.data instanceof ArrayBuffer
                ? Buffer.from(err.response.data).toString("utf8")
                : String(err.response.data);
              const parsed = JSON.parse(body);
              detail = parsed?.error?.message ?? detail;
            } catch { /* ignore parse errors */ }
          }
          throw new Error(`VoiceStudio TTS failed (status ${status ?? "?"}): ${detail}`);
        }
        await sleep(delays[attempt]);
      }
    }
    throw lastErr;
  }
}
