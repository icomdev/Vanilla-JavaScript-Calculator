# Edge-case test sweeps

## Original sweep (#32)

Run `node --test` (Node.js 18+, no dependencies). All sweep tests live in
`tests/calculator.test.js` and exercise the real button click handlers with a
lightweight DOM stub. Names below use `{…}` for generated test-name variants.

| Matrix cell | Test name(s) |
| --- | --- |
| Operator → equals → operator, chaining the result | `operator chain {first} → equals → {next} uses the result` (all 16 pairs of `+`, `-`, `*`, `÷`) |
| Sign toggle mid-entry | `sign toggle mid-entry preserves digits and a trailing decimal` |
| Sign toggle after equals vs a fresh entry | `sign toggle after equals edits the result and digits still start fresh` (updated for #80) |
| Percent after a pending operator combined with sign toggle | `pending {operator} with {% then ± or ± then %} uses the signed percent entry` (all four operators, both orders; also checks empty pending entries) |
| M+ with a pending operator, empty operand | `M+ with an empty pending operand leaves memory and the operation unchanged` |
| M+ with a pending operator, entered operand | `M+ with a pending operator stores only the entry without computing` |
| MR then immediate operator | `MR then immediate operator uses recalled memory instead of the equals result` |
| Divide-by-zero message → number-key recovery | `divide-by-zero recovery via number key clears repeat-equals state` |
| Divide-by-zero message → AC recovery | `divide-by-zero recovery via AC clears repeat-equals state` |
| Repeat-equals alternating with new number entry | `repeat-equals {operator} alternates with fresh number entries` (all four operators) |

Outcome: **116 tests pass**, including 35 added by this sweep. No production
bugs were uncovered, so no calculator behavior was changed. At the time of this
sweep, sign toggle was inactive immediately after equals (superseded by #80
below). Percent divides only
the current entry by 100 (#26), and repeat-equals applies the remembered
operation to the current display even after a new number is entered (#15).

## Sign-toggle state transitions (#80)

The existing sign-toggle button is now `±` with id `sign-toggle`, and lowercase
`s` dispatches its click handler. A result stays in result mode when negated:
the next digit starts fresh, a decimal extends it, and repeated equals uses the
negated display with the remembered operator/right operand. Empty entries stay
empty (the calculator's existing representation of no input); typed/computed
zero stays zero. Negating does not select an operator or alter history/memory.

Names use `{…}` for parameterized variants. Run `node --test` with no dependencies.

| Entry state × operation → exit state | Test name(s) | File |
| --- | --- | --- |
| Positive/negative entry × ± twice → opposite/original sign, digits preserved | `sign toggle round-trips {entry} without changing its digits` | `tests/sign.test.js` |
| Typed zero (integer/decimal/signed) × ± → unchanged | `sign toggle leaves zero entry {entry} unchanged` | `tests/sign.test.js` |
| Fresh/cleared/empty pending × ± → empty, next digits unsigned | `sign toggle on {state} is a no-op before new digits` | `tests/sign.test.js` |
| Unfinished unary minus × ± → unchanged, digits can complete it | `sign toggle preserves an unfinished unary minus` | `tests/sign.test.js` |
| Pending +, -, *, ÷ × right-entry ± → only right operand negated | `sign toggle edits only the right operand of {operation}` | `tests/sign.test.js` |
| Positive/negative/zero result × ± → opposite sign/zero; repeat equals retains right operand/history | `sign toggle edits {kind} results while preserving history and repeat equals` | `tests/sign.test.js` |
| Result × ± then digit → fresh entry | `sign toggle after equals edits the result and digits still start fresh` | `tests/calculator.test.js` |
| Result × ± then decimal → signed result extended | `decimal entry extends a sign-toggled result` | `tests/sign.test.js` |
| Result × ± then +, -, *, ÷ → negated left operand | `sign-toggled result feeds the next {operation} operation` | `tests/sign.test.js` |
| Recalled positive/negative/zero × ± → entry changed, stored memory unchanged | `sign toggle on recalled {kind} memory preserves stored memory` | `tests/sign.test.js` |
| Pending × recall then ± → signed right operand | `sign toggle on recalled memory preserves a pending operation` | `tests/sign.test.js` |
| Result × recall then ± → recalled entry negated, memory unchanged | `sign toggle after result and memory recall edits only the recalled entry` | `tests/sign.test.js` |
| Pending operator × percent and ± in both orders → signed percentage | `pending {operator} with {% then ± or ± then %} uses the signed percent entry` | `tests/calculator.test.js` |
| Positive/negative entry, last result, empty, zero, empty pending, mid-expression, error × button/keyboard → identical display/pending state | `sign toggle via {button or keyboard} in {state}` (16 cells; keyboard also checks focus and default prevention) | `test/keyboard.test.js` |
| Button markup → unique requested id, visible ±, existing handler selector | `sign toggle button has the requested id and visible symbol` | `test/keyboard.test.js` |
| Ctrl/Command/Alt+s → ignored browser shortcut | `unrelated keys and browser shortcuts do not change state or prevent defaults` | `test/keyboard.test.js` |

Regression evidence: after updating the markup and tests, **15 tests failed**
against the old logic (missing `s` binding and result-mode sign-toggle guard).
Removing only that guard and adding the keyboard alias makes the suite pass.
This deliberately supersedes the older tests requiring sign toggle to be
inactive after equals; no other calculation semantics are changed.

Outcome: **297 tests pass, 0 failures** (21 new tests, plus updated regression
expectations). No dependencies or browser required.
