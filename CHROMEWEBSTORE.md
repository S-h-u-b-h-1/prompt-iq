# Chrome Web Store release - PromptIQ

Last updated: 2026-09-13

## Release

Extension ID: goheoijjaebpbcgifabpgmjkgiddkpek

Package: dist.zip

Version: 1.0.15

Homepage: https://promptiq-theta.vercel.app/

Privacy policy: https://promptiq-theta.vercel.app/privacy

Support: https://promptiq-theta.vercel.app/support

## Store listing

Name

PromptIQ

Short description

Score and improve prompts inside ChatGPT, Claude, Gemini, Perplexity, Copilot, and DeepSeek.

Detailed description

PromptIQ helps you get better AI responses by turning rough ideas into clear, structured instructions directly inside the AI tools you already use.

Write normally. PromptIQ makes it AI-ready.

Key features

One-click prompt optimization

Turn vague or incomplete drafts into clear, detailed prompts with a defined task, context, format, role, specificity, and constraints.

Live prompt quality score

See a real-time score as you type and identify the prompt dimensions that need more direction.

Platform-aware optimization

PromptIQ adapts prompts for ChatGPT, Claude, Gemini, Perplexity, Copilot, and DeepSeek.

Five optimization modes

Choose Standard, Concise, Detailed, Creative, or Technical mode for the work you are doing.

Compare, insert, and undo

Review the original and optimized versions, insert the improved prompt into the chat composer, and undo the insertion when needed.

History, favorites, and templates

Review previous optimizations, save useful prompts as favorites, and reuse templates from the PromptIQ dashboard.

Plans

Free

- 100 Smart Template optimizations per day
- 5 cloud AI trial optimizations per day for Free accounts
- Prompt scoring and all five optimization modes
- Local history, favorites, comparison, and undo
- Free account and express prompt-storage consent required before accessing a chat composer
- Free Smart Template optimization runs locally and does not send prompt text to an AI provider
- Latest prompt-draft revisions are stored for 30 days and can be deleted from the dashboard

Premium

- 50 Premium AI optimizations per day
- 200 Smart Template optimizations per day
- Secure server-side AI optimization through OpenRouter, with Google fallback
- Signed-in history synchronization
- Provider API keys remain secured on the PromptIQ server

How it works

1. Open a supported AI platform and write your prompt.
2. Click the floating PromptIQ score beside the chat composer.
3. Choose an optimization mode and engine.
4. Review the optimized version and explanation.
5. Insert the improved prompt with one click.

Privacy and security

An account and express prompt-storage consent are required before PromptIQ reads a supported chat composer. The latest revision of each prompt draft is stored under that account for 30 days. Smart Template optimization runs locally and does not send prompt text to an AI provider. When a user deliberately selects cloud AI, PromptIQ sends only that prompt through the PromptIQ backend to OpenRouter and an eligible model provider; Google Gemini may be used as a fallback. OpenRouter requests enforce zero-data-retention routing and deny provider data collection. PromptIQ does not sell user data and does not include provider API keys in the extension package.

Category: Productivity

Single purpose: Evaluates, scores, and refines user prompts inline on supported AI text platforms.

Language: English

## Permissions

| Permission | Justification |
|---|---|
| storage | Saves settings, local history, favorites, usage counters, and signed-in session state. |
| contextMenus | Adds an Optimize with PromptIQ action for selected text. |
| chatgpt.com and chat.openai.com | Reads and writes only the active prompt composer for scoring and user-requested insertion. |
| claude.ai | Reads and writes only the active prompt composer for scoring and user-requested insertion. |
| gemini.google.com | Reads and writes only the active prompt composer for scoring and user-requested insertion. |
| perplexity.ai | Reads and writes only the active prompt composer for scoring and user-requested insertion. |
| copilot.microsoft.com | Reads and writes only the active prompt composer for scoring and user-requested insertion. |
| chat.deepseek.com | Reads and writes only the active prompt composer for scoring and user-requested insertion. |
| promptiq-theta.vercel.app | Handles account authentication, prompt-draft and optimization-history synchronization, usage status, Premium checkout, and user-requested cloud AI optimization. |

## Privacy disclosure

Does the extension collect user data? Yes.

| Chrome Web Store data type | Collected | Purpose |
|---|---|---|
| Personally identifiable information | Yes | Account email, when a user creates an account. |
| Authentication information | Yes | Email and password are transmitted over HTTPS; passwords are stored as salted hashes. |
| Personal communications | Yes | Latest revisions of prompt drafts, optimization history, and prompts explicitly submitted for cloud AI optimization. |
| User activity | Yes | Limited product events, prompt scores, platform, mode, history, feedback, and subscription status. |
| Website content | Yes | After account access and express consent, the active prompt composer is read for scoring and its latest draft revision is stored for account history; it is also written only for user-requested insertion. |
| Financial information | Yes | Razorpay directly processes payment details; PromptIQ stores only subscription/customer identifiers and status. |
| Web history | No | PromptIQ does not collect browsing history. |
| Location | No | PromptIQ does not collect location. |
| Health information | No | PromptIQ does not intentionally collect health information. |

Data use certifications

- Data is not sold to third parties.
- Data is not used for purposes unrelated to PromptIQ's single purpose.
- Data is not used for creditworthiness or lending.
- Chrome API data is handled under the Chrome Web Store User Data Policy and Limited Use requirements.

## Assets

| Asset | File |
|---|---|
| 128 x 128 icon | public/store_icon.png |
| 1280 x 800 screenshot 1 | public/screenshot1.png |
| 1280 x 800 screenshot 2 | public/screenshot2.png |
| 1280 x 800 screenshot 3 | public/screenshot3.png |

All three store screenshots are 1280 x 800 product captures with the graphite-and-mint branding. Screenshots 1 and 2 show the real floating optimizer before and after local optimization in a demonstration workspace; screenshot 3 shows the account popup and USD price. The website uses a separate 2400 x 1600 capture of the same optimizer.

## Cloud AI setup

Add `OPENROUTER_API_KEY` to Vercel. Optional model overrides are `OPENROUTER_MODEL` and `OPENROUTER_FALLBACK_MODEL`. The defaults are `mistralai/mistral-small-24b-instruct-2501` and `mistralai/mistral-small-3.2-24b-instruct`. Keep `GEMINI_API_KEY` configured as the service fallback until OpenRouter has been verified in production.

## Razorpay setup

Required production environment variables:

- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_PLAN_ID
- RAZORPAY_WEBHOOK_SECRET
- RAZORPAY_TOTAL_COUNT, optional; defaults to 120 monthly billing cycles

The configured Razorpay plan must be USD 1 (100 cents), billed monthly with an interval of 1, excluding taxes. Checkout refuses a mismatched or tax-inclusive plan. Configure a new USD plan, not the old INR plan, and confirm USD recurring payments are enabled for the merchant account. Applicable tax configuration must be verified in the provider before activating payments. This release does not configure or calculate tax rates.

Existing paid subscriptions are not repriced by this code update. Review any existing subscribers and webhook plan handling before changing the production RAZORPAY_PLAN_ID. New checkout links are reused only when the plan and quantity match.

Webhook URL:

https://promptiq-theta.vercel.app/api/subscription/webhook

Subscribe to these Razorpay events:

- subscription.authenticated
- subscription.activated
- subscription.charged
- subscription.updated
- subscription.pending
- subscription.halted
- subscription.paused
- subscription.resumed
- subscription.cancelled
- subscription.completed

## Version history

Version 1.0.15 release notes:

- Account required before the extension reads or optimizes a supported chat composer.
- Required, unchecked prompt-storage consent during sign-in or account creation.
- Signed-in draft recovery and optional PromptIQ library search history.
- Drafts include unsent composer text after a typing pause; search capture is limited to committed PromptIQ library queries.
- No browser-wide search history, conversation URLs, unrelated page fields, or chat responses are collected.
- Users can retrieve/copy recent entries, stop capture, and delete drafts/searches separately from optimization history.
- Store privacy disclosures cover personal communications, website content, user activity, retention, and deletion.
- Apply and verify the live database migration before deploying the updated history API. See data/NEON_MIGRATION.md.

| Version | Date | Status | Changes |
|---|---|---|---|
| 1.0.15 | 2026-09-13 | Ready for submission | Account-required extension access; explicit prompt-storage consent; structured 30-day draft and optional library-search history; visible Premium upgrade path. Production Neon migration and deployment verified. |
| 1.0.14 | 2026-09-13 | Ready for submission | US$1/month excluding taxes; USD plan validation and checkout-link reuse checks; self-hosted Space Grotesk and Manrope website fonts. |
| 1.0.13 | 2026-09-13 | Superseded | Futuristic graphite-and-mint identity, matching icons, optical-rail hero artwork, staggered motion, and refreshed product captures. No new permissions or data collection. |
| 1.0.12 | 2026-09-13 | Superseded | Minimal blue-and-white website, popup, dashboard, and floating optimizer; refreshed captures; reduced-motion support and smaller-screen panel improvements. No new permissions or data collection. |
| 1.0.11 | 2026-09-13 | Superseded | New brand mark and toolbar icons; original hero artwork; high-resolution actual product capture; responsive website redesign and working before/after demo. |
| 1.0.10 | 2026-09-13 | Superseded | Light website, popup, and dashboard design; local website preview; subtle transitions with reduced-motion support; refreshed popup screenshot. |
| 1.0.9 | 2026-09-13 | Superseded | Adds 5 daily cloud AI trials for signed-in Free users, 50 daily Premium AI optimizations, INR 50 monthly billing validation, OpenRouter support with Google fallback, and updated privacy disclosures. |
| 1.0.8 | 2026-09-13 | Superseded | Compact usage popup, signed-out Free dashboard, Razorpay-ready Premium flow, atomic Premium quota, safer rendering, refreshed platform selectors, working production links, and corrected privacy/store disclosures. |
| 1.0.7 | 2026-07-15 | Draft | Added daily quotas. |
| 1.0.6 | 2026-07-15 | Draft | Added optimization modes, favorites, undo, comparison, and onboarding updates. |
| 1.0.4 | 2026-07-03 | Published | Authentication and local Free templates. |
