const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const path = require('node:path')

// Exercise the real event handlers with elements from the calculator markup.
function setup() {
  const html = readFileSync(path.join(__dirname, '../index.html'), 'utf8')
  const elements = [...html.matchAll(/<(?:div|button|span)\b([^>]*\bdata-[^>]*)>([^<]*)/g)]
    .map(([, attributes, text]) => ({
      attributes,
      innerText: text,
      addEventListener(event, handler) { this[event] = handler }
    }))
  const select = selector => elements.filter(element => element.attributes.includes(selector.slice(1, -1)))
  vm.runInNewContext(readFileSync(path.join(__dirname, '../script.js'), 'utf8'), {
    document: {
      querySelector: selector => select(selector)[0],
      querySelectorAll: select,
      addEventListener() {}
    }
  })
  return {
    press(...labels) {
      for (const label of labels) {
        const button = elements.find(element => element.innerText === label && element.click)
        assert.ok(button, `Button ${label} exists`)
        button.click()
      }
    },
    text: selector => select(selector)[0].innerText
  }
}

test('equals shows the completed expression above the result and replaces it on the next equals', () => {
  const { press, text } = setup()
  press('1', '2', '+', '7', '=')
  assert.equal(text('[data-history]'), '12+7=19')
  assert.equal(text('[data-current-operand]'), '19')
  press('*', '2', '=')
  assert.equal(text('[data-history]'), '19*2=38')
  assert.equal(text('[data-current-operand]'), '38')
})

test('history survives editing and intermediate chained calculations', () => {
  const { press, text } = setup()
  press('8', '-', '3', '=')
  press('+', '2', 'DEL', '3', '*')
  assert.equal(text('[data-history]'), '8-3=5')
  press('2', '=')
  assert.equal(text('[data-history]'), '8*2=16')
})

test('all-clear resets history and both operands', () => {
  const { press, text } = setup()
  press('1', '+', '2', '=', 'C')
  for (const selector of ['[data-history]', '[data-current-operand]', '[data-previous-operand]']) {
    assert.equal(text(selector), '')
  }
  press('4', '÷', '2', '=')
  assert.equal(text('[data-history]'), '4÷2=2')
})

test('incomplete or repeated equals does not overwrite the last completed expression', () => {
  const { press, text } = setup()
  press('=')
  assert.equal(text('[data-history]'), '')
  press('1', '.', '5', '+', '.', '5', '=')
  assert.equal(text('[data-history]'), '1.5+.5=2')
  press('=', '+', '=')
  assert.equal(text('[data-history]'), '1.5+.5=2')
})
