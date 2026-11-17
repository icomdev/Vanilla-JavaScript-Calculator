# Crash-recovery checkpoint: step 7

Step 7 is a manual PR-reconciliation checklist, not a calculator feature.
The shipped `script.js` has no recovery journal, lease, or epoch mechanism.
- After an interrupted contribution, inspect its branch and existing PR before retrying.
- Reuse an existing open PR rather than creating a duplicate; check its current diff.
- If already merged, treat the contribution as complete; do not replay it.
- Before resubmitting changes, run `node --test`, as `.github/workflows/ci.yml` does.
