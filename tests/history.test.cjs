const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

function setup() {
  const elements = new Map()
  const element = selector => {
    if (!elements.has(selector)) {
      elements.set(selector, {
        innerText: '',
        addEventListener(event, handler) { this[event] = handler }
      })
    }
    return elements.get(selector)
  }
  const context = vm.createContext({
    document: { querySelector: element, querySelectorAll: () => [], addEventListener() {} }
  })
  vm.runInContext(fs.readFileSync('script.js', 'utf8'), context)
  return {
    run: code => vm.runInContext(code, context),
    click: selector => element(selector).click(),
    text: selector => element(selector).innerText
  }
}

test('equals records the expression and C clears history and operands', () => {
  const app = setup()
  app.run("calculator.appendNumber('12'); calculator.chooseOperation('+'); calculator.appendNumber('7')")
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '12+7=19')
  assert.equal(app.text('[data-current-operand]'), '19')
  app.click('[data-all-clear]')
  assert.equal(app.text('[data-history]'), '')
  assert.equal(app.text('[data-current-operand]'), '')
  assert.equal(app.text('[data-previous-operand]'), '')
})

test('each completed equals replaces history; incomplete equals preserves it', () => {
  const app = setup()
  for (const [left, operator, right, result] of [
    ['12', '+', '7', '19'], ['9', '-', '12', '-3'],
    ['2.5', '*', '4', '10'], ['9', '÷', '2', '4.5']
  ]) {
    app.run(`calculator.currentOperand = '${left}'; calculator.chooseOperation('${operator}'); calculator.appendNumber('${right}')`)
    app.click('[data-equals]')
    assert.equal(app.text('[data-history]'), `${left}${operator}${right}=${result}`)
  }
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '9÷2=4.5')
  app.run("calculator.chooseOperation('+')")
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '9÷2=4.5')
})

test('chained operations do not update history until equals', () => {
  const app = setup()
  app.run("calculator.appendNumber('2'); calculator.chooseOperation('+'); calculator.appendNumber('3'); calculator.chooseOperation('*'); calculator.updateDisplay()")
  assert.equal(app.text('[data-history]'), '')
  app.run("calculator.appendNumber('4')")
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '5*4=20')
})
