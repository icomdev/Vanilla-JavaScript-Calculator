# Vanilla JavaScript Calculator

Open `index.html` in a browser to use the calculator. Click the on-screen
buttons or use the keyboard:

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter digits and a decimal point |
| `+`, `-`, `*`, `/` | Add, subtract, multiply, divide (`/` is the `÷` button) |
| `Enter` | Calculate (`=`) |
| `Escape` | Clear everything (`AC`) |
| `Backspace` | Delete the last character (`DEL`) |

Other keys are ignored by the calculator. Ctrl, Command, and Alt shortcuts
are left to the browser. Shift can be used to type symbols such as `+` and `*`.
Enter always calculates, even when another button has focus; Tab and Space
retain the browser's normal button navigation and activation behavior.

## Tests

With Node.js installed, run `node --test` (no dependencies required).
