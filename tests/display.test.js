// Run with: node --test tests/display.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

/*
Display sweep matrix (#49). Kept here to preserve the new-file-only scope.
Names in braces are expanded into independently named tests below.

| Matrix cell | Test name(s) |
| --- | --- |
| Entry → render → pending operand, grouping × decimals × sign × zeros | display entry {name} survives rendering and moving to the previous line |
| Empty/sign-only entry → render → delete | empty and unfinished negative entries remain visible without NaN |
| Grouped integer → decimal → fractional zeros → delete | editing across a grouping boundary preserves raw digits and decimal zeros |
| Grouped negative entry → sign toggle → positive | sign toggling preserves grouped digits and fractional zeros |
| Long entry → render → append/delete | maximum safe integer remains grouped and editable; long fractional entries are not truncated |
| Large fixed-point entry → numeric result → exponent | large results switch from grouped fixed notation to scientific notation |
| Small signed decimal → numeric result → exponent | small {sign} results preserve scientific notation |
| Grouped signed entry → equals → digit, zero, decimal, operator, equals, AC | result {sign} → {action} has the expected display and isResult state |
| Fractional result → duplicate decimal → digit | fractional {sign} result rejects a duplicate decimal but exits result state |
| Entry with pending operator → chained subtotal → result | chained grouped operands render the subtotal without marking it as a result |
*/

const source = readFileSync(`${__dirname}/../script.js`, 'utf8')
const html = readFileSync(`${__dirname}/../index.html`, 'utf8')

function createCalculator() {
  const elements = new Map()
  const buttons = new Map()
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
  elements.set('[data-current-operand]', [current])
  elements.set('[data-previous-operand]', [previous])
  elements.set('[data-history]', [{ innerText: '' }])
  elements.set('[data-memory-indicator]', [{ hidden: true }])
  const state = runInNewContext(`${source}\ncalculator`, {
    document: {
      addEventListener() {},
      querySelector: selector => elements.get(selector)[0],
      querySelectorAll: selector => elements.get(selector)
    }
  })
  return {
    state,
    press(...keys) { keys.forEach(key => buttons.get(key).click()) },
    expect(currentText, previousText = '', isResult = false) {
      assert.equal(current.innerText, currentText, 'current display')
      assert.equal(previous.innerText, previousText, 'previous display')
      assert.equal(state.isResult, isResult, 'isResult')
    }
  }
}

for (const [name, entry, display] of [
  ['below grouping boundary', '999', '999'],
  ['first grouping boundary', '1000', '1,000'],
  ['multiple groups', '1234567', '1,234,567'],
  ['trailing decimal', '1234.', '1,234.'],
  ['fractional zeros', '1234.00500', '1,234.00500'],
  ['ungrouped fraction', '1.123456789', '1.123456789'],
  ['leading decimal', '.0050', '0.0050'],
  ['zero entry', '0000', '0'],
  ['leading integer zeros', '0001234', '1,234'],
  ['leading zeros with decimal', '0001234.0500', '1,234.0500'],
  ['zero fraction', '000.000', '0.000'],
  ['negative groups', '-1234567', '-1,234,567'],
  ['negative trailing decimal', '-1234.', '-1,234.'],
  ['negative leading zeros', '-0001234.0500', '-1,234.0500'],
  ['negative subunit', '-0.0050', '-0.0050']
]) {
  test(`display entry ${name} survives rendering and moving to the previous line`, () => {
    const calculator = createCalculator()
    calculator.press(...entry)
    calculator.expect(display)
    assert.equal(calculator.state.currentOperand, entry.startsWith('.') ? `0${entry}` : entry)
    calculator.state.updateDisplay()
    calculator.expect(display)
    calculator.press('+')
    calculator.expect('', `${display} +`)
    calculator.press('2')
    calculator.expect('2', `${display} +`)
    assert.equal(calculator.state.previousOperand, entry.startsWith('.') ? `0${entry}` : entry)
  })
}

test('empty and unfinished negative entries remain visible without NaN', () => {
  const calculator = createCalculator()
  calculator.state.updateDisplay()
  calculator.expect('')
  calculator.press('-')
  calculator.expect('-')
  calculator.press('.')
  calculator.expect('-.')
  calculator.press('5')
  calculator.expect('-.5')
  calculator.press('DEL')
  calculator.expect('-.')
  // DEL also removes a dangling sign.
  calculator.press('DEL')
  calculator.expect('')
  calculator.press('DEL')
  calculator.expect('')
})

test('editing across a grouping boundary preserves raw digits and decimal zeros', () => {
  const calculator = createCalculator()
  calculator.press(...'1000')
  calculator.expect('1,000')
  calculator.press('DEL')
  calculator.expect('100')
  calculator.press('0', '.', '0', '0')
  calculator.expect('1,000.00')
  calculator.press('DEL', 'DEL')
  calculator.expect('1,000.')
  calculator.press('DEL')
  calculator.expect('1,000')
  assert.equal(calculator.state.currentOperand, '1000')
})

test('sign toggling preserves grouped digits and fractional zeros', () => {
  const calculator = createCalculator()
  calculator.press(...'001234.0500', '+/-')
  calculator.expect('-1,234.0500')
  assert.equal(calculator.state.currentOperand, '-001234.0500')
  calculator.press('+/-')
  calculator.expect('1,234.0500')
  assert.equal(calculator.state.currentOperand, '001234.0500')
})

test('maximum safe integer remains grouped and editable', () => {
  const calculator = createCalculator()
  calculator.press(...'900719925474099')
  calculator.expect('900,719,925,474,099')
  calculator.press('1')
  calculator.expect('9,007,199,254,740,991')
  assert.equal(calculator.state.currentOperand, String(Number.MAX_SAFE_INTEGER))
  calculator.press('DEL')
  calculator.expect('900,719,925,474,099')
})

test('long fractional entries are not truncated', () => {
  const calculator = createCalculator()
  const entry = '1234.1234567890123456789000'
  calculator.press(...entry)
  calculator.expect('1,234.1234567890123456789000')
  assert.equal(calculator.state.currentOperand, entry)
  calculator.press('1')
  calculator.expect('1,234.12345678901234567890001')
  calculator.press('DEL')
  calculator.expect('1,234.1234567890123456789000')
})

test('large results switch from grouped fixed notation to scientific notation', () => {
  const calculator = createCalculator()
  // There is no entry-length cap. Use an exactly representable power of ten
  // rather than asserting precision for integers beyond MAX_SAFE_INTEGER.
  calculator.press(...'100000000000000000000')
  calculator.expect('100,000,000,000,000,000,000')
  calculator.press('*', '1', '=')
  calculator.expect('100,000,000,000,000,000,000', '', true)
  calculator.press('*', '1', '0', '=')
  calculator.expect('1e+21', '', true)
  calculator.press('+')
  calculator.expect('', '1e+21 +')
})

for (const [sign, prefix] of [['positive', ''], ['negative', '-']]) {
  test(`small ${sign} results preserve scientific notation`, () => {
    const calculator = createCalculator()
    calculator.press(...`${prefix}0.000001`)
    calculator.expect(`${prefix}0.000001`)
    calculator.press('÷', '1', '0', '=')
    calculator.expect(`${prefix}1e-7`, '', true)
    calculator.press('*')
    calculator.expect('', `${prefix}1e-7 *`)
  })
}

for (const [sign, prefix] of [['positive', ''], ['negative', '-']]) {
  for (const [action, keys, current, previous, isResult] of [
    ['digit', ['7'], '7', '', false],
    ['zero', ['0'], '0', '', false],
    ['decimal', ['.', '5'], `${prefix}1,234.5`, '', false],
    ['operator', ['*'], '', `${prefix}1,234 *`, false],
    ['equals', ['='], `${prefix}1,234`, '', true],
    ['AC', ['AC'], '', '', false]
  ]) {
    test(`result ${sign} → ${action} has the expected display and isResult state`, () => {
      const calculator = createCalculator()
      calculator.press(...`${prefix}001234.00`, '+')
      calculator.expect('', `${prefix}1,234.00 +`)
      calculator.press('0', '=')
      calculator.expect(`${prefix}1,234`, '', true)
      calculator.state.updateDisplay()
      calculator.expect(`${prefix}1,234`, '', true)
      calculator.press(...keys)
      calculator.expect(current, previous, isResult)
    })
  }
}

test('chained grouped operands render the subtotal without marking it as a result', () => {
  const calculator = createCalculator()
  calculator.press(...'1234.50', '+', ...'765.50')
  calculator.expect('765.50', '1,234.50 +')
  calculator.press('*')
  calculator.expect('', '2,000 *')
  calculator.press('2', '=')
  calculator.expect('4,000', '', true)
})

for (const [sign, prefix] of [['positive', ''], ['negative', '-']]) {
  test(`fractional ${sign} result rejects a duplicate decimal but exits result state`, () => {
    const calculator = createCalculator()
    calculator.press(...`${prefix}1234.5`, '+', '0', '=')
    calculator.expect(`${prefix}1,234.5`, '', true)
    calculator.press('.')
    calculator.expect(`${prefix}1,234.5`)
    calculator.press('0')
    calculator.expect(`${prefix}1,234.50`)
    calculator.press('+')
    calculator.expect('', `${prefix}1,234.50 +`)
  })
}
