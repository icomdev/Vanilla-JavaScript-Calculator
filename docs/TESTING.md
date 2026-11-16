# Testing

## Run the tests

Use **Node.js 18 or newer** and run commands from the repository root. No
package installation, third-party dependencies, build step, or browser is needed.
The suites use Node's built-in test runner and strict assertions.

```sh
# Discover all suites in both test/ and tests/ (including .test.cjs files).
node --test

# Equivalent explicit directory selection.
node --test test/ tests/

# Run one suite.
node --test tests/decimal.test.js

# Run tests whose names match a pattern in one suite.
node --test --test-name-pattern='duplicate decimals' tests/decimal.test.js
```

Keep runner flags before file arguments. A successful run exits with status 0;
failures print the test name, assertion details, and stack trace and exit nonzero.
Use a focused run while developing, then run `node --test` before submitting.
Running from the root matters: `tests/history.test.cjs` reads `script.js` using a
working-directory-relative path.

## Suite map

Both directories are intentional parts of the test suite; do not run only one
and assume all behavior is covered. The `.js` and `.cjs` suites use CommonJS
(`require`) and are both discovered by the runner.

| File | Coverage |
| --- | --- |
| `test/keyboard.test.js` | Keyboard/button parity for digits, decimals, arithmetic, deletion, and percent; mixed pointer/keyboard input; ignored keys and browser shortcuts; focus targets; Escape entry clearing versus Shift+Escape full reset; long AC holds, cancellation, and short-click memory preservation. |
| `tests/calculator.test.js` | Arithmetic and chaining, division-by-zero messages and recovery, repeated equals, operator replacement, unary minus, percent, and cross-feature interactions with sign toggle, memory, editing, and fresh entries. |
| `tests/decimal.test.js` | Leading and duplicate decimal guards, decimal operands for all four operators, editing results, chaining, deleting decimals, and resetting the guard with AC. |
| `tests/history.test.js` | Markup-backed click-handler checks for recording/replacing completed expressions, preserving history during editing/chaining or incomplete/repeated equals, and clearing history and operands with AC. |
| `tests/history.test.cjs` | Complementary VM-level history checks: seeds calculator state directly, then exercises equals/clear handlers; covers all four operators, incomplete/repeated equals, and delayed history updates during chaining. |
| `tests/memory.test.cjs` | Memory add/recall/clear, accumulation, indicator visibility, pending operations, computed results, and invalid/non-finite entries; also static accessibility attributes, readable button names, and preservation of memory/history labels. |

See [TEST-SWEEP.md](TEST-SWEEP.md) for the named cross-feature edge-case matrix
in `tests/calculator.test.js`. Its recorded test count describes that sweep,
not necessarily the current total.

## How the VM and DOM stubs work

These are logic and event-handler tests of the **real `script.js`**, not a
second implementation of the calculator. Each suite has a small local setup
helper (`setup()` or `createCalculator()`); there is no shared harness module.

1. The helper reads `script.js` with `node:fs`. Most helpers also read
   `index.html` and extract the buttons or data-attribute elements they need.
   The decimal suite instead constructs the elements explicitly; the CJS
   history suite creates elements on demand.
2. Plain JavaScript objects stand in for DOM elements. They provide only the
   properties and methods used by the test, such as `innerText`, `hidden`,
   `getAttribute`, and `addEventListener`. A stub `document` implements
   `querySelector` and `querySelectorAll` for the calculator's data selectors.
   These are not general HTML parsers or complete DOM implementations.
3. `node:vm` evaluates the source using `runInNewContext`, or
   `createContext` plus `runInContext`, with that `document` supplied as a
   global. Evaluating the script creates the calculator and registers the real
   event handlers. A fresh setup call gives each test independent calculator
   state and elements, including independent memory and history.
4. Most button stubs store callbacks as properties (for example,
   `addEventListener('click', handler)` assigns `element.click = handler`).
   Helpers such as `press()` invoke those callbacks and tests assert the
   resulting display text or indicator state. The CJS history suite also runs
   code inside its VM context to access `calculator` directly.
5. The keyboard harness additionally records document listeners, synthesizes
   key events and `preventDefault`, tracks `focus()` through `activeElement`,
   and dispatches pointer events. Its injected `setTimeout`/`clearTimeout`
   store callbacks in a map; `runHold()` checks the 700 ms delay and executes
   pending callbacks without sleeping. Other suites leave unused document
   listeners as no-ops and do not simulate holds.

No jsdom, browser automation, or other dependencies are involved. The stubs do
not test layout, CSS focus-ring rendering, native event propagation, real timer
scheduling, or screen-reader announcements. Accessibility assertions inspect
markup attributes, not assistive-technology behavior. Open `index.html` in a
browser for visual and real-interaction checks.

## Add a suite

1. First check the suite map: extend an existing suite when the scenario fits,
   particularly for interactions between features. For a separate concern,
   create `tests/<behavior>.test.js` (or `.test.cjs`); `test/` is also discovered.
2. Use `require('node:test')` and `require('node:assert/strict')`. Start with the
   local setup helper from the closest suite above and adapt only the stub
   surface the new tests need. There is no exported setup helper to import.
   Read application files relative to `__dirname` where possible.
3. Evaluate the real script in a fresh VM setup for each independent test.
   Prefer driving the registered handlers and asserting observable display,
   history, memory-indicator, or focus state. For keyboard or hold behavior,
   use the keyboard harness pattern rather than real delays.
4. Name tests for the entry state, action, and expected outcome. Use table-driven
   loops for regular cases, with distinct generated test names. Include boundary
   states and interactions (for example, an empty operand with a pending
   operation), rather than duplicating only a happy path. For a new edge-case
   sweep, map cases to test names in `TEST-SWEEP.md`.
5. Run the new file with `node --test tests/<behavior>.test.js`, then run
   `node --test` to check both directories. Keep the suite dependency-free and
   update this guide's suite map when adding a new file.
