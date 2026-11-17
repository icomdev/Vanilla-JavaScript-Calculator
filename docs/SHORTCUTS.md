# Keyboard shortcuts — quick reference

Open `index.html`; keyboard and on-screen button input can be mixed.
“Result mode” means a computed result is displayed; an error is
`Cannot divide by zero`. This card follows the [README](../README.md) and
[shipped key handler](../script.js), including its entry/result edge cases.

| Key | Action | Notes / edge cases |
| --- | --- | --- |
| `0`–`9` | Enter digits | Start a new entry in result mode; clear an error before entering. |
| `.` | Enter a decimal point | Empty entry becomes `0.`; extra points are ignored. Extends a result instead of replacing it; clears an error first. |
| `+`, `*`, `/` or `÷` | Add, multiply, divide | Use a displayed result as the left operand. With an empty right entry, replace the pending operator; with no left operand, do nothing. On error, clear calculation without selecting an operator. |
| `-` | Subtract / start a negative entry | An empty entry or lone minus becomes `-`, including after a pending operator. On error, clear calculation only. |
| `%` or `k` | Toggle entry/result sign | Each press toggles again; **not** division by 100. Empty, invalid, non-finite, zero, and error entries stay unchanged. Pending operation and repeat-equals state are kept. |
| `r` | Square root (`√`) | Use current entry, or saved result if blank. No change for negative/invalid/non-finite values or errors. Keeps pending operation and repeat-equals state; result mode stays active on results. |
| `Enter` or `=` | Calculate / repeat equals | Incomplete operands do nothing. Repeat the last operator/right operand on the displayed value (`5 + 3 = =` → `11`). On error, clear calculation. |
| `Backspace` | Delete via **DEL** | Empty stays blank; a single digit becomes blank; a remaining lone minus is removed. Edits results without leaving result mode. On error, clear calculation, keeping memory. Not the separate `⌫` button. |
| `Escape` | Clear entry | Clear error, result mode, and repeated-equals state; keep pending operand/operator, history, memory, and saved square-root result. |
| `Shift+Escape` | Full reset | Clear calculation, error, history, saved result, repeated-equals state, and memory. |
| `m`, `mr`, `mc` | No memory shortcuts | `m` is ignored; multi-key sequences are not recognized (`r` still takes square root). Use **M+**, **MR**, **MC** buttons. |

## Operating notes

- Operators evaluate left to right: `2 + 3 * 4 =` gives `20`, not `14`.
- `%`/`k` can negate a pending right operand: `200 + 10 % =` gives `190`.
- Square root can reuse the saved result after Escape/DEL; AC and full reset
  forget it. With no saved result and a blank entry, `r` does nothing.
- Short AC clears calculation/history but keeps memory; holding AC for 700 ms
  also clears memory. Plain Escape is entry clear, **not** an AC click.
- Recognized shortcuts focus their matching button; both Escape tiers focus AC.
  Enter prevents native activation of whichever button was previously focused.
- Letter aliases are lowercase. Shift is allowed for symbols and Shift+Escape.
  Ctrl, Command/Meta, Alt, IME composition, text fields, editable content, and
  already-handled events are left alone. Other unmapped keys are ignored.
- No dedicated shortcut invokes `+/-` or the separate `⌫` button.

Checked with `node --test` (logic/event-handler tests, not browser rendering):
[`test/keyboard.test.js`](../test/keyboard.test.js),
[`tests/sqrt.test.js`](../tests/sqrt.test.js), and the rest of the suite.
