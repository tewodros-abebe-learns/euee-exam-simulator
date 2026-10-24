import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TRUST_PROXY, parseTrustProxy } from './trustProxy';

test('TRUST_PROXY unset keeps the private-ranges default', () => {
  assert.equal(parseTrustProxy(undefined), DEFAULT_TRUST_PROXY);
  assert.equal(parseTrustProxy(''), DEFAULT_TRUST_PROXY);
  assert.equal(parseTrustProxy('   '), DEFAULT_TRUST_PROXY);
});

test('TRUST_PROXY accepts the false spellings as real booleans', () => {
  for (const value of ['false', 'FALSE', 'off', 'no', '0', ' false ']) {
    assert.equal(parseTrustProxy(value), false, value);
  }
});

test('TRUST_PROXY accepts the true spellings as real booleans', () => {
  for (const value of ['true', 'TRUE', 'on', 'yes']) {
    assert.equal(parseTrustProxy(value), true, value);
  }
});

test('TRUST_PROXY hop counts become numbers, not strings', () => {
  assert.equal(parseTrustProxy('1'), 1);
  assert.equal(parseTrustProxy('2'), 2);
  assert.equal(parseTrustProxy(' 3 '), 3);
  // "0" is handled as false above, so only positive counts reach here.
  assert.equal(parseTrustProxy('10'), 10);
});

test('TRUST_PROXY address and subnet lists pass through untouched', () => {
  assert.equal(parseTrustProxy('loopback'), 'loopback');
  assert.equal(parseTrustProxy('173.245.48.0/20, 103.21.244.0/22'), '173.245.48.0/20, 103.21.244.0/22');
  assert.equal(parseTrustProxy('loopback, linklocal, uniquelocal'), 'loopback, linklocal, uniquelocal');
});

test('never returns an empty string, which Express cannot parse', () => {
  for (const value of [undefined, '', '  ', '\n']) {
    const parsed = parseTrustProxy(value);
    assert.notEqual(parsed, '');
    assert.equal(parsed, DEFAULT_TRUST_PROXY);
  }
});
