
## Add Background Image to App Launcher

Add the existing `auth-background.webp` as a subtle background to the App Launcher page (Index), similar to how it's used on the Login page but adapted for the main app context.

### Changes

**File: `src/pages/Index.tsx`**
- Import the existing `auth-background.webp` asset
- Add a background div with the image behind the app grid, using a blur overlay to keep readability
- The background will be visible on both mobile and desktop, with a semi-transparent overlay so the cards remain legible

### Technical Details

- Reuse `src/assets/auth-background.webp` (already optimized)
- Apply `bg-cover bg-center` with a `backdrop-blur-sm` and `bg-background/80` overlay to maintain contrast and readability
- No new dependencies or assets needed
- No impact on other pages or components
