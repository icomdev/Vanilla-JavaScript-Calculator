// Run with: node --test tests/backspace.test.js
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
    backspace: () => get('[data-backspace]'),
    delete: () => get('[data-delete]'),
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

for (const path of ['button', 'keyboard']) {
  const erase = app => path === 'button' ? app.press('⌫') : app.key('Backspace')
  for (const [state, before, previous] of [
    ['fresh', [], ''], ['AC cleared', ['4', 'AC'], ''],
    ['entry cleared', ['8', '+', '2', 'Escape'], '8 +'],
    ...['+', '-', '*', '÷'].map(op => [`pending ${op}`, ['8', op], `8 ${op}`])
  ]) {
    test(`${path} backspace on ${state} empty entry is a no-op`, () => {
      const app = setup()
      for (const label of before) label === 'Escape' ? app.key(label) : app.press(label)
      erase(app)
      erase(app)
      assert.equal(app.display(), '')
      assert.equal(app.previous(), previous)
      app.press('3')
      assert.equal(app.display(), '3')
      assert.equal(app.previous(), previous)
    })
  }
  for (const [entry, expected] of [
    ['12345', '1,234'], ['12.50', '12.5'], ['12.', '12'],
    ['-12', '-1'], ['-1', ''], ['-0', ''], ['0', ''], ['-', '']
  ]) {
    test(`${path} backspace edits ${entry} without display formatting leaking into entry`, () => {
      const app = setup()
      app.press(...entry)
      erase(app)
      assert.equal(app.display(), expected)
      app.press('7')
      assert.equal(app.display(), entry === '12345' ? '12,347' : expected + '7')
    })
  }
  test(`${path} backspace deletes digit by digit to empty and permits a fresh decimal`, () => {
    const app = setup()
    app.press(...'12.3')
    for (const expected of ['12.', '12', '1', '', '']) {
      erase(app)
      assert.equal(app.display(), expected)
    }
    app.press('.', '5')
    assert.equal(app.display(), '0.5')
  })
  for (const [op, result] of [['+', '11'], ['-', '5'], ['*', '24'], ['÷', '2.6666666666666665']]) {
    test(`${path} backspace preserves pending ${op} through right-entry deletion and replacement`, () => {
      const app = setup()
      app.press('8', op, '2', '5')
      erase(app)
      assert.equal(app.display(), '2')
      assert.equal(app.previous(), `8 ${op}`)
      erase(app)
      erase(app)
      assert.equal(app.display(), '')
      assert.equal(app.previous(), `8 ${op}`)
      app.press('3', '=')
      assert.equal(app.display(), result)
      assert.equal(app.history(), `8${op}3=${result}`)
    })
  }
  for (const [kind, before] of [
    ['positive', ['8', '+', '2', '=']], ['negative', ['2', '-', '8', '=']],
    ['zero', ['2', '-', '2', '=']], ['fraction', ['1', '÷', '4', '=']],
    ['square root', ['4', '+', '5', '=', 'DEL', '√']]
  ]) {
    test(`${path} backspace resets ${kind} result to zero rather than truncating`, () => {
      const app = setup()
      app.press(...before, 'M+')
      const history = app.history()
      erase(app)
      assert.equal(app.display(), '0')
      assert.equal(app.history(), history)
      assert.equal(app.previous(), '')
      erase(app)
      assert.equal(app.display(), '0')
      app.press('7')
      assert.equal(app.display(), '7') // retain result-mode fresh-digit behavior
      app.press('MR')
      const memory = setup()
      memory.press(...before)
      assert.equal(app.display(), memory.display())
    })
  }
  test(`${path} backspace resets a result without losing an independently pending operation`, () => {
    const app = setup()
    app.press('4', '+', '5', '=', '*', '√') // sqrt of saved result, with 9 * pending
    assert.equal(app.display(), '3')
    erase(app)
    assert.equal(app.display(), '0')
    assert.equal(app.previous(), '9 *')
    assert.equal(app.history(), '4+5=9')
    app.press('2', '=')
    assert.equal(app.display(), '18')
  })
  test(`${path} backspace preserves repeated equals and saved square-root result`, () => {
    const app = setup()
    app.press('8', '+', '2', '=')
    erase(app)
    app.press('=')
    assert.equal(app.display(), '2') // 0 + remembered 2
    app.press('AC', '4', '+', '5', '=', 'DEL', '√')
    erase(app)
    app.key('Escape')
    app.press('√')
    assert.equal(app.display(), Math.sqrt(3).toString())
  })
  test(`${path} backspace edits recalled memory without changing memory or pending state`, () => {
    const app = setup()
    app.press('1', '2', 'M+', 'AC', '8', '+', 'MR')
    erase(app)
    assert.equal(app.display(), '1')
    assert.equal(app.previous(), '8 +')
    app.press('=', 'MR')
    assert.equal(app.display(), '12')
  })
  test(`${path} backspace leaves an error with an empty entry unchanged`, () => {
    const app = setup()
    app.press('1', '÷', '0', '=')
    erase(app)
    assert.equal(app.display(), 'Cannot divide by zero')
    app.press('7')
    assert.equal(app.display(), '7')
  })
}

test('Backspace focuses and clicks the backspace button once per keydown, including repeat', () => {
  const app = setup()
  app.press('1', '2', '3')
  for (const [modifiers, expected] of [[{}, '12'], [{ repeat: true }, '1'], [{ shiftKey: true }, '']]) {
    const before = app.backspace().clicks
    assert.equal(app.key('Backspace', modifiers), true)
    assert.equal(app.focused(), app.backspace())
    assert.equal(app.backspace().clicks, before + 1)
    assert.equal(app.delete().clicks, 0)
    assert.equal(app.display(), expected)
  }
})

test('Backspace leaves browser shortcuts, editing, composition and handled events alone', () => {
  const app = setup()
  app.press('1', '2')
  for (const modifiers of [
    { ctrlKey: true }, { metaKey: true }, { altKey: true },
    { isComposing: true }, { defaultPrevented: true },
    { target: { isContentEditable: true } },
    ...['input', 'textarea', 'select'].map(tag => ({ target: { closest(selector) {
      assert.equal(selector, 'input, textarea, select')
      return { tagName: tag }
    } } }))
  ]) {
    assert.equal(app.key('Backspace', modifiers), false)
    assert.equal(app.display(), '12')
    assert.equal(app.backspace().clicks, 0)
    assert.equal(app.focused(), undefined)
  }
})

test('backspace has one labelled button immediately next to zero', () => {
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  assert.equal([...html.matchAll(/<button\b[^>]*\bdata-backspace\b/g)].length, 1)
  assert.match(html, /<button data-number>0<\/button>\s*<button data-backspace aria-label="Backspace">⌫<\/button>/)
})
