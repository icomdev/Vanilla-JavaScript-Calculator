// Run with: node --test tests/sign.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

// Issue #51: keep the sweep matrix here to honor the new-file-only scope.
// Names use {...} for parameterized variants, as in docs/TEST-SWEEP.md.
// | Entry state × operation → exit state | Test name |
// | --- | --- |
// | Nonzero integer/decimal × +/- twice → opposite/original sign | sign toggle round-trips {entry} without changing its digits |
// | Zero × +/- twice → unchanged entry | sign toggle leaves zero entry {entry} unchanged |
// | Empty fresh/cleared/pending × +/- → empty, next entry unsigned | sign toggle on {state} is a no-op before new digits |
// | Bare unary sign × +/- → sign retained, next digits negative | sign toggle preserves an unfinished unary minus |
// | Pending operator + signed right entry × +/- → signed computation | sign toggle edits only the right operand of {operation} |
// | Result × +/- twice → unchanged, repeat equals retained; digit → active | sign toggle is inactive on {kind} results until a new digit entry |
// | Result × decimal entry → active sign toggle | decimal entry reactivates sign toggle after a result |
// | Recalled positive/negative/zero × +/- → entry sign changes only | sign toggle on recalled {kind} memory preserves stored memory |
// | Pending operation + recall × +/- → signed right operand | sign toggle on recalled memory preserves a pending operation |
// | Result + recall × +/- → inactive until digit entry | memory recall after a result does not reactivate sign toggle |

// Exercise the real DOM click handlers without dependencies or a browser.
function createCalculator() {
  const elements = new Map()
  const buttons = new Map()
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8')
  for (const [, attribute, text] of html.matchAll(/<button (data-[\w-]+)[^>]*>([^<]+)<\/button>/g)) {
    const button = {
      innerText: text,
      addEventListener(event, handler) { this[event] = handler }
    }
    const selector = `[${attribute}]`
    if (!elements.has(selector)) elements.set(selector, [])
    elements.get(selector).push(button)
    buttons.set(text, button)
  }
  const current = { innerText: '' }
  const previous = { innerText: '' }
  const memory = { hidden: true }
  const history = { innerText: '' }
  elements.set('[data-current-operand]', [current])
  elements.set('[data-previous-operand]', [previous])
  elements.set('[data-memory-indicator]', [memory])
  elements.set('[data-history]', [history])
  runInNewContext(readFileSync(`${__dirname}/../script.js`, 'utf8'), {
    document: {
      addEventListener() {},
      querySelectorAll: selector => elements.get(selector),
      querySelector: selector => elements.get(selector)[0]
    }
  })
  return {
    current, previous, memory, history,
    press(...keys) { keys.forEach(key => buttons.get(key).click()) }
  }
}

for (const [entry, initial, toggled] of [
  ['12', '12', '-12'],
  ['-12', '-12', '12'],
  ['12.', '12.', '-12.'],
  ['-12.50', '-12.50', '12.50'],
  ['0.05', '0.05', '-0.05'],
  ['1234.50', '1,234.50', '-1,234.50']
]) {
  test(`sign toggle round-trips ${entry} without changing its digits`, () => {
    const calculator = createCalculator()
    calculator.press(...entry)
    assert.equal(calculator.current.innerText, initial)
    calculator.press('+/-')
    assert.equal(calculator.current.innerText, toggled)
    calculator.press('+/-')
    assert.equal(calculator.current.innerText, initial)
  })
}

for (const entry of ['0', '0.', '0.00', '-0', '-0.00']) {
  test(`sign toggle leaves zero entry ${entry} unchanged`, () => {
    const calculator = createCalculator()
    calculator.press(...entry)
    const before = calculator.current.innerText
    calculator.press('+/-', '+/-')
    assert.equal(calculator.current.innerText, before)
  })
}

for (const [state, setup, pending] of [
  ['fresh entry', [], ''],
  ['cleared entry', ['4', 'AC'], ''],
  ...['+', '-', '*', '÷'].map(operation => [
    `empty pending ${operation} entry`, ['8', operation], `8 ${operation}`
  ])
]) {
  test(`sign toggle on ${state} is a no-op before new digits`, () => {
    const calculator = createCalculator()
    calculator.press(...setup, '+/-', '+/-')
    assert.equal(calculator.current.innerText, '')
    assert.equal(calculator.previous.innerText, pending)
    calculator.press('3')
    assert.equal(calculator.current.innerText, '3')
    assert.equal(calculator.previous.innerText, pending)
  })
}

test('sign toggle preserves an unfinished unary minus', () => {
  const calculator = createCalculator()
  calculator.press('-', '+/-')
  assert.equal(calculator.current.innerText, '-')
  calculator.press('2', '+/-')
  assert.equal(calculator.current.innerText, '2')
})

for (const [operation, expected] of [['+', '6'], ['-', '10'], ['*', '-16'], ['÷', '-4']]) {
  test(`sign toggle edits only the right operand of ${operation}`, () => {
    const calculator = createCalculator()
    calculator.press('8', operation, '2', '+/-')
    assert.equal(calculator.current.innerText, '-2')
    assert.equal(calculator.previous.innerText, `8 ${operation}`)
    calculator.press('=')
    assert.equal(calculator.current.innerText, expected)
    assert.equal(calculator.previous.innerText, '')
  })
}

for (const [kind, setup, result, repeated] of [
  ['positive', ['8', '+', '2'], '10', '12'],
  ['negative', ['2', '-', '8'], '-6', '-14'],
  ['zero', ['2', '-', '2'], '0', '-2']
]) {
  test(`sign toggle is inactive on ${kind} results until a new digit entry`, () => {
    const calculator = createCalculator()
    calculator.press(...setup, '=')
    const history = calculator.history.innerText
    calculator.press('+/-', '+/-')
    assert.equal(calculator.current.innerText, result)
    assert.equal(calculator.history.innerText, history)
    calculator.press('=')
    assert.equal(calculator.current.innerText, repeated)
    calculator.press('3', '+/-', '4')
    assert.equal(calculator.current.innerText, '-34')
    calculator.press('+/-')
    assert.equal(calculator.current.innerText, '34')
  })
}

test('decimal entry reactivates sign toggle after a result', () => {
  const calculator = createCalculator()
  calculator.press('1', '+', '2', '=', '.', '+/-')
  assert.equal(calculator.current.innerText, '-3.')
  calculator.press('5', '+/-')
  assert.equal(calculator.current.innerText, '3.5')
})

for (const [kind, entry, recalled, toggled] of [
  ['positive', '12.5', '12.5', '-12.5'],
  ['negative', '-12.5', '-12.5', '12.5'],
  ['zero', '0', '0', '0']
]) {
  test(`sign toggle on recalled ${kind} memory preserves stored memory`, () => {
    const calculator = createCalculator()
    calculator.press(...entry, 'M+', 'AC', 'MR')
    assert.equal(calculator.current.innerText, recalled)
    calculator.press('+/-')
    assert.equal(calculator.current.innerText, toggled)
    assert.equal(calculator.memory.hidden, kind === 'zero')
    calculator.press('AC', 'MR')
    assert.equal(calculator.current.innerText, recalled)
  })
}

test('sign toggle on recalled memory preserves a pending operation', () => {
  const calculator = createCalculator()
  calculator.press('3', 'M+', 'AC', '8', '+', 'MR', '+/-')
  assert.equal(calculator.current.innerText, '-3')
  assert.equal(calculator.previous.innerText, '8 +')
  calculator.press('=')
  assert.equal(calculator.current.innerText, '5')
  calculator.press('AC', 'MR')
  assert.equal(calculator.current.innerText, '3')
})

test('memory recall after a result does not reactivate sign toggle', () => {
  const calculator = createCalculator()
  calculator.press('4', 'M+', 'AC', '8', '+', '2', '=', 'MR', '+/-')
  assert.equal(calculator.current.innerText, '4')
  calculator.press('3', '+/-')
  assert.equal(calculator.current.innerText, '-3')
  calculator.press('AC', 'MR')
  assert.equal(calculator.current.innerText, '4')
})
