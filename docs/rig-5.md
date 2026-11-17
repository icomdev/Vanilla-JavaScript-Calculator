# Checkpoint step 5: PR reconciliation

This is an operator recovery checklist, not a calculator feature.
`script.js` keeps calculator state in memory; it implements no durable recovery journal.
After a worker crash, reconcile GitHub state before repeating PR creation:
- Inspect the task branch and any existing PR targeting the default branch.
- Reuse an existing open PR; if already merged, verify its changes before continuing.
- If no PR exists, verify the pushed diff and tests, then open one with the issue reference.
