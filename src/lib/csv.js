/** Encode records as RFC 4180-style CSV with CRLF rows and escaped cells. */
export function encodeCsv(rows) {
  if (!Array.isArray(rows)) return ''
  const escapeCell = value => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return rows.map(row => (Array.isArray(row) ? row : [row]).map(escapeCell).join(',')).join('\r\n') + (rows.length ? '\r\n' : '')
}
