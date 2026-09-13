# PromptIQ visual identity, release 1.0.12

The product uses two base colors: cobalt blue (#2454eb) and white (#ffffff). Borders and quiet surfaces use transparent blue over white; they are not additional brand colors. Text and status labels retain solid blue for contrast. The floating optimizer stays light on dark host pages to preserve this identity.

## Design

- Centered, compact introduction, generous whitespace, short copy, and a working local preview.
- Shared palette across the website, account popup, dashboard, floating optimizer, and policy pages.
- Subtle entrance, reveal, button, meter, and result transitions. Every animated surface honors reduced-motion preferences.
- Scores, errors, and changes use text or symbols as well as color.
- No external fonts, remote executable code, or new extension permissions.

## Current assets

- public/brand-mark.svg and public/favicon.svg: local speech/command monogram.
- public/icon-16.png, public/icon-48.png, public/store_icon.png: existing browser-rendered toolbar icons.
- website-assets/product-workspace-v12.png: 2400 x 1600 capture of the actual optimizer with local Smart Template output in a labeled demonstration workspace.
- public/screenshot1.png and public/screenshot2.png: 1280 x 800 captures before and after optimization.
- public/screenshot3.png: 1280 x 800 account popup capture.

The previous studio artwork is retained as source history but is no longer shipped on the website. Versioned asset URLs prevent old artwork or styles being reused from cache.

## Verification

Run npm test, npm run verify:brand, npm run build:website, and npm run package:extension.

Browser checks cover the local preview's 15 platform/mode combinations, copy, empty input, safe text rendering, account UI with mocked responses, plan usage displays, five website viewport sizes, and three floating panel sizes with compare, edit, insert, undo, and favorite callbacks.

This is a visual-only release. Billing configuration and the separately prepared Neon activity migration are not activated by it.
