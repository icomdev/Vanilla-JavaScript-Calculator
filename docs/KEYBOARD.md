# Keyboard guide

Open `index.html` in a browser. Shortcuts work anywhere on the calculator page;
there is no text field to select first. Keyboard and pointer input can be mixed.

## Shortcut reference

| Key | Action |
| --- | --- |
| `0`–`9` | Append a digit to the current entry. After equals, a digit starts a new entry. |
| `.` | Add a decimal point; an empty entry becomes `0.`. Extra decimal points are ignored. After equals, `.` continues the result rather than clearing it. |
| `+` | Select addition. |
| `-` | Select subtraction, or start a negative operand when the entry is empty (including after a pending operator). |
| `*` | Select multiplication. |
| `/` or `÷` | Select division (the `÷` button). Dividing by zero displays `Cannot divide by zero`. |
| `%` | Divide the current entry by 100; repeat to divide again. Keep the pending operator. Empty, invalid, or non-finite entries are unchanged. This is not a percentage of the previous operand: `200 + 10 % =` gives `200.1`. |
| `r` | Take the square root of the current entry, or the last computed/square-root result if the entry is blank. Keep pending operations, history, memory, and repeat-equals state. Negative or invalid entries and active errors are unchanged. AC/Shift+Escape forget the saved result; Escape/DEL do not. |
| `Enter` or `=` | Calculate. With a completed calculation, repeat the last operator and right operand (for example, `5 + 3 = =` gives `11`). Incomplete operands do not compute. |
| `Escape` | Clear the current entry only; see the clear comparison below. |
| `Shift+Escape` | Reset the whole calculation, history, and memory. |
| `Backspace` | Invoke **DEL**, removing the last character of the current entry. A single digit becomes blank; a remaining lone minus sign is also removed. On an error, clear the calculation (memory is kept). |

Selecting another operator after entering both operands computes the pending
operation first: `2 + 3 * 4 =` gives `20`, not `14`. With an empty right operand,
`+`, `*`, and `/` replace the pending operator; `-` starts a signed operand.

**Backspace is not the separate `⌫` button.** That button leaves `0` when deleting
a single digit; the keyboard shortcut uses DEL instead. There are no dedicated
shortcuts for `⌫`, sign toggle (`+/-`), or memory (`M+`, `MR`, `MC`).

## Entry clear versus full reset

Both Escape shortcuts focus **AC**, but plain Escape does **not** click AC.

| State | `Escape` | `Shift+Escape` |
| --- | --- | --- |
| Current entry and error message | Clear to a blank entry | Clear to a blank entry |
| Previous operand and pending operator | Keep | Clear |
| History line | Keep | Clear |
| Result mode and remembered repeated-equals operation | Reset | Reset |
| Memory and its `M` indicator | Keep | Reset memory to zero and hide `M` |

For example, `8 + 9 Escape 2 Enter` gives `10`: Escape lets you correct the
right operand without losing `8 +`. A short pointer click on AC instead clears
the entire calculation and history but keeps memory; holding AC for 700 ms also
clears memory, like `Shift+Escape`.

## Focus and other keys

- Each recognized shortcut focuses its matching on-screen button without
  scrolling the page. Keyboard focus shows a dark inset ring; Tab navigation
  also shows it. Pointer clicks do not show the keyboard focus ring. The styling
  uses the browser's `:focus-visible` state, not a permanently drawn outline.
- Recognized shortcuts prevent the browser's default key action. In particular,
  `Enter` calculates instead of also activating whichever button was focused.
- Ctrl, Command (Meta), or Alt combinations are ignored by the calculator and
  left to the browser/OS. Shift is allowed to type symbols such as `+`, `*`, and
  `%`; it also distinguishes `Shift+Escape` from `Escape`.
- Other keys (for example, `a`, `c`, `Delete`, or arrow keys) are ignored by the
  shortcut handler and retain their normal browser behavior. Tab/Shift+Tab still
  navigate buttons; Space can activate a focused button through native browser
  behavior, but is not a calculator shortcut.

## Implementation and checks

This reference follows the key map and `keydown` handler in
[`script.js`](../script.js), the buttons in [`index.html`](../index.html), and
`:focus-visible` in [`styles.css`](../styles.css).
[`test/keyboard.test.js`](../test/keyboard.test.js) checks shortcut handling,
focus targets, clear behavior, and ignored keys with DOM stubs. Run all tests
from the repository root with `node --test`; these are logic/event-handler tests,
not browser focus-ring rendering tests.
