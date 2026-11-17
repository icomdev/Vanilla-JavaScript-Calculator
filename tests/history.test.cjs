const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

function setup(options = {}) {
  const writes = [], textareas = []
  const documentHandlers = {}
  const timers = new Map()
  let now = 0, timerId = 0
  const focus = { restored: 0, focus() { this.restored++ } }
  const elements = new Map()
  const element = selector => {
    if (!elements.has(selector)) {
      elements.set(selector, {
        innerText: selector === '[data-history-copy]' ? 'Copy' : '',
        disabled: selector === '[data-history-copy]',
        addEventListener(event, handler) { this[event] = handler }
      })
    }
    return elements.get(selector)
  }
  const context = vm.createContext({
    navigator: options.navigator ?? { clipboard: { async writeText(text) { writes.push(text) } } },
    setTimeout(handler, delay) { const id = ++timerId; timers.set(id, { handler, at: now + delay }); return id },
    clearTimeout(id) { timers.delete(id) },
    document: {
      querySelector: element, querySelectorAll: () => [],
      addEventListener(event, handler) { documentHandlers[event] = handler },
      activeElement: focus,
      body: { appendChild(node) { textareas.push(node); node.attached = true } },
      createElement(tag) {
        assert.equal(tag, 'textarea')
        return { style: {}, setAttribute() {}, select() { this.selected = true }, remove() { this.attached = false } }
      },
      execCommand(command) {
        assert.equal(command, 'copy')
        assert.equal(textareas.at(-1).selected, true)
        if (options.fallbackThrows) throw new Error('copy blocked')
        if (options.fallbackFails) return false
        writes.push(textareas.at(-1).value)
        return true
      }
    }
  })
  vm.runInContext(fs.readFileSync('script.js', 'utf8'), context)
  return {
    run: code => vm.runInContext(code, context),
    click: selector => element(selector).click(),
    text: selector => element(selector).innerText,
    button: () => element('[data-history-copy]'),
    writes, textareas, focus,
    keydown: event => documentHandlers.keydown(event),
    advance(ms) {
      now += ms
      for (const [id, timer] of timers) {
        if (timer.at <= now) { timers.delete(id); timer.handler() }
      }
    },
    complete(left = '12', operator = '+', right = '7') {
      vm.runInContext(`calculator.currentOperand = '${left}'; calculator.chooseOperation('${operator}'); calculator.appendNumber('${right}')`, context)
      element('[data-equals]').click()
    }
  }
}

test('equals records the expression and C clears history and operands', () => {
  const app = setup()
  app.run("calculator.appendNumber('12'); calculator.chooseOperation('+'); calculator.appendNumber('7')")
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '12+7=19')
  assert.equal(app.text('[data-current-operand]'), '19')
  app.click('[data-all-clear]')
  assert.equal(app.text('[data-history]'), '')
  assert.equal(app.text('[data-current-operand]'), '')
  assert.equal(app.text('[data-previous-operand]'), '')
})

test('each completed equals replaces history; incomplete equals preserves it', () => {
  const app = setup()
  for (const [left, operator, right, result] of [
    ['12', '+', '7', '19'], ['9', '-', '12', '-3'],
    ['2.5', '*', '4', '10'], ['9', '÷', '2', '4.5']
  ]) {
    app.run(`calculator.currentOperand = '${left}'; calculator.chooseOperation('${operator}'); calculator.appendNumber('${right}')`)
    app.click('[data-equals]')
    assert.equal(app.text('[data-history]'), `${left}${operator}${right}=${result}`)
  }
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '9÷2=4.5')
  app.run("calculator.chooseOperation('+')")
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '9÷2=4.5')
})

test('chained operations do not update history until equals', () => {
  const app = setup()
  app.run("calculator.appendNumber('2'); calculator.chooseOperation('+'); calculator.appendNumber('3'); calculator.chooseOperation('*'); calculator.updateDisplay()")
  assert.equal(app.text('[data-history]'), '')
  app.run("calculator.appendNumber('4')")
  app.click('[data-equals]')
  assert.equal(app.text('[data-history]'), '5*4=20')
})

test('history panel has one native Copy button initially disabled', () => {
  const html = fs.readFileSync('index.html', 'utf8')
  assert.equal([...html.matchAll(/data-history-copy/g)].length, 1)
  assert.match(html, /<button\b[^>]*data-history-copy[^>]*disabled[^>]*>Copy<\/button>/)
  assert.match(html, /data-copy-panel[\s\S]*data-history[\s\S]*data-history-copy[\s\S]*<\/div>/)
})

test('empty history disables copy until completed equals; AC disables and resets confirmation', async () => {
  const app = setup()
  assert.equal(app.button().disabled, true)
  await app.click('[data-history-copy]')
  app.run("calculator.appendNumber('2'); calculator.chooseOperation('+'); calculator.updateDisplay()")
  app.click('[data-equals]')
  assert.equal(app.button().disabled, true)
  assert.deepEqual(app.writes, [])
  app.run("calculator.appendNumber('3')")
  app.click('[data-equals]')
  assert.equal(app.button().disabled, false)
  await app.click('[data-history-copy]')
  app.click('[data-all-clear]')
  assert.equal(app.button().disabled, true)
  assert.equal(app.button().innerText, 'Copy')
  app.complete('4', '*', '2')
  await app.click('[data-history-copy]')
  assert.equal(app.writes.at(-1), '4*2 = 8')
})

for (const path of ['clipboard', 'unavailable', 'rejected', 'throws']) {
  test(`copy formats session lines via ${path} without changing calculator state`, async () => {
    const options = path === 'clipboard' ? {} : { navigator: path === 'unavailable' ? {} : {
      clipboard: { writeText() { if (path === 'throws') throw new Error('blocked'); return Promise.reject(new Error('denied')) } }
    } }
    const app = setup(options)
    app.complete()
    app.complete('2.50', '*', '-4')
    app.click('[data-equals]')
    app.run("calculator.chooseOperation('+'); calculator.updateDisplay()")
    app.click('[data-equals]')
    const snapshot = 'JSON.stringify([calculator.currentOperand, calculator.previousOperand, calculator.operation, calculator.history, calculator.memory, calculator.lastOperation, calculator.lastOperand])'
    const before = app.run(snapshot)
    await app.click('[data-history-copy]')
    assert.deepEqual(app.writes, ['12+7 = 19\n2.50*-4 = -10'])
    assert.equal(app.text('[data-history]'), '2.50*-4=-10')
    assert.equal(app.run(snapshot), before)
    assert.equal(app.button().innerText, 'Copied')
    assert.equal(app.textareas.length, path === 'clipboard' ? 0 : 1)
    if (path !== 'clipboard') {
      assert.equal(app.textareas[0].attached, false)
      assert.equal(app.focus.restored, 1)
    }
  })
}

test('confirmation resets after one second and a second copy restarts its timer', async () => {
  const app = setup()
  app.complete()
  await app.click('[data-history-copy]')
  app.advance(999)
  assert.equal(app.button().innerText, 'Copied')
  await app.click('[data-history-copy]')
  app.advance(1)
  assert.equal(app.button().innerText, 'Copied')
  app.advance(999)
  assert.equal(app.button().innerText, 'Copy')
  assert.equal(app.button().disabled, false)
})

for (const failure of ['fallbackFails', 'fallbackThrows']) {
  test(`${failure} cleans up textarea without claiming success`, async () => {
    const app = setup({ navigator: {}, [failure]: true })
    app.complete()
    await app.click('[data-history-copy]')
    assert.equal(app.button().innerText, 'Copy')
    assert.equal(app.button().disabled, false)
    assert.equal(app.textareas[0].attached, false)
    assert.equal(app.focus.restored, 1)
    assert.deepEqual(app.writes, [])
  })
}

test('clearing while clipboard is pending cannot restore stale confirmation', async () => {
  let resolve
  const app = setup({ navigator: { clipboard: { writeText: () => new Promise(done => { resolve = done }) } } })
  app.complete()
  const copying = app.click('[data-history-copy]')
  app.click('[data-all-clear]')
  resolve()
  await copying
  assert.equal(app.button().disabled, true)
  assert.equal(app.button().innerText, 'Copy')
})

test('editing, memory, sqrt and chaining preserve session; errors and full reset clear it', async () => {
  const app = setup()
  app.complete('4', '+', '5')
  app.run("calculator.clearEntry(); calculator.sqrt(); calculator.addToMemory(); calculator.recallMemory(); calculator.chooseOperation('+'); calculator.appendNumber('2'); calculator.chooseOperation('*'); calculator.appendNumber('3')")
  app.click('[data-equals]')
  await app.click('[data-history-copy]')
  assert.deepEqual(app.writes, ['4+5 = 9\n5*3 = 15'])
  app.complete('1', '÷', '0')
  assert.equal(app.button().disabled, true)
  app.run('calculator.clear()')
  app.complete()
  app.run('calculator.fullClear(); calculator.updateDisplay()')
  assert.equal(app.button().disabled, true)
  await app.click('[data-history-copy]')
  assert.equal(app.writes.length, 1)
})


test('Enter on Copy retains native activation rather than computing equals', () => {
  const app = setup()
  app.complete()
  const before = app.run('calculator.currentOperand')
  let prevented = false
  app.keydown({ key: 'Enter', target: app.button(), preventDefault() { prevented = true } })
  assert.equal(prevented, false)
  assert.equal(app.run('calculator.currentOperand'), before)
})
