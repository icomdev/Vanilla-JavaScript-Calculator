// Run with: node --test tests/percent-sign.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

// Read the actual buttons so this checks markup, click wiring, and key routing.
function setup() {
  const elements = new Map()
  const listeners = new Map()
  let focused
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const handlers = new Map()
    const button = {
      innerText: text,
      addEventListener(type, handler) {
        if (!handlers.has(type)) handlers.set(type, [])
        handlers.get(type).push(handler)
      },
      focus() { focused = this },
      clicks: 0,
      click() { this.clicks++; for (const handler of handlers.get('click') || []) handler() }
    }
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    elements.get(selector).push(button)
  }
  for (const name of ['memory-indicator', 'history', 'previous-operand', 'current-operand']) {
    elements.set(`[data-${name}]`, [{ innerText: '', hidden: true }])
  }
  const get = selector => elements.get(selector)?.[0]
  runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), {
    document: {
      querySelector: get,
      querySelectorAll: selector => elements.get(selector) || [],
      addEventListener: (type, handler) => listeners.set(type, handler)
    }
  })
  return {
    percent: () => get('[data-percent]'),
    focused: () => focused,
    display: () => get('[data-current-operand]').innerText,
    previous: () => get('[data-previous-operand]').innerText,
    history: () => get('[data-history]').innerText,
    press(...labels) {
      for (const label of labels) {
        const button = [...elements.values()].flat().find(button => button.innerText === label)
        assert.ok(button, `button ${label} exists`)
        button.click()
      }
    },
    key(key, modifiers = {}) {
      let prevented = false
      listeners.get('keydown')({ key, ...modifiers, preventDefault() { prevented = true } })
      return prevented
    }
  }
}

for (const path of ['button', '%']) {
  const percent = app => path === 'button' ? app.press('%') : app.key('%')
  for (const [entry, expected] of [['12', '0.12'], ['-12.50', '-0.125'], ['12.', '0.12'], ['0.05', '0.0005']]) {
    test(`${path} divides ${entry} by 100 on each activation`, () => {
      const app = setup()
      app.press(...entry)
      percent(app)
      assert.equal(app.display(), expected)
      assert.equal(app.previous(), '')
      percent(app)
      assert.equal(app.display(), String(Number(expected) / 100))
    })
  }
  for (const [state, before, expected] of [
    ['empty', [], ''], ['lone minus', ['-'], '-'], ['zero', ['0'], '0'],
    ['error', ['1', '÷', '0', '='], 'Cannot divide by zero'],
    ['empty pending', ['8', '+'], '']
  ]) {
    test(`${path} leaves ${state} unchanged`, () => {
      const app = setup()
      app.press(...before)
      percent(app)
      assert.equal(app.display(), expected)
      assert.equal(app.previous(), state === 'empty pending' ? '8 +' : '')
    })
  }
  for (const [operator, expected] of [['+', '8.02'], ['-', '7.98'], ['*', '0.16'], ['÷', '400']]) {
    test(`${path} transforms only the right entry of pending ${operator}`, () => {
      const app = setup()
      app.press('8', operator, '2')
      percent(app)
      assert.equal(app.display(), '0.02')
      assert.equal(app.previous(), `8 ${operator}`)
      app.press('=')
      assert.equal(app.display(), expected)
    })
  }
  test(`${path} scales results preserving history and repeated equals`, () => {
    const app = setup()
    app.press('4', '+', '5', '=')
    percent(app)
    assert.equal(app.display(), '0.09')
    assert.equal(app.history(), '4+5=9')
    app.press('=')
    assert.equal(app.display(), '5.09')
    app.press('7')
    assert.equal(app.display(), '7')
  })
  test(`${path} preserves memory and composes with square root`, () => {
    const app = setup()
    app.press('9', 'M+', 'AC', 'MR')
    percent(app)
    assert.equal(app.display(), '0.09')
    app.press('√')
    assert.equal(app.display(), '0.3')
    app.press('AC', 'MR')
    assert.equal(app.display(), '9')
  })
}

test('k focuses +/- and ignores modified browser shortcuts', () => {
  const app = setup()
  app.press('5')
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(app.key('k', { [modifier]: true }), false)
    assert.equal(app.display(), '5')
  }
  assert.equal(app.percent().clicks, 0)
  assert.equal(app.key('k'), true)
  assert.equal(app.focused().innerText, '+/-')
  assert.equal(app.display(), '-5')
  assert.equal(app.percent().clicks, 0)
  assert.equal(app.key('k', { repeat: true }), true)
  assert.equal(app.display(), '5')
})
