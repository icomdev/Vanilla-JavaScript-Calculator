// Run with: node --test tests/percent.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

const source = readFileSync(`${__dirname}/../script.js`, 'utf8')

// Coverage matrix (kept here because #45 is restricted to this new file):
// Entry state              | Operation        | Named test family
// Integer/fraction/sign/0  | %                | percent divides ...
// Standalone/pending entry | % then %         | repeated percent ...
// Fresh/cleared/deleted    | % then input     | percent leaves ... entry unchanged
// Empty pending operand    | % then operand = | percent preserves empty operand ...
// Entered pending operand  | % then =         | percent preserves pending ...
function createCalculator() {
  const buttons = new Map()
  const current = { innerText: '' }
  const previous = { innerText: '' }
  function button(label) {
    const element = {
      innerText: label,
      addEventListener(event, callback) { this[event] = callback }
    }
    buttons.set(label, element)
    return element
  }
  const elements = {
    '[data-number]': [...'0123456789.'].map(button),
    '[data-operation]': ['+', '-', '*', '÷'].map(button),
    '[data-equals]': button('='),
    '[data-delete]': button('DEL'),
    '[data-backspace]': button('⌫'),
    '[data-percent]': button('%'),
    '[data-sign-toggle]': button('+/-'),
    '[data-memory-add]': button('M+'),
    '[data-memory-recall]': button('MR'),
    '[data-memory-clear]': button('MC'),
    '[data-memory-indicator]': { hidden: true },
    '[data-history]': { innerText: '' },
    '[data-all-clear]': button('AC'),
    '[data-previous-operand]': previous,
    '[data-current-operand]': current
  }
  runInNewContext(source, {
    document: {
      addEventListener() {},
      querySelector: selector => elements[selector],
      querySelectorAll: selector => elements[selector]
    }
  })
  return {
    press(...labels) { labels.forEach(label => buttons.get(label).click()) },
    current,
    previous
  }
}

for (const [entry, expected] of [
  ['50', '0.5'],
  ['12.5', '0.125'],
  ['-25', '-0.25'],
  ['0', '0']
]) {
  test(`percent divides current entry ${entry} by 100`, () => {
    const calculator = createCalculator()
    calculator.press(...entry, '%')
    assert.equal(calculator.current.innerText, expected)
    assert.equal(calculator.previous.innerText, '')
  })
}

for (const pending of [false, true]) {
  test(`repeated percent divides again with ${pending ? 'a pending operation' : 'a standalone entry'}`, () => {
    const calculator = createCalculator()
    if (pending) calculator.press('2', '0', '0', '+')
    calculator.press('5', '0', '%')
    assert.equal(calculator.current.innerText, '0.5')
    calculator.press('%')
    assert.equal(calculator.current.innerText, '0.005')
    assert.equal(calculator.previous.innerText, pending ? '200 +' : '')
    if (pending) {
      calculator.press('=')
      assert.equal(calculator.current.innerText, '200.005')
      assert.equal(calculator.previous.innerText, '')
    }
  })
}

for (const [state, setup] of [
  ['fresh', []],
  ['cleared', ['2', '+', '3', '=', 'AC']],
  ['deleted', ['7', 'DEL']]
]) {
  test(`percent leaves ${state} empty entry unchanged`, () => {
    const calculator = createCalculator()
    calculator.press(...setup, '%', '%')
    assert.equal(calculator.current.innerText, '')
    assert.equal(calculator.previous.innerText, '')
    calculator.press('4', '+', '2', '=')
    assert.equal(calculator.current.innerText, '6')
  })
}

for (const [operator, percentResult, normalResult] of [
  ['+', '200.1', '210'],
  ['-', '199.9', '190'],
  ['*', '20', '2,000'],
  ['÷', '2,000', '20']
]) {
  test(`percent preserves empty operand and pending ${operator}`, () => {
    const calculator = createCalculator()
    calculator.press('2', '0', '0', operator, '%', '%')
    assert.equal(calculator.current.innerText, '')
    assert.equal(calculator.previous.innerText, `200 ${operator}`)
    calculator.press('1', '0', '=')
    assert.equal(calculator.current.innerText, normalResult)
    assert.equal(calculator.previous.innerText, '')
  })

  test(`percent preserves pending ${operator} while scaling only the current entry`, () => {
    const calculator = createCalculator()
    calculator.press('2', '0', '0', operator, '1', '0', '%')
    assert.equal(calculator.current.innerText, '0.1')
    assert.equal(calculator.previous.innerText, `200 ${operator}`)
    calculator.press('=')
    assert.equal(calculator.current.innerText, percentResult)
    assert.equal(calculator.previous.innerText, '')
  })
}
