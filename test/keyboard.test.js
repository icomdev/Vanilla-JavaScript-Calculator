const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')

// Minimal DOM harness runs the real script, including its click handlers.
function setup() {
  const elements = new Map()
  const listeners = new Map()
  const timers = new Map()
  let nextTimer = 0
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const handlers = new Map()
    const button = {
      innerText: text,
      clicks: 0,
      focus() { document.activeElement = this },
      dispatch(type, event = {}) { for (const handler of handlers.get(type) || []) handler(event) },
      addEventListener(type, handler) {
        if (!handlers.has(type)) handlers.set(type, [])
        handlers.get(type).push(handler)
      },
      click() {
        this.clicks++
        this.dispatch('click')
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
  runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), { document,
    setTimeout(callback, delay) {
      const id = ++nextTimer
      timers.set(id, { callback, delay })
      return id
    },
    clearTimeout(id) { timers.delete(id) }
  })
  return {
    button: text => [...elements.values()].flat().find(button => button.innerText === text),
    focused: () => document.activeElement,
    memoryHidden: () => document.querySelector('[data-memory-indicator]').hidden,
    history: () => document.querySelector('[data-history]').innerText,
    dispatch: (type, event = {}) => listeners.get(type)?.(event),
    runHold() {
      for (const [id, timer] of timers) {
        assert.equal(timer.delay, 700)
        timers.delete(id)
        timer.callback()
      }
    },
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

test('digits, decimal and deletion use button handlers; Escape clears the entry', () => {
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
  assert.equal(app.button('⌫').clicks, 1)
  app.key('+')
  app.key('4')
  app.key('Escape')
  assert.equal(app.display(), '')
  assert.equal(app.previous(), '12.3 +')
  assert.equal(app.focused(), app.button('AC'))
  assert.equal(app.button('AC').clicks, 0)
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
  for (const key of ['a', 'Delete', 'Tab', 'ArrowLeft', ' ', 'F5']) {
    assert.equal(app.key(key), false)
  }
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    for (const key of ['1', '+', '%', 'k', 'c', 'C', 'Enter', 'Escape', 'Backspace']) {
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


test('Escape preserves pending operation and memory, allowing a corrected entry', () => {
  const app = setup()
  app.key('8')
  app.button('M+').click()
  app.key('+')
  app.key('9')
  assert.equal(app.key('Escape'), true)
  assert.equal(app.display(), '')
  assert.equal(app.previous(), '8 +')
  assert.equal(app.memoryHidden(), false)
  app.key('2')
  app.key('Enter')
  assert.equal(app.display(), '10')
  app.button('MR').click()
  assert.equal(app.display(), '8')
})

test('Shift+Escape resets calculation, history, repeated equals and memory', () => {
  const app = setup()
  for (const key of ['8', '+', '2', '=']) app.key(key)
  app.button('M+').click()
  assert.notEqual(app.history(), '')
  assert.equal(app.key('Escape', { shiftKey: true }), true)
  assert.equal(app.focused(), app.button('AC'))
  assert.equal(app.display(), '')
  assert.equal(app.previous(), '')
  assert.equal(app.history(), '')
  assert.equal(app.memoryHidden(), true)
  app.key('3')
  app.key('=')
  assert.equal(app.display(), '3')
  app.button('MR').click()
  assert.equal(app.display(), '0')
})

test('Escape clears errors and result mode without deleting history', () => {
  const app = setup()
  for (const key of ['8', '+', '2', '=']) app.key(key)
  app.key('Escape')
  assert.equal(app.history(), '8+2=10')
  for (const key of ['3', '=']) app.key(key)
  assert.equal(app.display(), '3')
  for (const key of ['/', '0', '=']) app.key(key)
  assert.equal(app.display(), 'Cannot divide by zero')
  app.key('Escape')
  assert.equal(app.display(), '')
  app.key('4')
  assert.equal(app.display(), '4')
})

test('every mapped key focuses its corresponding button', () => {
  const app = setup()
  for (const [key, label] of [
    ...[...'0123456789.+-*%'].map(key => [key, key]),
    ['k', '+/-'], ['r', '√'], ['/', '÷'], ['÷', '÷'], ['Enter', '='], ['=', '='],
    ['Backspace', '⌫'], ['c', 'AC'], ['C', 'AC'], ['Escape', 'AC']
  ]) {
    app.key(key)
    assert.equal(app.focused(), app.button(label), key)
  }
  app.key('Tab')
  app.key('1', { ctrlKey: true })
  assert.equal(app.focused(), app.button('AC'))
})

test('long AC clears memory as well as the calculation', () => {
  const app = setup()
  app.key('7')
  app.button('M+').click()
  app.button('AC').dispatch('pointerdown', { button: 0 })
  app.runHold()
  app.dispatch('pointerup')
  app.button('AC').click()
  assert.equal(app.display(), '')
  assert.equal(app.memoryHidden(), true)
  app.button('MR').click()
  assert.equal(app.display(), '0')
})

for (const cancel of ['pointerup', 'pointercancel', 'pointerleave']) {
  test(cancel + ' cancels a pending AC hold; short AC preserves memory', () => {
    const app = setup()
    app.key('7')
    app.button('M+').click()
    app.button('AC').dispatch('pointerdown', { button: 0 })
    if (cancel === 'pointerleave') app.button('AC').dispatch(cancel)
    else app.dispatch(cancel)
    app.runHold()
    app.button('AC').click()
    assert.equal(app.memoryHidden(), false)
    app.button('MR').click()
    assert.equal(app.display(), '7')
  })
}

test('non-primary AC presses do not schedule a full clear', () => {
  const app = setup()
  app.key('7')
  app.button('M+').click()
  app.button('AC').dispatch('pointerdown', { button: 2 })
  app.button('AC').dispatch('pointerdown', { button: 0, isPrimary: false })
  app.runHold()
  assert.equal(app.display(), '7')
  assert.equal(app.memoryHidden(), false)
})

test('Shift+Escape recovers from an error and removes stored memory', () => {
  const app = setup()
  app.key('9')
  app.button('M+').click()
  for (const key of ['/', '0', '=']) app.key(key)
  assert.equal(app.display(), 'Cannot divide by zero')
  assert.equal(app.key('Escape', { shiftKey: true }), true)
  assert.equal(app.display(), '')
  assert.equal(app.previous(), '')
  assert.equal(app.memoryHidden(), true)
  app.key('4')
  app.key('=')
  assert.equal(app.display(), '4')
  app.button('MR').click()
  assert.equal(app.display(), '0')
})

for (const path of ['keyboard', 'button']) {
  test(`${path} percent divides entries and results by 100`, () => {
    const app = setup()
    const percent = () => path === 'keyboard' ? app.key('%') : app.button('%').click()
    for (const key of '12.50') app.key(key)
    percent()
    assert.equal(app.display(), '0.125')
    percent()
    assert.equal(app.display(), '0.00125')
    app.button('AC').click()
    for (const key of ['8', '+', '2', '=']) app.key(key)
    app.button('M+').click()
    percent()
    assert.equal(app.display(), '0.1')
    assert.equal(app.history(), '8+2=10')
    app.button('MR').click()
    assert.equal(app.display(), '10')
  })

  test(`${path} percent leaves empty, pending-empty and error states unchanged`, () => {
    const app = setup()
    const percent = () => path === 'keyboard' ? app.key('%') : app.button('%').click()
    percent()
    assert.equal(app.display(), '')
    app.key('-')
    percent()
    assert.equal(app.display(), '-')
    app.button('AC').click()
    for (const key of ['8', '+']) app.key(key)
    percent()
    assert.equal(app.previous(), '8 +')
    assert.equal(app.display(), '')
    app.key('2')
    percent()
    assert.equal(app.previous(), '8 +')
    assert.equal(app.display(), '0.02')
    for (const key of ['=', '/', '0', '=']) app.key(key)
    percent()
    assert.equal(app.display(), 'Cannot divide by zero')
  })

  for (const [operator, expected] of [['+', '8.02'], ['-', '7.98'], ['*', '0.16'], ['÷', '400']]) {
    test(`${path} percent transforms pending ${operator} entry before equals`, () => {
      const app = setup()
      for (const key of ['8', operator, '2']) app.key(key)
      if (path === 'keyboard') app.key('%')
      else app.button('%').click()
      assert.equal(app.display(), '0.02')
      assert.equal(app.previous(), `8 ${operator}`)
      app.key('Enter')
      assert.equal(app.display(), expected)
      assert.equal(app.history(), `8${operator}0.02=${expected}`)
    })
  }
}

test('k routes to +/- independently of percent', () => {
  const app = setup()
  for (const key of ['8', '+', '2', '=']) app.key(key)
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(app.key('k', { [modifier]: true }), false)
    assert.equal(app.display(), '10')
  }
  app.key('k') // +/- is inactive on a result
  assert.equal(app.focused(), app.button('+/-'))
  assert.equal(app.display(), '10')
  app.key('%', { shiftKey: true })
  assert.equal(app.display(), '0.1')
  app.key('3')
  app.key('k')
  assert.equal(app.display(), '-3')
  app.button('+/-').click()
  assert.equal(app.display(), '3')
  assert.equal(app.button('%').clicks, 1)
  assert.equal(app.button('+/-').clicks, 2)
})

test('percent is one button labelled with its percentage action', () => {
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  const buttons = [...html.matchAll(/<button\b[^>]*\bdata-percent\b[^>]*>%<\/button>/g)]
  assert.equal(buttons.length, 1)
  assert.match(buttons[0][0], /aria-label="Percent"/)
})

// AC alias matrix: case/Shift × calculation state × short/held activation.
for (const [label, key, modifiers] of [
  ['c without Shift', 'c', {}],
  ['C uppercase', 'C', { shiftKey: true }],
  ['C without Shift (Caps Lock)', 'C', {}],
  ['c with Shift', 'c', { shiftKey: true }]
]) {
  for (const [state, keys] of [
    ['entry', ['1', '2']],
    ['pending operation', ['8', '+', '2']],
    ['result', ['8', '+', '2', '=']],
    ['error', ['8', '/', '0', '=']]
  ]) {
    test(`${label} short AC clears ${state} and preserves memory`, () => {
      const app = setup()
      app.key('7')
      app.button('M+').click()
      app.button('AC').click()
      for (const digit of keys) app.key(digit)
      assert.equal(app.key(key, modifiers), true)
      assert.equal(app.focused(), app.button('AC'))
      assert.equal(app.button('AC').clicks, 2)
      assert.equal(app.display(), '')
      assert.equal(app.previous(), '')
      assert.equal(app.history(), '')
      app.dispatch('keyup', { key })
      app.runHold()
      assert.equal(app.memoryHidden(), false)
      app.key('3')
      app.key('=')
      assert.equal(app.display(), '3') // no pending or repeated operation
      app.key('Escape')
      app.key('r')
      assert.equal(app.display(), '') // AC forgot the last result
      app.button('MR').click()
      assert.equal(app.display(), '7')
    })
  }

  test(`${label} long AC alias clears memory after 700 ms`, () => {
    const app = setup()
    for (const digit of ['8', '+', '2', '=']) app.key(digit)
    app.button('M+').click()
    assert.equal(app.key(key, modifiers), true)
    assert.equal(app.memoryHidden(), false)
    // Auto-repeat must not restart the hold timer or dispatch extra clicks.
    assert.equal(app.key(key, { ...modifiers, repeat: true }), true)
    assert.equal(app.button('AC').clicks, 1)
    app.dispatch('keyup', { key: 'Shift' })
    app.runHold()
    assert.equal(app.display(), '')
    assert.equal(app.previous(), '')
    assert.equal(app.history(), '')
    assert.equal(app.memoryHidden(), true)
    app.dispatch('keyup', { key: key === 'c' ? 'C' : 'c' })
    app.button('MR').click()
    assert.equal(app.display(), '0')
  })
}

test('AC alias release cancels its hold and allows a later hold', () => {
  const app = setup()
  app.key('7')
  app.button('M+').click()
  app.key('c')
  app.dispatch('keyup', { key: 'C' })
  app.runHold()
  assert.equal(app.memoryHidden(), false)
  app.key('C')
  app.runHold()
  assert.equal(app.memoryHidden(), true)
})

test('AC aliases leave browser shortcuts, editable targets and composition untouched', () => {
  const app = setup()
  app.key('7')
  app.button('M+').click()
  for (const key of ['c', 'C']) {
    for (const modifiers of [
      { ctrlKey: true }, { metaKey: true }, { altKey: true },
      { defaultPrevented: true }, { isComposing: true },
      { target: { isContentEditable: true } },
      { target: { closest: () => ({}) } }
    ]) assert.equal(app.key(key, modifiers), false)
  }
  app.runHold()
  assert.equal(app.display(), '7')
  assert.equal(app.memoryHidden(), false)
  assert.equal(app.button('AC').clicks, 0)
})

for (const event of ['visibilitychange', 'blur']) {
  test(`${event} cancels an AC alias hold`, () => {
    const app = setup()
    app.key('7')
    app.button('M+').click()
    app.key('c')
    app.dispatch(event)
    app.runHold()
    assert.equal(app.memoryHidden(), false)
  })
}
