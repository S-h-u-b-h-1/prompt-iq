# Chrome Web Store release - PromptIQ by Shubhaang

Last updated: November 19, 2026

- Extension ID: `goheoijjaebpbcgifabpgmjkgiddkpek`
- Package: `dist.zip`
- Version: `1.0.17`
- Homepage: https://promptiq-theta.vercel.app/
- Privacy policy: https://promptiq-theta.vercel.app/privacy
- Support: https://promptiq-theta.vercel.app/support

## Store listing

Name

PromptIQ by Shubhaang

Short description

Free prompt scoring and rewriting by Shubhaang Kataruka for ChatGPT, Claude, Gemini, and more.

Detailed description

PromptIQ by Shubhaang helps you turn rough drafts into clear instructions while you write in an AI chat. It is a free Chrome extension built by Shubhaang Kataruka.

Score your draft
See which details are missing from your prompt, including the task, context, constraints, and expected output.

Rewrite on your device
Quick Rewrite improves the structure of your prompt using on-device templates. Choose Standard, Concise, Detailed, Creative, or Technical mode. Your free account includes 100 Quick Rewrites per day.

Compare, insert, and undo
Review the original and rewritten prompt side by side. Click Use Prompt to replace your draft without sending it to the chat. Undo restores the original text.

Find past rewrites
Open the PromptIQ dashboard to revisit your saved rewrites, favorite prompts, and templates.

Supported sites
ChatGPT, Claude, Gemini, Perplexity, Copilot, DeepSeek, Grok, Le Chat, Meta AI, Poe, and You.com.

Privacy controls
A free account is required. PromptIQ reads supported chat composers to score prompts and saves completed rewrites to your account history. Saving unsent drafts or searches from the PromptIQ template library is optional. Both are off until you enable them, and you can turn them off or delete saved entries from the dashboard.

- Category: Tools
- Language: English
- Single purpose: Score and rewrite user-authored prompts directly inside supported AI chat composers.

## Permissions

| Permission | Justification |
|---|---|
| `storage` | Stores the user session, interface settings, favorites, and local rewrite counters in Chrome extension storage. |
| `contextMenus` | Offers a Quick Rewrite action for selected text on supported AI sites. It opens the rewrite in PromptIQ without replacing the chat draft. |
| Supported HTTPS AI sites | Lets PromptIQ identify the active chat composer, score its draft after account setup, and insert a rewrite when the user clicks Use Prompt. Optional draft sync uses these same composers. |
| `promptiq-theta.vercel.app` | Connects to PromptIQ's HTTPS backend for authentication, preferences, account history, usage, feature health events, and explicitly requested cloud rewrites when available. |

## Privacy fields

- Personally identifiable information: account email and account ID.
- Authentication information: password and session token. The database stores salted password hashes.
- Personal communications and website content: prompt text, completed rewrites, and optional unsent drafts in supported chat composers.
- User activity: platform, rewrite mode, prompt scores, product event names, optional template-library searches, and feedback.
- Limited Use: PromptIQ uses data to score, rewrite, and save users' prompts and to operate these features. It does not sell user data or use it for advertising, lending, unrelated purposes, or model training.

## Store assets

- Icon: `public/store_icon.png` (128 x 128).
- Screenshot: `website-assets/product-workspace-v17.jpg` (1280 x 800, labeled sample workspace with the actual extension).
- Promo video: leave empty. The earlier video shows a prior release.

## Reviewer instructions

1. Open the PromptIQ toolbar icon. Sign in or create a free account. Signup accepts a test email and a password of at least 8 characters. No verification email is required.
2. Read the privacy disclosure and confirm that completed rewrites are saved. Leave both optional sync boxes unchecked.
3. Open ChatGPT from the popup. In its composer, type "Write a launch email for a fictional calendar app. Keep it under 100 words."
4. Click the floating PromptIQ badge and choose Optimize Prompt. Review the result and click Use Prompt. Reopen the panel and click Undo to restore the original.
5. In PromptIQ's dashboard, open History. The completed rewrite is present and draft sync is off. The History tab can enable optional sync and delete synced data.
6. AI Rewrite is unavailable in the release environment. Quick Rewrite requires no third-party AI account.

## Release checks

Run `npm test`, `npm run package:extension`, and `npm run build:website`. Confirm the extension ZIP includes only bundled code, the homepage and policy URLs respond over HTTPS, and the screenshot and privacy answers match the uploaded build.
