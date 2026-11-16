# Changelog

Landed changes, newest first; dates and merge commits are from git history.

## 2026-11-16

- Added keyboard button focus and visible focus feedback, entry-only Escape, full-reset Shift+Escape, and a 700 ms AC hold to also clear memory, with regression tests (PR #34, `8968db4`).
- Added calculator and control ARIA labels, named history and memory elements, and a polite, atomic live display, with accessibility regression tests (PR #38, `6d55f76`).
- Added a README keyboard quick-reference, ASCII layout, and dependency-free Node.js testing guide; clarified expression-history behavior (PR #36, `e475c8a`).
- Added 35 cross-feature tests covering operator chains, sign toggle, percent, memory, error recovery, and repeated equals, plus the coverage matrix in `docs/TEST-SWEEP.md` (PR #35, `5c30d1d`).
