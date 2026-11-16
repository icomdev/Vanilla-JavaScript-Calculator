// Run with: node --test tests/aria.test.js
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const html = readFileSync(join(__dirname, '../index.html'), 'utf8')

// Parse the static markup without a browser or external dependencies.
function parseAttributes(source) {
  return Object.fromEntries([...source.matchAll(
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  )].map(([, name, doubleQuoted, singleQuoted, unquoted]) => [
    name.toLowerCase(), doubleQuoted ?? singleQuoted ?? unquoted ?? ''
  ]))
}

const elements = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)]
  .map(([, tag, attributes]) => ({ tag, attributes: parseAttributes(attributes) }))

function byClass(className) {
  const element = elements.find(({ attributes }) =>
    (attributes.class || '').split(/\s+/).includes(className))
  assert.ok(element, `Element with class "${className}" exists`)
  return element.attributes
}

test('calculator is an ARIA group with a nonempty label', () => {
  const calculator = byClass('calculator-grid')
  assert.equal(calculator.role, 'group')
  assert.ok(calculator['aria-label']?.trim(), 'Calculator has a nonempty aria-label')
})

test('output announces updates politely and atomically', () => {
  const output = byClass('output')
  assert.equal(output['aria-live'], 'polite')
  assert.equal(output['aria-atomic'], 'true')
})

test('every button has a nonempty aria-label or text content', () => {
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi)]
  assert.ok(buttons.length > 0, 'Calculator contains buttons')
  assert.equal(buttons.length, elements.filter(({ tag }) => tag === 'button').length,
    'Every opening button tag has been parsed')
  for (const [index, [, source, content]] of buttons.entries()) {
    const attributes = parseAttributes(source)
    const text = content.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '').trim()
    assert.ok(attributes['aria-label']?.trim() || text,
      `Button ${index + 1} has an aria-label or text content`)
  }
})

test('memory indicator has the img role', () => {
  const indicator = elements.find(({ attributes }) =>
    Object.hasOwn(attributes, 'data-memory-indicator'))
  assert.ok(indicator, 'Memory indicator exists')
  assert.equal(indicator.attributes.role, 'img')
})
