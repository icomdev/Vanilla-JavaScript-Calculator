# Accessibility statement

This document describes the existing calculator in [index.html](../index.html),
with interaction behavior from [script.js](../script.js) and focus styling from
[styles.css](../styles.css). It documents the current implementation, not a
claim of WCAG conformance or verified support in every assistive technology.

## Structure and announcements

- The calculator container has `role="group"` and `aria-label="Calculator"`.
  This names and groups the display and controls; it is not an application role
  and does not request an application-specific screen-reader mode.
- The `.output` container has `aria-live="polite"` and `aria-atomic="true"`.
  Updates are intended to be announced when the screen reader is ready, without
  interrupting current speech. Atomic announcements request the whole output
  region rather than only the changed digit. The region contains the memory
  indicator, history, previous operand, and current operand (or error message).
  Actual timing and wording depend on the browser and screen reader.
- The history container has `role="group"` and `aria-label="History"` inside
  that live region; it is not a separate live region.

## Button names

All controls are native `<button>` elements. Symbolic and abbreviated controls
have explicit `aria-label` values, so their accessible names explain the action
rather than relying on pronunciation of a symbol:

| Visible button | `aria-label` |
| --- | --- |
| `M+` | Add to memory |
| `MR` | Recall memory |
| `MC` | Clear memory |
| `%` | Percent |
| `AC` | All clear |
| `DEL` | Delete last digit |
| `⌫` | Backspace |
| `+/-` | Negate |
| `÷` | Divide |
| `*` | Multiply |
| `+` | Add |
| `-` | Subtract |
| `.` | Decimal point |
| `=` | Equals |

Digit buttons `0`–`9` do not have `aria-label` attributes: their visible text
provides their accessible names. AC also has a `title` describing its pointer
hold action (700 ms to clear memory as well); this does not replace its name.

## Memory indicator

The display's `M` is a non-interactive `<span>` with `role="img"` and
`aria-label="Memory state"`. This gives the visual marker an accessible name
instead of relying on the letter alone. It starts with `hidden`, and the script
sets `hidden` whenever memory is zero. When memory is nonzero, the marker is
shown within the live output. It indicates that memory is populated; its label
does not announce the stored numeric value. Use MR (Recall memory) to put that
value in the current entry.

## Keyboard access and parity

Tab and Shift+Tab navigate the native buttons in document order. The stylesheet
provides a `:focus-visible` outline for keyboard focus. Space activates a focused
button. Enter is handled globally as Equals, rather than activating whichever
button currently has focus.

The keyboard shortcuts focus their matching on-screen button. Most reuse the
button's click handler, keeping arithmetic behavior aligned with pointer input:

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter a digit or decimal point |
| `+`, `-`, `*`, `/` or `÷` | Select an operator (`/` maps to Divide) |
| `%` | Percent |
| `Enter` or `=` | Equals |
| `Backspace` | DEL (Delete last digit), not the separate `⌫` button |
| `Escape` | Clear the current entry, preserving the pending operation and memory |
| `Shift+Escape` | Full reset, including memory |

Escape shortcuts are deliberate exceptions to click parity: they focus AC but
call entry-clear or full-reset behavior directly. A short AC activation clears
the calculation while preserving memory; holding AC with a pointer for 700 ms
also clears memory. Shift+Escape offers a keyboard route to the full reset.

There are no dedicated shortcuts for M+, MR, MC, Negate, or the separate `⌫`
button; reach them with Tab and activate with Space. Ctrl, Command (Meta), and
Alt combinations are left to the browser or operating system. Shift is allowed
for characters such as `+` and `%`, as well as Shift+Escape. Other keys are
ignored by the shortcut handler. Screen readers may intercept keys in browsing
mode, so shortcut availability depends on their interaction mode.

## Verification scope

The automated Node tests exercise calculator logic and keyboard handlers using
DOM stubs; they do not verify screen-reader announcements, browser focus
rendering, contrast, or full accessibility conformance. Manual checks should
include tabbing through every button, activating controls with Space, comparing
shortcuts with pointer actions, and listening to result, error, and memory
updates in a browser/screen-reader combination. This statement does not claim
those manual checks have been completed.
