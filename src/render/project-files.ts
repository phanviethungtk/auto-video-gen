import { copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config, VideoTheme } from "../config.js";
import { fetchImage } from "../assets/image-fetcher.js";
import { log } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(__dirname, "templates");
const PROJECT_ROOT = join(__dirname, "..", "..");

/** CSS file inside src/render/templates for each theme. Always lands as "styles.css". */
export function themeCssFile(theme: VideoTheme): string {
  return theme === "dark-neon" ? "styles.css" : `styles.${theme}.css`;
}

/**
 * Copy the theme CSS + shared animations.js next to index.html.
 * Shared by pipeline.ts and rerender.ts so both always use the configured theme.
 */
export async function copyThemeFiles(outputDir: string, theme: VideoTheme): Promise<void> {
  await copyFile(join(TPL_DIR, themeCssFile(theme)), join(outputDir, "styles.css"));
  await copyFile(join(TPL_DIR, "animations.js"),     join(outputDir, "animations.js"));
}

export interface BrandAssets {
  /** e.g. "tiktok-avatar.png" */
  tiktokAvatarRelPath: string;
  /** e.g. "brand-logo.png" — undefined when BRAND_LOGO_PATH is not set */
  brandLogoRelPath?: string;
  /** e.g. "brand-wordmark.png" — undefined when BRAND_WORDMARK_PATH is not set */
  brandWordmarkRelPath?: string;
}

function findBundledAvatar(): string {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const p = join(PROJECT_ROOT, "assets", `avatar.${ext}`);
    if (existsSync(p)) return p;
  }
  throw new Error(`No bundled avatar found. Place an image at assets/avatar.{jpg,png,webp}`);
}

/**
 * Put the outro avatar and the optional header logo into the output dir.
 * Avatar: TIKTOK_AVATAR_URL if set (falls back to bundled on failure), else assets/avatar.*.
 * Logo: BRAND_LOGO_PATH (absolute, or relative to the project root).
 */
export async function prepareBrandAssets(cfg: Config, outputDir: string): Promise<BrandAssets> {
  const bundledAvatar = findBundledAvatar();
  const tiktokAvatarRelPath = `tiktok-avatar${extname(bundledAvatar).toLowerCase()}`;
  const avatarOut = join(outputDir, tiktokAvatarRelPath);
  if (cfg.tiktok.avatarUrl) {
    const r = await fetchImage(cfg.tiktok.avatarUrl, avatarOut);
    if (!r.success) {
      log.warn(`TikTok avatar download failed: ${r.reason} → falling back to bundled default`);
      await copyFile(bundledAvatar, avatarOut);
    }
  } else {
    await copyFile(bundledAvatar, avatarOut);
  }

  const brandLogoRelPath = await copyBrandFile(cfg.brandLogoPath, outputDir, "brand-logo", "BRAND_LOGO_PATH", "the text icon");
  const brandWordmarkRelPath = await copyBrandFile(cfg.brandWordmarkPath, outputDir, "brand-wordmark", "BRAND_WORDMARK_PATH", "the channel name as text");

  return { tiktokAvatarRelPath, brandLogoRelPath, brandWordmarkRelPath };
}

/** Copy an optional brand image (absolute, or relative to the project root) into the output dir. */
async function copyBrandFile(
  path: string | undefined,
  outputDir: string,
  baseName: string,
  envName: string,
  fallback: string,
): Promise<string | undefined> {
  if (!path) return undefined;
  const src = isAbsolute(path) ? path : resolve(PROJECT_ROOT, path);
  if (!existsSync(src)) {
    log.warn(`${envName} not found: ${src} → using ${fallback} instead`);
    return undefined;
  }
  const rel = `${baseName}${extname(src).toLowerCase()}`;
  await copyFile(src, join(outputDir, rel));
  return rel;
}
