# CSS Loading Fix for Language Routes

## Issue Summary

CSS styles were not loading correctly for Chinese (`/zh/`) and Japanese (`/ja/`) language routes, while the English route (`/en/`) worked fine. This resulted in pages displaying with basic HTML styling instead of the intended cosmic theme with purple backgrounds, gradient buttons, and animations.

## Root Cause Analysis

The issue was caused by Astro's CSS import resolution behavior in layout files when accessed through different route structures:

- **English route**: `/en/` (worked fine)
- **Chinese route**: `/zh/` (CSS not loading)
- **Japanese route**: `/ja/` (CSS not loading)

### Investigation Process

1. **Network Request Analysis**: Found that `src/styles/main.css` was missing from network requests for zh/ja routes
2. **HTML Comparison**: English pages had CSS loaded, zh/ja pages only had component-specific CSS
3. **Import Path Testing**: Both relative (`../styles/main.css`) and alias (`@/styles/main.css`) imports in frontmatter failed

### Technical Root Cause

Astro's CSS bundling system was not properly resolving CSS imports in layout files when accessed from language subdirectory routes. The import statement in the frontmatter:

```astro
---
import "@/styles/main.css"; // or import "../styles/main.css";
---
```

Was working for `/en/` but failing for `/zh/` and `/ja/` routes due to different asset resolution paths.

## Solution

### Fix Applied

Changed from frontmatter CSS import to HTML `<link>` tag in `src/layouts/main.astro`:

**Before (Broken):**
```astro
---
import { ViewTransitions } from "astro:transitions";
import "@/styles/main.css";

const { content, lang = "en" } = Astro.props;
---

<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <ViewTransitions />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{content.title}</title>
  </head>
  <!-- ... -->
</html>
```

**After (Fixed):**
```astro
---
import { ViewTransitions } from "astro:transitions";

const { content, lang = "en" } = Astro.props;
---

<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <ViewTransitions />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/src/styles/main.css" />
    <title>{content.title}</title>
  </head>
  <!-- ... -->
</html>
```

### Why This Works

The HTML `<link>` tag with `href="/src/styles/main.css"` uses an absolute path that Astro's development server can resolve consistently across all routes, regardless of the URL structure.

## Verification

### Testing Method
Used Playwright to test all three language routes:

1. **Network Request Verification**: Confirmed `src/styles/main.css` loads with `[200] OK` or `[304] Not Modified`
2. **Visual Testing**: Screenshots confirmed cosmic purple background, gradient buttons, and proper styling
3. **Console Monitoring**: No CSS loading errors in browser console

### Results
✅ **English page** (`/en/`): Working
✅ **Chinese page** (`/zh/`): **FIXED** - Now loads cosmic styling
✅ **Japanese page** (`/ja/`): **FIXED** - Now loads cosmic styling

## Key Learnings

1. **Astro CSS Import Behavior**: Frontmatter CSS imports can have route-dependent resolution issues
2. **HTML Link Tags**: More reliable for critical CSS that must load across all routes
3. **Language Route Testing**: Always test multi-language applications across all language routes
4. **Network Debugging**: Check actual network requests, not just visual appearance

## Prevention

### Best Practices
1. Use HTML `<link>` tags for critical CSS that must work across all routes
2. Test CSS loading on all language routes during development
3. Monitor network requests in browser dev tools when debugging CSS issues
4. Consider using absolute paths (`/src/...`) rather than relative paths for CSS

### Testing Checklist
When implementing multi-language routes:
- [ ] Test CSS loading on all language routes
- [ ] Verify network requests include all expected CSS files
- [ ] Check browser console for loading errors
- [ ] Take screenshots to verify visual consistency

## Related Files

- `src/layouts/main.astro` - Main layout file (fixed)
- `src/styles/main.css` - Main CSS file (imports global.css)
- `src/styles/global.css` - Global styles with TailwindCSS
- `src/pages/en/index.astro` - English home page
- `src/pages/zh/index.astro` - Chinese home page
- `src/pages/ja/index.astro` - Japanese home page

## Environment Details

- **Astro Version**: v5.12.1
- **Issue Date**: September 2024
- **Node Version**: v22.14.0
- **System**: macOS (arm64)
- **Package Manager**: npm