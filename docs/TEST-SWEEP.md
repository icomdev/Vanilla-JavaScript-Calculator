# Edge-case test sweep (#32)

Run `node --test` (Node.js 18+, no dependencies). All sweep tests live in
`tests/calculator.test.js` and exercise the real button click handlers with a
lightweight DOM stub. Names below use `{…}` for generated test-name variants.

| Matrix cell | Test name(s) |
| --- | --- |
| Operator → equals → operator, chaining the result | `operator chain {first} → equals → {next} uses the result` (all 16 pairs of `+`, `-`, `*`, `÷`) |
| Sign toggle mid-entry | `sign toggle mid-entry preserves digits and a trailing decimal` |
| Sign toggle after equals vs a fresh entry | `sign toggle after equals negates the result and preserves repeat equals` |
| Percent after a pending operator combined with sign toggle | `pending {operator} with {% then ± or ± then %} uses the signed percent entry` (all four operators, both orders; also checks empty pending entries) |
| M+ with a pending operator, empty operand | `M+ with an empty pending operand leaves memory and the operation unchanged` |
| M+ with a pending operator, entered operand | `M+ with a pending operator stores only the entry without computing` |
| MR then immediate operator | `MR then immediate operator uses recalled memory instead of the equals result` |
| Divide-by-zero message → number-key recovery | `divide-by-zero recovery via number key clears repeat-equals state` |
| Divide-by-zero message → AC recovery | `divide-by-zero recovery via AC clears repeat-equals state` |
| Repeat-equals alternating with new number entry | `repeat-equals {operator} alternates with fresh number entries` (all four operators) |

Original sweep outcome: **116 tests passed**, including 35 added by the sweep.
Issue #80 subsequently extended sign toggle to negate the displayed result
immediately after equals and updated the corresponding tests. Percent divides only
the current entry by 100 (#26), and repeat-equals applies the remembered
operation to the current display even after a new number is entered (#15).
