import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRichText } from './richText';

test('plain answer options are left exactly as written', () => {
  const plain = [
    '5 m/s east',
    'metres per second',
    'A',
    '1,250',
    'Newton’s second law',
    'x_1', // underscore alone is not treated as emphasis
    'a*b*c',
    'Cost is $5', // one dollar sign is a price, not a formula
    '50% of 200',
    'H2O',
  ];
  for (const value of plain) {
    assert.equal(hasRichText(value), false, value);
  }
});

test('inline maths is recognised', () => {
  assert.equal(hasRichText('$\\text{s/m}$'), true);
  assert.equal(hasRichText('$5\\ \\text{m/s east}$'), true);
  assert.equal(hasRichText('$\\frac{1}{2}$'), true);
  assert.equal(hasRichText('so $v = d/t$ here'), true);
});

test('LaTeX delimiters without dollar signs are recognised', () => {
  assert.equal(hasRichText('\\(x^2 + y^2\\)'), true);
  assert.equal(hasRichText('\\[\\frac{a}{b}\\]'), true);
  assert.equal(hasRichText('\\text{m/s}'), true);
});

test('prose markdown is recognised', () => {
  assert.equal(hasRichText('**5 m/s**'), true);
  assert.equal(hasRichText('`m/s`'), true);
  assert.equal(hasRichText('__speed__'), true);
  assert.equal(hasRichText('[unit](https://example.com)'), true);
});

test('empty and non-string input is never rich', () => {
  assert.equal(hasRichText(''), false);
  assert.equal(hasRichText('   '), false);
  assert.equal(hasRichText(null), false);
  assert.equal(hasRichText(undefined), false);
  assert.equal(hasRichText(42), false);
  assert.equal(hasRichText({ text: '$x$' }), false);
});
