# Checkpoint step 6: PR reconciliation

This is an operator recovery checklist, not a calculator runtime feature.
After a crash, inspect GitHub before retrying a PR creation or push.
- Match the issue, source branch, and target branch to any existing PR.
- Reuse an open PR; if merged, verify its changes before marking work complete.
- If closed without merging, inspect the outcome before deciding to retry.
- Record the reconciled PR URL and state in the recovery journal, if maintained.
The shipped calculator keeps state in memory; it has no recovery journal or lease.
