import { useEffect, useRef } from 'react'

export function useDialog(open, onClose) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open || !dialogRef.current) return
    const dialog = dialogRef.current
    const trigger = document.activeElement
    const fallbackTarget = trigger?.closest('[role="region"]') || document.getElementById('main-content')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.tabIndex = -1
    dialog.focus({ preventScroll: true })

    const isTopDialog = () => [...document.querySelectorAll('[aria-modal="true"]')].at(-1) === dialog
    const focusable = () => [...dialog.querySelectorAll('button, a[href], input, select, textarea, iframe, [contenteditable="true"], [tabindex]')]
      .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'))
    const handleKeyDown = event => {
      if (!isTopDialog()) return
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      if (!first) {
        event.preventDefault()
        dialog.focus()
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault()
        first.focus()
      }
    }
    const keepFocusInside = event => {
      if (isTopDialog() && !dialog.contains(event.target)) dialog.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', keepFocusInside)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', keepFocusInside)
      const returnTarget = trigger?.isConnected ? trigger : fallbackTarget
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true })
    }
  }, [open])

  return dialogRef
}
