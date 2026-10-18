/** Clock validation only, never medication instructions or a dosing decision. */
export function reminderDate(value, now = new Date()) {
  if (typeof value !== 'string') return null
  const twelve = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s(AM|PM)$/i.exec(value)
  const twentyFour = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(value)
  const match = twelve || twentyFour
  if (!match) return null
  let hour = Number(match[1])
  if (twelve) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)
  const due = new Date(now)
  due.setHours(hour, Number(match[2]), 0, 0)
  return due
}
