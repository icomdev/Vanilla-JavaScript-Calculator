# Checkpoint step 4: PR reconciliation

This is a manual recovery checklist, not a calculator runtime feature.
After a worker crash, reconcile GitHub state before retrying PR creation.
- Find the issue's branch and inspect its existing PR, including closed PRs.
- If a matching PR is open, resume it rather than creating a duplicate.
- If it is merged, record its URL and stop; if closed unmerged, review why before retrying.
- If no PR exists, verify the pushed diff, then open one referencing the issue.
