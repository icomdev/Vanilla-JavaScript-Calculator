# Changelog

Landed changes, newest first; commit links point to the implementation history.

## 2026-11-16

- Keyboard focus + Escape modes: added visible keyboard focus, entry-only Escape, Shift+Escape full reset including memory, and a 700 ms AC hold for full reset, with regression tests ([#34](https://github.com/icomdev/Vanilla-JavaScript-Calculator/pull/34), [6bed4c9](https://github.com/icomdev/Vanilla-JavaScript-Calculator/commit/6bed4c9)).
- ARIA audit: added calculator grouping, a polite atomic live display, accessible control/history/memory names, and accessibility regression checks ([#36](https://github.com/icomdev/Vanilla-JavaScript-Calculator/pull/36), [73c713b](https://github.com/icomdev/Vanilla-JavaScript-Calculator/commit/73c713b)).
- README quick-reference: documented keyboard shortcuts, the ASCII layout, and test commands, then clarified history semantics and test coverage ([#38](https://github.com/icomdev/Vanilla-JavaScript-Calculator/pull/38), [38bbe81](https://github.com/icomdev/Vanilla-JavaScript-Calculator/commit/38bbe81), [10394f3](https://github.com/icomdev/Vanilla-JavaScript-Calculator/commit/10394f3)).
- Test sweep: added 35 cross-feature edge-case tests and a coverage matrix without changing calculator behavior ([#35](https://github.com/icomdev/Vanilla-JavaScript-Calculator/pull/35), [00a6d35](https://github.com/icomdev/Vanilla-JavaScript-Calculator/commit/00a6d35)).
