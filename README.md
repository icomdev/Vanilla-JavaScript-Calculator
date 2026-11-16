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
| `AC` | Clears both numbers, the selected operator, and the remembered operation for repeated equals; preserves memory. Hold for 600 ms to clear everything, including memory. |
| `DEL` | Removes the last character of the current number. |
| `⌫` | Removes the last character of the current entry; a single digit resets it to `0`. |
| `+/-` | Toggles the sign of the current entry (inactive right after `=` until a new entry starts). |
| `M+` | Adds the current entry to memory. |
| `MR` | Recalls the memory value into the current entry. |
| `MC` | Clears the memory. |

The clear button is labeled `AC`, not `C`.
## Keyboard

The keyboard uses the same actions as the on-screen buttons:

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter digits or a decimal point |
| `+`, `-`, `*`, `/` | Add, subtract, multiply, or divide |
| `%` | Divide the current entry by 100 (same as the percent button) |
| `Enter` or `=` | Calculate the result |
| `Escape` | Clear only the current entry (preserves the pending operation, history, and memory) |
| `Shift+Escape` | Clear everything, including memory |
| `Backspace` | Delete the last character (DEL) |

Keyboard input focuses the matching button with a visible focus ring; pointer clicks do not show the ring. `Escape` and `Shift+Escape` focus AC.

Other keys are ignored. Shortcuts using Ctrl, Command, or Alt are left to the browser.

## Tests

Run `node --test tests/ test/` with Node.js 18 or newer.
