// Run with: node --test tests/chains.test.js
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
    '[data-sqrt]': button('√'),
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
test('mixed operators evaluate sequentially rather than using precedence', () => {
  const calculator = createCalculator()
  calculator.press('2', '+', '3', '*')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '5 *')
  calculator.press('4', '=')
  assert.equal(calculator.current.innerText, '20')
  assert.equal(calculator.previous.innerText, '')
})

test('a long chain carries each subtotal through all four operators', () => {
  const calculator = createCalculator()
  calculator.press('2', '+')
  for (const [operand, next, subtotal] of [
    ['3', '*', '5'],
    ['4', '-', '20'],
    ['8', '÷', '12'],
    ['3', '+', '4'],
    ['6', '*', '10']
  ]) {
    calculator.press(operand, next)
    assert.equal(calculator.current.innerText, '')
    assert.equal(calculator.previous.innerText, `${subtotal} ${next}`)
  }
  calculator.press('2', '=')
  assert.equal(calculator.current.innerText, '20')
  assert.equal(calculator.previous.innerText, '')
})

for (const [operator, operand, results] of [
  ['+', '4', ['24', '28', '32']],
  ['-', '4', ['16', '12', '8']],
  ['*', '2', ['40', '80', '160']],
  ['÷', '2', ['10', '5', '2.5']]
]) {
  test(`repeated equals after a chain re-applies only the final ${operator} ${operand}`, () => {
    const calculator = createCalculator()
    calculator.press('2', '+', '3', '*', '4', operator, operand)
    for (const result of results) {
      calculator.press('=')
      assert.equal(calculator.current.innerText, result)
      assert.equal(calculator.previous.innerText, '')
    }
  })
}

test('switching a pending operator mid-chain preserves the accumulated subtotal', () => {
  const calculator = createCalculator()
  calculator.press('2', '+', '3', '*', '÷', '+', '*')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '5 *')
  calculator.press('4', '=')
  assert.equal(calculator.current.innerText, '20')
  calculator.press('=')
  assert.equal(calculator.current.innerText, '80')
})

test('an operator after an entered operand computes before queuing the next operator', () => {
  const calculator = createCalculator()
  calculator.press('2', '+', '3', '*', '1', '2')
  assert.equal(calculator.current.innerText, '12')
  assert.equal(calculator.previous.innerText, '5 *')
  calculator.press('+')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '60 +')
  calculator.press('4', '=')
  assert.equal(calculator.current.innerText, '64')
  assert.equal(calculator.previous.innerText, '')
})

test('a binary operator replaces an unfinished negative operand mid-chain', () => {
  const calculator = createCalculator()
  calculator.press('2', '+', '3', '*', '-')
  assert.equal(calculator.current.innerText, '-')
  assert.equal(calculator.previous.innerText, '5 *')
  calculator.press('÷')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '5 ÷')
  calculator.press('2', '=')
  assert.equal(calculator.current.innerText, '2.5')
})

for (const trigger of ['+', '=']) {
  test(`division by zero mid-chain triggered by ${trigger} clears pending and replay state`, () => {
    const calculator = createCalculator()
    calculator.press('8', '+', '2', '=', '*', '3', '÷', '0', trigger)
    assert.equal(calculator.current.innerText, 'Cannot divide by zero')
    assert.equal(calculator.previous.innerText, '')
    calculator.press('4', '=')
    assert.equal(calculator.current.innerText, '4')
    assert.equal(calculator.previous.innerText, '')
    calculator.press('+', '2', '*', '3', '=')
    assert.equal(calculator.current.innerText, '18')
    calculator.press('=')
    assert.equal(calculator.current.innerText, '54')
  })
}

for (const [operator, result] of [
  ['+', '190'], ['-', '210'], ['*', '-2,000'], ['÷', '-20']
]) {
  test(`percent mid-chain changes only the right entry of 200 ${operator} 10`, () => {
    const calculator = createCalculator()
    calculator.press('2', '0', '0', operator, '1', '0', '%')
    assert.equal(calculator.current.innerText, '-10')
    assert.equal(calculator.previous.innerText, `200 ${operator}`)
    calculator.press('=')
    assert.equal(calculator.current.innerText, result)
    assert.equal(calculator.previous.innerText, '')
  })
}

test('sqrt ignores a toggled-negative right entry without losing the pending chain', () => {
  const calculator = createCalculator()
  calculator.press('8', '+', '8', '+', '9', '%')
  assert.equal(calculator.current.innerText, '-9')
  assert.equal(calculator.previous.innerText, '16 +')
  calculator.press('√')
  assert.equal(calculator.current.innerText, '-9')
  assert.equal(calculator.previous.innerText, '16 +')
  calculator.press('%', '√')
  assert.equal(calculator.current.innerText, '3')
  assert.equal(calculator.previous.innerText, '16 +')
  calculator.press('=')
  assert.equal(calculator.current.innerText, '19')
  assert.equal(calculator.previous.innerText, '')
})

test('sqrt ignores a toggled-negative chain result and preserves repeated equals', () => {
  const calculator = createCalculator()
  calculator.press('1', '+', '1', '+', '7', '=', '%')
  assert.equal(calculator.current.innerText, '-9')
  assert.equal(calculator.previous.innerText, '')
  calculator.press('√')
  assert.equal(calculator.current.innerText, '-9')
  assert.equal(calculator.previous.innerText, '')
  calculator.press('=')
  assert.equal(calculator.current.innerText, '-2')
  assert.equal(calculator.previous.innerText, '')
})

for (const [operator, result] of [
  ['+', '2'], ['-', '6'], ['*', '-8'], ['÷', '-2']
]) {
  test(`sqrt chain result then ${operator} then percent uses the root as the left operand`, () => {
    const calculator = createCalculator()
    calculator.press('2', '+', '2', '*', '4', '=', '√')
    assert.equal(calculator.current.innerText, '4')
    assert.equal(calculator.previous.innerText, '')
    calculator.press(operator)
    assert.equal(calculator.current.innerText, '')
    assert.equal(calculator.previous.innerText, `4 ${operator}`)
    calculator.press('2', '%')
    assert.equal(calculator.current.innerText, '-2')
    assert.equal(calculator.previous.innerText, `4 ${operator}`)
    calculator.press('=')
    assert.equal(calculator.current.innerText, result)
    assert.equal(calculator.previous.innerText, '')
  })
}

for (const [operator, operand, result, toggled, repeats] of [
  ['+', '4', '24', '-24', ['-20', '-16']],
  ['-', '4', '16', '-16', ['-20', '-24']],
  ['*', '2', '40', '-40', ['-80', '-160']],
  ['÷', '2', '10', '-10', ['-5', '-2.5']]
]) {
  test(`repeated equals after percent toggles a chain result preserves final ${operator} ${operand}`, () => {
    const calculator = createCalculator()
    calculator.press('2', '+', '3', '*', '4', operator, operand, '=')
    assert.equal(calculator.current.innerText, result)
    assert.equal(calculator.previous.innerText, '')
    calculator.press('%')
    assert.equal(calculator.current.innerText, toggled)
    assert.equal(calculator.previous.innerText, '')
    for (const expected of repeats) {
      calculator.press('=')
      assert.equal(calculator.current.innerText, expected)
      assert.equal(calculator.previous.innerText, '')
    }
  })
}

// Sweep matrix, following docs/TEST-SWEEP.md, kept here for new-file-only scope.
// | State transition | Test name |
// | --- | --- |
// | Entered operand -> immediate subtotal | mixed operators evaluate sequentially rather than using precedence |
// | Subtotal -> all four operators -> result | a long chain carries each subtotal through all four operators |
// | Chain result -> repeat final operation | repeated equals after a chain re-applies only the final {operator} {operand} |
// | Empty pending entry -> operator replacement | switching a pending operator mid-chain preserves the accumulated subtotal |
// | Multi-digit entry -> computed subtotal | an operator after an entered operand computes before queuing the next operator |
// | Bare minus -> replacement operator | a binary operator replaces an unfinished negative operand mid-chain |
// | Zero divisor -> error -> fresh entry | division by zero mid-chain triggered by {trigger} clears pending and replay state |

// Sign-toggle / sqrt interaction sweep (#98). Kept inline for this file-only scope.
// | Matrix cell | Test name(s) |
// | --- | --- |
// | Pending {+/-/*/÷} + right entry -> % -> signed result | percent mid-chain changes only the right entry of 200 {operator} 10 |
// | Subtotal + toggled-negative entry -> sqrt no-op -> toggle -> sqrt -> equals | sqrt ignores a toggled-negative right entry without losing the pending chain |
// | Toggled-negative chain result -> sqrt no-op -> repeat equals | sqrt ignores a toggled-negative chain result and preserves repeated equals |
// | Chain result -> sqrt -> {+/-/*/÷} -> right entry -> % -> equals | sqrt chain result then {operator} then percent uses the root as the left operand |
// | Chain result -> % -> repeated equals with final {+/-/*/÷} | repeated equals after percent toggles a chain result preserves final {operator} {operand} |
