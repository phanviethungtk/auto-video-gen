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

  let brandLogoRelPath: string | undefined;
  if (cfg.brandLogoPath) {
    const src = isAbsolute(cfg.brandLogoPath) ? cfg.brandLogoPath : resolve(PROJECT_ROOT, cfg.brandLogoPath);
    if (existsSync(src)) {
      brandLogoRelPath = `brand-logo${extname(src).toLowerCase()}`;
      await copyFile(src, join(outputDir, brandLogoRelPath));
    } else {
      log.warn(`BRAND_LOGO_PATH not found: ${src} → using the text icon instead`);
    }
  }

  return { tiktokAvatarRelPath, brandLogoRelPath };
}
