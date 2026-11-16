class Calculator {
  constructor(previousOperandTextElement, currentOperandTextElement, memoryIndicatorElement) {
    this.previousOperandTextElement = previousOperandTextElement
    this.currentOperandTextElement = currentOperandTextElement
    this.memoryIndicatorElement = memoryIndicatorElement
    this.memory = 0
    this.clear()
  }

  clear() {
    this.currentOperand = ''
    this.previousOperand = ''
    this.operation = undefined
    this.isResult = false
    this.errorMessage = ''
    this.lastOperation = undefined
    this.lastOperand = undefined
  }

  addToMemory() {
    const value = parseFloat(this.currentOperand)
    if (!Number.isFinite(value)) return
    const total = this.memory + value
    if (Number.isFinite(total)) this.memory = total
  }

  recallMemory() {
    if (this.errorMessage) this.clear()
    this.currentOperand = this.memory.toString()
  }

  clearMemory() {
    this.memory = 0
  }

  delete() {
    if (this.errorMessage) {
      this.clear()
      return
    }
    this.currentOperand = this.currentOperand.toString().slice(0, -1)
    if (this.currentOperand === '-') this.currentOperand = ''
  }

  toggleSign() {
    const value = parseFloat(this.currentOperand)
    if (this.isResult || isNaN(value) || value === 0) return
    const entry = this.currentOperand.toString()
    this.currentOperand = entry.startsWith('-') ? entry.slice(1) : `-${entry}`
  }

  backspace() {
    const entry = this.currentOperand.toString()
    if (entry === '' || entry === '-' || entry === '-0') return
    if (entry.length === 1) {
      this.currentOperand = '0'
      return
    }
    this.currentOperand = entry.slice(0, -1)
  }

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

  chooseOperation(operation) {
    if (this.errorMessage) {
      this.clear()
      return
    }
    if (this.currentOperand === '') return
    if (this.previousOperand !== '') {
      this.compute()
      if (this.errorMessage) return
    }
    this.operation = operation
    this.previousOperand = this.currentOperand
    this.currentOperand = ''
    this.isResult = false
  }

  compute() {
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
    this.currentOperand = computation
    this.operation = undefined
    this.previousOperand = ''
    this.isResult = true
  }

  getDisplayNumber(number) {
    const stringNumber = number.toString()
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

  updateDisplay() {
    this.memoryIndicatorElement.hidden = this.memory === 0
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


const numberButtons = document.querySelectorAll('[data-number]')
const operationButtons = document.querySelectorAll('[data-operation]')
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

const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement, memoryIndicatorElement)

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

equalsButton.addEventListener('click', button => {
  calculator.compute()
  calculator.isResult = true
  calculator.updateDisplay()
})

allClearButton.addEventListener('click', button => {
  calculator.clear()
  calculator.updateDisplay()
})

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
const keyboardButtons = new Map(
  [...numberButtons, ...operationButtons].map(button => [button.innerText, button])
)
keyboardButtons.set('/', keyboardButtons.get('÷'))
keyboardButtons.set('=', equalsButton)
keyboardButtons.set('Enter', equalsButton)
keyboardButtons.set('Escape', allClearButton)
keyboardButtons.set('Backspace', deleteButton)

document.addEventListener('keydown', event => {
  // Leave browser/OS shortcuts (copy, reload, etc.) alone.
  if (event.ctrlKey || event.metaKey || event.altKey) return

  const button = keyboardButtons.get(event.key)
  if (!button) return

  // In particular, Enter must not also activate the currently focused button.
  event.preventDefault()
  button.click()})
