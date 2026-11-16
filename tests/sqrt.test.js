// Run with: node --test tests/sqrt.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

// Read the real markup so the tests exercise the new key and its wiring.
function setup() {
  const elements = new Map()
  const buttons = new Map()
  const listeners = new Map()
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const handlers = new Map()
    const button = {
      innerText: text,
      addEventListener(type, handler) { handlers.set(type, handler) },
      click() { handlers.get('click')() },
      focus() {}
    }
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    elements.get(selector).push(button)
    buttons.set(text, button)
  }
  for (const name of ['memory-indicator', 'history', 'previous-operand', 'current-operand']) {
    elements.set(`[data-${name}]`, [{ innerText: '', hidden: true }])
  }
  runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), {
    document: {
      querySelector: selector => elements.get(selector)?.[0],
      querySelectorAll: selector => elements.get(selector),
      addEventListener: (type, handler) => listeners.set(type, handler)
    }
  })
  return {
    press(...keys) { keys.forEach(key => buttons.get(key).click()) },
    key(key, modifiers = {}) {
      let prevented = false
      listeners.get('keydown')({ key, ...modifiers, preventDefault() { prevented = true } })
      return prevented
    },
    display: () => elements.get('[data-current-operand]')[0].innerText,
    previous: () => elements.get('[data-previous-operand]')[0].innerText
  }
}

test('sqrt key computes sqrt(9)=3 and r uses the last result after entry clear', () => {
  const app = setup()
  app.press('9', '√')
  assert.equal(app.display(), '3')
  app.press('AC', '4', '+', '5', '=')
  assert.equal(app.display(), '9')
  app.key('Escape')
  assert.equal(app.display(), '')
  assert.equal(app.key('r'), true)
  assert.equal(app.display(), '3')
  app.press('=') // sqrt must not repeat the preceding addition.
  assert.equal(app.display(), '3')
  app.press('7')
  assert.equal(app.display(), '7')
})

test('sqrt transforms only the current operand of a pending calculation', () => {
  const app = setup()
  app.press('2', '+', '9', '√')
  assert.equal(app.display(), '3')
  assert.equal(app.previous(), '2 +')
  app.press('=')
  assert.equal(app.display(), '5')
})

test('sqrt ignores missing or negative input, and full clear discards the last result', () => {
  const app = setup()
  app.press('√')
  assert.equal(app.display(), '')
  app.press('-', '9', '√')
  assert.equal(app.display(), '-9')
  app.press('AC', '0', '√')
  assert.equal(app.display(), '0')
  app.press('AC', '9', '√', 'AC', '√')
  assert.equal(app.display(), '')
  assert.equal(app.key('r', { ctrlKey: true }), false)
})
