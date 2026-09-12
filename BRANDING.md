# PromptIQ visual identity, release 1.0.11

The website uses an original blue, white, ink, and yellow identity. Brand assets are local. No external fonts, script CDNs, or website-only artwork are shipped as extension logic.

## Final assets

- `public/brand-mark.svg`: hand-authored, scalable speech/command monogram, used by the website and popup. The native vector is also used in the floating panel. PNG toolbar icons are browser-rendered from this vector at 16, 48, and 128 pixels.
- `public/favicon.svg`: same vector mark for policy pages.
- `website-assets/clarity-studio-original.png`: original studio artwork from the built-in image generation tool.
- `website-assets/clarity-studio-v11.jpg`: delivery-compressed hero artwork.
- `website-assets/product-workspace-v11.png`: 2400 x 1600 browser capture of the actual floating optimizer with real Smart Template output, inside a labeled demonstration workspace. This is not a screenshot of ChatGPT or a generated UI.

## Final image prompt

Built-in image generation was used, not the CLI/API fallback.

Use case: ads-marketing. Create an exceptionally refined high-resolution 3D editorial hero photograph for PromptIQ, an AI prompt writing tool. Wide landscape 3:2 composition. A bright white seamless studio surface and backdrop, with a beautifully arranged sculptural stack of three thin white paper sheets on the RIGHT HALF, rising diagonally, with precise cobalt blue embossed paragraph strokes and rectangular typographic rules (no readable text). One elegant cobalt blue folded paper corner, one small vivid lemon yellow page tab. Represents rough ideas becoming structured instructions. Realistic tactile paper fibers, subtle folds, crisp edges, physical soft daylight shadows, sophisticated premium design studio art direction. LEFT HALF and upper left must be clean almost white negative space for HTML headline overlay; objects occupy the rightmost 50 percent. Camera slightly elevated, strong graphic composition, ultra sharp throughout. No UI screenshots, no fake software text, no letters, no floating orbs, no glass spheres, no gradient backdrop, no dark background, no watermark. Image for a product website, not a poster. Save a high-quality original.

Two generated logo explorations were rejected because the raster edges were not suitable for toolbar sizes. The final mark is a native vector, not one of those generated explorations.

## Delivery

New website asset filenames and versioned CSS/JS references prevent reusing old cached visuals. The site build copies only delivery images, not full-size originals. Extension icons are locally packaged. Premium activation copy remains explicit that billing setup is pending.
