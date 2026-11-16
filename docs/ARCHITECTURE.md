# Architecture

## Runtime and files

This is a static, vanilla JavaScript calculator. Open `index.html` directly in a
browser: there is no build step, framework, package installation, or server
required. The page loads `styles.css` and a deferred, classic `script.js`; deferring
the script lets the HTML finish parsing before it queries and wires the DOM.

## Page structure (`index.html`)

The body contains a single `.calculator-grid` container, labelled as a calculator
group. Its first child is `.output`, followed by native buttons in display order.
The output contains the memory indicator, a single history line, the previous
operand, and the current operand. It is a polite, atomic live region so display
changes can be announced by assistive technology.

Buttons cover memory, percent, clearing/editing, sign toggle, arithmetic, digits,
the decimal point, and equals. `data-*` attributes identify controls and output
elements for JavaScript; CSS classes describe layout and presentation. Most
non-digit controls also have explicit accessible labels.

## Layout (`styles.css`)

`.calculator-grid` uses CSS Grid with **four 100px columns**:
`grid-template-columns: repeat(4, 100px)`. It centers the calculator in a container
with a minimum height of the viewport. The explicit rows are a display track
(`minmax(120px, auto)`) and six 100px button tracks.

The output spans all columns (`grid-column: 1 / -1`). Buttons are auto-placed in
HTML order; the equals button's `.span-two` class spans two columns, while zero
occupies one cell. With the current button count and ordering, equals flows into
an implicit seventh button row, whose size is not fixed by the explicit row rule.

Inside the output, a vertical flex layout right-aligns the history and operands;
the memory indicator is absolutely positioned at the upper left. The stylesheet
also supplies the gradient background, translucent buttons, hover treatment,
visible keyboard-focus outline, and display typography.

## State and rendering (`script.js`)

`Calculator` holds calculation state and references to the four output elements.
There is one instance for the page. Its methods handle:

- Entry editing: digits/decimal input, deletion, backspace, sign toggle, and percent.
- Arithmetic: pending operands and operator, chained calculations, repeated equals,
  and a division-by-zero error message.
- Clearing: current entry, calculation state, or a full reset including memory.
- Memory: add, recall, and clear, with the indicator hidden when memory is zero.
- History: one completed expression, recorded by equals for a pending operation.

`getDisplayNumber()` formats values for presentation; `updateDisplay()` writes
history and operands via `innerText` and updates the indicator's `hidden` state.
State-changing methods and display updates are separate: event handlers normally
call an action and then `updateDisplay()`. The class is not a DOM-independent
model, because it also owns these formatting and rendering responsibilities.

## Event wiring and input flow

The bottom of `script.js` selects elements by their `data-*` attributes, constructs
the calculator, and registers listeners. Number and operator buttons use their
text as the action argument; the other controls call the corresponding methods.
A normal click follows this path:

```text
button click -> Calculator action -> state change -> updateDisplay() -> DOM
```

A document-level `keydown` handler maps supported keys to buttons, including `/`
to divide, `Enter` to equals, and `Backspace` to DEL. It ignores Ctrl/Command/Alt
combinations and unmapped keys. For mapped keys it prevents the browser's default
action, focuses the button without scrolling, and usually calls `button.click()`
to reuse the click handler. Escape is the exception: it clears the current entry
directly; Shift+Escape performs a full reset including memory.

AC also has a pointer-hold path: a primary pointer press starts a 700 ms timer for
a full reset. Pointer release, cancellation, or leaving AC cancels the timer.
A short AC click clears the calculation while preserving memory.

## Verification

The existing Node.js tests exercise the real script with lightweight DOM stubs
using `node --test` (Node.js 18 or newer). They check logic and event behavior,
not browser layout or rendering. See [the README](../README.md#testing) for the
test suites and [the edge-case sweep](TEST-SWEEP.md) for a coverage overview.
