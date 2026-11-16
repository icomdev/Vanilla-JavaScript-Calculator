const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')

// Minimal DOM harness runs the real script, including its click handlers.
function setup() {
  const elements = new Map()
  const listeners = new Map()
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const handlers = new Map()
    const button = {
      innerText: text,
      clicks: 0,
      addEventListener(type, handler) { handlers.set(type, handler) },
      click() {
        this.clicks++
        handlers.get('click')()
      }
    }
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    elements.get(selector).push(button)
  }
  elements.set('[data-memory-indicator]', [{ hidden: true }])
  elements.set('[data-history]', [{ innerText: '' }])
  for (const selector of ['[data-previous-operand]', '[data-current-operand]']) {
    elements.set(selector, [{ innerText: '' }])
  }
  const document = {
    querySelectorAll: selector => elements.get(selector),
    querySelector: selector => elements.get(selector)[0],
    addEventListener: (type, handler) => listeners.set(type, handler)
  }
  runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), { document })
  return {
    button: text => [...elements.values()].flat().find(button => button.innerText === text),
    display: () => document.querySelector('[data-current-operand]').innerText,
    previous: () => document.querySelector('[data-previous-operand]').innerText,
    key(key, modifiers = {}) {
      let prevented = false
      listeners.get('keydown')({
        key, ...modifiers,
        preventDefault() { prevented = true }
      })
      return prevented
    }
  }
}

test('digits, decimal, deletion and clear use their button handlers', () => {
  const app = setup()
  for (const key of '0123456789.') {
    assert.equal(app.key(key), true)
    assert.equal(app.button(key).clicks, 1)
  }
  app.key('Escape')
  for (const key of '12.3.4') app.key(key)
  assert.equal(app.display(), '12.34')
  app.key('Backspace')
  assert.equal(app.display(), '12.3')
  assert.equal(app.button('DEL').clicks, 1)
  app.key('+')
  app.key('4')
  app.key('Escape')
  assert.equal(app.display(), '')
  assert.equal(app.previous(), '')
  assert.equal(app.button('AC').clicks, 2)
})

for (const [operator, button, result] of [
  ['+', '+', '10'], ['-', '-', '6'], ['*', '*', '16'], ['/', '÷', '4']
]) {
  test(`keyboard ${operator} calculates via the matching buttons`, () => {
    const app = setup()
    for (const key of ['8', operator, '2', 'Enter']) assert.equal(app.key(key), true)
    assert.equal(app.display(), result)
    assert.equal(app.previous(), '')
    assert.equal(app.button(button).clicks, 1)
    assert.equal(app.button('=').clicks, 1)
  })
}

test('keyboard and pointer input can be mixed; equals key also computes', () => {
  const app = setup()
  app.button('6').click()
  app.key('/')
  app.button('2').click()
  app.key('=')
  assert.equal(app.display(), '3')
})

test('unrelated keys and browser shortcuts do not change state or prevent defaults', () => {
  const app = setup()
  app.key('7')
  for (const key of ['a', 'c', 'Delete', 'Tab', 'ArrowLeft', ' ', 'F5']) {
    assert.equal(app.key(key), false)
  }
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    for (const key of ['1', '+', '%', 'Enter', 'Escape', 'Backspace']) {
      assert.equal(app.key(key, { [modifier]: true }), false)
    }
  }
  assert.equal(app.display(), '7')
  assert.equal(app.key('+', { shiftKey: true }), true)
  assert.equal(app.previous(), '7 +')
})


test('percent key reuses the button handler, including repeated presses', () => {
  const keyboard = setup()
  const pointer = setup()
  for (const app of [keyboard, pointer]) {
    for (const key of ['2', '0', '0', '+', '1', '0']) app.key(key)
  }
  for (const expected of ['0.1', '0.001']) {
    assert.equal(keyboard.key('%', { shiftKey: true }), true)
    pointer.button('%').click()
    assert.equal(keyboard.display(), expected)
    assert.equal(keyboard.display(), pointer.display())
    assert.equal(keyboard.previous(), '200 +')
    assert.equal(keyboard.previous(), pointer.previous())
  }
  assert.equal(keyboard.button('%').clicks, 2)
})

test('percent key leaves empty entries and pending operations unchanged', () => {
  const app = setup()
  assert.equal(app.key('%'), true)
  assert.equal(app.display(), '')
  assert.equal(app.previous(), '')
  app.key('2')
  app.key('+')
  assert.equal(app.key('%'), true)
  assert.equal(app.display(), '')
  assert.equal(app.previous(), '2 +')
  assert.equal(app.button('%').clicks, 2)
})

test('percent key leaves an error state untouched', () => {
  const app = setup()
  for (const key of ['1', '/', '0', '=']) app.key(key)
  assert.equal(app.display(), 'Cannot divide by zero')
  assert.equal(app.key('%'), true)
  assert.equal(app.display(), 'Cannot divide by zero')
  assert.equal(app.previous(), '')
  assert.equal(app.button('%').clicks, 1)
})
