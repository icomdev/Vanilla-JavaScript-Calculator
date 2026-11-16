# Vanilla JavaScript Calculator

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
| `%` | Divides the current entry by 100; repeat to divide again. Empty entries are unchanged. Preserves pending operations (200 + 10 % = 200.1). |
| `=` | Shows the result; press again to repeat the last operator and operand on the displayed value (e.g. `5 + 3 = =` gives `11`). |
| `AC` | Clears both numbers, the selected operator, and the remembered operation for repeated equals. |
| `DEL` | Removes the last character of the current number. |
| `⌫` | Removes the last character of the current entry; a single digit resets it to `0`. |
| `+/-` | Toggles the sign of the current entry (inactive right after `=` until a new entry starts). |
| `M+` | Adds the current entry to memory. |
| `MR` | Recalls the memory value into the current entry. |
| `MC` | Clears the memory. |

The clear button is labeled `AC`, not `C`.
## Quick reference

The keyboard uses the same actions as the on-screen buttons:

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter digits or a decimal point |
| `+`, `-`, `*`, `/` or `÷` | Add, subtract, multiply, or divide |
| `%` | Divide the current entry by 100 (same as the percent button) |
| `Enter` or `=` | Calculate the result |
| `Escape` or `Shift+Escape` | Clear calculation, history and repeated equals (AC); preserve memory |
| `Backspace` | Delete the last character (DEL) |

Other keys are ignored. Shortcuts using Ctrl, Command, or Alt are left to the browser.

## Testing

Run `node --test tests/ test/` with Node.js 18 or newer.

The suites run the real script in Node's VM with lightweight DOM stubs:

- `test/keyboard.test.js`: keyboard/button parity, arithmetic, deletion, clear,
  percent, mixed pointer/keyboard input, and ignored browser shortcuts.
- `tests/calculator.test.js`: arithmetic/chaining, division-by-zero recovery,
  repeated equals, operator replacement, unary minus, and percent.
- `tests/decimal.test.js`: decimal guards, arithmetic, deletion, and result editing.
- `tests/history.test.js` and `tests/history.test.cjs`: expression recording,
  replacement, preservation while editing/chaining, and clearing.
- `tests/memory.test.cjs`: memory add/recall/clear, indicator state, pending
  operations, and invalid or non-finite entries.

You can also run `node --test` from the repository root to discover all tests.
No dependencies or build step are needed. These are logic/event-handler tests,
not browser rendering or visual tests.

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
and current entry. It shows the last completed expression, is replaced by the
next completed calculation, and is cleared by AC.
