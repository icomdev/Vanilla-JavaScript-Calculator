# Crash-recovery checkpoint — step 1

Manual PR reconciliation for the issue #1 documentation task, not calculator recovery.
Before retrying after a crash, inspect GitHub rather than opening a duplicate PR:
`gh pr list --repo icomdev/Vanilla-JavaScript-Calculator --state all --head agent/1`
- Open PR: inspect its diff and checks, then continue that PR.
- Merged PR: verify `docs/rig-1.md` on the default branch before treating the task as done.
- Closed/unmerged PR or no match: inspect the branch and task status before retrying.
