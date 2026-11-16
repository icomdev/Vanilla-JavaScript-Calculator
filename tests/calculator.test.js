const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')

// Exercise the real click handlers with lightweight DOM elements.
function createCalculator() {
  const elements = new Map()
  const buttons = new Map()
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const button = {
      innerText: text,
      addEventListener(event, handler) { this[event] = handler }
    }
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    elements.get(selector).push(button)
    buttons.set(text, button)
  }
  const previous = { innerText: '' }
  const current = { innerText: '' }
  elements.set('[data-memory-indicator]', [{ hidden: true }])
  elements.set('[data-previous-operand]', [previous])
  elements.set('[data-current-operand]', [current])
  vm.runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), {
    document: {
      querySelectorAll: selector => elements.get(selector),
      querySelector: selector => elements.get(selector)[0]
    }
  })
  return {
    current,
    previous,
    press(...keys) { keys.forEach(key => buttons.get(key).click()) }
  }
}

const message = 'Cannot divide by zero'

test('division by zero displays a clear message and clears pending operation', () => {
  const calculator = createCalculator()
  calculator.press('1', '÷', '0', '=')
  assert.equal(calculator.current.innerText, message)
  assert.equal(calculator.previous.innerText, '')
})

for (const digit of '0123456789') {
  test(`digit ${digit} starts fresh after division by zero`, () => {
    const calculator = createCalculator()
    calculator.press('1', '÷', '0', '=', digit)
    assert.equal(calculator.current.innerText, digit)
    calculator.press('+', '2', '=')
    assert.equal(calculator.current.innerText, String(Number(digit) + 2))
  })
}

for (const zero of [['0'], ['0', '.', '0']]) {
  test(`zero divided by ${zero.join('')} also shows the message`, () => {
    const calculator = createCalculator()
    calculator.press('0', '÷', ...zero, '=')
    assert.equal(calculator.current.innerText, message)
  })
}

test('chained operation preserves the error instead of queuing an operation', () => {
  const calculator = createCalculator()
  calculator.press('1', '÷', '0', '+')
  assert.equal(calculator.current.innerText, message)
  assert.equal(calculator.previous.innerText, '')
  calculator.press('3', '+', '2', '=')
  assert.equal(calculator.current.innerText, '5')
})

for (const key of ['AC', 'DEL', '=', '+', '-', '*', '÷']) {
  test(`${key} clears the error and leaves a fresh entry`, () => {
    const calculator = createCalculator()
    calculator.press('1', '÷', '0', '=', key)
    assert.equal(calculator.current.innerText, '')
    assert.equal(calculator.previous.innerText, '')
    calculator.press('4')
    assert.equal(calculator.current.innerText, '4')
  })
}

test('decimal starts a fresh fractional entry after the error', () => {
  const calculator = createCalculator()
  calculator.press('1', '÷', '0', '=', '.', '5')
  // PR20 integration: leading '.' renders as 0. — value still a fresh 0.5 entry
  assert.equal(calculator.current.innerText, '0.5')
})

test('normal arithmetic and chained operations still work', () => {
  const calculator = createCalculator()
  calculator.press('8', '÷', '2', '+', '3', '*', '2', '-', '4', '=')
  assert.equal(calculator.current.innerText, '10')
  calculator.press('AC', '1', '.', '5', '÷', '0', '.', '5', '=')
  assert.equal(calculator.current.innerText, '3')
})

for (const [operator, first, second, third] of [
  ['+', '8', '11', '14'],
  ['-', '2', '-1', '-4'],
  ['*', '15', '45', '135'],
  ['÷', '1.6666666666666667', '0.5555555555555556', '0.1851851851851852']
]) {
  test(`equals repeatedly applies ${operator} with the original right operand`, () => {
    const calculator = createCalculator()
    calculator.press('5', operator, '3', '=')
    assert.equal(calculator.current.innerText, first)
    assert.equal(calculator.previous.innerText, '')
    calculator.press('=')
    assert.equal(calculator.current.innerText, second)
    calculator.press('=')
    assert.equal(calculator.current.innerText, third)
  })
}

test('AC clears the remembered operation and operand', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '=', 'AC', '=')
  assert.equal(calculator.current.innerText, '')
  calculator.press('2', '=')
  assert.equal(calculator.current.innerText, '2')
})

test('equals without a completed operation is a no-op', () => {
  const calculator = createCalculator()
  calculator.press('=')
  assert.equal(calculator.current.innerText, '')
  calculator.press('5', '=')
  assert.equal(calculator.current.innerText, '5')
  calculator.press('+', '=')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '5 +')
})

test('a new calculation replaces the remembered operation', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '=', '*', '2', '=', '=')
  assert.equal(calculator.current.innerText, '32')
})

test('an incomplete new operation does not replay the previous operation', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '=', '*', '=')
  assert.equal(calculator.current.innerText, '')
  assert.equal(calculator.previous.innerText, '8 *')
  calculator.press('2', '=', '=')
  assert.equal(calculator.current.innerText, '32')
})

test('chained operations remember the final operator and decimal operand', () => {
  const calculator = createCalculator()
  calculator.press('5', '+', '3', '*', '2', '.', '5', '=', '=')
  assert.equal(calculator.current.innerText, '50')
})

test('zero is remembered as a valid right operand', () => {
  const calculator = createCalculator()
  calculator.press('5', '*', '0', '=', '=')
  assert.equal(calculator.current.innerText, '0')
})

test('replay uses the current display value after editing', () => {
  const calculator = createCalculator()
  calculator.press('9', '+', '3', '=', 'DEL', '=')
  assert.equal(calculator.current.innerText, '4')
})
