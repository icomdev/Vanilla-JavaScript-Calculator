const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

// Model native disabled button clicks while running the actual calculator handlers.
function setup() {
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  const elements = new Map()
  const listeners = new Map()
  for (const [, attribute, attrs, label] of html.matchAll(/<button (data-[\w-]+)([^>]*)>([^<]+)<\/button>/g)) {
    const button = {
      innerText: label,
      disabled: /\bdisabled\b/.test(attrs),
      addEventListener(type, handler) { this[type === "click" ? "clickHandler" : type] = handler },
      focus() { this.focused = true },
      click() { if (!this.disabled) this.clickHandler?.() }
    }
    const selector = `[${attribute}]`
    elements.set(selector, [...(elements.get(selector) || []), button])
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
    percent: get('[data-percent]'),
    display: () => get('[data-current-operand]').innerText,
    previous: () => get('[data-previous-operand]').innerText,
    press(label) {
      const button = [...elements.values()].flat().find(element => element.innerText === label && element.click)
      assert.ok(button, `button ${label} exists`)
      button.click()
    },
    key(key) {
      listeners.get('keydown')({ key, preventDefault() {} })
    }
  }
}

test('percent has a readable name, starts disabled, and has a dim disabled style', () => {
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  const css = readFileSync(`${__dirname}/../styles.css`, 'utf8')
  assert.match(html, /<button data-percent aria-label="Percent" disabled>%<\/button>/)
  assert.match(css, /\.calculator-grid > button:disabled\s*\{[^}]*opacity:\s*\.45/s)
})

test('pointer and keyboard percent divide the current entry; disabled for empty/error', () => {
  const app = setup()
  assert.equal(app.percent.disabled, true)
  app.press('%')
  app.key('%')
  assert.equal(app.display(), '')
  app.press('2')
  app.press('0')
  app.press('0')
  app.press('+')
  assert.equal(app.percent.disabled, true)
  app.key('%')
  assert.equal(app.previous(), '200 +')
  app.press('1')
  app.press('0')
  assert.equal(app.percent.disabled, false)
  app.press('%')
  assert.equal(app.display(), '0.1')
  app.key('%')
  assert.equal(app.display(), '0.001')
  app.press('=')
  assert.equal(app.display(), '200.001')
  app.key('%')
  assert.equal(app.display(), '2.00001')
  app.press('AC')
  assert.equal(app.percent.disabled, true)
  for (const label of ['1', '÷', '0', '=']) app.press(label)
  assert.equal(app.display(), 'Cannot divide by zero')
  assert.equal(app.percent.disabled, true)
  app.press('%')
  app.key('%')
  assert.equal(app.display(), 'Cannot divide by zero')
  app.press('DEL')
  assert.equal(app.percent.disabled, true)
  app.press('5')
  assert.equal(app.percent.disabled, false)
})
