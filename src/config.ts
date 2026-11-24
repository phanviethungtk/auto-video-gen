import "dotenv/config";

export type TtsProvider = "edge-tts" | "lucylab" | "elevenlabs" | "vbee" | "voicestudio";
export type VideoTheme = "dark-neon" | "light-pro" | "sorata";
export const VIDEO_THEMES: readonly VideoTheme[] = ["dark-neon", "light-pro", "sorata"];

export interface TiktokConfig {
  displayName: string;
  handle: string;
  followers: string;
  /** URL to download avatar JPG. If undefined, the bundled `assets/avatar.jpg` is used. */
  avatarUrl?: string;
}

export interface Config {
  ttsProvider: TtsProvider;

  // Edge TTS (Free, no API key required)
  edgeTtsVoice: string;
  edgeTtsRate: string;
  edgeTtsPitch: string;
  edgeTtsVolume: string;

  // LucyLab
  lucylabApiKey?: string;
  lucylabVoiceId?: string;
  lucylabEndpoint: string;
  lucylabPollIntervalMs: number;
  lucylabPollTimeoutMs: number;

  // ElevenLabs
  elevenlabsApiKey?: string;
  elevenlabsVoiceId?: string;
  elevenlabsModelId: string;
  elevenlabsEndpoint: string;

  // Vbee
  vbeeAppId?: string;
  vbeeAccessToken?: string;
  vbeeEndpoint: string;
  vbeeVoiceCode: string;
  vbeeSpeedRate: number;
  vbeePollIntervalMs: number;
  vbeePollTimeoutMs: number;

  // VoiceStudio (local, OpenAI-compatible)
  voicestudioEndpoint: string;
  voicestudioModel: string;
  voicestudioVoice: string;
  voicestudioLanguage: string;
  voicestudioSpeed: number;
  voicestudioApiKey?: string;
  voicestudioTimeoutMs: number;

  // TikTok follow card (outro)
  tiktok: TiktokConfig;

  /** Persistent header: small tag under the channel name (e.g. "KẾ TOÁN THUẾ"). */
  brandTag: string;
  /** Optional path to a square logo image shown in the header icon box. */
  brandLogoPath?: string;

  ttsConcurrency: number;

  /** Visual template — selects which styles.<theme>.css file gets used. */
  videoTheme: VideoTheme;
}

function intDefault(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = parseInt(v, 10);
  if (isNaN(n)) throw new Error(`Env var ${name} must be integer, got "${v}"`);
  return n;
}

function floatDefault(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = parseFloat(v);
  if (isNaN(n)) throw new Error(`Env var ${name} must be a number, got "${v}"`);
  return n;
}

export function loadConfig(): Config {
  const rawProvider = (process.env.TTS_PROVIDER ?? "edge-tts").trim().toLowerCase();
  const provider = (rawProvider === "edgetts" ? "edge-tts" : rawProvider) as TtsProvider;

  if (
    provider !== "edge-tts" &&
    provider !== "lucylab" &&
    provider !== "elevenlabs" &&
    provider !== "vbee" &&
    provider !== "voicestudio"
  ) {
    throw new Error(
      `TTS_PROVIDER must be "edge-tts", "lucylab", "elevenlabs", "vbee" or "voicestudio", got "${rawProvider}"`
    );
  }

  // Validate provider-specific required vars
  if (provider === "lucylab") {
    if (!process.env.VIETNAMESE_API_KEY || process.env.VIETNAMESE_API_KEY.trim() === "") {
      throw new Error(
        `Missing VIETNAMESE_API_KEY (required when TTS_PROVIDER=lucylab). ` +
        `Copy .env.example to .env.local and fill in your LucyLab API key.`
      );
    }
    if (!process.env.VIETNAMESE_VOICEID || process.env.VIETNAMESE_VOICEID.trim() === "") {
      throw new Error(
        `Missing VIETNAMESE_VOICEID (required when TTS_PROVIDER=lucylab). ` +
        `Copy .env.example to .env.local and fill in your LucyLab voice ID.`
      );
    }
  } else if (provider === "elevenlabs") {
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.trim() === "") {
      throw new Error(
        `Missing ELEVENLABS_API_KEY (required when TTS_PROVIDER=elevenlabs). ` +
        `Copy .env.example to .env.local and fill in your ElevenLabs API key.`
      );
    }
    if (!process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_VOICE_ID.trim() === "") {
      throw new Error(
        `Missing ELEVENLABS_VOICE_ID (required when TTS_PROVIDER=elevenlabs). ` +
        `Copy .env.example to .env.local and fill in your ElevenLabs voice ID.`
      );
    }
  } else if (provider === "vbee") {
    if (!process.env.VBEE_APP_ID || process.env.VBEE_APP_ID.trim() === "") {
      throw new Error(
        `Missing VBEE_APP_ID (required when TTS_PROVIDER=vbee). ` +
        `Copy .env.example to .env.local and fill in your Vbee app ID.`
      );
    }
    if (!process.env.VBEE_ACCESS_TOKEN || process.env.VBEE_ACCESS_TOKEN.trim() === "") {
      throw new Error(
        `Missing VBEE_ACCESS_TOKEN (required when TTS_PROVIDER=vbee). ` +
        `Copy .env.example to .env.local and fill in your Vbee access token.`
      );
    }
  }

  const videoTheme = (process.env.VIDEO_THEME ?? "dark-neon") as VideoTheme;
  if (!VIDEO_THEMES.includes(videoTheme)) {
    throw new Error(`VIDEO_THEME must be one of ${VIDEO_THEMES.map((t) => `"${t}"`).join(", ")}, got "${videoTheme}"`);
  }

  return {
    ttsProvider: provider,
    edgeTtsVoice: process.env.EDGE_TTS_VOICE ?? "vi-VN-HoaiMyNeural",
    edgeTtsRate: process.env.EDGE_TTS_RATE ?? "+0%",
    edgeTtsPitch: process.env.EDGE_TTS_PITCH ?? "+0Hz",
    edgeTtsVolume: process.env.EDGE_TTS_VOLUME ?? "+0%",
    lucylabApiKey: process.env.VIETNAMESE_API_KEY,
    lucylabVoiceId: process.env.VIETNAMESE_VOICEID,
    lucylabEndpoint: process.env.LUCYLAB_ENDPOINT ?? "https://api.lucylab.io/json-rpc",
    lucylabPollIntervalMs: intDefault("LUCYLAB_POLL_INTERVAL_MS", 2000),
    lucylabPollTimeoutMs: intDefault("LUCYLAB_POLL_TIMEOUT_MS", 120000),
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
    elevenlabsModelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
    elevenlabsEndpoint: process.env.ELEVENLABS_ENDPOINT ?? "https://api.elevenlabs.io/v1",
    vbeeAppId: process.env.VBEE_APP_ID,
    vbeeAccessToken: process.env.VBEE_ACCESS_TOKEN,
    vbeeEndpoint: process.env.VBEE_ENDPOINT ?? "https://vbee.vn/api/v1",
    vbeeVoiceCode: process.env.VBEE_VOICE_CODE ?? "n_hanoi_male_protrainer_education_vc",
    vbeeSpeedRate: floatDefault("VBEE_SPEED_RATE", 1.0),
    vbeePollIntervalMs: intDefault("VBEE_POLL_INTERVAL_MS", 2000),
    vbeePollTimeoutMs: intDefault("VBEE_POLL_TIMEOUT_MS", 60000),
    voicestudioEndpoint: process.env.VOICESTUDIO_ENDPOINT ?? "http://localhost:3900/v1",
    voicestudioModel: process.env.VOICESTUDIO_MODEL ?? "voxcpm2",
    voicestudioVoice: process.env.VOICESTUDIO_VOICE ?? "default",
    voicestudioLanguage: process.env.VOICESTUDIO_LANGUAGE ?? "vi",
    voicestudioSpeed: floatDefault("VOICESTUDIO_SPEED", 1.0),
    voicestudioApiKey: process.env.VOICESTUDIO_API_KEY || undefined,
    voicestudioTimeoutMs: intDefault("VOICESTUDIO_TIMEOUT_MS", 300000),
    tiktok: {
      displayName: process.env.TIKTOK_DISPLAY_NAME ?? "Công nghệ 24h",
      handle: process.env.TIKTOK_HANDLE ?? "@congnghe24h",
      followers: process.env.TIKTOK_FOLLOWERS ?? "1.2M followers",
      avatarUrl: process.env.TIKTOK_AVATAR_URL || undefined,
    },
    brandTag: process.env.BRAND_TAG ?? "BLOG IT",
    brandLogoPath: process.env.BRAND_LOGO_PATH || undefined,
    ttsConcurrency: intDefault("TTS_CONCURRENCY", 1),
    videoTheme,
  };
}
