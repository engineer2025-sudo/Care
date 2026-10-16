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
