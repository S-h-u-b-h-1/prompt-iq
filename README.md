# PromptIQ

PromptIQ is a Manifest V3 Chrome extension that improves prompts directly inside ChatGPT, Claude, Gemini, Perplexity, Copilot, and DeepSeek.

## Plans

- Free: 100 Smart Template optimizations per day, plus 5 cloud AI trials per day after sign-in.
- Premium: 200 Smart Template optimizations plus 50 cloud AI optimizations per day.
- Premium price: INR 50 per month through Razorpay.

## Local development

```bash
npm install
npm test
npm run dev
```

Load `dist/` as an unpacked extension after running `npm run build`.

## Environment

The Vercel deployment always requires `DATABASE_URL` and `JWT_SECRET`. Configure at least one cloud AI provider; OpenRouter is preferred and Gemini is the fallback. Razorpay values are required only when enabling paid checkout.

```text
DATABASE_URL
JWT_SECRET
GEMINI_API_KEY
OPENROUTER_API_KEY
OPENROUTER_MODEL
OPENROUTER_FALLBACK_MODEL
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_PLAN_ID
RAZORPAY_WEBHOOK_SECRET
```

`OPENROUTER_MODEL` and `OPENROUTER_FALLBACK_MODEL` are optional. PromptIQ defaults to `mistralai/mistral-small-24b-instruct-2501`, falls back through OpenRouter to `mistralai/mistral-small-3.2-24b-instruct`, and can use `GEMINI_API_KEY` if OpenRouter is unavailable.

Create the Razorpay plan for INR 50 per month and configure its webhook URL as:

```text
https://promptiq-theta.vercel.app/api/subscription/webhook
```

Subscribe the webhook to subscription lifecycle events. Never put payment or AI-provider secrets in extension files.

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
