# Chrome Web Store Listing — PromptIQ

> Last Updated: 2026-06-22

## Store Listing

**Extension Name**
PromptIQ

**Short Description**
Score your prompts, optimize them for ChatGPT, Claude, and Gemini in real-time, and learn prompt engineering as you type.

**Detailed Description**
PromptIQ is your ultimate inline companion to elevate your prompts to state-of-the-art quality in real-time. It integrates seamlessly into your favorite AI environments to give you instant feedback and re-writes.

Core Features:
* Live Quality Scoring: Displays a real-time 0–100 quality indicator next to your chat inputs as you type, highlighting missing elements (such as role, context, specificity, and constraints).
* Context-Aware Refinement: Automatically optimizes prompts depending on the platform you are currently using (ChatGPT, Claude, Gemini, DeepSeek, etc.).
* Explanation Layer: Teaches you prompt engineering by highlighting exactly what changed and explaining why it improves the prompt.
* One-Click Injection: Inject optimized prompts directly back into the chatbox with a single click.

How to Use:
1. Open any supported AI tool (ChatGPT, Claude, Gemini, Perplexity, Copilot, or DeepSeek).
2. A sleek PromptIQ badge will float in the bottom-right corner next to the chatbox input.
3. As you type, the badge will score your prompt. Click the badge to slide out the PromptIQ sidebar.
4. Click "Optimize Prompt" to refine it instantly using local templates (Free) or advanced LLMs (Premium).
5. Click "Use Optimized" to insert the refined prompt directly into the input text area.

Privacy & Security:
All prompt optimizations are processed securely. Telemetry history is saved under a randomized install ID to sync history records safely without collecting personally identifiable information.

**Category**
Productivity

**Single Purpose**
Evaluates, scores, and refines user prompts inline on major AI text platforms.

**Primary Language**
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ⬜ Not created | Omitted (Chrome Default) |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 3 | 1280×800 or 640×400 | ⬜ Not created | |


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
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | Yes | Yes | To send prompt data to backend for optimization and history syncing. | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | Yes | Yes | To sync optimization stats (scores, improvements) to history logs. | No |
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
| 1.0.0 | 2026-06-22 | Initial Release. Live prompt scoring, inline optimizations, Vercel backend sync, and premium upgrade paths. | Draft |
