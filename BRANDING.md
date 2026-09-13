# PromptIQ visual identity, release 1.0.13

The two dominant brand colors are graphite (#101414) and electric mint (#9fffc8). Soft neutral text (#f1f7f3), muted text (#a8b8af), and a raised graphite surface (#171e1b) preserve readability without competing with the accent. The website and extension use the same dark identity.

## Design

- Centered, compact introduction, generous whitespace, short copy, and a working local preview.
- Shared palette across the website, account popup, dashboard, floating optimizer, and policy pages.
- Staggered entrance, terminal-cursor, reveal, button, meter, and result transitions. Every animated surface honors reduced-motion preferences.
- Scores, errors, and changes use text or symbols as well as color.
- No external fonts, remote executable code, or new extension permissions.

## Current assets

- public/brand-mark.svg and public/favicon.svg: local speech/command monogram.
- public/icon-16.png, public/icon-48.png, public/store_icon.png: browser-rendered mint/graphite toolbar icons.
- website-assets/optical-rails-v13.png: original generated full-bleed hero artwork, with graphite optical rails and mint light. Generated using the built-in image tool; not executable extension content.
- website-assets/product-workspace-v13.png: 2400 x 1600 capture of the actual optimizer with local Smart Template output in a labeled demonstration workspace.
- public/screenshot1.png and public/screenshot2.png: 1280 x 800 captures before and after optimization.
- public/screenshot3.png: 1280 x 800 account popup capture.

The previous studio artwork is retained as source history but is no longer shipped on the website. Versioned asset URLs prevent old artwork or styles being reused from cache.

## Verification

Run npm test, npm run verify:brand, npm run build:website, and npm run package:extension.

Browser checks cover the local preview's 15 platform/mode combinations, copy, empty input, safe text rendering, account UI with mocked responses, plan usage displays, five website viewport sizes, and three floating panel sizes with compare, edit, insert, undo, and favorite callbacks.

This is a visual-only release. Billing configuration and the separately prepared Neon activity migration are not activated by it.
