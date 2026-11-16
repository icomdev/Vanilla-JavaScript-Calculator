const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

const root = resolve(__dirname, '..')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const script = readFileSync(resolve(root, 'script.js'), 'utf8')

function setup() {
  const elements = new Map()
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const listeners = {}
    const button = {
      innerText: text,
      clicks: 0,
      addEventListener(type, listener) { listeners[type] = listener },
      click() { this.clicks++; listeners.click() }
    }
    if (!elements.has(attribute)) elements.set(attribute, [])
    elements.get(attribute).push(button)
  }
  const current = { innerText: '' }
  const previous = { innerText: '' }
  elements.set('data-current-operand', [current])
  elements.set('data-previous-operand', [previous])
  const listeners = {}
  const document = {
    querySelectorAll(selector) { return elements.get(selector.slice(1, -1)) },
    querySelector(selector) { return this.querySelectorAll(selector)[0] },
    addEventListener(type, listener) { listeners[type] = listener }
  }
  vm.runInNewContext(script, { document })
  return {
    current, previous,
    button(text) {
      return [...elements.values()].flat().find(button => button.innerText === text)
    },
    key(key, options = {}) {
      const event = {
        key, ...options, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true }
      }
      listeners.keydown(event)
      return event
    }
  }
}

test('every supported key clicks its corresponding button exactly once', () => {
  const app = setup()
  for (const key of '0123456789.+-*/') {
    const button = app.button(key === '/' ? '÷' : key)
    assert.equal(app.key(key).defaultPrevented, true)
    assert.equal(button.clicks, 1, key)
  }
  for (const [key, label] of [['Enter', '='], ['Escape', 'AC'], ['Backspace', 'DEL']]) {
    assert.equal(app.key(key).defaultPrevented, true)
    assert.equal(app.button(label).clicks, 1)
  }
})

test('keyboard arithmetic updates both displays, including division', () => {
  for (const [operator, result] of [['+', '10'], ['-', '6'], ['*', '16'], ['/', '4']]) {
    const app = setup()
    app.key('8')
    app.key(operator)
    assert.equal(app.previous.innerText, `8 ${operator === '/' ? '÷' : operator}`)
    app.key('2')
    app.key('Enter')
    assert.equal(app.current.innerText, result)
    assert.equal(app.previous.innerText, '')
  }
})

test('decimal input, deletion, and clearing reuse calculator behavior', () => {
  const app = setup()
  for (const key of ['1', '.', '.', '2', '3', 'Backspace']) app.key(key)
  assert.equal(app.current.innerText, '1.2')
  app.key('+')
  app.key('9')
  app.key('Escape')
  assert.equal(app.current.innerText, '')
  assert.equal(app.previous.innerText, '')
  app.key('Backspace')
  app.key('Enter')
  assert.equal(app.current.innerText, '')
})

test('unrelated keys, shortcuts, and composing input are untouched', () => {
  const app = setup()
  app.key('7')
  for (const key of ['a', 'Tab', ' ', 'ArrowLeft', 'Delete', '=', 'F5']) {
    assert.equal(app.key(key).defaultPrevented, false)
  }
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'isComposing']) {
    assert.equal(app.key('1', { [modifier]: true }).defaultPrevented, false)
  }
  assert.equal(app.current.innerText, '7')
  app.key('+', { shiftKey: true })
  app.key('2')
  app.key('Enter')
  assert.equal(app.current.innerText, '9')
})

test('mouse and keyboard input can be mixed', () => {
  const app = setup()
  app.button('6').click()
  app.key('*')
  app.key('3')
  app.button('=').click()
  assert.equal(app.current.innerText, '18')
})
