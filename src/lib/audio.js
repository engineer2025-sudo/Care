// ─────────────────────────────────────────────────────────────────────────────
// CareSphere Sensory Audio Engine
// Generates ambient soundscapes procedurally with the Web Audio API — no audio
// files, no downloads, works offline, and never blocks the UI thread.
// ─────────────────────────────────────────────────────────────────────────────

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function makeNoiseBuffer(ac, seconds = 2) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function makeBrownBuffer(ac, seconds = 3) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }
  return buf
}

const builders = {
  // Gentle rainfall: filtered noise with a slow intensity swell.
  rain(ac, out) {
    const src = ac.createBufferSource()
    src.buffer = makeNoiseBuffer(ac)
    src.loop = true
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.3
    const g = ac.createGain(); g.gain.value = 0.22
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.06
    const lfoGain = ac.createGain(); lfoGain.gain.value = 180
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency)
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out)
    src.start(); lfo.start()
    return () => { try { src.stop(); lfo.stop() } catch (e) {} }
  },

  // Ocean waves: low noise whose amplitude breathes with a slow LFO.
  ocean(ac, out) {
    const src = ac.createBufferSource()
    src.buffer = makeNoiseBuffer(ac, 3)
    src.loop = true
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420
    const g = ac.createGain(); g.gain.value = 0.2
    const swell = ac.createOscillator(); swell.frequency.value = 0.08
    const swellGain = ac.createGain(); swellGain.gain.value = 0.13
    swell.connect(swellGain); swellGain.connect(g.gain)
    src.connect(lp); lp.connect(g); g.connect(out)
    src.start(); swell.start()
    return () => { try { src.stop(); swell.stop() } catch (e) {} }
  },

  // Forest: soft breeze bed with procedurally scheduled birdsong chirps.
  forest(ac, out) {
    const src = ac.createBufferSource()
    src.buffer = makeNoiseBuffer(ac, 3)
    src.loop = true
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520
    const bed = ac.createGain(); bed.gain.value = 0.05
    src.connect(lp); lp.connect(bed); bed.connect(out)
    src.start()

    let timer = null
    let stopped = false
    const chirp = () => {
      if (stopped) return
      const n = 2 + Math.floor(Math.random() * 3) // notes per chirp
      for (let i = 0; i < n; i++) {
        const t = ac.currentTime + i * (0.12 + Math.random() * 0.1)
        const osc = ac.createOscillator()
        osc.type = 'sine'
        const base = 2200 + Math.random() * 900
        osc.frequency.setValueAtTime(base, t)
        osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + 0.09)
        const g = ac.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
        osc.connect(g); g.connect(out)
        osc.start(t); osc.stop(t + 0.2)
      }
      timer = setTimeout(chirp, 2200 + Math.random() * 4800)
    }
    timer = setTimeout(chirp, 800)

    return () => { stopped = true; clearTimeout(timer); try { src.stop() } catch (e) {} }
  },

  // Hearth fire: brown-noise bed with randomly scheduled crackle transients.
  fire(ac, out) {
    const src = ac.createBufferSource()
    src.buffer = makeBrownBuffer(ac, 3)
    src.loop = true
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700
    const bed = ac.createGain(); bed.gain.value = 0.3
    src.connect(lp); lp.connect(bed); bed.connect(out)
    src.start()

    let timer = null
    let stopped = false
    const crackle = () => {
      if (stopped) return
      const burst = ac.createBufferSource()
      burst.buffer = makeNoiseBuffer(ac, 0.05)
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'
      bp.frequency.value = 1200 + Math.random() * 2400; bp.Q.value = 2
      const g = ac.createGain()
      g.gain.setValueAtTime(0.05 + Math.random() * 0.12, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05)
      burst.connect(bp); bp.connect(g); g.connect(out)
      burst.start()
      timer = setTimeout(crackle, 60 + Math.random() * 420)
    }
    timer = setTimeout(crackle, 200)

    return () => { stopped = true; clearTimeout(timer); try { src.stop() } catch (e) {} }
  },
}

export class SoundScape {
  constructor() {
    this.stopFn = null
    this.current = null
    this.out = null
  }

  play(id) {
    this.stop()
    const ac = getCtx()
    const out = ac.createGain()
    out.gain.value = 0.9
    out.connect(ac.destination)
    this.out = out
    this.current = id
    this.stopFn = builders[id](ac, out)
  }

  stop() {
    if (this.stopFn) { try { this.stopFn() } catch (e) {} }
    if (this.out) { try { this.out.disconnect() } catch (e) {} }
    this.stopFn = null
    this.current = null
  }

  get playing() { return !!this.stopFn }
}

export const soundEngine = new SoundScape()
