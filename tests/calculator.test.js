const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

const source = readFileSync(`${__dirname}/../script.js`, 'utf8')

// Exercise the real click handlers without adding browser dependencies.
function createCalculator() {
  const elements = new Map()
  function button(label) {
    return {
      innerText: label,
      addEventListener(event, handler) { this[event] = handler }
    }
  }
  const numbers = [...'0123456789.'].map(button)
  const operations = ['+', '-', '*', '÷'].map(button)
  const document = {
    querySelectorAll(selector) {
      return selector === '[data-number]' ? numbers : operations
    },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, button(''))
      return elements.get(selector)
    }
  }
  runInNewContext(source, { document })
  return {
    press(...keys) {
      for (const key of keys) {
        const control = {
          '=': '[data-equals]', AC: '[data-all-clear]', DEL: '[data-delete]'
        }[key]
        const target = control ? elements.get(control) :
          [...numbers, ...operations].find(element => element.innerText === key)
        assert.ok(target, `Unknown key: ${key}`)
        target.click()
      }
    },
    display() { return elements.get('[data-current-operand]').innerText },
    previous() { return elements.get('[data-previous-operand]').innerText }
  }
}

for (const [operator, first, second, third] of [
  ['+', '8', '11', '14'],
  ['-', '2', '-1', '-4'],
  ['*', '15', '45', '135'],
  ['÷', '1.6666666666666667', '0.5555555555555556', '0.1851851851851852']
]) {
  test(`equals repeatedly applies ${operator} with the original right operand`, () => {
    const calculator = createCalculator()
    calculator.press('5', operator, '3', '=')
    assert.equal(calculator.display(), first)
    assert.equal(calculator.previous(), '')
    calculator.press('=')
    assert.equal(calculator.display(), second)
    calculator.press('=')
    assert.equal(calculator.display(), third)
  })
}

test('AC clears the remembered operation and operand', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '=', 'AC', '=')
  assert.equal(calculator.display(), '')
  calculator.press('2', '=')
  assert.equal(calculator.display(), '2')
})

test('equals without a completed operation is a no-op', () => {
  const calculator = createCalculator()
  calculator.press('=')
  assert.equal(calculator.display(), '')
  calculator.press('5', '=')
  assert.equal(calculator.display(), '5')
  calculator.press('+', '=')
  assert.equal(calculator.display(), '')
  assert.equal(calculator.previous(), '5 +')
})

test('a new calculation replaces the remembered operation', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '=', '*', '2', '=', '=')
  assert.equal(calculator.display(), '32')
})

test('an incomplete new operation does not replay the previous operation', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '=', '*', '=')
  assert.equal(calculator.display(), '')
  assert.equal(calculator.previous(), '8 *')
  calculator.press('2', '=', '=')
  assert.equal(calculator.display(), '32')
})

test('chained operations remember the final operator and decimal operand', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '*', '2', '.', '5', '=', '=')
  assert.equal(calculator.display(), '50')
})

test('zero is remembered as a valid right operand', () => {
  const calculator = createCalculator()
  calculator.press('5', '*', '0', '=', '=')
  assert.equal(calculator.display(), '0')
})

test('replay uses the current display value after editing', () => {
  const calculator = createCalculator()
  calculator.press('9', '+', '3', '=', 'DEL', '=')
  assert.equal(calculator.display(), '4')
})
