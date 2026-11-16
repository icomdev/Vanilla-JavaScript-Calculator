# Vanilla JavaScript Calculator

Open `index.html` in a browser to use the calculator. No build step is required.

## Keyboard support

The keyboard uses the same actions as the on-screen buttons:

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter digits or a decimal point |
| `+`, `-`, `*`, `/` | Add, subtract, multiply, or divide |
| `Enter` or `=` | Calculate the result |
| `Escape` | Clear all (AC) |
| `Backspace` | Delete the last character (DEL) |

Other keys are ignored. Shortcuts using Ctrl, Command, or Alt are left to the browser.

## Tests

Run `node --test` with Node.js 18 or newer. Tests use Node's built-in test runner
and require no dependencies.
