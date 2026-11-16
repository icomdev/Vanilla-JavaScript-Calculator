const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')

const source = readFileSync(`${__dirname}/../script.js`, 'utf8')

// Exercise the actual button listeners and display without browser dependencies.
function setup() {
  const buttons = new Map()
  function button(label) {
    const element = {
      innerText: label,
      addEventListener(event, callback) { this[event] = callback }
    }
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
  const context = vm.createContext({ document: {
    querySelectorAll: selector => selector === '[data-number]' ? numbers : operations,
    querySelector: selector => elements[selector]
  } })
  vm.runInContext(source, context)
  return {
    press(...labels) { labels.forEach(label => buttons.get(label).click()) },
    previous,
    current
  }
}

for (const replacement of ['+', '*', '÷']) {
  test(`a pending + is replaced by ${replacement}`, () => {
    const { press, previous, current } = setup()
    press('1', '+', replacement)
    assert.equal(previous.innerText, `1 ${replacement}`)
    assert.equal(current.innerText, '')
    press('2', '=')
    assert.equal(current.innerText, { '+': '3', '*': '2', '÷': '0.5' }[replacement])
  })
}

for (const operator of ['+', '*', '÷']) {
  test(`leading ${operator} is ignored`, () => {
    const { press, previous, current } = setup()
    press(operator)
    assert.equal(previous.innerText, '')
    assert.equal(current.innerText, '')
    press('2', '=')
    assert.equal(current.innerText, '2')
  })
}

for (const [operator, result] of [['+', '-1'], ['-', '3'], ['*', '-2'], ['÷', '-0.5']]) {
  test(`unary minus after ${operator} starts a negative operand`, () => {
    const { press, previous, current } = setup()
    press('1', operator, '-')
    assert.equal(previous.innerText, `1 ${operator}`)
    assert.equal(current.innerText, '-')
    press('2', '=')
    assert.equal(current.innerText, result)
    assert.equal(previous.innerText, '')
  })
}

test('a leading unary minus supports negative decimals', () => {
  const { press, current } = setup()
  press('-', '.')
  assert.equal(current.innerText, '-.')
  press('5', '*', '2', '=')
  assert.equal(current.innerText, '-1')
})

test('replacing an operator also discards an unfinished unary minus', () => {
  const { press, current, previous } = setup()
  press('1', '+', '-', '*')
  assert.equal(previous.innerText, '1 *')
  assert.equal(current.innerText, '')
  press('2', '=')
  assert.equal(current.innerText, '2')
})

test('repeated minus does not stack signs; equals waits for a number', () => {
  const { press, current, previous } = setup()
  press('1', '+', '-', '-', '=')
  assert.equal(previous.innerText, '1 +')
  assert.equal(current.innerText, '-')
  press('2', '=')
  assert.equal(current.innerText, '-1')
})

test('delete and clear remove an unfinished negative operand', () => {
  const { press, current, previous } = setup()
  press('1', '+', '-', 'DEL', '*', '2', '=')
  assert.equal(current.innerText, '2')
  press('AC', '-', 'AC', '+')
  assert.equal(previous.innerText, '')
  assert.equal(current.innerText, '')
})

test('completed operands still compute when chaining operations', () => {
  const { press, current } = setup()
  press('1', '+', '2', '*', '3', '=')
  assert.equal(current.innerText, '9')
})
