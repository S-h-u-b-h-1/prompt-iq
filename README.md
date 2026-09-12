# PromptIQ

PromptIQ is a Manifest V3 Chrome extension that improves prompts directly inside ChatGPT, Claude, Gemini, Perplexity, Copilot, and DeepSeek.

## Plans

- Free: 100 Smart Template optimizations per day, stored on the current device.
- Premium: 200 Smart Template optimizations plus 20 cloud AI optimizations per day.
- Premium price: INR 199 per month through Razorpay.

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
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_PLAN_ID
RAZORPAY_WEBHOOK_SECRET
```

Create the Razorpay plan for INR 199 per month and configure its webhook URL as:

```text
https://promptiq-theta.vercel.app/api/subscription/webhook
```

Subscribe the webhook to subscription lifecycle events. Never put payment or Gemini secrets in extension files.

## Release

```bash
npm test
npm run build
npm run verify:extension
npm run package:extension
npm run build:website
```

Upload `dist.zip` to the Chrome Web Store. The extension version is defined in `public/manifest.json`; every submitted update must use a higher version than the currently published item.

Store copy, permission explanations, privacy disclosures, and the release checklist are in `CHROMEWEBSTORE.md`.
