# PromptIQ by Shubhaang

PromptIQ is a free Manifest V3 Chrome extension by Shubhaang Kataruka. It provides in-chat prompt tools for ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Grok, Le Chat, Meta AI, Poe, and You.com.

## Product access

- Private Paste & rewrite for any chat, including the current Copilot site, without an account or additional site permissions.
- 100 in-chat Quick Rewrites per day.
- Standard, Concise, Detailed, Creative, and Technical modes.
- History, favorites, comparison, insertion, and undo.
- No subscription or paid feature tier.
- Optional ₹150 UPI contribution to `shubhaang2201@axl`; contributions do not unlock features.

The extension requires an account and a privacy acknowledgment before it reads a supported chat composer. Completed rewrites are saved to account history. Draft and template-library search sync are optional and can be managed or deleted under Dashboard > History.

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
ADMIN_DASHBOARD_KEY
```

Cloud AI is optional. To enable it, configure the owner's FreeLLMAPI gateway as a server-side integration:

```text
FREELLM_BASE_URL
FREELLM_API_KEY
FREELLM_MODEL
FREELLM_PROVIDER
```

Local backend development accepts a gateway at `http://127.0.0.1:3001/v1`. Production requires a reachable HTTPS gateway and a pinned model. Use a gateway configuration and named model provider that limit prompt processing to the requested rewrite. Verify the route and its data handling before configuring production. The extension discloses the processor before sending and uses Quick Rewrite when cloud service is unavailable. Keep the unified key in server-side secrets.

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
