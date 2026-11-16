const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

// Exercise the real button listeners without a browser or external dependencies.
function createCalculator() {
  const buttons = new Map()
  function button(label) {
    const element = { innerText: label, addEventListener: (_, listener) => {
      element.click = listener
    } }
    buttons.set(label, element)
    return element
  }
  const numbers = '0123456789.'.split('').map(button)
  const operations = ['+', '-', '*', '÷'].map(button)
  const previous = { innerText: '' }
  const current = { innerText: '' }
  const elements = {
    '[data-equals]': button('='),
    '[data-delete]': button('DEL'),
    '[data-all-clear]': button('AC'),
    '[data-previous-operand]': previous,
    '[data-current-operand]': current
  }
  runInNewContext(readFileSync(join(__dirname, '../script.js'), 'utf8'), {
    document: {
      querySelectorAll: selector => selector === '[data-number]' ? numbers : operations,
      querySelector: selector => elements[selector]
    }
  })
  return {
    press: (...labels) => labels.forEach(label => buttons.get(label).click()),
    previous,
    current
  }
}

test('a second binary operator replaces the pending operator', () => {
  for (const first of ['+', '-', '*', '÷']) {
    for (const replacement of ['+', '*', '÷']) {
      const calculator = createCalculator()
      calculator.press('1', first, replacement)
      assert.equal(calculator.previous.innerText, `1 ${replacement}`)
      calculator.press('2', '=')
      assert.equal(calculator.current.innerText,
        replacement === '+' ? '3' : replacement === '*' ? '2' : '0.5')
    }
  }
})

test('repeated plus does not stack', () => {
  const calculator = createCalculator()
  calculator.press('1', '2', '+', '+')
  assert.equal(calculator.previous.innerText, '12 +')
  calculator.press('2', '=')
  assert.equal(calculator.current.innerText, '14')
})

test('leading binary operators are ignored on a fresh or cleared calculator', () => {
  const calculator = createCalculator()
  for (const operator of ['+', '*', '÷']) {
    calculator.press(operator)
    assert.equal(calculator.current.innerText, '')
    assert.equal(calculator.previous.innerText, '')
  }
  calculator.press('2', '+', '3', '=', 'AC', '+')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '')
  calculator.press('2', '=')
  assert.equal(calculator.current.innerText, '2')
})

test('unary minus works after each operator', () => {
  for (const [operator, result] of [['+', '1'], ['-', '5'], ['*', '-6'], ['÷', '-1.5']]) {
    const calculator = createCalculator()
    calculator.press('3', operator, '-')
    assert.equal(calculator.current.innerText, '-')
    assert.equal(calculator.previous.innerText, `3 ${operator}`)
    calculator.press('2', '=')
    assert.equal(calculator.current.innerText, result)
  }
})

test('unary minus works at the start and with decimals', () => {
  const calculator = createCalculator()
  calculator.press('-', '2', '.', '5', '*', '-', '2', '=')
  assert.equal(calculator.current.innerText, '5')
})

test('a binary operator can replace a pending operator and unfinished sign', () => {
  const calculator = createCalculator()
  calculator.press('1', '+', '-', '*', '2', '=')
  assert.equal(calculator.current.innerText, '2')
})

test('deleting a unary sign leaves the pending operation editable', () => {
  const calculator = createCalculator()
  calculator.press('3', '+', '-', 'DEL', '*', '2', '=')
  assert.equal(calculator.current.innerText, '6')
})

test('ordinary chained calculations still work', () => {
  const calculator = createCalculator()
  calculator.press('2', '+', '3', '*', '4', '=')
  assert.equal(calculator.current.innerText, '20')
})

test('a leading unary minus remains visible before decimal digits', () => {
  const calculator = createCalculator()
  calculator.press('-', '.')
  assert.equal(calculator.current.innerText, '-.')
  calculator.press('5', '*', '2', '=')
  assert.equal(calculator.current.innerText, '-1')
})

test('repeated minus does not stack signs; equals waits for a number', () => {
  const calculator = createCalculator()
  calculator.press('1', '+', '-', '-', '=')
  assert.equal(calculator.previous.innerText, '1 +')
  assert.equal(calculator.current.innerText, '-')
  calculator.press('2', '=')
  assert.equal(calculator.current.innerText, '-1')
})
