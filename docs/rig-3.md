# Crash-recovery checkpoint: step 3

PR reconciliation is a maintainer recovery procedure, not calculator runtime behavior.
After an interrupted documentation run, inspect GitHub before retrying PR creation:
- Find PRs from `agent/3` targeting the repository's default branch, including closed PRs.
- If one is open, verify its diff contains only `docs/rig-3.md` and resume that PR.
- If it was merged, treat the checkpoint as complete; if closed unmerged, review why before retrying.
- If none exists, verify the branch and open one PR with `Closes #3` in its body.
