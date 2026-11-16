// Run with: node --test tests/error.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

// Drive the real click and keydown handlers, not a copy of Calculator's logic.
function setup() {
  const elements = new Map()
  const listeners = new Map()
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const handlers = new Map()
    const button = {
      innerText: text,
      addEventListener(type, handler) { handlers.set(type, handler) },
      focus() {},
      click() { handlers.get('click')() }
    }
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    elements.get(selector).push(button)
  }
  for (const attribute of ['current-operand', 'previous-operand', 'history']) {
    elements.set(`[data-${attribute}]`, [{ innerText: '' }])
  }
  elements.set('[data-memory-indicator]', [{ hidden: true }])
  const document = {
    querySelectorAll: selector => elements.get(selector),
    querySelector: selector => elements.get(selector)[0],
    addEventListener: (type, handler) => listeners.set(type, handler)
  }
  runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), { document })
  return {
    press(...labels) {
      for (const label of labels) {
        const button = [...elements.values()].flat().find(element => element.innerText === label)
        assert.ok(button, `Missing button: ${label}`)
        button.click()
      }
    },
    key(key) {
      let prevented = false
      listeners.get('keydown')({ key, preventDefault() { prevented = true } })
      assert.equal(prevented, true, `${key} should be handled`)
    },
    display: () => document.querySelector('[data-current-operand]').innerText,
    previous: () => document.querySelector('[data-previous-operand]').innerText,
    history: () => document.querySelector('[data-history]').innerText,
    memoryHidden: () => document.querySelector('[data-memory-indicator]').hidden
  }
}

const errorMessage = 'Cannot divide by zero'

function assertError(app) {
  assert.equal(app.display(), errorMessage)
  assert.equal(app.previous(), '')
  assert.equal(app.history(), '')
}

const zeroCases = [
  { name: 'positive / zero', numerator: ['8'], denominator: ['0'] },
  { name: 'zero / decimal zero', numerator: ['0'], denominator: ['0', '.', '0'] },
  { name: 'negative / signed zero', numerator: ['-', '8'], denominator: ['-', '0'] }
]
const errorTriggers = [
  { name: 'equals button', run: app => app.press('=') },
  { name: 'keyboard Enter', run: app => app.key('Enter') },
  { name: 'chained operator', run: app => app.press('+') }
]

for (const { name: operands, numerator, denominator } of zeroCases) {
  for (const { name: trigger, run } of errorTriggers) {
    test(`divide-by-zero display: ${operands} via ${trigger}`, () => {
      const app = setup()
      // An earlier result/history must not survive the failed calculation.
      app.press('2', '+', '3', '=')
      assert.equal(app.history(), '2+3=5')
      app.press(...numerator, '÷', ...denominator)
      run(app)
      assertError(app)
      // Non-computing operations must not turn the error into a numeric display.
      app.press('%', '±')
      assertError(app)
    })
  }
}

for (const { name, entry, expected } of [
  { name: 'integer', entry: ['4'], expected: '4' },
  { name: 'leading decimal', entry: ['.', '5'], expected: '0.5' }
]) {
  test(`Escape after error allows fresh ${name} entry without stale repeat-equals`, () => {
    const app = setup()
    app.press('2', '+', '3', '=', '8', '÷', '0', '=')
    assertError(app)
    app.key('Escape')
    assert.equal(app.display(), '')
    assert.equal(app.previous(), '')
    assert.equal(app.history(), '')
    for (const key of entry) app.key(key)
    assert.equal(app.display(), expected)
    app.key('Enter')
    assert.equal(app.display(), expected)
    app.key('+')
    app.key('2')
    app.key('Enter')
    assert.equal(app.display(), String(Number(expected) + 2))
  })
}

for (const { name: memoryState, seed, expected } of [
  { name: 'empty', seed: [], expected: '0' },
  { name: 'positive', seed: ['7', 'M+', 'AC'], expected: '7' },
  { name: 'negative', seed: ['-', '7', 'M+', 'AC'], expected: '-7' }
]) {
  for (const recovery of ['MR', 'Escape then MR']) {
    test(`error preserves ${memoryState} memory through M+ and ${recovery}`, () => {
      const app = setup()
      app.press(...seed)
      app.press('8', '÷', '0', '=')
      assertError(app)
      assert.equal(app.memoryHidden(), expected === '0')
      app.press('M+', 'M+')
      assertError(app)
      assert.equal(app.memoryHidden(), expected === '0')
      if (recovery === 'Escape then MR') {
        app.key('Escape')
        assert.equal(app.display(), '')
        assert.equal(app.memoryHidden(), expected === '0')
      }
      app.press('MR')
      assert.equal(app.display(), expected)
      assert.equal(app.previous(), '')
      assert.equal(app.memoryHidden(), expected === '0')
      // Memory is still usable for both arithmetic and subsequent accumulation.
      app.press('+', '2', '=')
      const result = Number(expected) + 2
      assert.equal(app.display(), String(result))
      app.press('M+', 'AC', 'MR')
      assert.equal(app.display(), String(Number(expected) + result))
    })
  }
}
