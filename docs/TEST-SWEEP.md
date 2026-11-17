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

## Percent sign key (#93)

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
