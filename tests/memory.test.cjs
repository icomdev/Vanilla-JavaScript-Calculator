const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

// Exercise the real event handlers with lightweight DOM elements from index.html.
function setup() {
  const html = readFileSync(path.join(__dirname, '../index.html'), 'utf8')
  const elements = [...html.matchAll(/<(button|div|span)\b([^>]*)>([^<]*)/g)].map(([, tagName, attributes, text]) => ({
    tagName,
    attributes,
    innerText: text.trim(),
    hidden: /\bhidden\b/.test(attributes),
    getAttribute(name) {
      const match = this.attributes.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))
      return match ? match[1] : null
    },
    addEventListener(event, handler) { this[event] = handler }
  }))
  const document = {
  addEventListener() {},
    querySelectorAll(selector) {
      return elements.filter(element => element.attributes.includes(selector.slice(1, -1)))
    },
    querySelector(selector) {
      const element = this.querySelectorAll(selector)[0]
      assert.ok(element, `Missing element: ${selector}`)
      return element
    }
  }
  vm.runInNewContext(readFileSync(path.join(__dirname, '../script.js'), 'utf8'), { document })
  return {
    elements,
    click(attribute) { document.querySelector(`[data-${attribute}]`).click() },
    type(value) {
      for (const digit of value) {
        const button = document.querySelectorAll('[data-number]').find(element => element.innerText === digit)
        button.click()
      }
    },
    operation(value) {
      document.querySelectorAll('[data-operation]').find(element => element.innerText === value).click()
    },
    display() { return document.querySelector('[data-current-operand]').innerText },
    memoryHidden() { return document.querySelector('[data-memory-indicator]').hidden }
  }
}

test('M+ then AC then MR restores the entry and preserves the indicator', () => {
  const app = setup()
  assert.equal(app.memoryHidden(), true)
  app.type('1234.5')
  app.click('memory-add')
  assert.equal(app.display(), '1,234.5')
  assert.equal(app.memoryHidden(), false)
  app.click('all-clear')
  assert.equal(app.display(), '')
  assert.equal(app.memoryHidden(), false)
  app.click('memory-recall')
  assert.equal(app.display(), '1,234.5')
})

test('M+ accumulates and MC clears only memory', () => {
  const app = setup()
  app.type('5')
  app.click('memory-add')
  app.click('memory-add')
  app.click('memory-recall')
  assert.equal(app.display(), '10')
  app.click('memory-clear')
  assert.equal(app.display(), '10')
  assert.equal(app.memoryHidden(), true)
  app.click('memory-recall')
  assert.equal(app.display(), '0')
})

test('M+ stores the result after equals', () => {
  const app = setup()
  app.type('6')
  app.operation('*')
  app.type('7')
  app.click('equals')
  app.click('memory-add')
  app.click('all-clear')
  app.click('memory-recall')
  assert.equal(app.display(), '42')
})

test('indicator is hidden for zero and cancellation, visible for negative memory', () => {
  const app = setup()
  app.type('0')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), true)
  app.operation('-')
  app.type('5')
  app.click('equals')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), false)
  app.click('all-clear')
  app.type('5')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), true)
  app.click('memory-recall')
  assert.equal(app.display(), '0')
})

test('MR replaces the entry without losing a pending operation', () => {
  const app = setup()
  app.type('3')
  app.click('memory-add')
  app.click('all-clear')
  app.type('10')
  app.operation('+')
  app.type('99')
  app.click('memory-recall')
  assert.equal(app.display(), '3')
  app.click('equals')
  assert.equal(app.display(), '13')
})

test('empty, incomplete and non-finite entries do not poison memory', () => {
  const app = setup()
  app.click('memory-add')
  app.type('.')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), true)
  app.click('all-clear')
  app.type('8')
  app.click('memory-add')
  app.operation('÷')
  app.type('0')
  app.click('equals')
  app.click('memory-add')
  app.click('memory-recall')
  assert.equal(app.display(), '8')
})

test('decimal input works after storing a computed result', () => {
  const app = setup()
  app.type('1')
  app.operation('+')
  app.type('2')
  app.click('equals')
  app.click('memory-add')
  app.type('.5')
  assert.equal(app.display(), '3.5')
})

test('calculator has a named group and one polite atomic output region', () => {
  const { elements } = setup()
  const container = elements.find(element => element.getAttribute('class') === 'calculator-grid')
  assert.equal(container.getAttribute('role'), 'group')
  assert.equal(container.getAttribute('aria-label'), 'Calculator')
  const liveRegions = elements.filter(element => element.getAttribute('aria-live'))
  assert.equal(liveRegions.length, 1, 'avoid nested live regions announcing history twice')
  assert.equal(liveRegions[0].getAttribute('class'), 'output')
  assert.equal(liveRegions[0].getAttribute('aria-live'), 'polite')
  assert.equal(liveRegions[0].getAttribute('aria-atomic'), 'true')
})

test('all buttons have accessible names and symbols have descriptive labels', () => {
  const { elements } = setup()
  const symbolicLabels = {
    'M+': 'Add to memory', MR: 'Recall memory', MC: 'Clear memory',
    '%': 'Percent', AC: 'All clear', DEL: 'Delete last digit',
    '⌫': 'Backspace', '+/-': 'Negate', '÷': 'Divide', '*': 'Multiply',
    '+': 'Add', '-': 'Subtract', '.': 'Decimal point', '=': 'Equals'
  }
  const buttons = elements.filter(element => element.tagName === 'button')
  assert.ok(buttons.length > 0)
  for (const button of buttons) {
    const label = button.getAttribute('aria-label')
    assert.ok((label || button.innerText).trim(), 'each button needs an accessible name')
    if (!/^\d$/.test(button.innerText)) {
      assert.ok(symbolicLabels[button.innerText], `uncovered symbol: ${button.innerText}`)
      assert.equal(label, symbolicLabels[button.innerText])
    }
  }
})

test('memory and history labels persist through calculation and clear', () => {
  const app = setup()
  const memory = app.elements.find(element => element.attributes.includes('data-memory-indicator'))
  const history = app.elements.find(element => element.attributes.includes('data-history'))
  const checkLabels = () => {
    assert.equal(memory.getAttribute('aria-label'), 'Memory state')
    assert.equal(history.getAttribute('aria-label'), 'History')
  }
  checkLabels()
  app.type('6')
  app.click('memory-add')
  app.operation('*')
  app.type('7')
  app.click('equals')
  assert.equal(app.display(), '42')
  assert.equal(history.innerText, '6*7=42')
  assert.equal(memory.hidden, false)
  checkLabels()
  app.click('all-clear')
  app.click('memory-clear')
  assert.equal(history.innerText, '')
  assert.equal(memory.hidden, true)
  checkLabels()
})
