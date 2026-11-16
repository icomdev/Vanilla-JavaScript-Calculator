const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')

// Matrix (kept here because #46 permits only this new file):
// | Entry state × action → exit state | Named test (parameterized variants) |
// | Zero memory × MR → zero entry, pending operation retained | MR with empty memory from {state} |
// | Zero/positive/negative memory × error × M+ → unchanged error and memory | M+ on error preserves {memory} memory and the error |
// | Zero memory × MC twice → calculation unchanged | MC when already zero preserves {state} |
// | Zero → positive → zero → negative → MC | indicator follows memory rather than the displayed entry |
// | Signed memory × AC from result/pending/error → memory retained | AC from {state} preserves {memory} memory |
// | Signed memory × full reset from result/pending/error → zero memory | {reset} from {state} clears {memory} memory |

// Same lightweight DOM/VM style as the existing calculator and keyboard suites.
// Exercise actual UI handlers, including both full-reset routes, without real timers.
function setup() {
  const elements = new Map()
  const buttons = new Map()
  const listeners = new Map()
  const timers = new Map()
  let nextTimer = 0
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const handlers = new Map()
    const button = {
      innerText: text,
      focus() {},
      addEventListener(type, handler) { handlers.set(type, handler) },
      dispatch(type, event = {}) { handlers.get(type)(event) },
      click() { handlers.get('click')() }
    }
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    elements.get(selector).push(button)
    buttons.set(text, button)
  }
  elements.set('[data-memory-indicator]', [{ hidden: /data-memory-indicator[^>]*\bhidden\b/.test(html) }])
  for (const name of ['history', 'previous-operand', 'current-operand']) {
    elements.set(`[data-${name}]`, [{ innerText: '' }])
  }
  const document = {
    querySelectorAll: selector => elements.get(selector),
    querySelector: selector => elements.get(selector)[0],
    addEventListener: (type, handler) => listeners.set(type, handler)
  }
  runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), {
    document,
    setTimeout(callback, delay) {
      const id = ++nextTimer
      timers.set(id, { callback, delay })
      return id
    },
    clearTimeout(id) { timers.delete(id) }
  })
  return {
    press(...keys) { keys.forEach(key => buttons.get(key).click()) },
    display: () => document.querySelector('[data-current-operand]').innerText,
    previous: () => document.querySelector('[data-previous-operand]').innerText,
    history: () => document.querySelector('[data-history]').innerText,
    memoryHidden: () => document.querySelector('[data-memory-indicator]').hidden,
    reset(method) {
      if (method === 'Shift+Escape') {
        let prevented = false
        listeners.get('keydown')({
          key: 'Escape', shiftKey: true,
          preventDefault() { prevented = true }
        })
        assert.equal(prevented, true)
      } else {
        buttons.get('AC').dispatch('pointerdown', { button: 0, isPrimary: true })
        assert.equal(timers.size, 1)
        for (const [id, timer] of timers) {
          assert.equal(timer.delay, 700)
          timers.delete(id)
          timer.callback()
        }
        listeners.get('pointerup')()
        buttons.get('AC').click()
      }
    }
  }
}

const error = 'Cannot divide by zero'
const states = [
  ['result', ['6', '+', '2', '=']],
  ['pending operation', ['6', '+', '2']],
  ['error', ['6', '÷', '0', '=']]
]

for (const [state, keys, expectedPrevious] of [
  ['fresh entry', [], ''],
  ['existing entry', ['9'], ''],
  ['pending operation', ['9', '+', '3'], '9 +'],
  ['error', ['9', '÷', '0', '='], '']
]) {
  test(`MR with empty memory from ${state}`, () => {
    const app = setup()
    app.press(...keys, 'MR')
    assert.equal(app.display(), '0')
    assert.equal(app.previous(), expectedPrevious)
    assert.equal(app.memoryHidden(), true)
    if (expectedPrevious) {
      app.press('=')
      assert.equal(app.display(), '9')
    } else {
      app.press('+', '2', '=')
      assert.equal(app.display(), '2')
    }
  })
}

for (const memory of ['0', '7', '-7']) {
  test(`M+ on error preserves ${memory} memory and the error`, () => {
    const app = setup()
    app.press(...memory, 'M+', 'AC', '6', '÷', '0', '=')
    assert.equal(app.display(), error)
    app.press('M+', 'M+')
    assert.equal(app.display(), error)
    assert.equal(app.previous(), '')
    assert.equal(app.memoryHidden(), memory === '0')
    app.press('MR')
    assert.equal(app.display(), memory)
    assert.equal(app.memoryHidden(), memory === '0')
  })
}

for (const [state, keys] of states) {
  test(`MC when already zero preserves ${state}`, () => {
    const app = setup()
    app.press(...keys)
    const before = [app.display(), app.previous(), app.history()]
    app.press('MC', 'MC')
    assert.deepEqual([app.display(), app.previous(), app.history()], before)
    assert.equal(app.memoryHidden(), true)
    if (state === 'pending operation') {
      app.press('=')
      assert.equal(app.display(), '8')
    } else if (state === 'result') {
      app.press('=')
      assert.equal(app.display(), '10')
    }
    app.press('MR')
    assert.equal(app.display(), '0')
  })
}

test('indicator follows memory rather than the displayed entry', () => {
  const app = setup()
  assert.equal(app.memoryHidden(), true)
  app.press('0', 'M+')
  assert.equal(app.memoryHidden(), true)
  app.press('AC', '4', 'M+')
  assert.equal(app.memoryHidden(), false)
  app.press('AC', '0')
  assert.equal(app.memoryHidden(), false)
  app.press('AC', '-', '4', 'M+')
  assert.equal(app.display(), '-4')
  assert.equal(app.memoryHidden(), true)
  app.press('MR')
  assert.equal(app.display(), '0')
  app.press('AC', '-', '4', 'M+')
  assert.equal(app.memoryHidden(), false)
  app.press('MC')
  assert.equal(app.display(), '-4')
  assert.equal(app.memoryHidden(), true)
})

for (const memory of ['7', '-7']) {
  for (const [state, keys] of states) {
    test(`AC from ${state} preserves ${memory} memory`, () => {
      const app = setup()
      app.press(...memory, 'M+', 'AC', ...keys, 'AC', 'AC')
      assert.equal(app.display(), '')
      assert.equal(app.previous(), '')
      assert.equal(app.history(), '')
      assert.equal(app.memoryHidden(), false)
      app.press('MR')
      assert.equal(app.display(), memory)
      app.press('=', '=')
      assert.equal(app.display(), memory)
    })

    for (const reset of ['Shift+Escape', 'long AC']) {
      test(`${reset} from ${state} clears ${memory} memory`, () => {
        const app = setup()
        app.press(...memory, 'M+', 'AC', ...keys)
        assert.equal(app.memoryHidden(), false)
        app.reset(reset)
        assert.equal(app.display(), '')
        assert.equal(app.previous(), '')
        assert.equal(app.history(), '')
        assert.equal(app.memoryHidden(), true)
        app.press('MR', '=')
        assert.equal(app.display(), '0')
        app.press('AC', '3', '=')
        assert.equal(app.display(), '3')
      })
    }
  }
}
