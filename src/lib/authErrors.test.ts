import test from 'node:test';
import assert from 'node:assert/strict';
import { friendlyAuthError, isUserCancelledError } from './authErrors';

test('cancelling the Google window is not an error', () => {
  for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']) {
    assert.equal(isUserCancelledError({ code }), true, code);
  }
  assert.equal(isUserCancelledError({ code: 'auth/popup-blocked' }), false);
  assert.equal(isUserCancelledError(null), false);
});

test('Google-specific failures get actionable messages', () => {
  assert.match(friendlyAuthError({ code: 'auth/account-exists-with-different-credential' }), /email and password/i);
  assert.match(friendlyAuthError({ code: 'auth/popup-blocked' }), /pop-up/i);
  assert.match(friendlyAuthError({ code: 'auth/unauthorized-domain' }), /domain/i);
  assert.match(friendlyAuthError({ code: 'auth/operation-not-allowed' }), /not enabled/i);
  assert.match(friendlyAuthError({ code: 'auth/network-request-failed' }), /offline/i);
});

test('unknown errors fall back to the raw message, never to undefined', () => {
  assert.equal(friendlyAuthError({ message: 'Boom' }), 'Boom');
  assert.equal(friendlyAuthError({}), 'Authentication failed. Please try again.');
});
