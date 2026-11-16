# Architecture

A static, vanilla JavaScript calculator: open `index.html` in a browser. There
is no build step, package manifest, framework, or dependency installation.

## Files and page structure

| File | Responsibility |
| --- | --- |
| [`index.html`](../index.html) | Page markup, display regions, and 24 native buttons. Links `styles.css` and loads `script.js` with `defer`, so the DOM exists before event wiring runs. |
| [`styles.css`](../styles.css) | Four-column calculator grid, display typography, gradient background, hover styling, and `:focus-visible` button outlines. |
| [`script.js`](../script.js) | `Calculator` state and methods, one calculator instance, DOM selection, and input listeners. Uses browser DOM APIs directly; no modules or imports. |

```text
body
└─ .calculator-grid (role=group, label="Calculator")
   ├─ .output (aria-live=polite, aria-atomic=true)
   │  ├─ [data-memory-indicator] (M; initially hidden)
   │  ├─ [data-history]          (last recorded expression)
   │  ├─ [data-previous-operand] (pending left operand/operator)
   │  └─ [data-current-operand]  (entry, result, or error)
   └─ buttons selected by data-* attributes
```

The history is a named group inside the single live region, not a separate
live region. Symbolic controls have explicit accessible names; digit buttons
use their text.

## Grid layout

| CSS rule | Effect |
| --- | --- |
| `grid-template-columns: repeat(4, 100px)` | Four fixed-width columns. |
| `grid-template-rows: minmax(120px, auto) repeat(6, 100px)` | One display track and six explicit button tracks; auto-placement adds an implicit seventh button row for equals. |
| `.output { grid-column: 1 / -1 }` | Display spans all four columns; its contents use a right-aligned flex column. |
| `.span-two { grid-column: span 2 }` | Equals spans two columns; zero occupies one cell. |
| `min-height: 100vh` with centered grid content | Centers the grid within a container at least as tall as the viewport. |

Buttons follow HTML order, not a separate JavaScript layout definition:

```text
+--------+--------+--------+--------+
| M      history / previous / entry |
+--------+--------+--------+--------+
|   M+   |   MR   |   MC   |   %    |
|   AC   |  DEL   |   <-   |  +/-   |
|   /    |   1    |   2    |   3    |
|   *    |   4    |   5    |   6    |
|   +    |   7    |   8    |   9    |
|   -    |   .    |   0    |        |
+--------+--------+--------+--------+
|        =        |                 |
+-----------------+-----------------+
```

Here `/` represents `÷`, `<-` represents `⌫`, and empty cells have no button.
The memory indicator is positioned at the display's upper left.

## Calculator state and rendering

The constructor receives the previous/current operand, memory indicator, and
history elements, sets memory to zero, then calls `clear()`. State lives in
this in-memory instance; there is no persistence or network access.

| State / methods | Role |
| --- | --- |
| `currentOperand`, `previousOperand`, `operation` | Editable entry and pending binary calculation. Entries are strings; `compute()` parses operands with `parseFloat` and uses JavaScript number arithmetic. |
| `appendNumber()`, `chooseOperation()`, `compute()` | Enter digits/decimal, select or replace an operator, and calculate. Chaining evaluates the pending operation immediately rather than applying expression precedence. |
| `isResult`, `lastOperation`, `lastOperand` | Track result editing and repeat-equals behavior. |
| `history` | One expression string, replaced by a completed, non-repeating `compute(true)`; intermediate chained calculations do not record history. |
| `errorMessage` | Division by zero clears calculation state and sets `Cannot divide by zero`. |
| `delete()`, `backspace()`, `toggleSign()`, `percent()` | Entry edits; DEL and the separate backspace button have distinct methods. |
| `memory`, `addToMemory()`, `recallMemory()`, `clearMemory()` | Numeric memory register; the indicator is hidden when memory is zero. |
| `clear()`, `clearEntry()`, `fullClear()` | Clear calculation/history while retaining memory; clear only entry/error/replay state; or clear calculation and memory, respectively. |
| `getDisplayNumber()`, `updateDisplay()` | Format grouped integer digits (leaving scientific notation intact), write text with `innerText`, and update indicator visibility. |

## Event flow

```text
button click -> Calculator method -> updateDisplay() -> display DOM
keydown      -> key-to-button map -> focus + click -> same path
                                    (Escape uses clear methods directly)
```

| Input wiring in `script.js` | Dispatch |
| --- | --- |
| `[data-number]`, `[data-operation]` click listeners | Pass button text to `appendNumber()` or `chooseOperation()`. |
| Equals and other action buttons | Call the matching method, then `updateDisplay()`; equals calls `compute(true)`. |
| Document `keydown` | Maps digits, `.`, operators (`/` aliases `÷`), `%`, `=`/Enter, and Backspace (to DEL). Recognized keys prevent default and focus the mapped button before dispatch. Ctrl/Meta/Alt combinations and unmapped keys are ignored. |
| Escape / Shift+Escape | Focus AC but bypass its click handler: call `clearEntry()` / `fullClear()`, then render. A normal AC click calls `clear()`. |
| Primary AC `pointerdown` | Starts a 700 ms timer for `fullClear()` and rendering. AC `pointerleave`, document `pointerup`, or document `pointercancel` cancels a pending hold. |

## Verification

Run `node --test` from the repository root; no dependencies are required.
The suites in [`test/`](../test/) and [`tests/`](../tests/) execute the real
script with Node's VM and lightweight DOM stubs. They cover arithmetic and
state transitions, decimals, keyboard/click wiring, clear/hold behavior,
history, memory, and accessibility markup. They are not browser rendering or
visual layout tests; the grid description above comes from HTML/CSS inspection.
