# Chrome Web Store release - PromptIQ by Shubhaang

Last updated: 2026-11-19

## Release

- Extension ID: `goheoijjaebpbcgifabpgmjkgiddkpek`
- Package: `dist.zip`
- Version: `1.0.16`
- Homepage: `https://promptiq-theta.vercel.app/`
- Privacy policy: `https://promptiq-theta.vercel.app/privacy`
- Support: `https://promptiq-theta.vercel.app/support`

## Store listing

Name

PromptIQ by Shubhaang

Short description

Free prompt scoring and AI rewriting by Shubhaang Kataruka for ChatGPT, Claude, Gemini, and more.

Detailed description

PromptIQ by Shubhaang helps you get better AI responses by turning rough ideas into clear, useful instructions directly inside the AI tools you already use.

Write normally. PromptIQ makes it AI-ready.

Key features

One-click AI Rewrite

Rewrite vague or incomplete drafts with a free AI model while preserving your original intent, facts, and constraints.

Private Quick Rewrite

Use an on-device rewrite when you prefer local processing or when the AI service is busy. PromptIQ automatically falls back to Quick Rewrite when possible.

Live prompt quality score

See a real-time score as you type and identify missing task, context, role, format, specificity, and constraint details.

Platform-aware optimization

PromptIQ supports ChatGPT, Claude, Gemini, Perplexity, Copilot, DeepSeek, Grok, Le Chat, Meta AI, Poe, and You.com.

Five optimization modes

Choose Standard, Concise, Detailed, Creative, or Technical mode.

Compare, insert, and undo

Review the original and rewritten versions, insert the result into the chat composer, and undo the replacement when needed.

History, favorites, and templates

Review previous optimizations, save useful prompts as favorites, and reuse templates from the PromptIQ dashboard.

Free access

- 20 AI Rewrites per day
- 100 on-device Quick Rewrites per day
- All five optimization modes
- Account history, favorites, compare, insert, and undo
- No subscription and no paid feature tier
- Optional ₹150 UPI contribution; contributing does not unlock features

How it works

1. Open a supported AI platform and write your prompt.
2. Click the floating PromptIQ score beside the chat composer.
3. Choose a mode and either AI Rewrite or Quick Rewrite.
4. Review the rewritten prompt and the explanation.
5. Insert the improved prompt with one click.

Privacy and security

An account and express prompt-storage consent are required before PromptIQ reads a supported chat composer. The latest revision of each prompt draft is stored under that account for 30 days. Quick Rewrite runs on the device and does not send prompt text to an AI provider. AI Rewrite sends only the selected prompt and optimization instructions through the PromptIQ backend to Google Gemini or OpenRouter and an eligible model provider. PromptIQ does not sell user data and does not include provider API keys in the extension package.

- Category: Productivity
- Single purpose: Evaluates, scores, and refines user prompts inline on supported AI text platforms.
- Language: English

## Permissions

| Permission | Justification |
|---|---|
| `storage` | Saves settings, local history, favorites, usage counters, and signed-in session state. |
| `contextMenus` | Adds an Optimize with PromptIQ action for selected text. |
| Supported AI site hosts | Reads and writes only a visible active prompt composer for scoring, draft recovery, and user-requested insertion. |
| `promptiq-theta.vercel.app` | Handles authentication, consent preferences, prompt-draft and optimization-history synchronization, usage status, telemetry event names, and user-requested AI Rewrite. |

PromptIQ uses explicit site host permissions and does not request `<all_urls>`.

## Privacy disclosure

Does the extension collect user data? Yes.

| Chrome Web Store data type | Collected | Purpose |
|---|---|---|
| Personally identifiable information | Yes | Account email. |
| Authentication information | Yes | Email and password are transmitted over HTTPS; passwords are stored as salted hashes. |
| Personal communications | Yes | Latest prompt-draft revisions, optimization history, and prompts explicitly submitted for AI Rewrite. |
| User activity | Yes | Limited product event names, prompt scores, platform, mode, history, and feedback. |
| Website content | Yes | After account access and express consent, the active prompt composer is read for scoring and its latest draft revision is stored; it is written only for user-requested insertion. |
| Financial information | No | The extension has no paid tier. An optional external UPI contribution link is not required for product access. |
| Web history | No | PromptIQ does not collect browsing history or conversation URLs. |
| Location | No | PromptIQ does not collect location. |
| Health information | No | PromptIQ does not intentionally collect health information. |

Data use certifications

- Data is not sold to third parties.
- Data is not used for purposes unrelated to PromptIQ's single purpose.
- Data is not used for creditworthiness or lending.
- Chrome API data is handled under the Chrome Web Store User Data Policy and Limited Use requirements.
- Product analytics events never include prompt text, email addresses, AI responses, or page URLs.

## Cloud AI setup

Configure `GEMINI_API_KEY` for the direct free-tier provider. `OPENROUTER_API_KEY` is optional; the default OpenRouter model is `openrouter/free`, and `OPENROUTER_MODEL` or `OPENROUTER_FALLBACK_MODEL` may override it. Keep all provider keys in Vercel environment variables.

## Assets

| Asset | File |
|---|---|
| 128 x 128 icon | `public/store_icon.png` |
| 1280 x 800 screenshot 1 | `store-assets/screenshot1-v16.png` |
| 1280 x 800 screenshot 2 | `public/screenshot2.png` |
| 1280 x 800 screenshot 3 | `public/screenshot3.png` |

Before submission, replace any screenshot that displays Premium, pricing, an older supported-platform list, or a version below 1.0.16.

## Version 1.0.16 release notes

- Renamed the listing to PromptIQ by Shubhaang.
- Removed Premium, billing, Razorpay endpoints, checkout UI, and subscription-based quotas.
- Added 20 free AI Rewrites and 100 on-device Quick Rewrites per day.
- Added automatic local fallback when AI Rewrite is unavailable.
- Improved prompt preservation and reduced generic boilerplate.
- Added Grok, Le Chat, Meta AI, Poe, and You.com support with explicit host permissions.
- Added privacy-safe product events and a protected aggregate analytics dashboard.
- Added an optional ₹150 UPI contribution link that does not unlock features.
- Updated website, popup, support, terms, privacy policy, and store copy to match product behavior.

## Submission checklist

- Run `npm test`.
- Run `npm run package:extension`.
- Run `npm run build:website`.
- Confirm `dist.zip` contains no remote JavaScript or provider keys.
- Confirm sign up, sign in, consent, AI Rewrite, Quick Rewrite, insert, undo, history, and logout.
- Confirm homepage, privacy, terms, and support URLs are reachable.
- Confirm every screenshot and listing field matches version 1.0.16 behavior.
- Upload only after the current Chrome Web Store review is complete or withdrawn intentionally.
