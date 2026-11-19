# PromptIQ by Shubhaang

PromptIQ is a free Manifest V3 Chrome extension by Shubhaang Kataruka. It scores and rewrites prompts directly inside ChatGPT, Claude, Gemini, Perplexity, Copilot, DeepSeek, Grok, Le Chat, Meta AI, Poe, and You.com.

## Product access

- 20 free AI Rewrites per account per day.
- 100 on-device Quick Rewrites per day.
- Standard, Concise, Detailed, Creative, and Technical modes.
- History, favorites, comparison, insertion, and undo.
- No subscription or paid feature tier.
- Optional ₹150 UPI contribution to `shubhaang2201@axl`; contributions do not unlock features.

The extension requires an account and explicit prompt-storage consent before it reads a supported chat composer. It stores the latest revision of each prompt draft for 30 days, not every keystroke. Users can inspect and delete saved activity from Dashboard > History.

## Local development

```bash
npm install
npm test
npm run dev
```

Load `dist/` as an unpacked extension after running `npm run build`.

## Environment

The Vercel deployment requires:

```text
DATABASE_URL
JWT_SECRET
GEMINI_API_KEY
ADMIN_DASHBOARD_KEY
```

OpenRouter is optional:

```text
OPENROUTER_API_KEY
OPENROUTER_MODEL
OPENROUTER_FALLBACK_MODEL
```

When OpenRouter is configured, PromptIQ defaults to the `openrouter/free` router. Gemini 2.5 Flash Lite and Gemini 2.5 Flash are the direct provider fallback. Provider keys remain on the server and are never packaged with the extension.

The public website can send privacy-safe event names to Google Analytics when this build variable is configured:

```text
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

The aggregate first-party analytics page is `/api/admin/dashboard`. It uses HTTP Basic authentication; enter any username and use `ADMIN_DASHBOARD_KEY` as the password.

## Release

```bash
npm test
npm run build
npm run verify:extension
npm run package:extension
npm run build:website
```

Upload `dist.zip` to the Chrome Web Store. The extension version is defined in `public/manifest.json`; each submitted update must use a higher version than the currently published item.

Store copy, permission explanations, privacy disclosures, and the release checklist are in `CHROMEWEBSTORE.md`.
