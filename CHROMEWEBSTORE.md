# Chrome Web Store Listing — PromptIQ

> Last Updated: 2026-06-26

## Store Listing

**Extension Name**
PromptIQ

**Short Description**
Write normally. PromptIQ turns your idea into a professional AI prompt in one click.

**Detailed Description**
PromptIQ helps you get better AI responses by transforming ordinary drafts into clear, structured, and high-quality instructions—right where you work. It integrates seamlessly with popular AI platforms, allowing you to optimize prompts without switching tabs or learning prompt engineering.

Write normally. PromptIQ makes it AI-ready.

### Key Features

🚀 **One-Click Prompt Optimization**
Instantly rewrite vague or incomplete drafts into well-structured, AI-ready prompts for higher-quality responses.

📊 **Live Prompt Quality Score**
Receive a real-time quality score as you type, with actionable suggestions for improving clarity, context, specificity, role definition, and constraints.

🧠 **Platform-Aware Calibrations**
PromptIQ automatically adapts its optimization strategy to match the formatting guidelines and nuances of your target AI platform.

📖 **Explanations Included**
See exactly what was improved and why, helping you understand the principles behind effective prompt writing.

⚡ **One-Click Insert**
Replace your original prompt with the optimized version instantly—no manual copy-pasting required.

### How It Works:

1. **Write:** Open your preferred AI platform and start typing as usual.
2. **Score:** Click the floating PromptIQ badge beside the chat input to check your draft's score.
3. **Optimize:** Free uses a local Smart Template. Premium uses server-side AI with API keys kept outside the extension package.
4. **Insert:** Insert the optimized prompt directly into the text area with a single click.

### Privacy & Security

Free Smart Template optimization runs locally without sending prompt text to an optimization API. Premium sends only prompts the user chooses to optimize through the PromptIQ backend to Google Gemini. Signed-out history stays on the device; signed-in history is synchronized to the user's account. API keys remain on the server and are never included in the extension package.

**Category**
Productivity

**Single Purpose**
Evaluates, scores, and refines user prompts inline on major AI text platforms.

**Primary Language**
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `public/store_icon.png` |
| Screenshot 1 | 1280×800 PNG | ✅ Ready | `public/screenshot1.png` |
| Screenshot 2 | 1280×800 PNG | ✅ Ready | `public/screenshot2.png` |
| Screenshot 3 | 1280×800 PNG | ✅ Ready | `public/screenshot3.png` |


## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to persist user settings (Free vs Premium tier), local history logs, and unique installation UUIDs. |
| `contextMenus` | permissions | Used to add a right-click context menu option allowing users to highlight text on any webpage and optimize it as a prompt. |
| `*://chatgpt.com/*` | host_permissions | Required to detect, read, and inject optimized text into input fields in ChatGPT interfaces. |
| `*://chat.openai.com/*` | host_permissions | Required to detect, read, and inject optimized text into input fields in legacy ChatGPT interfaces. |
| `*://claude.ai/*` | host_permissions | Required to detect, read, and inject optimized text into input fields in Claude interfaces. |
| `*://gemini.google.com/*` | host_permissions | Required to detect, read, and inject optimized text into input fields in Gemini interfaces. |
| `*://www.perplexity.ai/*` | host_permissions | Required to detect, read, and inject optimized text into input fields in Perplexity interfaces. |
| `*://copilot.microsoft.com/*` | host_permissions | Required to detect, read, and inject optimized text into input fields in Microsoft Copilot interfaces. |
| `*://chat.deepseek.com/*` | host_permissions | Required to detect, read, and inject optimized text into input fields in DeepSeek interfaces. |
| `https://promptiq-theta.vercel.app/*` | host_permissions | Used for account authentication, signed-in history synchronization, subscriptions, and Premium AI optimization. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | Yes | Yes | Account email for login, support, and subscription status. | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | Yes | Yes | Email/password login; passwords are transmitted to the backend over HTTPS and stored as salted hashes. | No |
| Personal communications | Yes | Only for signed-in history and Premium optimization | Free optimization is local; Premium sends selected prompts to backend/Gemini. | Yes, Google Gemini API for Premium processing |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | Yes | Yes when signed in | To synchronize optimization history, feedback, account status, and subscriptions. | No |
| Website content | Yes | Yes | To read input field values to calculate prompt scores. | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Homepage URL**
https://promptiq-theta.vercel.app/

**Privacy Policy URL**
https://promptiq-theta.vercel.app/privacy


## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free (with paid subscription upgrade to Premium)


## Developer Info

**Publisher Name**
PromptIQ Developer

**Contact Email**
shubhaangkataruka22012007@gmail.com


## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.5 | 2026-07-07 | Redesigned popup dialog to premium dark mode glassmorphism layout, enabled payment bypass checkout, and restricted premium runs to a 1-prompt free trial. | Draft |
| 1.0.4 | 2026-07-03 | Moved the toolbar entry to onboarding, repaired authentication and account navigation, introduced local Free templates and server-side Premium AI, and hardened storage and MV3 packaging. | Published |
| 1.0.3 | 2026-06-29 | Removed website-only pages and all remote resources from the extension UI; added an automated Manifest V3 package compliance check. | Draft |
| 1.0.2 | 2026-06-27 | Fixed metadata policy violation (keyword spam in description). | Rejected |
| 1.0.1 | 2026-06-26 | UI/UX redesign of onboarding and inline optimizer panel; updated API keys for model compatibility. | Rejected |
| 1.0.0 | 2026-06-22 | Initial Release. Live prompt scoring, inline optimizations, Vercel backend sync, and premium upgrade paths. | Published |
