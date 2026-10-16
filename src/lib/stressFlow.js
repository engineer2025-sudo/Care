/** Self-paced pause, then a check-in. Not treatment, no assessment, nothing sent automatically. */
export const BREATH_PHASES = [
{ name: 'Breathe in', seconds: 4 },
{ name: 'Breathe out', seconds: 6 }];

export const TARGET_CYCLES = 3;

export const CHECK_IN_STEPS = ['pause', 'after', 'support'];

export const startBreathing = () => ({
  phaseIndex: 0,
  secondsLeft: BREATH_PHASES[0].seconds,
  cycles: 0,
  running: true
});

/** One second later. A completed in/out pair counts a cycle; the guide stops after three. */
export function tick(state) {
  if (!state.running) return state;
  if (state.secondsLeft > 1) return { ...state, secondsLeft: state.secondsLeft - 1 };
  const phaseIndex = (state.phaseIndex + 1) % BREATH_PHASES.length;
  const cycles = phaseIndex === 0 ? state.cycles + 1 : state.cycles;
  return {
    phaseIndex,
    secondsLeft: BREATH_PHASES[phaseIndex].seconds,
    cycles,
    running: cycles < TARGET_CYCLES
  };
}

export const cycleCount = (cycles) => [Math.min(cycles, TARGET_CYCLES), TARGET_CYCLES];

export const stressRoom = (random = Math.random) =>
`CareSphere-Support-${random().toString(36).slice(2).padEnd(6, '0').slice(0, 6)}`;

export const supportMessage = (room, { urgent = false } = {}) =>
`${urgent ?
'I need urgent support. Please call me or join me here:' :
'I could use some support. Please join me here:'} https://meet.jit.si/${room}`;
