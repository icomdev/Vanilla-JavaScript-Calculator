// Run with: node --test tests/aria.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const html = readFileSync(join(__dirname, '../index.html'), 'utf8')

// Coverage matrix (#50), inline to preserve the new-file-only scope:
// | Matrix cell | Test name |
// | --- | --- |
// | Container role + label | calculator is an ARIA group with a nonempty label |
// | Live output + atomic updates | output announces updates politely and atomically |
// | Labelled controls + text-only digits | every button has a nonempty aria-label or text content |
// | Memory indicator semantics | memory indicator has the img role |
// Static initial-document contracts; runtime transition matrix is in docs/TEST-SWEEP.md.

// Parse the static markup without a browser or external dependencies.
function parseAttributes(source) {
  return Object.fromEntries([...source.matchAll(
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  )].map(([, name, doubleQuoted, singleQuoted, unquoted]) => [
    name.toLowerCase(), doubleQuoted ?? singleQuoted ?? unquoted ?? ''
  ]))
}

const elements = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)]
  .map(([, tag, attributes]) => ({ tag, attributes: parseAttributes(attributes) }))

function byClass(className) {
  const element = elements.find(({ attributes }) =>
    (attributes.class || '').split(/\s+/).includes(className))
  assert.ok(element, `Element with class "${className}" exists`)
  return element.attributes
}

test('calculator is an ARIA group with a nonempty label', () => {
  const calculator = byClass('calculator-grid')
  assert.equal(calculator.role, 'group')
  assert.ok(calculator['aria-label']?.trim(), 'Calculator has a nonempty aria-label')
})

test('one dedicated status announces updates politely and atomically', () => {
  const output = byClass('announcements')
  assert.equal(byClass('output')['aria-live'], undefined)
  assert.equal(elements.filter(({ attributes }) => attributes['aria-live']).length, 1)
  assert.equal(output['aria-live'], 'polite')
  assert.equal(output['aria-atomic'], 'true')
})

test('every button has a nonempty aria-label or text content', () => {
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi)]
  assert.ok(buttons.length > 0, 'Calculator contains buttons')
  assert.equal(buttons.length, elements.filter(({ tag }) => tag === 'button').length,
    'Every opening button tag has been parsed')
  for (const [index, [, source, content]] of buttons.entries()) {
    const attributes = parseAttributes(source)
    const text = content.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '').trim()
    assert.ok(attributes['aria-label']?.trim() || text,
      `Button ${index + 1} has an aria-label or text content`)
  }
})

test('memory indicator has the img role', () => {
  const indicator = elements.find(({ attributes }) =>
    Object.hasOwn(attributes, 'data-memory-indicator'))
  assert.ok(indicator, 'Memory indicator exists')
  assert.equal(indicator.attributes.role, 'img')
})

// Real event handlers, with DOM writes tracked to detect duplicate announcements.
function setupAnnouncements() {
  const vm = require('node:vm')
  const nodes = new Map()
  const listeners = new Map()
  const writes = []
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const handlers = new Map()
    const button = {
      innerText: text,
      addEventListener(type, handler) {
        handlers.set(type, handler)
        if (type === 'pointerdown') this.hold = () => handler({ button: 0 })
      },
      focus() {},
      click() { handlers.get('click')() }
    }
    const selector = `[${attribute}]`
    if (!nodes.has(selector)) nodes.set(selector, [])
    nodes.get(selector).push(button)
  }
  for (const name of ['memory-indicator', 'history', 'previous-operand', 'current-operand']) {
    nodes.set(`[data-${name}]`, [{ innerText: '', hidden: true }])
  }
  let holdCallback
  let announcement = ''
  nodes.set('[data-announcements]', [{
    get textContent() { return announcement },
    set textContent(value) { announcement = value; writes.push(value) }
  }])
  const context = vm.createContext({
    setTimeout(callback) { holdCallback = callback; return 1 },
    clearTimeout() { holdCallback = undefined },
    document: {
    querySelector: selector => nodes.get(selector)?.[0],
    querySelectorAll: selector => nodes.get(selector) || [],
    addEventListener: (type, handler) => listeners.set(type, handler)
  } })
  vm.runInContext(readFileSync(join(__dirname, '../script.js'), 'utf8'), context)
  return {
    writes,
    holdAC() {
      nodes.get('[data-all-clear]')[0].hold()
      holdCallback()
    },
    announcement: () => announcement,
    run: code => vm.runInContext(code, context),
    display: () => nodes.get('[data-current-operand]')[0].innerText,
    press(...labels) {
      for (const label of labels) {
        const button = [...nodes.values()].flat().find(node => node.innerText === label)
        assert.ok(button, `button ${label} exists`)
        button.click()
      }
    },
    escape(shiftKey = false) {
      listeners.get('keydown')({ key: 'Escape', shiftKey, preventDefault() {} })
    }
  }
}

for (const trigger of ['equals', 'chaining']) {
  test(`error via ${trigger} is announced once through no-op actions and rerenders`, () => {
    const app = setupAnnouncements()
    app.press('8', '÷', '0', trigger === 'equals' ? '=' : '+')
    assert.equal(app.announcement(), 'Cannot divide by zero')
    const count = app.writes.length
    app.press('M+', '%', '√')
    app.run('calculator.updateDisplay(); calculator.updateDisplay()')
    assert.equal(app.writes.length, count)
    app.press('2', '÷', '0', '=')
    assert.equal(app.announcement(), 'Cannot divide by zero')
    assert.equal(app.writes.filter(text => text === 'Cannot divide by zero').length, 2)
  })
}

for (const state of ['fresh', 'entry', 'result', 'pending', 'error']) {
  for (const action of ['AC', 'Escape', 'Shift+Escape']) {
    test(`${state} then ${action} announces cleared once and permits a later clear`, () => {
      const app = setupAnnouncements()
      if (state === 'entry') app.press('9')
      if (state === 'result') app.press('4', '+', '5', '=')
      if (state === 'pending') app.press('4', '+', '5')
      if (state === 'error') app.press('4', '÷', '0', '=')
      const clear = () => action === 'AC' ? app.press('AC') : app.escape(action === 'Shift+Escape')
      clear()
      assert.equal(app.announcement(), 'Cleared')
      assert.equal(app.display(), '')
      const count = app.writes.length
      clear()
      app.run('calculator.updateDisplay()')
      assert.equal(app.writes.length, count)
      app.press('1')
      clear()
      assert.equal(app.writes.filter(text => text === 'Cleared').length, 2)
      if (state === 'pending') {
        app.press('2', '=')
        assert.equal(app.display(), action === 'Escape' ? '6' : '2')
      }
    })
  }
}

test('memory announcements report accumulated stored value, recall and clear without duplicate writes', () => {
  const app = setupAnnouncements()
  app.press('1', '2', '.', '5', 'M+')
  assert.equal(app.announcement(), 'Memory stored: 12.5')
  app.press('M+')
  assert.equal(app.announcement(), 'Memory stored: 25')
  assert.equal(app.display(), '12.5')
  app.press('MR')
  assert.equal(app.announcement(), 'Memory recalled: 25')
  const count = app.writes.length
  app.press('MR')
  app.run('calculator.updateDisplay()')
  assert.equal(app.writes.length, count)
  app.press('MC')
  assert.equal(app.announcement(), 'Memory cleared')
  app.press('MC')
  assert.equal(app.writes.length, count + 1)
  app.press('MR')
  assert.equal(app.announcement(), 'Memory recalled: 0')
  assert.equal(app.display(), '0')
})

for (const state of ['empty', 'unfinished', 'non-finite', 'overflow']) {
  test(`M+ ignores ${state} without claiming a store`, () => {
    const app = setupAnnouncements()
    app.press('8', 'M+', 'AC')
    if (state === 'unfinished') app.press('-')
    if (state === 'non-finite') app.run("calculator.currentOperand = 'Infinity'; calculator.updateDisplay()")
    if (state === 'overflow') app.run('calculator.memory = Number.MAX_VALUE; calculator.currentOperand = Number.MAX_VALUE; calculator.updateDisplay()')
    const count = app.writes.length
    app.press('M+')
    assert.equal(app.writes.length, count)
  })
}

test('memory recall recovers an error and preserves a pending operation', () => {
  const app = setupAnnouncements()
  app.press('3', 'M+', '÷', '0', '=', 'MR')
  assert.equal(app.announcement(), 'Memory recalled: 3')
  app.press('+', '9', 'MR', '=')
  assert.equal(app.display(), '6')
  assert.equal(app.announcement(), '6')
})

test('ordinary entries, pending operands and results remain announced without history replay', () => {
  const app = setupAnnouncements()
  assert.deepEqual(app.writes, [])
  app.press('4', '+')
  assert.equal(app.announcement(), '4 +')
  app.press('5', '=')
  assert.equal(app.announcement(), '9')
  const count = app.writes.length
  app.run('calculator.updateDisplay()')
  assert.equal(app.writes.length, count)
})

test('held AC clears calculation and memory with one cleared announcement even after release click', () => {
  const app = setupAnnouncements()
  app.press('8', 'M+', '+', '2')
  app.holdAC()
  assert.equal(app.announcement(), 'Cleared')
  assert.equal(app.display(), '')
  const count = app.writes.length
  app.press('AC')
  assert.equal(app.writes.length, count)
  app.press('MR')
  assert.equal(app.announcement(), 'Memory recalled: 0')
})

for (const action of ['AC', 'Escape', 'Shift+Escape']) {
  test(`${action} announces cleared while retaining its existing memory semantics`, () => {
    const app = setupAnnouncements()
    app.press('8', 'M+')
    if (action === 'AC') app.press('AC')
    else app.escape(action === 'Shift+Escape')
    assert.equal(app.announcement(), 'Cleared')
    app.press('MR')
    assert.equal(app.announcement(), `Memory recalled: ${action === 'Shift+Escape' ? '0' : '8'}`)
  })
}

test('zero stores deduplicate and memory feedback uses formatted signed values', () => {
  const app = setupAnnouncements()
  app.press('0', 'M+')
  assert.equal(app.announcement(), 'Memory stored: 0')
  const count = app.writes.length
  app.press('M+')
  assert.equal(app.writes.length, count)
  app.press('AC', '-', '1', '2', '3', '4', '.', '5', 'M+')
  assert.equal(app.announcement(), 'Memory stored: -1,234.5')
  app.press('MR')
  assert.equal(app.announcement(), 'Memory recalled: -1,234.5')
})
