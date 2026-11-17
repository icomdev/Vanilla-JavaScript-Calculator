// Run with: node --test tests/sqrt.test.js
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

for (const [entry, expected] of [['9', '3'], ['0', '0'], ['0.25', '0.5']]) {
  test(`sqrt transforms current entry ${entry} into ${expected}`, () => {
    const app = setup()
    app.press(...entry, '√')
    assert.equal(app.display(), expected)
    assert.equal(app.previous(), '')
  })
}

for (const clear of ['Escape', 'DEL']) {
  test(`sqrt uses last result after ${clear} clears the entry`, () => {
    const app = setup()
    app.press('4', '+', '5', '=')
    if (clear === 'Escape') app.key(clear)
    else app.press(clear)
    assert.equal(app.display(), '')
    app.press('√')
    assert.equal(app.display(), '3')
    assert.equal(app.history(), '4+5=9')
    app.key('Escape')
    app.press('√')
    assert.equal(app.display(), '~1.7320508075688772')
  })
}

for (const [operator, expected] of [['+', '19'], ['-', '13'], ['*', '48'], ['÷', '5.333333333333333']]) {
  test(`sqrt preserves pending ${operator} and transforms only the right entry`, () => {
    const app = setup()
    app.press('1', '6', operator, '9', '√')
    assert.equal(app.display(), '3')
    assert.equal(app.previous(), `16 ${operator}`)
    app.press('=')
    assert.equal(app.display(), expected)
  })
}

test('sqrt prefers the current entry over an older result and preserves memory', () => {
  const app = setup()
  app.press('4', '+', '5', '=', 'M+', '1', '6', '√')
  assert.equal(app.display(), '4')
  app.press('MR')
  assert.equal(app.display(), '9')
})

test('sqrt on a result keeps fresh-digit and repeat-equals behavior', () => {
  const app = setup()
  app.press('4', '+', '5', '=', '√')
  assert.equal(app.display(), '3')
  app.press('=')
  assert.equal(app.display(), '8')
  app.press('√', '7')
  assert.equal(app.display(), '7')
})

test('sqrt with an empty pending entry uses the last result without losing the operator', () => {
  const app = setup()
  app.press('4', '+', '5', '=', '+', '√')
  assert.equal(app.display(), '3')
  assert.equal(app.previous(), '9 +')
  app.press('=')
  assert.equal(app.display(), '12')
})

for (const [state, before, expected] of [
  ['fresh', [], ''],
  ['cleared without a result', ['9', 'Escape'], ''],
  ['AC reset', ['4', '+', '5', '=', 'AC'], ''],
  ['full reset', ['4', '+', '5', '=', 'ShiftEscape'], ''],
  ['negative', ['-', '9'], '-9'],
  ['lone minus', ['-'], '-'],
  ['error', ['4', '+', '5', '=', '÷', '0', '='], 'Cannot divide by zero']
]) {
  test(`sqrt leaves ${state} state unchanged`, () => {
    const app = setup()
    for (const key of before) {
      if (key === 'Escape') app.key(key)
      else if (key === 'ShiftEscape') app.key('Escape', { shiftKey: true })
      else app.press(key)
    }
    app.press('√')
    assert.equal(app.display(), expected)
  })
}

test('r focuses and clicks the square-root key; browser shortcuts remain untouched', () => {
  const app = setup()
  app.press('9')
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(app.key('r', { [modifier]: true }), false)
    assert.equal(app.display(), '9')
  }
  assert.equal(app.key('r'), true)
  assert.equal(app.display(), '3')
  assert.equal(app.focused(), app.sqrt())
})

test('sqrt is one accessible operator-style button using the shared button styling', () => {
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  const buttons = [...html.matchAll(/<button\b[^>]*\bdata-sqrt\b[^>]*>√<\/button>/g)]
  assert.equal(buttons.length, 1)
  assert.match(buttons[0][0], /aria-label="Square root"/)
  assert.doesNotMatch(buttons[0][0], /data-operation|class=|style=/)
  const css = readFileSync(`${__dirname}/../styles.css`, 'utf8')
  assert.match(css, /\.calculator-grid > button\s*\{/)
})
