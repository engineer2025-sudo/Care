import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPhone, cleanName, usableContact, smsDraftLink, callLink } from '../src/lib/emergencyContact.js';

test('phone cleaning keeps a leading plus and drops formatting', () => {
  assert.equal(cleanPhone(' (555) 123-4567 '), '5551234567');
  assert.equal(cleanPhone('+1 555 123 4567'), '+15551234567');
  assert.equal(cleanPhone('+'), '');
  assert.equal(cleanPhone('12-34'), '1234');
});

test('phone cleaning never keeps a plus in the middle', () => {
  assert.equal(cleanPhone('55+51234567'), '5551234567');
  assert.equal(cleanPhone('++15551234567'), '+15551234567');
});

test('names collapse whitespace and stay bounded', () => {
  assert.equal(cleanName('  Sam   Lee  '), 'Sam Lee');
  assert.equal(cleanName('x'.repeat(80)).length, 40);
});

test('a contact is usable only with a name and at least seven digits', () => {
  assert.equal(usableContact('Sam', '(555) 123-4567'), true);
  assert.equal(usableContact('Sam', '12345'), false);
  assert.equal(usableContact('   ', '5551234567'), false);
});

test('the message link opens a draft and does not imply delivery', () => {
  const link = smsDraftLink('+1 (555) 123-4567', 'I could use some support. https://meet.jit.si/Room');
  assert.ok(link.startsWith('sms:+15551234567?body='));
  assert.equal(decodeURIComponent(link.split('?body=')[1]), 'I could use some support. https://meet.jit.si/Room');
  assert.ok(!link.includes('sent'));
  assert.equal(callLink('(555) 123-4567'), 'tel:5551234567');
});
