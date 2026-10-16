import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BREATH_PHASES, TARGET_CYCLES, startBreathing, tick, cycleCount, stressRoom, supportMessage } from
'../src/lib/stressFlow.js';

test('the pause starts on an in-breath and alternates in/out', () => {
  let state = startBreathing();
  assert.equal(BREATH_PHASES[state.phaseIndex].name, 'Breathe in');
  assert.equal(state.secondsLeft, 4);
  for (let i = 0; i < 4; i++) state = tick(state);
  assert.equal(BREATH_PHASES[state.phaseIndex].name, 'Breathe out');
  assert.equal(state.cycles, 0);
});

test('a full in/out pair counts one cycle and the guide stops after three', () => {
  let state = startBreathing();
  for (let i = 0; i < 10; i++) state = tick(state);
  assert.equal(state.cycles, 1);
  assert.equal(state.running, true);
  for (let i = 0; i < 20; i++) state = tick(state);
  assert.equal(state.cycles, TARGET_CYCLES);
  assert.equal(state.running, false);
  assert.deepEqual(tick(state), state);
});

test('pausing holds the timer instead of advancing it', () => {
  const state = { ...startBreathing(), running: false };
  assert.deepEqual(tick(state), state);
});

test('the cycle counter never counts past the target', () => {
  assert.deepEqual(cycleCount(0), [0, 3]);
  assert.deepEqual(cycleCount(2), [2, 3]);
  assert.deepEqual(cycleCount(9), [3, 3]);
});

test('the support message names the room and never claims it was sent', () => {
  const room = stressRoom(() => 0.5);
  assert.match(room, /^CareSphere-Support-[a-z0-9]{4,6}$/);
  assert.equal(supportMessage(room),
  `I could use some support. Please join me here: https://meet.jit.si/${room}`);
  assert.match(supportMessage(room, { urgent: true }), /urgent support/);
});
