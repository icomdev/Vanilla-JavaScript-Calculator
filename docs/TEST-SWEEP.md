# Edge-case test sweep (#32)

Run `node --test` (Node.js 18+, no dependencies). All sweep tests live in
`tests/calculator.test.js` and exercise the real button click handlers with a
lightweight DOM stub. Names below use `{…}` for generated test-name variants.

| Matrix cell | Test name(s) |
| --- | --- |
| Operator → equals → operator, chaining the result | `operator chain {first} → equals → {next} uses the result` (all 16 pairs of `+`, `-`, `*`, `÷`) |
| Sign toggle mid-entry | `sign toggle mid-entry preserves digits and a trailing decimal` |
| Sign toggle after equals vs a fresh entry | `sign toggle after equals is inactive until a new number entry` |
| Percent after a pending operator combined with sign toggle | `pending {operator} with {% then +/- or +/- then %} toggles the entry twice` (all four operators, both orders; also checks empty pending entries) |
| M+ with a pending operator, empty operand | `M+ with an empty pending operand leaves memory and the operation unchanged` |
| M+ with a pending operator, entered operand | `M+ with a pending operator stores only the entry without computing` |
| MR then immediate operator | `MR then immediate operator uses recalled memory instead of the equals result` |
| Divide-by-zero message → number-key recovery | `divide-by-zero recovery via number key clears repeat-equals state` |
| Divide-by-zero message → AC recovery | `divide-by-zero recovery via AC clears repeat-equals state` |
| Repeat-equals alternating with new number entry | `repeat-equals {operator} alternates with fresh number entries` (all four operators) |

Outcome: **116 tests pass**, including 35 added by this sweep. No production
bugs were uncovered, so no calculator behavior was changed. In particular,
sign toggle remains inactive immediately after equals, percent divides only
the current entry by 100 (#26), and repeat-equals applies the remembered
operation to the current display even after a new number is entered (#15).

## Square-root key (#78)

All cells below use the real markup and event handlers in
`tests/sqrt.test.js` (plain `node --test`, no dependencies). A successful
binary calculation or square root saves the last result; clearing only the
entry preserves it, while AC/full reset forgets it. Other calculator behavior
is unchanged. Negative/unparseable/non-finite inputs and active errors are
ignored rather than introducing a new error mode.

| Matrix cell | Test name(s) |
| --- | --- |
| Integer / zero / fraction → sqrt → transformed entry | `sqrt transforms current entry {9/0/0.25} into {3/0/0.5}` |
| Result → Escape / DEL → sqrt → restored transformed result, history kept | `sqrt uses last result after {Escape/DEL} clears the entry` |
| Pending operator + right entry → sqrt → equals | `sqrt preserves pending {+/-/*/÷} and transforms only the right entry` |
| Older result + new entry + saved memory → sqrt → MR | `sqrt prefers the current entry over an older result and preserves memory` |
| Equals result → sqrt → repeat equals / new digit | `sqrt on a result keeps fresh-digit and repeat-equals behavior` |
| Equals result → operator → blank entry → sqrt → equals | `sqrt with an empty pending entry uses the last result without losing the operator` |
| Fresh / entry-clear without result / AC / full reset → sqrt → blank | `sqrt leaves {fresh/cleared without a result/AC reset/full reset} state unchanged` |
| Negative / lone minus / active error → sqrt → unchanged | `sqrt leaves {negative/lone minus/error} state unchanged` |
| `r` vs modified browser shortcuts → click, focus, prevent-default parity | `r focuses and clicks the square-root key; browser shortcuts remain untouched` |
| One labelled button → existing shared operator styling | `sqrt is one accessible operator-style button using the shared button styling` |

Tests were added first: all 21 failed before implementation, then passed.
The existing accessibility test's fixed labelled-button count was updated for
the one new key, and its symbolic-name map now includes square root.

Validation: **297 tests pass** (`node --test`), including all **21** square-root
cases (`node --test tests/sqrt.test.js`). No unrelated behavior fixes were needed.

## Additional percent path parity matrix (#93)

The original divide-by-100 behavior described above is superseded by #93.
The existing `%` button now toggles the current entry/result sign. `k` and `%`
share its click handler, once per keydown, like `r` does for square root.
Unlike the legacy `+/-` button, `%` also toggles displayed results. Zero,
empty/unfinished entries, non-finite entries, and errors are unchanged.
Pending operations, repeat-equals state, history, and memory are preserved.
Existing percent and cross-feature expectations were updated accordingly.
`test/keyboard.test.js` checks chained/mixed keyboard and button presses,
results, focus, browser shortcuts, no-op states, and pending operations.
Its button stub retains all listeners so duplicate click wiring cannot hide.

### State-transition matrix

`{path}` expands to `keyboard` (`k`) and `button` (`%`). All rows run
real event handlers; the keyboard harness reads the actual HTML. Zero is
intentionally unchanged, consistent with the existing sign control. Empty
entries do not fall back to the last result (unlike square root).

| Matrix cell | Test name(s) |
| --- | --- |
| Positive / negative / fraction / zero entry → toggle | `percent toggles current entry {50/12.5/-25/0}` (`tests/percent.test.js`) |
| Standalone / pending entry → toggle twice → original entry | `repeated percent toggles back with {a pending operation/a standalone entry}` |
| Fresh / AC / DEL → empty → toggle → input | `percent leaves {fresh/cleared/deleted} empty entry unchanged` |
| Empty right operand × all four operators → toggle → normal calculation | `percent preserves empty operand and pending {operator}` |
| Entered right operand × all four operators × both input paths → toggle → equals/history | `{path} percent transforms pending {operator} entry before equals` (`test/keyboard.test.js`) |
| Both input paths → repeated entry/result toggles → entry clear → sqrt / memory recall | `{path} percent toggles once per activation, including results` |
| Both input paths × empty / lone minus / negative zero / pending / error → unchanged surrounding state | `{path} percent preserves unfinished, zero, pending and error states` |
| Keyboard `%` alias vs button → repeated toggles, same pending operation | `percent key reuses the button handler, including repeated presses` |
| Mixed k / % / button → repeat equals / new digit; modified k → browser-owned | `mixed k/%/button presses toggle and preserve repeated equals and fresh digits` |
| Both input paths → trailing-decimal editing / negative sqrt no-op / positive sqrt / sign toggle | `{path} percent composes with square root and trailing-decimal editing` |
| Pending operator × order of legacy +/- and % → two toggles cancel | `pending {operator} with {% then +/- or +/- then %} uses the signed percent entry` (`tests/calculator.test.js`) |
| Recognized aliases → focus corresponding button | `every mapped key focuses its corresponding button` |
| Markup → exactly one % button with truthful accessible name | `percent has one button labelled with its sign-toggle action` |

Tests were exercised against the original implementation before adopting the
sign-toggle implementation: the updated percent expectations failed as expected.
The expanded sweep also proved that the old accessible name, “Percent”, no
longer described the action; the minimal regression fix renames it “Toggle sign”.
No other calculator behavior changes were needed beyond the requested feature.

Validation: `node --test`: **313 tests pass**, no dependencies added.
## Percent sign key (#93)

The existing `%` button is repurposed as requested (no duplicate button).
`k` and `%` dispatch its single click handler, like `r` does for square root.
Unlike the older `+/-` control, this control also toggles displayed results.
The earlier percent/divide-by-100 matrix above describes historical behavior;
its existing tests now assert sign toggling and composition of the two sign controls.

All new cells live in `tests/percent-sign.test.js`; `{path}` expands to
`button`, `k`, and `%`. Every intermediate sign is asserted to detect double mutation.

| Entry state × action → exit state | Named test |
| --- | --- |
| Positive / negative / trailing decimal / small fraction × three activations → alternating signs, same digits | `{path} toggles {12/-12.50/12./0.05} once per activation preserving digits` |
| Empty / lone minus / zero / error / empty pending × activation → unchanged | `{path} leaves {empty/lone minus/zero/error/empty pending} unchanged` |
| Pending binary operation × toggle right entry → signed computation | `{path} transforms only the right entry of pending {+/-/*/÷}` |
| Equals result × toggle / repeat equals / new digit → signed result, preserved repeat state, fresh entry | `{path} toggles results preserving history and repeated equals` |
| Memory recall × toggle / sqrt / toggle / sqrt → memory preserved, negative sqrt ignored | `{path} preserves memory and composes with square root` |
| Modified k / ordinary k / repeated keydown → browser untouched / one toggle each, focus | `k focuses percent and ignores modified browser shortcuts` |

Tests were added before implementation and exposed the old scaling behavior and
missing `k` route. This is the requested behavior replacement, not an unrelated
bug fix. Existing percent expectations and the accessible label were updated.
Validation: `node --test` — **359 pass, 0 fail**, including **46 new matrix tests**.
No dependencies or browser required.

## Memory active badge (#101)

The current default branch already maintains a nonzero-memory indicator and
updates it on M+, MR, MC, short AC, and long AC. The sweep therefore reuses that
single indicator rather than adding a second state flag or changing memory
semantics in `script.js`. The requested UI refinement adds a green dot to the `M`
badge and positions it at the bottom-left of the output, directly above the
memory controls. It remains hidden for zero (including cancellation to zero),
and visible for either sign of nonzero memory. Its existing accessible name and
role are preserved; the dot is not the only signal.

All new tests live in `tests/memory.test.cjs`. The harness now dispatches real
pointer handlers with deterministic timers (no sleeps or dependencies).
`{value}` expands to `7` and `-7`; `{action}` expands to `memory-recall`,
`memory-clear`, `all-clear`, and `long AC`.

| Entry state × action → exit state | Named test |
| --- | --- |
| Initial document → hidden, labelled dot/M badge immediately above memory controls | `memory badge sits above the memory row and has a visible active marker` (also checks the positioning rule) |
| Zero → M+ positive/negative → active; short AC/new entry → still active | `active badge after storing {value} then {action} reflects memory, not entry` (all eight variants) |
| Nonzero × MR → recalled value, still active | `active badge after storing {value} then memory-recall reflects memory, not entry` |
| Nonzero × MC → current entry unchanged, inactive; MR → zero | `active badge after storing {value} then memory-clear reflects memory, not entry` |
| Nonzero × short AC → entry cleared, still active; MR → saved value | `active badge after storing {value} then all-clear reflects memory, not entry` |
| Nonzero × AC hold at 699 ms → active; at 700 ms → inactive; release/click/MR → still inactive, zero recalled | `active badge after storing {value} then long AC reflects memory, not entry` |
| Active × hold cancelled by release/cancel/leave → active; subsequent completed hold → inactive | `cancelled AC hold via {pointerup/pointercancel/pointerleave} keeps the badge active and allows a later full clear` |
| Zero × MR/MC/long AC → inactive; subsequent M+ → active | `zero memory stays inactive through recall, MC and long AC; storing again reactivates it` |
| Zero addition / signed cancellation → inactive; negative total → active | Existing `indicator is hidden for zero and cancellation, visible for negative memory` |
| Invalid M+ / arithmetic error → memory preserved | Existing `empty, incomplete and non-finite entries do not poison memory` |

Tests first: **22 passed, 1 failed** before the UI refinement (the old `M`
marker did not match the requested dot badge). All runtime transitions already
passed; no production JavaScript bug or need for a behavior change was found.
Validation after the markup/style refinement: `node --test tests/memory.test.cjs`
— **26 pass, 0 fail**; `node --test` — **375 pass, 0 fail** (16 tests over
the original default branch, including the three existing PR regressions).
The positioning check is a static CSS contract, not a browser screenshot test.

## Copy session history (#100)

Tests were added first in `tests/history.test.cjs`: the three existing tests
passed and all eleven new tests failed before implementation. The last-expression
display is unchanged. The new in-memory session records the same successful,
non-repeating equals expressions, oldest first; each copied line uses
`expression = result` without display grouping or a trailing newline. Entry clear,
editing, memory, square root, and intermediate chaining preserve that session.
AC/full reset and division-by-zero clear it, following existing history lifetime.
Nothing is persisted across reloads.

| Entry state × action → exit state | Named test |
| --- | --- |
| Initial markup → native, disabled Copy in history panel | `history panel has one native Copy button initially disabled` |
| Empty / pending / incomplete equals → copy disabled; successful equals → enabled; AC after copy → disabled, Copy restored; new calculation → new session | `empty history disables copy until completed equals; AC disables and resets confirmation` |
| Multiple expressions with negative and decimal operands / repeated and incomplete equals / pending operator → copy oldest-first lines, no calculator mutation | `copy formats session lines via {clipboard/unavailable/rejected/throws} without changing calculator state` |
| Clipboard available → writeText; missing / rejected / synchronously throwing → selected fallback textarea, removed with focus restored | `copy formats session lines via {clipboard/unavailable/rejected/throws} without changing calculator state` |
| Successful copy → Copied for 1000 ms; second copy before expiry → renewed confirmation | `confirmation resets after one second and a second copy restarts its timer` |
| Fallback returns false / throws → cleanup and focus restoration, no false confirmation | `{fallbackFails/fallbackThrows} cleans up textarea without claiming success` |
| Pending asynchronous copy → AC → late success cannot restore stale confirmation | `clearing while clipboard is pending cannot restore stale confirmation` |
| Saved result → entry clear / sqrt / memory / chaining → accumulated lines; divide-by-zero / full reset → empty | `editing, memory, sqrt and chaining preserve session; errors and full reset clear it` |

The existing accessible-button inventory was updated for the text-labelled Copy
control. No unrelated production bug fixes or dependencies were needed. Tests use
real event handlers, a lightweight DOM, clipboard stubs and deterministic timers;
they do not claim to verify operating-system clipboard permissions in a browser.

Validation: `node --test tests/history.test.cjs` — **14 pass, 0 fail**;
`node --test` — **370 pass, 0 fail**. `git diff --check` passes.

## AC letter alias (#96)

All cells use the real event handlers in `test/keyboard.test.js`, without new
dependencies. `{alias}` expands to `c without Shift`, `C uppercase`,
`C without Shift (Caps Lock)`, and `c with Shift`. Short activation means
keydown followed by keyup before the 700 ms hold fires; it is AC, not Escape's
entry-only clear. Holding either case clears memory after 700 ms, exactly like
holding the pointer on AC. Auto-repeat does not reset that deadline.

| Entry state × action → exit state | Named test |
| --- | --- |
| Entry / pending operation / result / error × each alias → blank calculation/history, no repeat operation or saved result, memory retained | `{alias} short AC clears {entry/pending operation/result/error} and preserves memory` |
| Result + memory × each alias held with auto-repeat → blank calculation/history and zero memory | `{alias} long AC alias clears memory after 700 ms` |
| Press → opposite-case release before deadline → memory retained; next hold → zero memory | `AC alias release cancels its hold and allows a later hold` |
| Active hold → tab visibility change / focus loss → timer cancelled, memory retained | `{visibilitychange/blur} cancels an AC alias hold` |
| Both aliases × Ctrl / Meta / Alt / consumed event / IME / editable target → browser-owned, no click or timer | `AC aliases leave browser shortcuts, editable targets and composition untouched` |
| Both aliases → AC focus and existing Escape tiers unaffected | `every mapped key focuses its corresponding button` (extended), existing Escape tests |

Tests were added first: the missing aliases failed before implementation.
The implementation adds only the requested aliases and shares AC's existing
hold timer; no unrelated behavior fixes or dependencies were needed.

Validation: `node --test` — **383 pass, 0 fail**.

## Concise live announcements (#99)

`tests/aria.test.js` runs the real script/markup with a lightweight DOM stub.
It records every live-region text write (not just final text) to prove duplicate
suppression. `{state}`, `{action}`, and `{trigger}` expand to independently named
tests. No dependencies or browser are needed for these DOM contracts.

| Entry state × action → exit/announcement | Named test(s) |
| --- | --- |
| Markup → exactly one polite, atomic status outside visual output | `one dedicated status announces updates politely and atomically` |
| Pending divide by zero × equals / chained operator → error; no-op M+ / sign / sqrt / rerender → no duplicate; recovery → error again | `error via {equals/chaining} is announced once through no-op actions and rerenders` |
| Fresh / entry / result / pending / error × AC / Escape / Shift+Escape → “Cleared”; repeat/rerender → no duplicate; new entry → clear announces again | `{fresh/entry/result/pending/error} then {AC/Escape/Shift+Escape} announces cleared once and permits a later clear` (15 cells; pending-state tests also verify Escape preserves the operator) |
| Decimal entry → M+ twice → accumulated value; MR twice / MC twice / rerender → deduplicated action feedback; cleared memory → MR zero | `memory announcements report accumulated stored value, recall and clear without duplicate writes` |
| Empty / unfinished / non-finite / overflowing entry → M+ → no false store announcement | `M+ ignores {empty/unfinished/non-finite/overflow} without claiming a store` |
| Active error → MR → recovered entry; pending operator → MR → equals | `memory recall recovers an error and preserves a pending operation` |
| Fresh → entry → operator → right entry → result → rerender | `ordinary entries, pending operands and results remain announced without history replay` |
| Stored memory + pending entry → held AC → release click → cleared calculation/memory, no duplicate | `held AC clears calculation and memory with one cleared announcement even after release click` |
| Stored memory × AC / Escape / Shift+Escape → cleared → MR preserves / resets memory as before | `{AC/Escape/Shift+Escape} announces cleared while retaining its existing memory semantics` |
| Zero → repeated M+ → same stored state; negative grouped decimal → M+ / MR → formatted feedback | `zero stores deduplicate and memory feedback uses formatted signed values` |

Tests first: the initial matrix ran against the original code with **21 failures**
(7 passing static/no-op cases). The concrete accessibility defects were silent
empty clears and memory actions that only changed an indicator or left the display
unchanged. The minimal fix introduces one visually hidden live status rather than
announcing the entire output/history on every render. It announces errors, normal
entry/pending/result text, “Cleared”, “Memory stored: {total}”, “Memory recalled:
{value}”, and “Memory cleared”. Identical consecutive announcement text is never
rewritten; a later transition away and back can announce it again. Ignored memory
adds do not claim success. The existing memory markup contract was updated to
point at this single status. Arithmetic, history, and clear/memory semantics are
unchanged. Screen-reader speech itself is not simulated by the DOM tests.

Validation: `node --test tests/aria.test.js` — **33 pass, 0 fail**;
`node --test` — **388 pass, 0 fail**.

## Backspace entry deletion (#95)

`tests/backspace.test.js` runs the real markup and event handlers in a minimal
DOM under `node --test`. `{path}` expands to `button` and `keyboard`. The
existing ⌫ button is reused (not duplicated), moved immediately after 0, and
Backspace now routes to it instead of DEL. Entry deletion removes the final
character, including decimal points, and drops a leftover lone minus.

| Entry state × action → exit state | Named test |
| --- | --- |
| Fresh / AC / entry-clear / empty pending operator × delete twice → unchanged blank, next digit starts normally | `{path} backspace on {fresh/AC cleared/entry cleared/pending +/pending -/pending */pending ÷} empty entry is a no-op` |
| Grouped integer / decimal / trailing decimal / negative / final signed digit / signed zero / zero / lone sign × delete → shortened entry or blank | `{path} backspace edits {12345/12.50/12./-12/-1/-0/0/-} without display formatting leaking into entry` |
| Fraction × repeated delete → blank → decimal entry | `{path} backspace deletes digit by digit to empty and permits a fresh decimal` |
| Entered right operand × all operators × delete to blank → replace operand → equals | `{path} backspace preserves pending {+/-/*/÷} through right-entry deletion and replacement` |
| Positive / negative / zero / fractional / saved square-root result × delete twice → zero; history/memory preserved, digit starts fresh | `{path} backspace resets {positive/negative/zero/fraction/square root} result to zero rather than truncating` |
| Saved result + pending operator + empty-entry sqrt × delete → zero, pending operator kept → digit/equals | `{path} backspace resets a result without losing an independently pending operation` |
| Result × delete → repeat equals; saved sqrt result × delete/entry-clear → sqrt | `{path} backspace preserves repeated equals and saved square-root result` |
| Recalled memory + pending operation × delete → shortened entry, memory unchanged | `{path} backspace edits recalled memory without changing memory or pending state` |
| Divide-by-zero error with empty entry × delete → unchanged error → digit recovery | `{path} backspace leaves an error with an empty entry unchanged` |
| Ordinary / repeated / Shift keydown → one click, matching focus, prevent default | `Backspace focuses and clicks the backspace button once per keydown, including repeat` |
| Ctrl / Meta / Alt / composition / handled event / editable / input / textarea / select → browser-owned | `Backspace leaves browser shortcuts, editing, composition and handled events alone` |
| Markup → one accessible ⌫ immediately after 0 | `backspace has one labelled button immediately next to zero` |

Tests were written before implementation. Baseline: **359 pass**. The first
runnable new suite exposed the old single-digit-to-zero behavior, result
truncation, keyboard-to-DEL routing, and button placement. The minimal fixes
are confined to `backspace()`, its keyboard mapping, and moving the existing
button; DEL and square-root behavior are unchanged. Results deliberately keep
result mode and saved repeat/sqrt state: deletion resets the display, not the
calculation. No dependencies or browser are needed.

Validation: `node --test tests/backspace.test.js` — **61 pass, 0 fail**;
`node --test` — **420 pass, 0 fail**. Existing keyboard routing/focus assertions
were updated to expect ⌫ rather than DEL.
