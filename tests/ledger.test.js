const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')

const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
const css = readFileSync(`${__dirname}/../styles.css`, 'utf8')

// Exercise the actual markup and shared pointer/keyboard handlers with a DOM
// that supports ledger appends, clearing, focus, and scroll position.
function setup() {
  const elements = new Map(), handlers = new Map(), timers = new Map()
  function node(text = '') {
    const events = new Map()
    return {
      innerText: text, textContent: '', children: [], hidden: false, disabled: false,
      scrollTop: 0,
      get scrollHeight() { return this.children.length * 48 },
      appendChild(child) { this.children.push(child) },
      replaceChildren() { this.children = [] },
      addEventListener(type, handler) {
        if (!events.has(type)) events.set(type, [])
        events.get(type).push(handler)
      },
      focus() {},
      click() { for (const handler of events.get('click') || []) handler() }
    }
  }
  for (const [, attributes, text] of html.matchAll(/<[a-z]+\b([^>]*\bdata-[^>]*)>([^<]*)/g)) {
    const attribute = attributes.match(/\b(data-[\w-]+)/)[1]
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    const element = node(text.trim())
    element.disabled = /\bdisabled\b/.test(attributes)
    elements.get(selector).push(element)
  }
  const get = selector => elements.get(selector)?.[0]
  const context = vm.createContext({
    document: {
      querySelector: get,
      querySelectorAll: selector => elements.get(selector) || [],
      createElement: tag => { assert.equal(tag, 'li'); return node() },
      addEventListener: (type, handler) => handlers.set(type, handler)
    },
    setTimeout: handler => { const id = timers.size + 1; timers.set(id, handler); return id },
    clearTimeout: id => timers.delete(id)
  })
  vm.runInContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), context)
  return {
    get,
    run: code => vm.runInContext(code, context),
    rows: () => get('[data-ledger]').children.map(row => row.textContent),
    press(...labels) {
      for (const label of labels) {
        const button = [...elements.values()].flat().find(element => element.innerText === label)
        assert.ok(button, `Button ${label} exists`)
        button.click()
      }
    },
    key(key, options = {}) {
      let prevented = false
      handlers.get('keydown')({ key, ...options, preventDefault() { prevented = true } })
      handlers.get('keyup')?.({ key })
      return prevented
    }
  }
}

test('ledger is a labelled side panel with a keyboard-scrollable list and dedicated clear control', () => {
  assert.match(html, /<main class="calculator-layout">[\s\S]*calculator-grid[\s\S]*<aside class="ledger-panel" aria-labelledby="ledger-heading">/)
  assert.match(html, /<h2 id="ledger-heading">Calculation ledger<\/h2>/)
  assert.match(html, /<ol data-ledger[^>]*tabindex="0"[^>]*aria-label="Completed calculations"/)
  assert.match(html, /<button data-ledger-clear type="button" disabled>Clear ledger<\/button>/)
  assert.match(css, /\.calculator-layout\s*\{[^}]*display: flex/)
  assert.match(css, /\.ledger-list\s*\{[^}]*height: 420px;[^}]*overflow-y: auto/)
  assert.match(css, /@media \(max-width: 780px\)[\s\S]*flex-direction: column/)
})

for (const flow of ['mouse', 'keyboard', 'mixed']) {
  test(`${flow} calculations append ordered ledger entries and scroll newest to the bottom`, () => {
    const app = setup()
    assert.deepEqual(app.rows(), [])
    assert.equal(app.get('[data-ledger-clear]').disabled, true)
    assert.equal(app.get('[data-ledger-empty]').hidden, false)
    const inputs = ['1', '2', '+', '7', '=', '9', '÷', '2', '=']
    inputs.forEach((key, i) => flow === 'mouse' || (flow === 'mixed' && i % 2 === 0)
      ? app.press(key) : assert.equal(app.key(key === '=' ? 'Enter' : key), true))
    assert.deepEqual(app.rows(), ['12 + 7 = 19', '9 ÷ 2 = 4.5'])
    const list = app.get('[data-ledger]')
    assert.equal(list.scrollTop, list.scrollHeight)
    assert.equal(app.get('[data-ledger-clear]').disabled, false)
    assert.equal(app.get('[data-ledger-empty]').hidden, true)
    const firstRow = list.children[0]
    list.scrollTop = 0
    app.press('DEL')
    assert.equal(list.scrollTop, 0, 'editing does not force-scroll an older entry')
    assert.equal(list.children[0], firstRow, 'existing rows are not rebuilt on rerender')
  })
}

test('chained subtotals and repeated equals append exactly once; incomplete equals does not', () => {
  const app = setup()
  app.press('=', '2', '+', '=')
  assert.deepEqual(app.rows(), [])
  app.press('3', '*', '4', '=', '=')
  assert.deepEqual(app.rows(), ['2 + 3 = 5', '5 * 4 = 20', '20 * 4 = 80'])
  app.run('calculator.updateDisplay(); calculator.updateDisplay()')
  assert.equal(app.rows().length, 3)
})

for (const clear of ['AC', 'c', 'C', 'Escape', 'fullClear']) {
  test(`${clear} preserves ledger and copy availability`, () => {
    const app = setup()
    app.press('2', '+', '3', '=')
    if (clear === 'AC') app.press('AC')
    else if (clear === 'fullClear') app.run('calculator.fullClear(); calculator.updateDisplay()')
    else app.key(clear)
    assert.deepEqual(app.rows(), ['2 + 3 = 5'])
    assert.equal(app.get('[data-history-copy]').disabled, false)
  })
}

test('failed calculation and recovery preserve earlier ledger without adding error rows', () => {
  const app = setup()
  app.press('2', '+', '3', '=', '1', '÷', '0', '=')
  assert.equal(app.get('[data-current-operand]').innerText, 'Cannot divide by zero')
  assert.deepEqual(app.rows(), ['2 + 3 = 5'])
  app.press('4', '+', '2', '=')
  assert.deepEqual(app.rows(), ['2 + 3 = 5', '4 + 2 = 6'])
})

test('clear-ledger removes only ledger entries, resets copy and empty state, and permits further appends', () => {
  const app = setup()
  app.press('2', '+', '3', '=', 'M+', '+', '7')
  const snapshot = 'JSON.stringify([calculator.currentOperand, calculator.previousOperand, calculator.operation, calculator.memory, calculator.lastOperation, calculator.lastOperand, calculator.history])'
  const before = app.run(snapshot)
  app.press('Clear ledger')
  assert.equal(app.run(snapshot), before)
  assert.deepEqual(app.rows(), [])
  assert.equal(app.get('[data-history-copy]').disabled, true)
  assert.equal(app.get('[data-ledger-clear]').disabled, true)
  assert.equal(app.get('[data-ledger-empty]').hidden, false)
  assert.equal(app.get('[data-announcements]').textContent, 'Ledger cleared')
  app.press('=')
  assert.deepEqual(app.rows(), ['5 + 7 = 12'])
})

test('Enter on ledger controls is left to native activation, not dispatched to equals', () => {
  const app = setup()
  app.press('2', '+', '3')
  for (const selector of ['[data-ledger-clear]', '[data-history-copy]', '[data-ledger]']) {
    assert.equal(app.key('Enter', { target: app.get(selector) }), false)
    assert.deepEqual(app.rows(), [])
  }
})

test('many entries remain chronological and newest appends scroll the list', () => {
  const app = setup()
  app.press('1', '+', '1', '=')
  for (let i = 0; i < 99; i++) app.key('Enter')
  assert.equal(app.rows().length, 100)
  assert.equal(app.rows()[0], '1 + 1 = 2')
  assert.equal(app.rows()[99], '100 + 1 = 101')
  assert.equal(app.get('[data-ledger]').scrollTop, app.get('[data-ledger]').scrollHeight)
})
