# Edge-case test sweep (#32)

Run `node --test` from the repository root (no dependencies). All sweep tests
live in `tests/calculator.test.js` and exercise the real button click handlers
using the existing lightweight DOM harness. `{operator}` ranges over `+`, `-`,
`*`, and `÷`; parameterized names below expand to individual tests.

| Matrix cell | Test name(s) |
| --- | --- |
| Operator → equals → operator, chaining the result | `sweep: result chaining {first} then {next}` (all 16 operator pairs; also checks subsequent repeat-equals) |
| Sign toggle mid-entry | `sweep: sign toggle mid-entry preserves digits and pending operator` |
| Sign toggle after equals | `sweep: sign toggle after equals waits for a new entry` |
| Percent with a pending operator combined with sign toggle | `sweep: pending {operator} with sign then percent`; `sweep: pending {operator} with percent then sign` |
| M+ with a pending operator | `sweep: M+ with an empty pending operand leaves memory and operation intact`; `sweep: M+ stores the pending right operand without computing it` |
| MR then immediate operator | `sweep: M+ stores the pending right operand without computing it`; `sweep: MR then immediate operator completes a pending calculation` |
| Divide-by-zero message → number-key recovery | `sweep: divide-by-zero recovery via number discards replay state` |
| Divide-by-zero message → AC recovery | `sweep: divide-by-zero recovery via AC discards replay state` |
| Repeat-equals alternating with new number entry | `sweep: repeat {operator} equals alternates with fresh number entry` |

## Outcome

116 tests pass, including 35 new sweep cases. No genuine bugs were uncovered;
production behavior is unchanged. The assertions preserve the existing contracts:
`+/-` is inactive immediately after equals, percent divides only the current
entry by 100 (so `200 + 10 %` adds `0.1`, not `20`), and repeat-equals applies
the remembered operation to the displayed value even after fresh digit entry.
