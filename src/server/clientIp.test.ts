import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClientIp, isPlausibleIp } from './clientIp';

/**
 * The AI endpoint is limited per client, and that limit is the only thing
 * between a stranger and the deployment's Gemini quota. If a caller can choose
 * which address the limiter sees, the limit does not exist.
 */

test('the platform-provided address wins', () => {
  assert.equal(
    resolveClientIp({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' }),
    '203.0.113.9'
  );
});

test('a client-supplied forwarded entry is ignored', () => {
  // The caller wrote 1.2.3.4; the proxy appended the real address last.
  assert.equal(
    resolveClientIp({ 'x-forwarded-for': '1.2.3.4, 198.51.100.7' }),
    '198.51.100.7'
  );
});

test('a whole spoofed chain cannot produce the caller-chosen address', () => {
  assert.equal(
    resolveClientIp({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8, 192.0.2.44' }),
    '192.0.2.44'
  );
});

test('array headers are handled like the single form', () => {
  assert.equal(resolveClientIp({ 'x-forwarded-for': ['10.0.0.1, 10.0.0.2'] }), '10.0.0.2');
  assert.equal(resolveClientIp({ 'x-real-ip': ['10.0.0.9'] }), '10.0.0.9');
});

test('junk headers fall through to the socket address', () => {
  assert.equal(resolveClientIp({ 'x-real-ip': 'not-an-ip' }, '10.1.1.1'), '10.1.1.1');
  assert.equal(resolveClientIp({ 'x-forwarded-for': 'unknown, also-junk' }, '10.1.1.2'), '10.1.1.2');
  assert.equal(resolveClientIp({ 'x-forwarded-for': '1.2.3.4' }, '::1'), '1.2.3.4');
});

test('nothing usable yields one stable bucket, never an empty key', () => {
  assert.equal(resolveClientIp({}), 'unknown');
  assert.equal(resolveClientIp({ 'x-forwarded-for': '' }, ''), 'unknown');
  assert.equal(resolveClientIp({}, 'garbage'), 'unknown');
});

test('IPv6 and IPv4-mapped forms are accepted', () => {
  assert.equal(resolveClientIp({ 'x-real-ip': '2001:db8::1' }), '2001:db8::1');
  assert.equal(resolveClientIp({ 'x-real-ip': '::ffff:192.0.2.128' }), '::ffff:192.0.2.128');
  assert.equal(resolveClientIp({ 'x-real-ip': '[2001:db8::2]' }), '[2001:db8::2]');
});

test('IPv4 validation rejects impossible octets and partial addresses', () => {
  assert.equal(isPlausibleIp('192.168.1.1'), true);
  assert.equal(isPlausibleIp('256.1.1.1'), false);
  assert.equal(isPlausibleIp('1.2.3'), false);
  assert.equal(isPlausibleIp('1.2.3.4.5'), false);
  assert.equal(isPlausibleIp(''), false);
  assert.equal(isPlausibleIp('localhost'), false);
  assert.equal(isPlausibleIp('a'.repeat(60)), false);
});
