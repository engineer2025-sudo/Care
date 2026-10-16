import React from 'react'
import { useBareMinimum } from '../lib/displayMode.js'

export default function Info({ as: Tag = 'p', className, children, ...rest }) {
  if (useBareMinimum()) return null
  return <Tag className={className} {...rest}>{children}</Tag>
}
