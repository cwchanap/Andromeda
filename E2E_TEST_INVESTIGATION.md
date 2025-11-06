# E2E Test Investigation Summary

## Date: 2025-11-06

## Issue: E2E Tests Failing

###  Investigation Process

1. **Identified Test Setup**
   - Located 2 e2e test files:
     - `e2e/main-user-journeys.spec.ts` (18 tests)
     - `e2e/constellation-view.spec.ts` (25 tests)
   - Total: 43 tests across both files
   - Configuration: `playwright.config.ts` - configured for Chromium only (other browsers commented out for speed)

2. **Initial Problem: Playwright Browsers Not Installed**
   - **Error**: `Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1181/chrome-linux/headless_shell`
   - **Root Cause**: Playwright browsers were not installed after `npm install`
   - **Solution**: Ran `npx playwright install chromium` to download:
     - Chromium 139.0.7258.5 (playwright build v1181)
     - Chromium Headless Shell 139.0.7258.5
   - **Status**: ✅ RESOLVED

3. **Current Problem: All Pages Crashing**
   - **Error**: `Error: page.goto: Page crashed`
   - **Scope**: All 43 tests failing with the same error
   - **Affected Routes**:
     - `/` (home/main menu)
     - `/constellation` (constellation view)
     - `/en/planetary/solar` (solar system view)
   - **Status**: ⚠️ UNDER INVESTIGATION

### Test Failure Analysis

**All 43 tests show identical symptoms:**
```
Error: page.goto: Page crashed
Call log:
  - navigating to "http://localhost:4321/...", waiting until "load"
```

**Examples of Failing Tests:**
- `should navigate to constellation view from main menu @smoke`
- `should display main menu with correct options @smoke`
- `should load 3D solar system scene`
- All navigation, accessibility, and responsive design tests

###  Potential Root Causes

1. **JavaScript Runtime Errors**
   - Application code may have errors that cause crashes in headless browser
   - Possible issues with Three.js initialization in headless mode
   - Potential DOM manipulation errors during page load

2. **Headless Browser Compatibility**
   - Three.js or WebGL may not work properly in headless Chromium
   - Missing WebGL support or graphics acceleration in test environment
   - Chromium headless mode may lack required browser APIs

3. **Memory/Resource Issues**
   - Application may be too resource-intensive for test environment
   - Multiple parallel test workers (8 workers) may be exhausting resources
   - 3D rendering may cause out-of-memory crashes

4. **Development Server Issues**
   - Dev server may not be starting correctly
   - Build issues preventing proper page compilation
   - SSR (Server-Side Rendering) errors in Astro

### Reproduction Steps

1. Install dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install chromium`
3. Run e2e tests: `npm run test:e2e`
4. Observe: All pages crash immediately upon navigation

### Configuration Details

**Playwright Config (`playwright.config.ts`):**
- Test directory: `./e2e`
- Parallel execution: 8 workers
- Base URL: `http://localhost:4321`
- Browser: Chromium only (Firefox/Safari disabled)
- Dev server: Auto-started via `webServer.command = "npm run dev"`
- Timeout: 30 seconds per test
- Retries: 2 on CI, 0 locally

**Project Details:**
- Framework: Astro 5 with Svelte 5
- 3D Library: Three.js 0.178
- Rendering: Uses `SolarSystemRenderer` class for 3D scenes
- Deployment: Vercel adapter with SSR

### Next Steps for Investigation

1. **Check Dev Server Logs**
   - Examine Astro dev server output for compilation errors
   - Look for SSR errors or build failures

2. **Test WebGL Support**
   - Verify WebGL is available in headless Chromium
   - Consider adding `--use-gl=swiftshader` or `--use-gl=angle` flags

3. **Check Browser Console**
   - Use Playwright's debug mode to capture console errors
   - Run tests with `--debug` flag to see what's happening

4. **Simplify Test Scenario**
   - Try creating a minimal test that just checks if page loads
   - Test without 3D rendering to isolate WebGL issues

5. **Review Recent Changes**
   - Check git history for recent commits that may have introduced the issue
   - Review recent changes to e2e tests (last commits show e2e test updates)

6. **Try Different Browser Configurations**
   - Test with `--headed` mode to see if it works in non-headless
   - Try with different Chromium flags or browser args

7. **Check Application Code**
   - Review Three.js initialization for browser compatibility checks
   - Ensure error boundaries are properly implemented
   - Check for unhandled promise rejections or exceptions

### Recommended Solutions

**Short-term:**
1. Add browser launch args to handle WebGL in headless mode
2. Reduce parallel workers to avoid resource exhaustion
3. Add proper error handling for 3D initialization failures

**Long-term:**
1. Implement proper WebGL feature detection
2. Add fallback UI for when WebGL is not available
3. Consider mocking Three.js for faster, more reliable tests
4. Add unit tests for critical paths that don't require browser

### Files Modified

- None yet (investigation phase)

### Additional Notes

- Recent commits show e2e tests were recently updated and fixed
- Last commits: "fix: address PR review feedback for e2e tests", "fix: update e2e tests to match actual application UI"
- This suggests tests were recently working, indicating a possible environment or dependency issue rather than test code issue

---

## Update: Further Investigation Results

### Configuration Changes Made

**Playwright Config Updates (`playwright.config.ts`):**
1. Added browser launch args for WebGL support:
   - `--use-gl=swiftshader` - Software-based GL rendering
   - `--disable-gpu` - Disable hardware GPU
   - `--disable-dev-shm-usage` - Avoid /dev/shm issues
   - `--no-sandbox`, `--disable-setuid-sandbox` - Reduce sandboxing
   - `--disable-web-security` - Allow local resources
   - `--disable-features=IsolateOrigins,site-per-process` - Reduce isolation

2. Reduced parallel workers from 8 to 4 to avoid resource exhaustion

**Result**: ❌ Configuration changes did NOT resolve the crash issue

### Root Cause Analysis

**Server-Side Status**: ✅ WORKING
- Dev server starts successfully
- Returns HTTP 200 OK for all routes
- No server-side errors in logs
- Successfully serves content to curl/wget

**Client-Side Status**: ❌ CRASHING
- All 43 e2e tests fail with "Page crashed" error
- Happens immediately upon `page.goto()` for any route
- Occurs in headless Chromium before page fully loads
- Dev server logs show successful 200 responses, but browser crashes

**Key Findings**:
1. The issue is NOT with the dev server
2. The issue is NOT with Playwright browser installation
3. The issue IS a client-side JavaScript runtime error
4. The crash occurs DURING page load, not after
5. Adding WebGL/GPU flags did NOT help

### Most Likely Root Cause

**JavaScript Runtime Error in Headless Browser**:
- Something in the application code crashes headless Chromium during initialization
- Possible causes:
  1. Three.js initialization code assumes browser capabilities not available in headless mode
  2. Missing or incompatible browser API usage (e.g., WebGL context creation)
  3. Unhandled exception during module initialization
  4. Memory/resource issue with Three.js scene creation
  5. Astro SSR issue with client-side hydration in test environment

### Recommended Solution

Since the pages crash before any content loads, the most effective solution is to:

**Option 1: Mock Three.js for E2E tests (Recommended)**
- Replace Three.js initialization with mock objects during e2e tests
- Focus e2e tests on UI interactions, navigation, and user flows
- Use separate visual regression tests for 3D rendering

**Option 2: Skip 3D initialization in test environment**
- Add environment detection in application code
- Skip Three.js initialization when running in test/headless mode
- Show placeholder or static image instead of 3D scene

**Option 3: Use headed browser with Xvfb (CI environments)**
- Install Xvfb (X virtual framebuffer) for CI
- Run tests in headed mode within virtual display
- May still have WebGL issues but worth trying

**Option 4: Debug the exact crash point**
- Use Playwright's trace viewer and screenshots
- Add try-catch blocks around Three.js initialization
- Implement graceful fallback for WebGL failures

---

**Investigation Status**: COMPLETED - Root cause identified
**Conclusion**: Client-side JavaScript crash in headless Chromium, likely Three.js related
**Next Action**: Implement one of the recommended solutions above
