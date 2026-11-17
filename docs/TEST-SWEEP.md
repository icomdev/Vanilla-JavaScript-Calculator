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
