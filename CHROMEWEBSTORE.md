# Chrome Web Store release - PromptIQ by Shubhaang

Last updated: November 19, 2026

- Extension ID: `goheoijjaebpbcgifabpgmjkgiddkpek`
- Package: `dist.zip`
- Version: `1.0.18`
- Homepage: https://promptiq-theta.vercel.app/
- Privacy policy: https://promptiq-theta.vercel.app/privacy
- Support: https://promptiq-theta.vercel.app/support

## Store listing

Name

PromptIQ by Shubhaang

Short description

Free prompt rewriter by Shubhaang Kataruka. Score and refine drafts in ChatGPT, Claude, Gemini, or paste from any AI chat.

Detailed description

PromptIQ by Shubhaang turns rough drafts into clearer prompts. It is a free Chrome extension built by Shubhaang Kataruka.

Paste and rewrite for any AI chat
Open PromptIQ from your toolbar. Paste a draft, rewrite it on your device, and copy the result to any AI chat. No account is needed, and PromptIQ does not send or save text from this editor.

Score your draft
See which details are missing from your prompt, including the task, context, constraints, and expected output.

Rewrite on your device
On supported sites, Quick Rewrite improves your prompt using on-device templates. Choose Standard, Concise, Detailed, Creative, or Technical mode. Your free account includes 100 in-chat Quick Rewrites per day.

Compare, insert, and undo
Review the original and rewritten prompt side by side. Click Use Prompt to replace your draft without sending it to the chat. Undo restores the original text.

Find past rewrites
Open the PromptIQ dashboard to revisit your saved rewrites, favorite prompts, and templates.

Supported sites
In-chat integration is available on ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Grok, Le Chat, Meta AI, Poe, and You.com. On Copilot or if a badge is unavailable, use Paste & rewrite from the toolbar.

Privacy controls
A free account is required for in-chat features and synced history. PromptIQ reads supported chat composers after you accept its privacy disclosure. It saves completed in-chat rewrites to your account history. Saving unsent drafts or template-library searches is optional and off by default. You can change these choices and delete saved entries from the dashboard.

- Category: Tools
- Language: English
- Single purpose: Score and rewrite user-authored AI prompts in supported chat composers or a private toolbar editor.

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
- Screenshot: `website-assets/product-workspace-v18.jpg` (1280 x 800, labeled sample workspace with the actual extension).
- Promo video: leave empty. The earlier video shows a prior release.

## Reviewer instructions

1. Open the PromptIQ toolbar icon. Choose Try an example, then Rewrite on device. The editor works while signed out and does not send or save its text.
2. To test the inline tools, create a free account. Signup accepts a test email and a password of at least 8 characters. No verification email is required.
3. Read the privacy disclosure and confirm that completed rewrites are saved. Leave both optional sync boxes unchecked.
4. Open a supported chat, such as ChatGPT or Perplexity. In its composer, type "Write a launch email for a fictional calendar app. Keep it under 100 words." Do not send it.
5. Click the floating PromptIQ badge and choose Optimize Prompt. Review the result and click Use Prompt. Reopen the panel and click Undo to restore the original.
6. In PromptIQ's dashboard, open History. The completed rewrite is present and draft sync is off. The History tab can enable optional sync and delete synced data.
7. AI Rewrite is unavailable in the release environment. Quick Rewrite does not call an AI provider.

## Release checks

Run `npm test`, `npm run package:extension`, `npm run test:browser`, and `npm run build:website`. Install the browser for the fixture tests with `npx playwright install chromium`. Confirm the extension ZIP includes only bundled code, the homepage and policy URLs respond over HTTPS, and the screenshot and privacy answers match the uploaded build.
