// Run with: node --test
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

const source = readFileSync(`${__dirname}/../script.js`, 'utf8')

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
    '[data-all-clear]': button('AC'),
    '[data-previous-operand]': previous,
    '[data-current-operand]': current
  }
  runInNewContext(source, {
    document: {
      querySelector: selector => elements[selector],
      querySelectorAll: selector => elements[selector]
    }
  })
  return {
    press(...labels) { labels.forEach(label => buttons.get(label).click()) },
    display: () => current.innerText
  }
}

test('a leading decimal is displayed as 0. and accepts fractional digits', () => {
  const calculator = createCalculator()
  calculator.press('.')
  assert.equal(calculator.display(), '0.')
  calculator.press('5')
  assert.equal(calculator.display(), '0.5')
})

test('duplicate decimals do not alter an entry', () => {
  const calculator = createCalculator()
  calculator.press('.', '.')
  assert.equal(calculator.display(), '0.')
  calculator.press('5', '.', '2', '.')
  assert.equal(calculator.display(), '0.52')
  calculator.press('AC', '1', '2', '.', '.', '3', '.')
  assert.equal(calculator.display(), '12.3')
})

for (const [operation, expected] of [['+', '2.5'], ['-', '1.5'], ['*', '1'], ['÷', '4']]) {
  test(`decimal operands evaluate normally with ${operation} and equals`, () => {
    const calculator = createCalculator()
    calculator.press('2', '.', '.', operation, '.', '.', '5', '=')
    assert.equal(calculator.display(), expected)
  })
}

test('decimal input works after integer and fractional results', () => {
  const calculator = createCalculator()
  calculator.press('1', '+', '1', '=', '.', '.', '5')
  assert.equal(calculator.display(), '2.5')
  calculator.press('+', '1', '=', '.')
  assert.equal(calculator.display(), '3.5')
})

test('chained operations preserve normal evaluation', () => {
  const calculator = createCalculator()
  calculator.press('.', '5', '+', '.', '5', '*', '2', '=')
  assert.equal(calculator.display(), '2')
})

test('deleting a decimal permits re-entry and clear resets the guard', () => {
  const calculator = createCalculator()
  calculator.press('1', '.', 'DEL', '.', '.', '2')
  assert.equal(calculator.display(), '1.2')
  calculator.press('AC', '.')
  assert.equal(calculator.display(), '0.')
  calculator.press('DEL', 'DEL', '.')
  assert.equal(calculator.display(), '0.')
})
