# Checkpoint step 8: PR reconciliation

This is an operator recovery checklist, not a calculator runtime feature.
After a crash, inspect the issue, remote branch, and existing PR before retrying.
- If a matching PR is open, resume it rather than opening a duplicate.
- If it is merged, treat delivery as complete; do not replay the change.
- If no PR exists, verify the pushed diff and tests before creating one.
- Include `Closes #8` in the PR body to close the issue when merged.
The calculator itself keeps state in memory; see [architecture](ARCHITECTURE.md).
