import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeSos, sosSmsHref, SOS_OPENING } from '../src/lib/sosMessage.js';

test('the message without a location is the shared SOS wording', () => {
  assert.equal(composeSos(null), SOS_OPENING);
  assert.equal(composeSos(), SOS_OPENING);
});

test('a location adds its recorded time and a maps link', () => {
  const message = composeSos({ latitude: 37.12345, longitude: -122.54321, recordedAt: '3:42 PM' });
  assert.ok(message.startsWith(SOS_OPENING));
  assert.ok(message.endsWith('Location recorded at 3:42 PM: https://www.google.com/maps?q=37.12345,-122.54321'));
});

test('a location without a recorded time is labelled without inventing one', () => {
  const message = composeSos({ latitude: 1, longitude: 2 });
  assert.ok(message.includes('Location recorded: https://www.google.com/maps?q=1,2'));
  assert.ok(!message.includes('at undefined'));
});

test('the sms link encodes the message and never claims delivery', () => {
  const href = sosSmsHref('+15551234567', SOS_OPENING);
  assert.ok(href.startsWith('sms:+15551234567?body='));
  assert.equal(decodeURIComponent(href.split('body=')[1]), SOS_OPENING);
  assert.ok(!decodeURIComponent(href).match(/sent|delivered/));
});
