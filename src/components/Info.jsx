// Explanatory copy wrapper. Renders nothing in Bare minimum mode; the same
// component marks guidance text so the mode can remove it in one place.
import React from 'react'
import { useBareMinimum } from '../lib/displayMode.js'

export default function Info({ as: Tag = 'p', className, children, ...rest }) {
  if (useBareMinimum()) return null
  return <Tag className={className} {...rest}>{children}</Tag>
}
