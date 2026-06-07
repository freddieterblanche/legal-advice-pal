---
name: Edit forms must hydrate full existing record
description: Any edit dialog/form across admin + dashboard must load every editable column from the database before allowing input, and never overwrite unhydrated fields on save
type: preference
---

When building or modifying any Edit form (admin hub, firm dashboard, public-profile editors — anything with `isEdit`), the form MUST:

1. Fetch ALL editable columns of the row (use `select("*")` or list every column) — never a partial projection.
2. Hydrate every form field from the loaded row in a `useEffect`, falling back to the existing form state, not to empty string.
3. Gate the form's render on a `hydrated` flag when editing (`{isEdit && !hydrated ? <Loading/> : <form/>}`) so the user never sees blank fields they could accidentally re-save.
4. On submit, only send fields the user actually edited via the form — but those fields must have been hydrated first so unedited values round-trip unchanged.

**Why:** Sending unhydrated empty fields to `UPDATE` wipes good data in the database (user complaint: "data disappears, then updates overwrite everything").

**How to apply when fixing one form:** Search the codebase for other Edit modals/forms (`isEdit`, `editing`, `<FormModal expert=`, `<FormModal lawyer=`, etc.) and apply the same hydration pattern to all of them. Reposition/Crop and similar photo controls also belong in the shared photo-field component (e.g. `ExpertPhotoField`, `LawyerFormModal` photo block) so every form that uses it gets the fix.
