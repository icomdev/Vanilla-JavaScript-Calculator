class Calculator {
  /**
   * Connect display elements, initialize memory, and clear calculation state.
   * Display contents are rendered separately by updateDisplay().
   * @param {HTMLElement} previousOperandTextElement - Pending operand display.
   * @param {HTMLElement} currentOperandTextElement - Current entry/result display.
   * @param {HTMLElement} memoryIndicatorElement - Indicator hidden when memory is zero.
   * @param {HTMLElement} historyTextElement - Last recorded expression display.
   * @param {HTMLButtonElement} [historyCopyButton] - Session history copy control.
   * @returns {Calculator} The initialized calculator instance.
   */
  constructor(previousOperandTextElement, currentOperandTextElement, memoryIndicatorElement, historyTextElement, historyCopyButton) {
    this.previousOperandTextElement = previousOperandTextElement
    this.currentOperandTextElement = currentOperandTextElement
    this.memoryIndicatorElement = memoryIndicatorElement
    this.historyTextElement = historyTextElement
    this.historyCopyButton = historyCopyButton
    this.memory = 0
    this.clear()
  }

  /**
   * Reset operands, operation, history, errors, and repeated-equals state.
   * Preserve memory; rendering is left to updateDisplay().
   * @returns {void}
   */
  clear() {
    this.history = ''
    this.sessionHistory = []
    this.lastResult = undefined
    this.currentOperand = ''
    this.previousOperand = ''
    this.operation = undefined
    this.isResult = false
    this.errorMessage = ''
    this.lastOperation = undefined
    this.lastOperand = undefined
  }

  /**
   * Clear the current entry, error, result flag, and repeated-equals state.
   * Preserve the pending operand/operator, history, and memory.
   * @returns {void}
   */
  clearEntry() {
    this.currentOperand = ''
    this.isResult = false
    this.errorMessage = ''
    this.lastOperation = undefined
    this.lastOperand = undefined
  }

  /**
   * Reset calculation state and memory without rendering the display.
   * @returns {void}
   */
  fullClear() {
    this.clear()
    this.clearMemory()
  }

  /**
   * Add the parsed current entry to memory without changing the entry.
   * Ignore non-finite entries and totals that would make memory non-finite.
   * @returns {void}
   */
  addToMemory() {
    const value = parseFloat(this.currentOperand)
    if (!Number.isFinite(value)) return
    const total = this.memory + value
    if (Number.isFinite(total)) this.memory = total
  }

  /**
   * Replace the current entry with the memory value as a string.
   * Clear calculation state first if an error is active; otherwise preserve it.
   * @returns {void}
   */
  recallMemory() {
    if (this.errorMessage) this.clear()
    this.currentOperand = this.memory.toString()
  }

  /**
   * Set memory to zero without changing calculation state or rendering.
   * @returns {void}
   */
  clearMemory() {
    this.memory = 0
  }

  /**
   * Remove the last character, also removing a remaining lone minus sign.
   * Clear calculation state instead when an error is active.
   * @returns {void}
   */
  delete() {
    if (this.errorMessage) {
      this.clear()
      return
    }
    this.currentOperand = this.currentOperand.toString().slice(0, -1)
    if (this.currentOperand === '-') this.currentOperand = ''
  }

  /**
   * Toggle the sign of a finite current entry or displayed result.
   * Preserve pending state and digits; ignore errors, zero, and invalid entries.
   * @returns {void}
   */
  percent() {
    const value = parseFloat(this.currentOperand)
    if (!Number.isFinite(value)) return
    if (this.errorMessage || value === 0) return
    const entry = this.currentOperand.toString()
    this.currentOperand = entry.startsWith('-') ? entry.slice(1) : '-' + entry
    if (this.isResult) this.lastResult = Number(this.currentOperand)
  }

  /**
   * Take the square root of the current entry, or last result if entry is empty.
   * Preserve pending operations, history, memory, and repeat-equals state.
   * Ignore errors, invalid/non-finite values, and negative entries.
   * @returns {void}
   */
  sqrt() {
    if (this.errorMessage) return
    const empty = this.currentOperand === ''
    const value = empty ? this.lastResult : parseFloat(this.currentOperand)
    if (!Number.isFinite(value) || value < 0) return
    this.currentOperand = Math.sqrt(value).toString()
    this.lastResult = Number(this.currentOperand)
    if (empty) this.isResult = true
  }

  /**
   * Toggle the leading minus without reformatting the entry digits.
   * Leave results, unparseable entries, and zero unchanged.
   * @returns {void}
   */
  toggleSign() {
    const value = parseFloat(this.currentOperand)
    if (this.isResult || isNaN(value) || value === 0) return
    const entry = this.currentOperand.toString()
    this.currentOperand = entry.startsWith('-') ? entry.slice(1) : `-${entry}`
  }

  /**
   * Remove one character, replacing a single-character entry with zero.
   * Unlike delete(), leave empty entries, a lone minus, and negative zero alone.
   * @returns {void}
   */
  backspace() {
    const entry = this.currentOperand.toString()
    if (entry === '' || entry === '-' || entry === '-0') return
    if (entry.length === 1) {
      this.currentOperand = '0'
      return
    }
    this.currentOperand = entry.slice(0, -1)
  }

  /**
   * Append a digit or decimal point, rejecting a second decimal point.
   * Clear errors first; digits start fresh after a result, but a decimal extends it.
   * Prefix a decimal point with zero only when the entry is empty.
   * @param {string|number} number - Entry character; decimal points must be strings.
   * @returns {void}
   */
  appendNumber(number) {
    if (this.errorMessage) this.clear()
    if (this.isResult) {
      // PR9: digits start a fresh entry after equals; PR18 tests: '.' continues the result (3 -> 3.5)
      if (number !== '.') this.currentOperand = ''
      this.isResult = false
    }
    const currentOperand = this.currentOperand.toString()
    if (number === '.' && currentOperand.includes('.')) return
    this.currentOperand = number === '.' && currentOperand === ''
      ? '0.'
      : currentOperand + number.toString()
  }

  /**
   * Select an operator, computing a pending expression first when possible.
   * Minus can start a signed entry; other operators can replace a pending one.
   * Clear an active error without selecting the requested operation.
   * @param {string} operation - Operator symbol: +, -, *, or ÷.
   * @returns {void}
   */
  chooseOperation(operation) {
    if (this.errorMessage) {
      this.clear()
      return
    }
    // Minus starts a signed operand; other operators replace a pending one.
    if (this.currentOperand === '' || this.currentOperand === '-') {
      if (operation === '-') {
        this.currentOperand = '-'
      } else if (this.previousOperand !== '') {
        this.operation = operation
        this.currentOperand = ''
      }
      return
    }
    if (this.previousOperand !== '') {
      this.compute()
      if (this.errorMessage) return
    }
    this.operation = operation
    this.previousOperand = this.currentOperand
    this.currentOperand = ''
    this.isResult = false
  }

  /**
   * Compute the pending expression, or repeat the last operator and operand.
   * Ignore invalid operands or unsupported operators; clear an existing error.
   * Division by zero clears calculation state and sets an error, preserving memory.
   * On success, store repeat state and mark the current entry as a result.
   * @param {boolean} [recordHistory=false] - Record a successful, non-repeated expression.
   * @returns {void}
   */
  compute(recordHistory = false) {
    if (this.errorMessage) {
      this.clear()
      return
    }
    let computation
    const repeating = this.operation == null
    const operation = repeating ? this.lastOperation : this.operation
    const prev = parseFloat(repeating ? this.currentOperand : this.previousOperand)
    const current = repeating ? this.lastOperand : parseFloat(this.currentOperand)
    if (isNaN(prev) || isNaN(current)) return
    switch (operation) {
      case '+':
        computation = prev + current
        break
      case '-':
        computation = prev - current
        break
      case '*':
        computation = prev * current
        break
      case '÷':
        if (current === 0) {
          this.clear()
          this.errorMessage = 'Cannot divide by zero'
          return
        }
        computation = prev / current
        break
      default:
        return
    }
    this.lastOperation = operation
    this.lastOperand = current
    if (recordHistory && !repeating) {
      this.history = `${this.previousOperand}${this.operation}${this.currentOperand}=${computation}`
      this.sessionHistory.push(`${this.previousOperand}${this.operation}${this.currentOperand} = ${computation}`)
    }
    this.currentOperand = computation
    this.lastResult = computation
    this.operation = undefined
    this.previousOperand = ''
    this.isResult = true
  }

  /**
   * Group the integer part in English format while preserving decimal digits.
   * Pass scientific notation through unchanged; preserve empty or lone-minus entries.
   * @param {string|number} number - Operand or result to format without changing state.
   * @returns {string} Display text, including any entered trailing decimal point.
   */
  getDisplayNumber(number) {
    const stringNumber = number.toString()
    if (/e/i.test(stringNumber)) return stringNumber
    const integerDigits = parseFloat(stringNumber.split('.')[0])
    const decimalDigits = stringNumber.split('.')[1]
    let integerDisplay
    if (isNaN(integerDigits)) {
      integerDisplay = stringNumber.startsWith('-') ? '-' : ''
    } else {
      integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 })
    }
    if (decimalDigits != null) {
      return `${integerDisplay}.${decimalDigits}`
    } else {
      return integerDisplay
    }
  }

  /**
   * Render memory visibility, history, current entry/error, and pending expression.
   * Clear the previous-operand display when no operation is pending.
   * @returns {void}
   */
  updateDisplay() {
    // Keep the badge in sync after every action, including recall and full clear.
    this.memoryIndicatorElement.hidden = this.memory === 0
    this.historyTextElement.innerText = this.history
    if (this.historyCopyButton) {
      this.historyCopyButton.disabled = this.sessionHistory.length === 0
      if (this.historyCopyButton.disabled) {
        if (this.copyConfirmationTimer !== undefined) clearTimeout(this.copyConfirmationTimer)
        this.copyConfirmationTimer = undefined
        this.historyCopyButton.innerText = 'Copy'
      }
    }
    this.currentOperandTextElement.innerText =
      this.errorMessage || this.getDisplayNumber(this.currentOperand)
    if (this.operation != null) {
      this.previousOperandTextElement.innerText =
        `${this.getDisplayNumber(this.previousOperand)} ${this.operation}`
    } else {
      this.previousOperandTextElement.innerText = ''
    }
  }
}


// Display and control lookup for event wiring.
const numberButtons = document.querySelectorAll('[data-number]')
const operationButtons = document.querySelectorAll('[data-operation]')
const percentButton = document.querySelector('[data-percent]')
const sqrtButton = document.querySelector('[data-sqrt]')
const equalsButton = document.querySelector('[data-equals]')
const deleteButton = document.querySelector('[data-delete]')
const backspaceButton = document.querySelector('[data-backspace]')
const signToggleButton = document.querySelector('[data-sign-toggle]')
const allClearButton = document.querySelector('[data-all-clear]')
const memoryAddButton = document.querySelector('[data-memory-add]')
const memoryRecallButton = document.querySelector('[data-memory-recall]')
const memoryClearButton = document.querySelector('[data-memory-clear]')
const memoryIndicatorElement = document.querySelector('[data-memory-indicator]')
const previousOperandTextElement = document.querySelector('[data-previous-operand]')
const currentOperandTextElement = document.querySelector('[data-current-operand]')

const historyTextElement = document.querySelector('[data-history]')
const historyCopyButton = document.querySelector('[data-history-copy]')

// Shared calculator instance used by all input handlers.
const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement, memoryIndicatorElement, historyTextElement, historyCopyButton)

// Clipboard API may be absent on file:// or denied by browser permissions.
// Keep the fallback synchronous so it can still use the click's user activation.
function copyWithTextarea(text) {
  const textarea = document.createElement('textarea')
  const focused = document.activeElement
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    return document.execCommand('copy')
  } finally {
    textarea.remove()
    focused?.focus({ preventScroll: true })
  }
}

historyCopyButton?.addEventListener('click', async () => {
  const session = calculator.sessionHistory
  if (session.length === 0) return
  const text = session.join('\n')
  let copied = false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch {
        copied = copyWithTextarea(text)
      }
    } else {
      copied = copyWithTextarea(text)
    }
  } catch {
    // Neither clipboard route succeeded; do not show a false confirmation.
  }
  // An AC/error reset during an asynchronous copy starts a new session.
  if (!copied || session !== calculator.sessionHistory) return
  if (calculator.copyConfirmationTimer !== undefined) clearTimeout(calculator.copyConfirmationTimer)
  historyCopyButton.innerText = 'Copied'
  calculator.copyConfirmationTimer = setTimeout(() => {
    historyCopyButton.innerText = 'Copy'
    calculator.copyConfirmationTimer = undefined
  }, 1000)
})

// Numeric entry and arithmetic operation button events.
numberButtons.forEach(button => {
  button.addEventListener('click', () => {
    calculator.appendNumber(button.innerText)
    calculator.updateDisplay()
  })
})

operationButtons.forEach(button => {
  button.addEventListener('click', () => {
    calculator.chooseOperation(button.innerText)
    calculator.updateDisplay()
  })
})

// Equals and short-click clear events.
equalsButton.addEventListener('click', button => {
  calculator.compute(true)
  calculator.updateDisplay()
})

allClearButton.addEventListener('click', button => {
  calculator.clear()
  calculator.updateDisplay()
})

// A short AC click keeps its existing behavior; holding AC also resets memory.
let allClearTimer
function cancelAllClearHold() {
  clearTimeout(allClearTimer)
  allClearTimer = undefined
}
function startAllClearHold() {
  cancelAllClearHold()
  allClearTimer = setTimeout(() => {
    allClearTimer = undefined
    calculator.fullClear()
    calculator.updateDisplay()
  }, 700)
}
allClearButton.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.isPrimary === false) return
  startAllClearHold()
})
allClearButton.addEventListener('pointerleave', cancelAllClearHold)
document.addEventListener('pointerup', cancelAllClearHold)
document.addEventListener('pointercancel', cancelAllClearHold)

// Entry editing button events: delete, backspace, and sign toggle.
deleteButton.addEventListener('click', button => {
  calculator.delete()
  calculator.updateDisplay()
})

backspaceButton.addEventListener('click', () => {
  calculator.backspace()
  calculator.updateDisplay()
})

signToggleButton.addEventListener('click', () => {
  calculator.toggleSign()
  calculator.updateDisplay()
})

// Unary square-root button event, also invoked by its keyboard alias.
sqrtButton?.addEventListener('click', () => {
  calculator.sqrt()
  calculator.updateDisplay()
})

// Memory button events: add, recall, and clear.
memoryAddButton.addEventListener('click', () => {
  calculator.addToMemory()
  calculator.updateDisplay()
})

memoryRecallButton.addEventListener('click', () => {
  calculator.recallMemory()
  calculator.updateDisplay()
})

memoryClearButton.addEventListener('click', () => {
  calculator.clearMemory()
  calculator.updateDisplay()
})

// Reuse button click handlers so keyboard and pointer input stay in sync.
// Keyboard aliases and dispatch, including entry/full-clear shortcuts.
const keyboardButtons = new Map(
  [...numberButtons, ...operationButtons].map(button => [button.innerText, button])
)
keyboardButtons.set('/', keyboardButtons.get('÷'))
keyboardButtons.set('%', percentButton)
keyboardButtons.set('k', percentButton)
keyboardButtons.set('r', sqrtButton)
keyboardButtons.set('=', equalsButton)
keyboardButtons.set('Enter', equalsButton)
keyboardButtons.set('Escape', allClearButton)
keyboardButtons.set('c', allClearButton)
keyboardButtons.set('C', allClearButton)
keyboardButtons.set('Backspace', deleteButton)

document.addEventListener('keydown', event => {
  // Leave browser/OS shortcuts, composition, and text editing alone.
  if (event.defaultPrevented || event.isComposing ||
      event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target
  if (target?.isContentEditable || target?.closest?.('input, textarea, select')) return

  // Let Enter activate Copy natively rather than dispatching equals.
  if (target === historyCopyButton && event.key === 'Enter') return

  const button = keyboardButtons.get(event.key)
  if (!button) return

  // In particular, Enter must not also activate the currently focused button.
  event.preventDefault()
  button.focus({ preventScroll: true })
  if (event.key === 'Escape') {
    if (event.shiftKey) calculator.fullClear()
    else calculator.clearEntry()
    calculator.updateDisplay()
  } else if (event.key === 'c' || event.key === 'C') {
    // One click per physical press; auto-repeat must not restart the hold.
    if (!event.repeat) {
      button.click()
      startAllClearHold()
    }
  } else {
    button.click()
  }
})

document.addEventListener('keyup', event => {
  if (event.key === 'c' || event.key === 'C') cancelAllClearHold()
})
document.addEventListener('visibilitychange', cancelAllClearHold)
// Capture focus leaving the page as well as switching tabs.
document.addEventListener('blur', cancelAllClearHold, true)

// Percent button event, also invoked by the keyboard alias.
percentButton.addEventListener('click', () => {
  calculator.percent()
  calculator.updateDisplay()
})
