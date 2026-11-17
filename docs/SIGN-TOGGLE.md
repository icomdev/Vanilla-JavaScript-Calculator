# Issue #80: sign-toggle implementation pending

## Requested outcome

- Use a `±` button with id `sign-toggle`.
- Bind keyboard `s` to the same button click handler.
- Toggle the current entry, or the last result after equals.
- Keep zero unchanged.
- Cover entry, result, empty-state, and mid-expression behavior with tests.
- Update the README button and keyboard tables.

## Awaiting clarification and acceptance

The latest issue comment asks the writer to answer these questions and explicitly accept implementation:

1. After `12 +`, with no second operand entered, should ± do nothing, begin a negative second operand, or negate the first operand?
2. Should the existing sign control keep its keypad position, or should any buttons move?

Please answer and write **accepted**, **implement**, or **go ahead** before implementation starts.

## Source needed

The supplied file contents do not include `index.html`, `script.js`, or the existing sign and keyboard tests. Their current contents are needed to preserve unrelated behavior when rewriting complete files and to update existing result-sign expectations safely.

## Validation plan

After acceptance and source inspection, make the smallest compatible change, test button/keyboard parity and the agreed mid-expression behavior, and run the complete `node --test` suite. Use a real browser to verify the button and keyboard interaction when the repository environment is available.

No calculator behavior has been changed, and no tests have been run as part of this planning step.
