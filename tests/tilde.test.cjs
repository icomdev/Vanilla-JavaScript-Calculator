// Run with: node --test tests/tilde.test.cjs
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
      addEventListener(type, handler) { handlers.set(type, handler) },
      focus() { focused = this },
      click() { handlers.get('click')() }
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
    sqrt: () => get('[data-sqrt]'),
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

for (const path of ['r', '√']) {
  for (const [entry, expected] of [
    ['9', '3'], ['0', '0'], ['0.25', '0.5'], ['0.01', '0.1'],
    ['0.0004', '0.02'], ['1000000', '1,000'],
    ['2', '~1.4142135623730951'], ['3', '~1.7320508075688772'],
    ['0.2', '~0.4472135954999579'], ['0.00000002', '~0.0001414213562373095']
  ]) {
    test(`${path} sqrt of ${entry} renders ${expected} without changing numeric input`, () => {
      const app = setup()
      app.press(...entry)
      if (path === 'r') app.key(path)
      else app.press(path)
      assert.equal(app.display(), expected)
      app.press('M+', 'MR')
      assert.equal(app.display(), expected.replace('~', ''))
    })
  }
}

for (const operator of ['+', '-', '*', '÷']) {
  for (const side of ['left', 'right']) {
    test(`approximate ${side} operand survives ${operator}, repeat equals and operator chaining`, () => {
      const app = setup()
      if (side === 'left') {
        app.press('2', '√', operator)
        assert.equal(app.display(), '')
        assert.equal(app.previous(), `~1.4142135623730951 ${operator}`)
        app.press('2')
        assert.equal(app.display(), '2')
      } else {
        app.press('2', operator, '2', '√')
        assert.equal(app.previous(), `2 ${operator}`)
      }
      app.press('=')
      assert.ok(app.display().startsWith('~'))
      assert.ok(!app.history().includes('~'), 'marker is presentation only')
      app.press('=')
      assert.ok(app.display().startsWith('~'))
      app.press('+', '1', '=')
      assert.ok(app.display().startsWith('~'))
      app.press('7')
      assert.equal(app.display(), '7')
    })
  }
}

for (const [action, expected] of [
  ['digit', '7'], ['decimal', '1.4142135623730951'],
  ['DEL', '1.414213562373095'], ['⌫', '1.414213562373095'],
  ['Escape', ''], ['AC', ''], ['full reset', ''], ['MR', '0']
]) {
  test(`approximate result then ${action} clears only the replaced entry marker`, () => {
    const app = setup()
    app.press('1', '+', '1', '=', '√')
    assert.equal(app.display(), '~1.4142135623730951')
    if (action === 'digit') app.press('7')
    else if (action === 'decimal') app.press('.') // Rejected duplicate: not a new entry.
    else if (action === 'Escape') app.key('Escape')
    else if (action === 'full reset') app.key('Escape', { shiftKey: true })
    else app.press(action)
    assert.equal(app.display(), action === 'decimal' ? `~${expected}` : expected)
  })
}

test('editing a rooted entry starts a bare entry; ordinary fractions remain bare', () => {
  const app = setup()
  app.press('2', '√', '7')
  assert.equal(app.display(), '1.41421356237309517')
  app.press('AC', '1', '÷', '3', '=')
  assert.equal(app.display(), '0.3333333333333333')
})

test('unary sign, ignored negative sqrt and repeated sqrt preserve approximation', () => {
  const app = setup()
  app.press('2', '√', '%')
  assert.equal(app.display(), '~-1.4142135623730951')
  app.key('r')
  assert.equal(app.display(), '~-1.4142135623730951')
  app.press('%', '√')
  assert.equal(app.display(), '~1.189207115002721')
})

for (const clear of ['Escape', 'DEL']) {
  test(`saved approximate result survives ${clear} then sqrt fallback`, () => {
    const app = setup()
    app.press('2', '√')
    if (clear === 'Escape') app.key(clear)
    else { // Delete the whole entry without replacing the saved result.
      for (let i = 0; i < 18; i++) app.press('DEL')
    }
    assert.equal(app.display(), '')
    app.press('√')
    assert.equal(app.display(), '~1.189207115002721')
  })
}

test('division error clears approximation and recovery stays bare', () => {
  const app = setup()
  app.press('2', '√', '÷', '0', '=')
  assert.equal(app.display(), 'Cannot divide by zero')
  app.key('r')
  assert.equal(app.display(), 'Cannot divide by zero')
  app.press('9', '√')
  assert.equal(app.display(), '3')
})

test('memory actions and rejected decimal preserve marker until recall replaces entry', () => {
  const app = setup()
  app.press('2', '√', 'M+', 'MC', '.')
  assert.equal(app.display(), '~1.4142135623730951')
  app.press('MR')
  assert.equal(app.display(), '0')
})

for (const operator of ['+', '-', '*', '÷']) {
  test(`intermediate ${operator} chaining carries the marker through a new right entry`, () => {
    const app = setup()
    app.press('2', '√', operator, '2', '+')
    assert.equal(app.display(), '')
    assert.ok(app.previous().startsWith('~'))
    app.press('9')
    app.key('Escape')
    app.press('3', '=')
    assert.ok(app.display().startsWith('~'))
  })
}

test('new standalone entry does not inherit marker but repeat equals retains its approximate operand', () => {
  const app = setup()
  app.press('1', '+', '2', '√', '=', '7')
  assert.equal(app.display(), '7')
  app.press('=')
  assert.equal(app.display(), '~8.414213562373096')
  app.press('AC', '7', '+', '2', '=')
  assert.equal(app.display(), '9')
})

for (const [entry, expected] of [
  ['0.00000001', '0.0001'], ['10000000000000000000000', '100,000,000,000'],
  ['0.000000000000000000000001', '1e-12']
]) {
  test(`scientific-notation input ${entry} has bare rational root ${expected}`, () => {
    const app = setup()
    app.press(...entry, '√')
    assert.equal(app.display(), expected)
  })
}
