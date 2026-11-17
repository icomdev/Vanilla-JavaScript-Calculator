# Vanilla JavaScript Calculator

[![CI](https://github.com/icomdev/Vanilla-JavaScript-Calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/icomdev/Vanilla-JavaScript-Calculator/actions/workflows/ci.yml)

**Prerequisites:** Node.js 18+ for tests.

Open `index.html` in a browser to use the calculator.

## Buttons

| Button | What it does |
| --- | --- |
| `0` | Adds 0 to the current number. |
| `1` | Adds 1 to the current number. |
| `2` | Adds 2 to the current number. |
| `3` | Adds 3 to the current number. |
| `4` | Adds 4 to the current number. |
| `5` | Adds 5 to the current number. |
| `6` | Adds 6 to the current number. |
| `7` | Adds 7 to the current number. |
| `8` | Adds 8 to the current number. |
| `9` | Adds 9 to the current number. |
| `%` | Toggles the sign of the current entry or displayed result; each press toggles again (200 + 10 % = 190). Empty entries, zero, and errors are unchanged. This key does not divide by 100. |
| `=` | Shows the result; press again to repeat the last operator and operand on the displayed value (e.g. `5 + 3 = =` gives `11`). |
| `AC` | Clears both numbers, the selected operator, and the remembered operation for repeated equals. Hold for 700 ms to also clear memory. |
| `DEL` | Removes the last character of the current number. |
| `⌫` | Removes the last character of the current entry; a single digit resets it to `0`. |
| `+/-` | Toggles the sign of the current entry (inactive right after `=` until a new entry starts). |
| `M+` | Adds the current entry to memory. |
| `MR` | Recalls the memory value into the current entry. |
| `MC` | Clears the memory. |

The clear button is labeled `AC`, not `C`.

## Keyboard

Digits, operators, Enter, and Backspace reuse the on-screen button handlers.
Escape provides entry clearing, while Shift+Escape provides a full reset:

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter digits or a decimal point |
| `+`, `-`, `*`, `/` or `÷` | Add, subtract, multiply, or divide |
| `k` or `%` | Toggle the current entry/result sign once (same as `%`); repeated presses keep toggling |
| `r` | Take the square root (same as `√`); see the [keyboard guide](docs/KEYBOARD.md) |
| `Enter` or `=` | Calculate the result |
| `Escape` | Clear only the current entry; keep the pending operation and memory |
| `Shift+Escape` | Full reset, including memory |
| `c` or `C` | AC: clear the calculation and history, preserving memory; hold for 700 ms to also clear memory (Shift not required) |
| `Backspace` | Delete the last character (DEL) |

Keyboard shortcuts focus the matching on-screen button with a visible focus ring.
Tab navigation also shows the ring; pointer clicks do not. Escape clears an error
and resets repeated equals, without erasing calculation history. A short AC click
continues to preserve memory; releasing or moving off AC before 700 ms cancels
the full-reset hold. The `c`/`C` alias uses the same 700 ms hold; releasing
the key or leaving the page cancels it. Holding Shift does not change this alias
into an immediate memory reset.

Other keys are ignored. Shortcuts using Ctrl, Command, or Alt are left to the browser.
Shift is allowed (for example, to type `+` or `%`); `Shift+Escape` performs the
full reset listed above. Text fields, editable content, and IME composition are
left alone. There are no dedicated shortcuts for memory, sign toggle, or
the separate `⌫` button: `Backspace` invokes `DEL`.

## Troubleshooting

The `keydown` listener belongs to the calculator's document, not the parent page.
Keys may not reach it until the iframe has focus; clicking the surrounding page
or browser toolbar moves keyboard input away from the calculator again.

| Symptom | Check / fix |
| --- | --- |
| Buttons work, but typing does nothing | Click a calculator button inside the frame, then try `1 + 2 Enter`. The click also activates that button; use AC first if needed. |
| No response to buttons or keys in a sandboxed frame | Include `allow-scripts` in the iframe's `sandbox` attribute so `script.js` can run. |
| A browser shortcut still wins | Ctrl/Command/Alt combinations are deliberately ignored; browser/OS-reserved shortcuts cannot be captured reliably by page code. |

Use a minimal sandbox for this static calculator; `allow-same-origin` is not required:

```html
<iframe src="index.html" title="Calculator" sandbox="allow-scripts"></iframe>
```

Clicking inside the frame gives it keyboard focus through normal browser behavior;
no custom click-to-focus or parent-page key forwarding code is installed. Recognized
keys then focus their matching buttons. Reserved shortcuts include Ctrl/Command+L
(address bar), Ctrl/Command+T (new tab), and Ctrl/Command+W (close tab); reservations
vary by browser/OS. Use the plain keys in [Keyboard](#keyboard).

## Layout

The current grid has **4 columns**, not 5 columns × 5 rows. The display spans
all four columns. CSS defines six button-row tracks; auto-placement adds a
seventh row for `=`. The `0` button occupies one cell (no zero-span); `=` spans
two columns. This sketch reflects the actual HTML/CSS, not a proposed redesign:

```text
+--------+--------+--------+--------+
| M      history (last expression) |
|                previous operand |
|                 current operand |
+--------+--------+--------+--------+
|   M+   |   MR   |   MC   |   %    |
+--------+--------+--------+--------+
|   AC   |  DEL   |  <-    |  +/-   |
+--------+--------+--------+--------+
|   /    |   1    |   2    |   3    |
+--------+--------+--------+--------+
|   *    |   4    |   5    |   6    |
+--------+--------+--------+--------+
|   +    |   7    |   8    |   9    |
+--------+--------+--------+--------+
|   -    |   .    |   0    |        |
+--------+--------+--------+--------+
|        =        |                |
+-----------------+----------------+
```

Here `/` represents `÷`, `<-` represents `⌫`, and blank cells have no button.
The memory controls (`M+`, `MR`, `MC`) share the first button row with `%`.
The `M` indicator sits at the upper left of the display and is hidden when
memory is zero. The history line sits above the pending (previous) operand
and current entry. It records an expression when equals completes a pending
operation, replacing the previous history entry. Repeated equals, incomplete
equals, editing, and intermediate chained calculations leave that line unchanged.
AC and division by zero clear it; memory is preserved.

## Testing

From the repository root, use Node.js 18 or newer:

```sh
node --test
```

This discovers tests in both `test/` and `tests/`. To name both directories
explicitly, run `node --test tests/ test/`.

The suites run the real script in Node's VM with lightweight DOM stubs:

- `test/keyboard.test.js`: keyboard/button parity, arithmetic, deletion, clear,
  percent, mixed pointer/keyboard input, and ignored browser shortcuts.
- `tests/calculator.test.js`: arithmetic/chaining, division-by-zero recovery,
  repeated equals, operator replacement, unary minus, percent, and cross-feature
  interactions with sign toggle and memory. See the [edge-case sweep](docs/TEST-SWEEP.md)
  for the coverage matrix.
- `tests/decimal.test.js`: decimal guards, arithmetic, deletion, and result editing.
- `tests/history.test.js` and `tests/history.test.cjs`: expression recording,
  replacement, preservation while editing/chaining, and clearing.
- `tests/memory.test.cjs`: memory add/recall/clear, indicator state, pending
  operations, and invalid or non-finite entries.

No dependencies or build step are needed. These are logic/event-handler tests,
not browser rendering or visual tests.

### Copy session history

The small **Copy** button beside history copies all completed expressions in the
current session, oldest first, as one `expression = result` per line. It is
disabled until there is history and shows **Copied** for about one second after
success. It uses the Clipboard API with a textarea fallback where unavailable or
denied. AC, full reset, and division by zero also clear the copyable session;
entry-only Escape preserves it. History is not saved across page reloads.
