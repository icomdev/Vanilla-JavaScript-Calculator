const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

// Exercise the real event handlers with lightweight DOM elements from index.html.
function setup() {
  const html = readFileSync(path.join(__dirname, '../index.html'), 'utf8')
  const elements = [...html.matchAll(/<(button|div|span)\b([^>]*)>([^<]*)/g)].map(([, tagName, attributes, text]) => ({
    tagName,
    attributes,
    getAttribute(name) {
      const match = attributes.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))
      return match ? match[1] : null
    },
    innerText: text.trim(),
    hidden: /\bhidden\b/.test(attributes),
    addEventListener(event, handler) { this[event] = handler }
  }))
  const listeners = new Map()
  const timers = new Map()
  let now = 0
  let nextTimer = 0
  const document = {
    addEventListener(event, handler) { listeners.set(event, handler) },
    querySelectorAll(selector) {
      return elements.filter(element => element.attributes.includes(selector.slice(1, -1)))
    },
    querySelector(selector) {
      const element = this.querySelectorAll(selector)[0]
      assert.ok(element, `Missing element: ${selector}`)
      return element
    }
  }
  vm.runInNewContext(readFileSync(path.join(__dirname, '../script.js'), 'utf8'), {
    document,
    setTimeout(callback, delay) {
      const id = ++nextTimer
      timers.set(id, { callback, at: now + delay })
      return id
    },
    clearTimeout(id) { timers.delete(id) }
  })
  return {
    elements,
    pointer(event) {
      if (event === 'pointerdown') document.querySelector('[data-all-clear]').pointerdown({ button: 0, isPrimary: true })
      else if (event === 'pointerleave') document.querySelector('[data-all-clear]').pointerleave()
      else listeners.get(event)()
    },
    advance(ms) {
      now += ms
      for (const [id, timer] of timers) {
        if (timer.at <= now) {
          timers.delete(id)
          timer.callback()
        }
      }
    },
    element(attribute) { return document.querySelector(`[data-${attribute}]`) },
    click(attribute) { document.querySelector(`[data-${attribute}]`).click() },
    type(value) {
      for (const digit of value) {
        const button = document.querySelectorAll('[data-number]').find(element => element.innerText === digit)
        button.click()
      }
    },
    operation(value) {
      document.querySelectorAll('[data-operation]').find(element => element.innerText === value).click()
    },
    display() { return document.querySelector('[data-current-operand]').innerText },
    memoryHidden() { return document.querySelector('[data-memory-indicator]').hidden }
  }
}

test('M+ then AC then MR restores the entry and preserves the indicator', () => {
  const app = setup()
  assert.equal(app.memoryHidden(), true)
  app.type('1234.5')
  app.click('memory-add')
  assert.equal(app.display(), '1,234.5')
  assert.equal(app.memoryHidden(), false)
  app.click('all-clear')
  assert.equal(app.display(), '')
  assert.equal(app.memoryHidden(), false)
  app.click('memory-recall')
  assert.equal(app.display(), '1,234.5')
})

test('M+ accumulates and MC clears only memory', () => {
  const app = setup()
  app.type('5')
  app.click('memory-add')
  app.click('memory-add')
  app.click('memory-recall')
  assert.equal(app.display(), '10')
  app.click('memory-clear')
  assert.equal(app.display(), '10')
  assert.equal(app.memoryHidden(), true)
  app.click('memory-recall')
  assert.equal(app.display(), '0')
})

test('M+ stores the result after equals', () => {
  const app = setup()
  app.type('6')
  app.operation('*')
  app.type('7')
  app.click('equals')
  app.click('memory-add')
  app.click('all-clear')
  app.click('memory-recall')
  assert.equal(app.display(), '42')
})

test('indicator is hidden for zero and cancellation, visible for negative memory', () => {
  const app = setup()
  app.type('0')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), true)
  app.operation('-')
  app.type('5')
  app.click('equals')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), false)
  app.click('all-clear')
  app.type('5')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), true)
  app.click('memory-recall')
  assert.equal(app.display(), '0')
})

test('MR replaces the entry without losing a pending operation', () => {
  const app = setup()
  app.type('3')
  app.click('memory-add')
  app.click('all-clear')
  app.type('10')
  app.operation('+')
  app.type('99')
  app.click('memory-recall')
  assert.equal(app.display(), '3')
  app.click('equals')
  assert.equal(app.display(), '13')
})

test('empty, incomplete and non-finite entries do not poison memory', () => {
  const app = setup()
  app.click('memory-add')
  app.type('.')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), true)
  app.click('all-clear')
  app.type('8')
  app.click('memory-add')
  app.operation('÷')
  app.type('0')
  app.click('equals')
  app.click('memory-add')
  app.click('memory-recall')
  assert.equal(app.display(), '8')
})

test('decimal input works after storing a computed result', () => {
  const app = setup()
  app.type('1')
  app.operation('+')
  app.type('2')
  app.click('equals')
  app.click('memory-add')
  app.type('.5')
  assert.equal(app.display(), '3.5')
})

test('calculator and display expose a named group and one atomic polite live region', () => {
  const { elements } = setup()
  const container = elements.find(element => element.getAttribute('class') === 'calculator-grid')
  assert.equal(container.getAttribute('role'), 'group')
  assert.equal(container.getAttribute('aria-label'), 'Calculator')
  const status = elements.find(element => element.getAttribute('class') === 'announcements')
  assert.equal(status.getAttribute('aria-live'), 'polite')
  assert.equal(status.getAttribute('aria-atomic'), 'true')
  // Only concise status text is live; history remains available for navigation.
  assert.deepEqual(elements.filter(element => element.getAttribute('aria-live')), [status])
})

test('every button has a readable name, with explicit names for symbolic controls', () => {
  const { elements } = setup()
  const symbolicNames = new Map([
    ['M+', 'Add to memory'], ['MR', 'Recall memory'], ['MC', 'Clear memory'],
    ['%', 'Percent'], ['AC', 'All clear'], ['DEL', 'Delete last digit'],
    ['√', 'Square root'], ['⌫', 'Backspace'], ['+/-', 'Negate'], ['÷', 'Divide'], ['*', 'Multiply'],
    ['+', 'Add'], ['-', 'Subtract'], ['.', 'Decimal point'], ['=', 'Equals']
  ])
  const buttons = elements.filter(element => element.tagName === 'button')
  assert.equal(buttons.length, 26)
  for (const button of buttons) {
    const label = button.getAttribute('aria-label')
    assert.ok((label || button.innerText).trim(), 'Every button needs an accessible name')
    if (symbolicNames.has(button.innerText)) {
      assert.equal(label, symbolicNames.get(button.innerText))
    } else {
      assert.match(button.innerText, /^(?:[0-9]|Copy)$/)
    }
  }
})

test('memory and history labels survive calculations, recall, and clear', () => {
  const app = setup()
  const memory = app.element('memory-indicator')
  const history = app.element('history')
  const assertLabels = () => {
    assert.equal(memory.getAttribute('aria-label'), 'Memory state')
    assert.equal(memory.getAttribute('role'), 'img')
    assert.equal(history.getAttribute('aria-label'), 'History')
    assert.equal(history.getAttribute('role'), 'group')
  }
  assertLabels()
  app.type('6')
  app.operation('*')
  app.type('7')
  app.click('equals')
  assert.equal(history.innerText, '6*7=42')
  app.click('memory-add')
  assert.equal(memory.hidden, false)
  assertLabels()
  app.click('all-clear')
  assert.equal(history.innerText, '')
  app.click('memory-recall')
  assert.equal(app.display(), '42')
  assertLabels()
  app.click('memory-clear')
  assert.equal(memory.hidden, true)
  assertLabels()
})

// #101: memory state × recall/clear/hold transitions, using the real UI handlers.
test('memory badge sits above the memory row and has a visible active marker', () => {
  const app = setup()
  const badge = app.element('memory-indicator')
  assert.equal(badge.innerText, '● M')
  assert.equal(badge.hidden, true)
  const css = readFileSync(path.join(__dirname, '../styles.css'), 'utf8')
  const rule = css.match(/\.output \.memory-indicator\s*\{([^}]+)\}/)[1]
  assert.match(rule, /bottom:\s*10px/)
  assert.match(rule, /left:\s*10px/)
  assert.doesNotMatch(rule, /top:/)
})

for (const value of ['7', '-7']) {
  for (const action of ['memory-recall', 'memory-clear', 'all-clear', 'long AC']) {
    test(`active badge after storing ${value} then ${action} reflects memory, not entry`, () => {
      const app = setup()
      if (value.startsWith('-')) app.operation('-')
      app.type('7')
      app.click('memory-add')
      assert.equal(app.memoryHidden(), false)
      app.click('all-clear')
      app.type('99')
      assert.equal(app.memoryHidden(), false)
      if (action === 'long AC') {
        app.pointer('pointerdown')
        app.advance(699)
        assert.equal(app.memoryHidden(), false)
        assert.equal(app.display(), '99')
        app.advance(1)
        assert.equal(app.memoryHidden(), true)
        assert.equal(app.display(), '')
        app.pointer('pointerup')
        app.click('all-clear') // Browsers dispatch click after a completed hold.
      } else {
        app.click(action)
        assert.equal(app.display(), action === 'memory-recall' ? value : action === 'all-clear' ? '' : '99')
      }
      const cleared = action === 'memory-clear' || action === 'long AC'
      assert.equal(app.memoryHidden(), cleared)
      app.click('memory-recall')
      assert.equal(app.display(), cleared ? '0' : value)
      assert.equal(app.memoryHidden(), cleared)
    })
  }
}

for (const cancel of ['pointerup', 'pointercancel', 'pointerleave']) {
  test(`cancelled AC hold via ${cancel} keeps the badge active and allows a later full clear`, () => {
    const app = setup()
    app.type('5')
    app.click('memory-add')
    app.pointer('pointerdown')
    app.advance(699)
    app.pointer(cancel)
    app.advance(1)
    app.click('all-clear')
    assert.equal(app.memoryHidden(), false)
    app.click('memory-recall')
    assert.equal(app.display(), '5')
    app.pointer('pointerdown')
    app.advance(700)
    assert.equal(app.memoryHidden(), true)
    app.click('memory-recall')
    assert.equal(app.display(), '0')
  })
}

test('zero memory stays inactive through recall, MC and long AC; storing again reactivates it', () => {
  const app = setup()
  for (const action of ['memory-recall', 'memory-clear']) {
    app.click(action)
    assert.equal(app.memoryHidden(), true)
  }
  app.pointer('pointerdown')
  app.advance(700)
  assert.equal(app.memoryHidden(), true)
  app.type('3')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), false)
})

test('memory badge starts off and has a readable description', () => {
  const app = setup()
  const badge = app.element('memory-indicator')
  assert.match(badge.innerText, /●/)
  assert.equal(badge.hidden, true)
  assert.equal(badge.getAttribute('title'), 'Memory contains a value')
})

test('holding AC for 700 ms clears memory and its indicator', () => {
  const app = setup()
  app.type('42')
  app.click('memory-add')
  assert.equal(app.memoryHidden(), false)
  app.element('all-clear').pointerdown({ button: 0, isPrimary: true })
  app.advance(699)
  assert.equal(app.memoryHidden(), false)
  app.advance(1)
  assert.equal(app.memoryHidden(), true)
  assert.equal(app.display(), '')
  app.pointer('pointerup')
  app.click('all-clear')
  app.click('memory-recall')
  assert.equal(app.display(), '0')
  assert.equal(app.memoryHidden(), true)
})

test('releasing AC before the hold threshold preserves the indicator', () => {
  const app = setup()
  app.type('7')
  app.click('memory-add')
  app.element('all-clear').pointerdown({ button: 0, isPrimary: true })
  app.advance(699)
  app.pointer('pointerup')
  app.click('all-clear')
  app.advance(1)
  app.click('memory-recall')
  assert.equal(app.display(), '7')
  assert.equal(app.memoryHidden(), false)
})

