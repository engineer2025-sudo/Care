let confettiModule

/** Load the optional celebration code only on first use and honor reduced motion. */
export function celebrate(options = {}) {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  if (document.documentElement.dataset.lowSensory === 'true') return

  confettiModule ||= import('canvas-confetti')
  confettiModule
    .then(({ default: confetti }) => confetti({ ...options, disableForReducedMotion: true }))
    .catch(() => {})
}
