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

test('percent divides the current entry by 100', () => {
  const calculator = createCalculator()
  calculator.press('5', '0', '%')
  assert.equal(calculator.current.innerText, '0.5')
  assert.equal(calculator.previous.innerText, '')
})

test('each repeated percent press divides the entry again', () => {
  const calculator = createCalculator()
  calculator.press('5', '0', '%', '%')
  assert.equal(calculator.current.innerText, '0.005')
  calculator.press('%')
  assert.equal(calculator.current.innerText, '0.00005')
})

test('percent leaves an empty entry unchanged', () => {
  const calculator = createCalculator()
  calculator.press('%', '%')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '')
})

test('percent with an empty entry preserves a pending operation', () => {
  const calculator = createCalculator()
  calculator.press('2', '0', '0', '+', '%', '%')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '200 +')
  calculator.press('1', '0', '=')
  assert.equal(calculator.current.innerText, '210')
})

test('percent scales only the current entry while preserving a pending operation', () => {
  const calculator = createCalculator()
  calculator.press('2', '0', '0', '+', '1', '0', '%')
  assert.equal(calculator.current.innerText, '0.1')
  assert.equal(calculator.previous.innerText, '200 +')
  calculator.press('=')
  assert.equal(calculator.current.innerText, '200.1')
  assert.equal(calculator.previous.innerText, '')
})
