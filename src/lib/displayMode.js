// Bare minimum mode: a display preference that hides explanatory/guidance copy
// so the app shows only controls and personal content. Status messages, empty
// states and safety warnings are rendered by their own elements and stay visible.
import { useSyncExternalStore } from 'react'

let enabled = false
const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setBareMinimum(value) {
  const next = value === true
  if (next === enabled) return
  enabled = next
  for (const listener of listeners) listener()
}

export function bareMinimum() {
  return enabled
}

export function useBareMinimum() {
  return useSyncExternalStore(subscribe, bareMinimum, bareMinimum)
}
