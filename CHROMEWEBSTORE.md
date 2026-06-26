# Chrome Web Store Listing — PromptIQ

> Last Updated: 2026-06-26

## Store Listing

**Extension Name**
PromptIQ

**Short Description**
Write normally. PromptIQ turns your idea into a professional AI prompt in one click.

**Detailed Description**
Stop Guessing How To Write AI Prompts.

PromptIQ instantly upgrades your prompts for ChatGPT, Claude, Gemini, Perplexity, Copilot, and DeepSeek.

Write naturally. PromptIQ makes it AI-ready.

Same idea. Much better AI output.

Core Benefits:
* Instant Prompt Upgrade: Turn vague prompts into professional instructions.
* AI-Aware Optimization: Optimized differently for ChatGPT, Claude, Gemini, and other models.
* One Click Workflow: No copy-pasting between websites. Optimize directly where you work.
* Prompt History: Never lose a great prompt again.

Why PromptIQ Exists:
Most people don't get poor AI results because AI is bad. They get poor results because their prompts are vague. PromptIQ fixes that instantly. No prompt engineering, no tutorials, no learning curve. Just better prompts and better answers.

Pricing:
Free to get started. Upgrade when you need more power.

How to Use:
1. Open your preferred generative AI chat platform.
2. A sleek PromptIQ badge will float in the bottom-right corner next to the chatbox input.
3. As you type, the badge will score your prompt. Click the badge to slide out the PromptIQ sidebar.
4. Click "Optimize Prompt" to refine it instantly using local templates (Free) or advanced LLMs (Premium).
5. Click "Use Optimized" to insert the refined prompt directly into the input text area.

Privacy & Security:
All prompt optimizations are processed securely. Prompt history and telemetry are synced to your PromptIQ account or installation ID so the extension can show history, usage stats, and plan status.

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
| `https://*.vercel.app/*` | host_permissions | Used to connect to the backend serverless endpoints to store telemetry logs and retrieve AI-powered prompt optimizations. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | Yes | Yes | Account email for login, support, and subscription status. | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | Yes | Yes | Email/password login; passwords are transmitted to the backend over HTTPS and stored as salted hashes. | No |
| Personal communications | Yes | Yes | To send prompt data to backend/Gemini for optimization and history syncing. | Yes, Google Gemini API for optimization processing |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | Yes | Yes | To sync optimization stats, usage limits, survey responses, feedback, and upgrade events. | No |
| Website content | Yes | Yes | To read input field values to calculate prompt scores. | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL**
https://promptiq-theta.vercel.app/privacy (Recommended to host a simple markdown/HTML privacy page at this route).


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
| 1.0.1 | 2026-06-26 | UI/UX redesign of onboarding and inline optimizer panel; updated API keys for model compatibility. | Draft |
| 1.0.0 | 2026-06-22 | Initial Release. Live prompt scoring, inline optimizations, Vercel backend sync, and premium upgrade paths. | Published |
