## Problem

On the public firm registration form (and elsewhere), tapping the "Select province" dropdown on mobile either does not open the picker or selecting a value has no effect. The likely cause is the Google Translate browser feature (visible in the screenshot) wrapping `<option>` text nodes in extra elements, which breaks React's reconciliation of native `<select>` controls — a well-known React + Chrome Translate conflict.

## Fix

Replace the native `<select>` controls inside `src/components/ProvinceCityFields.tsx` with the same custom button+portal dropdown pattern already used by `Combobox`/`ComboboxCreatable`. Custom dropdowns are not affected by Google Translate's DOM rewrites and behave consistently across mobile and desktop.

### Changes

1. **`src/components/ProvinceCityFields.tsx`**
   - Add a small inline `SimpleSelect` component (button trigger + portalled menu, click-outside close, `translate="no"` on the trigger) used for:
     - Country dropdown (when shown).
     - Province dropdown (SA mode).
   - Keep city `ComboboxCreatable` and non-SA free-text inputs unchanged.
   - Preserve the existing `selectClassName` styling so look matches today's UI.
   - Reset city when province changes, and reset province/city when switching country group — same logic as today.

2. No other files change. Every consumer (`register.tsx`, `LawyerFormModal`, `MediatorArbitratorFormModal`, admin firm/expert forms, branch editors) uses `ProvinceCityFields`/`ProvinceCitySelect`, so the fix propagates everywhere automatically.

### Why not just add `translate="no"` to the existing `<select>`?

That helps but does not always prevent Chrome from rewriting child `<option>` text on Android, and we already use custom dropdowns for the same purpose elsewhere — converging on one pattern is more reliable.

### Verification

After the change, on mobile: tapping Province opens an in-page list, selecting a province updates the field and enables the City combobox. On desktop the behavior is unchanged visually.