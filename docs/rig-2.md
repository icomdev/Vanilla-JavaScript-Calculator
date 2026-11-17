# Crash-recovery checkpoint: step 2

PR reconciliation is an operator checklist, not a calculator recovery feature.
The calculator keeps state in memory; `script.js` provides no recovery journal.
- After an interrupted documentation run, inspect the issue branch and its diff.
- Check GitHub for an existing PR from that branch before creating another.
- Reuse an open PR; if already merged, verify the requested file on the default branch.
- Record the PR URL and test results so the next restart can reconcile progress.
