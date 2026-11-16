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
| `AC` | Clears both numbers, the selected operator, and the remembered operation for repeated equals. Hold for 700 ms to also clear memory. |
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
| `Escape` | Clear only the current entry; keep the pending operation and memory |
| `Shift+Escape` | Full reset, including memory |
| `Backspace` | Delete the last character (DEL) |

Keyboard shortcuts focus the matching on-screen button with a visible focus ring.
Tab navigation also shows the ring; pointer clicks do not. Escape clears an error
and resets repeated equals, without erasing calculation history. A short AC click
continues to preserve memory; releasing or moving off AC before 700 ms cancels
the full-reset hold.

Other keys are ignored. Shortcuts using Ctrl, Command, or Alt are left to the browser.

## Tests

Run `node --test tests/ test/` with Node.js 18 or newer.
