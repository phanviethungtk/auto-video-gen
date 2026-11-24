---
name: create-news-video
description: Tạo video tin tức ngắn 9:16 (~60s) từ URL bài báo hoặc file .txt tiếng Việt. Trigger khi user yêu cầu tạo video tin tức, làm short news, làm bản tin video, render tin thành video, làm TikTok tin tức. Output: video.mp4 + voice.mp3 + script.txt cho CapCut.
---

# Create News Video Skill

Generate a Vietnamese 9:16 motion-graphic news video from a URL or .txt file.

## Input

Single argument: a news article URL (starts with `http://` or `https://`) OR a path to a `.txt` file.

## Workflow (MUST follow these steps in order)

### Step 1: Detect input type

- Starts with `http://` or `https://` → URL mode
- Otherwise → file mode

### Step 2: Fetch content

**URL mode:**
- Use `read_url_content` (or `browser_subagent` if the page is dynamic / JS-rendered).
- Extract:
  - `title` (string): tiêu đề bài báo
  - `content` (string): nội dung chính, ~500-1500 từ
  - `ogImage` (string|null): URL ảnh og:image (meta og:image hoặc ảnh đầu bài)
  - `domain` (string): domain của URL (vd "github.com")
- If fetching fails (paywall, blocking, 4xx) → tell user to save content to a .txt file and pass that instead. Stop.

**File mode:**
- Use `view_file` to read the .txt file.
- Title = first non-empty line (strip whitespace, max 80 chars)
- Content = remaining lines joined
- ogImage = `null`
- domain = `"local"`

### Step 3: Create slug + output directory

- slug = lowercase ASCII (strip Vietnamese diacritics, đ→d), replace non-alphanumeric with `-`, trim dashes, max 40 chars
- timestamp = current local time as `YYYYMMDD-HHmm`
- outputDir = `output/<slug>-<timestamp>/`

### Step 4: Generate script.json

Following the schema in `docs/superpowers/specs/2026-04-29-auto-news-video-design.md` Section 4. Key rules:

**Script content (Vietnamese):**
- Total voiceText: ~150–200 words → ~55–65s spoken at speed 1.0
- Number of scenes: **5–8** (1 hook + 3–6 body + 1 outro)
- Each scene voiceText is 1-3 short sentences, văn nói (spoken style, not formal)
- No emoji, no markdown in voiceText

### ⚠️ CRITICAL: Accuracy rules (SORATA — tax & accounting content)

These videos are published by an accounting firm. One wrong number, date or legal reference costs more trust than the video earns. These rules override everything below about hooks and style.

- **Never invent figures.** Every number, percentage, amount, deadline, date, tax rate and legal document number in `voiceText` or `templateData` must appear in the source content. If the source does not state it, leave it out — do not estimate, round up for drama, or "fill in" a typical value.
- **No invented results or names**: no customer names, savings claims, multipliers ("gấp đôi", "tiết kiệm 50%") or testimonials unless the source states them word for word.
- **Name the legal basis when the source gives it** (e.g. "Nghị định 70/2025/NĐ-CP") — on screen in `templateData`, spoken in `voiceText` with numbers spelled out per the phonetic rules.
- **Say what is uncertain.** If the source says a rule is a draft, proposed, or not yet in force, the script must say so too ("dự thảo", "đề xuất", "chưa có hiệu lực").
- **No advice that depends on the viewer's facts.** Prefer "doanh nghiệp nên kiểm tra…" over "bạn phải nộp…" when obligations depend on the business type, size or tax method.
- **Pacing:** one idea per scene; keep each scene's `voiceText` to about 10 seconds or less (≈ 25–35 words) so something on screen changes every few seconds.

### ⚠️ CRITICAL: Vietnamese TTS Phonetic Rules

The `voiceText` field is read aloud by Edge TTS / LucyLab / ElevenLabs / Vbee / VoiceStudio. **Numbers and symbols are read literally** — if you write "5.5", TTS may say "năm rưỡi" (five and a half — WRONG for version numbers). **Always spell out numbers in Vietnamese phonetic form** in `voiceText`. The `templateData` fields (visual text on screen) can keep the original "5.5" / "82.7%" formatting.

**Mandatory rules for `voiceText`:**

| Number form | WRONG (TTS misreads) | RIGHT (spell out in Vietnamese) |
|---|---|---|
| Decimal version | `GPT 5.5` → "năm rưỡi" ❌ | `GPT năm chấm năm` ✅ |
| Decimal stat | `82.7%` | `tám mươi hai phẩy bảy phần trăm` |
| Version | `iPhone 17` | `iPhone mười bảy` (or `iPhone 17` works for whole numbers) |
| Version with point | `iOS 18.2` | `iOS mười tám chấm hai` |
| Tech spec | `200MP` | `hai trăm megapixel` |
| Battery | `5000mAh` | `năm nghìn miliampe giờ` |
| Tokens | `1M tokens` / `1000000 tokens` | `một triệu token` |
| Price VND | `21 triệu đồng` | `hai mươi mốt triệu đồng` |
| Price USD | `$5` | `năm đô la` (or `năm đô`) |
| Multiplier | `2x` | `gấp đôi` (more natural than "hai lần") |
| Year | `2026` | `hai nghìn không trăm hai mươi sáu` (or just `năm 2026` reads OK) |
| Percentage with decimal | `30%` | `ba mươi phần trăm` |
| Time | `60 giây` | `sáu mươi giây` |
| Frequency | `5G` | `năm gờ` (be careful — TTS often says "năm-gờ") |
| Channel name | `SORATA` (all caps may be spelled letter by letter) | `Sorata` |

**Notation choices:**
- For decimal point use `chấm` (more spoken/natural) or `phẩy` (formal). Both work; pick consistent.
- For comma separator, use `phẩy` (e.g. "1,000" → "một nghìn")
- For ratio "3:1" → say `ba trên một` or `ba so với một`

**English brand names — keep as-is**, TTS handles them OK:
- `Apple`, `Google`, `OpenAI`, `Microsoft`, `TikTok`, `YouTube` ✅

**English acronyms — write phonetically if TTS misreads:**
- `AI` → write `ây ai`
- `API` → write `ây pi ai`
- `GPT` → usually OK; if not, write `gí pi tí`
- `iOS` → write `ai ô ét` if matter

**Symbols to AVOID in voiceText:**
- `→` `&` `%` `$` `#` `+` `=` (TTS may say literal name or skip)
- `!` `?` at end of sentence is OK — they create natural intonation
- Emoji: NEVER (TTS pronounces or skips inconsistently)
- URLs: NEVER (TTS reads dot/slash literally)

**End each `voiceText` sentence with `.` or `?`** for natural pause/intonation.

**Examples — full scene:**

WRONG (will sound bad):
```json
{ "voiceText": "GPT 5.5 đạt 82.7% trên Terminal-Bench, vượt GPT 5.4 (75.1%)." }
```
→ TTS reads: "GPT năm rưỡi đạt tám mươi hai chấm bảy phần trăm trên Terminal-Bench..."

RIGHT (natural):
```json
{ "voiceText": "GPT năm chấm năm đạt tám mươi hai phẩy bảy phần trăm trên Terminal Bench, vượt phiên bản năm chấm bốn ở mức bảy mươi lăm phẩy một." }
```

**Note**: `templateData` (text on screen) CAN use original formatting — the visual is separate from spoken:
```json
{
  "voiceText": "GPT năm chấm năm đạt tám mươi hai phẩy bảy phần trăm.",
  "templateData": {
    "template": "stat-hero",
    "value": "82.7%",
    "label": "Terminal-Bench"
  }
}
```

**Hook (most important — gets first 3 seconds of viewer attention):**
- Must contain a claim, statistic, or curious question
- NEVER generic ("Hôm nay chúng ta sẽ nói về..." is wrong)
- ALWAYS include at least 1 effect: `flash-white-3f` or `particle-burst`

**Visual rules:**
- For image scenes: `background.src = "$source.image"` (literal — CLI substitutes)
- Vary `kenBurns` across scenes (don't use `zoom-in` for every scene)
- Vary text `animation` (don't use `slide-up` for every line)
- Each line ≤ 25 characters
- Each scene 1-3 lines

**Outro (always fixed format):**
```json
{
  "id": "outro",
  "type": "outro",
  "voiceText": "Theo dõi Sorata để cập nhật kiến thức thuế, kế toán.",
  "visual": {
    "background": { "type": "gradient", "preset": "outro-purple" },
    "text": {
      "position": "center",
      "style": "outro-card",
      "lines": [
        { "content": "Cập nhật thuế, kế toán", "emphasis": "primary", "animation": "fade-in" },
        { "content": "SORATA",             "emphasis": "channel", "animation": "scale-pop" },
        { "content": "Nguồn: <DOMAIN>",          "emphasis": "muted",   "animation": "fade-in-late" }
      ]
    }
  }
}
```
Replace `<DOMAIN>` with the actual domain string. Note: every outro line must fit the 25-char rule.

### Step 5: Self-validate before writing

Check:
- Total word count ~150-200
- Every line.content ≤ 25 chars
- 5-8 scenes total
- scenes[0].type === "hook"
- last scene type === "outro"
- All enum values valid (see spec Section 4.2)

If invalid, fix yourself silently. Up to 2 self-correction passes. After that, write anyway — the CLI's Zod validation will produce a precise error message that the user can act on.

### Step 6: Write script.json

Use the `write_to_file` tool to write the validated JSON to `<outputDir>/script.json`.

### Step 6.5: Stop for review (REQUIRED before rendering)

Do NOT run the pipeline yet. Show the user, in the chat:

1. Every scene's `voiceText`, numbered, as plain text.
2. A short table of every number, date, rate and legal reference used, each with the exact source sentence it came from.
3. Anything you left out because the source was unclear.

Then wait. Run Step 7 only after the user explicitly approves (e.g. "OK", "duyệt", "chạy đi"). If they ask for changes, edit `script.json` and show the review again.

### Step 7: Run the pipeline

Use `run_command` to run:

```bash
npm run pipeline -- <outputDir>/script.json
```

If exit code != 0:
- Report the error message clearly
- Tell user the output dir path so they can inspect intermediate files

### Step 8: Generate TikTok caption + hashtags

Only run this step if Step 7 (the pipeline) succeeded — don't caption a video that wasn't actually produced.

Write a short Vietnamese caption + exactly 4 hashtags for the video, based on `script.metadata.title` and the scenes' content.

**Caption rules:**
- 1 short, punchy line (~10–20 words), Vietnamese, văn nói.
- Reuse or riff on the hook's claim/question.
- 1 emoji is OK if it fits naturally.
- No markdown, no line breaks inside the caption itself.

**Hashtag rules — exactly 4, in this order:**
1. One broad niche tag in Vietnamese (e.g. `#ketoan`, `#thue`, `#doanhnghiep`)
2. One or two tags specific to the video's actual topic/product/company (e.g. `#hoadondientu`, `#thuetncn`, `#hokinhdoanh`)
3. One channel/discovery tag: `#sorata` (and `#fyp` or `#xuhuong` if there's room — still capped at 4 total)
- Lowercase, no spaces, no punctuation inside a tag.

Write the result to `<outputDir>/caption.txt` using `write_to_file`:
```
<caption line>

#tag1 #tag2 #tag3 #tag4
```

### Step 9: Report success

If successful, report to user with markdown links:

```markdown
✓ Video:   [video.mp4](output/<slug>-<timestamp>/video.mp4)
✓ Audio:   [voice.mp3](output/<slug>-<timestamp>/voice.mp3) — for CapCut
✓ Script:  [script.txt](output/<slug>-<timestamp>/script.txt) — for CapCut auto-caption
✓ Caption: [caption.txt](output/<slug>-<timestamp>/caption.txt) — for TikTok upload
Tổng thời lượng: XX.Xs

<caption line>
#tag1 #tag2 #tag3 #tag4
```

## Sound Effects (SFX)

**Licensing (SORATA): only use SFX you are allowed to publish commercially.**
- Put only CC0 / royalty-free-for-commercial-use or self-made files in `assets/sfx/`, and log each file's source and licence in `assets/sfx/SOURCES.md`.
- Do NOT run `npm run sfx:download` for business videos: it scrapes myinstants.com, whose clips have unclear rights.
- If `assets/sfx/` is empty the pipeline simply renders without SFX — that is fine.

**You almost never need to set the `sfx` field.** The pipeline has a smart 3-tier selector that picks the right SFX for each scene automatically:

1. **If `scene.sfx` is set** → use exactly that (override).
2. **Else, scan `voiceText` for semantic keywords**:
   - `cảnh báo / rủi ro / nguy hiểm / warning` → `alert/`
   - `kỷ lục / vượt / xuất sắc / breakthrough / success` → `success/`
   - `thất bại / sai / lỗi / fail / wrong` → `fail/`
   - `ra mắt / công bố / lần đầu / launch / unveil` → `reveal/`
   - `đếm ngược / tích tắc / countdown` → `countdown/`
   - `hùng vĩ / hoành tráng / cinematic / epic` → `cinematic/`
   - `hồi hộp / chờ đợi / drumroll / suspense` → `drumroll/`
3. **Else, fall back to template default category**:
   - `hook` → `transition/` or `cinematic/`
   - `comparison` → `transition/` or `emphasis/`
   - `stat-hero` → `emphasis/` or `success/`
   - `feature-list` → `transition/` or `emphasis/`
   - `callout` → `alert/` or `drumroll/`
   - `outro` → `outro/` or `success/`

Within a category, the actual file is picked **deterministically** by hashing the scene id — same script gives same SFX (idempotent), but different scenes in the same video get different files (variety).

### When to add explicit `sfx` override

Only when you want to FORCE a specific sound:
- Scene needs a particular signature sound: `{ "name": "transition/whoosh-sfx", "volume": 0.4 }`
- Disable SFX for a scene: `{ "name": "none" }`

Available SFX categories (`assets/sfx/<category>/<name>.mp3`):
- `transition/`, `emphasis/`, `alert/`, `success/`, `fail/`, `outro/`, `reveal/`, `drumroll/`, `countdown/`, `cinematic/`

## Edge cases

| Situation | Action |
|---|---|
| URL paywall / JS-rendered → read_url_content returns no content | Tell user: "Không đọc được URL (có thể do paywall hoặc JS). Hãy lưu nội dung vào file .txt rồi gọi lại." Stop. |
| URL content < 200 words | Warn "Tin gốc ngắn, video có thể không đủ chất liệu", continue anyway |
| URL content > 2000 words | Summarize to key points, fit ~150-200 words script |
| File mode + file empty/missing | Error message, don't create output dir |
| Pipeline fails | Report error message + output dir path; user can re-try `npm run pipeline -- <path>` after fixing |
