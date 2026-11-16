# Calculator memory

The calculator keeps one numeric memory total, initially `0`, separate from the
current entry and pending calculation. These controls follow
[`script.js`](../script.js).

## Memory controls

| Control | Behavior |
| --- | --- |
| **M+** (Add to memory) | Adds the numeric value of the current entry to the stored total. After `=`, it adds the displayed result. It does not evaluate a pending calculation or change the entry. Repeated presses add the same value again; negative values reduce the total. |
| **MR** (Recall memory) | Replaces the current entry with the stored total; it does not append digits or clear memory. With no error active, a pending operation is preserved, so the recalled value can be used as its next operand. If an error is showing, recall clears the calculation/error first. Recalling empty memory enters `0`. |
| **MC** (Clear memory) | Sets the stored total to `0`, without changing the current entry or pending calculation. |

M+ reads the underlying entry with `parseFloat`, not the display's formatted text
(for example, `1,234.5` represents the number `1234.5`). Empty entries, a lone
minus sign, and non-finite values are ignored. An addition that would make the
memory total non-finite is also ignored, leaving the previous total intact.

## The M indicator

The display shows **M** whenever the memory total is non-zero, including negative
totals. It is hidden when the total is `0`, whether memory was cleared, only zero
was added, or positive and negative additions canceled each other out.

## Clearing and resetting

- A normal **AC** click clears the calculation but **keeps memory**.
- **Escape** clears the current entry but **keeps memory** and any pending
  operation.
- **MC** clears memory only.
- **Shift+Escape** performs a full reset: both the calculation and memory are
  cleared.
- Holding **AC** for **700 ms** also performs a full reset, including memory.

Memory belongs to the running calculator instance; it is not saved across a page
reload.

## Try it

1. Enter `12`, then press **M+**: memory is `12` and **M** appears.
2. Press **AC**, enter `3`, then press **M+**: memory is now `15`.
3. Press **AC**, enter `10 + 99`, then press **MR**: the current entry becomes
   `15`, replacing `99`. Press `=` to get `25`.
4. Press **MC**: the displayed result stays `25`, but **M** disappears. **MR** now
   enters `0`.
