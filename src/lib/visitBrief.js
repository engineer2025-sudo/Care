import { isMedicationTakenToday } from './careStorage.js'

const DEFAULT_MOOD_LABELS = {
  1: 'Struggling',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

/**
 * Assemble a user-selected, source-labeled visit-prep text brief.
 * This is a convenience export, not a clinical record or interpretation.
 */
export function buildVisitBrief({
  displayName = '',
  meds = [],
  medsConfirmed = false,
  notes = [],
  moods = [],
  hrRecords = [],
  manualVitals = [],
  includeName = false,
  includeMeds = false,
  includeMoods = false,
  includeNotes = false,
  includeLiveVitals = false,
  includeManualVitals = false,
  visitQuestions = '',
  moodLabels = DEFAULT_MOOD_LABELS,
  now = new Date(),
} = {}) {
  const dateLabel = value => {
    const date = new Date(value)
    return Number.isNaN(date.valueOf()) ? String(value || 'Date not recorded') : date.toLocaleString()
  }
  const noteDateLabel = value => {
    if (!value || value === 'Just now') return 'Date not recorded'
    const date = new Date(value)
    return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleString()
  }
  const liveRecords = hrRecords.filter(record => record.source === 'LIVE_BLE').slice(-20)
  const lines = [
    'CareSphere · Visit preparation brief',
    `Prepared: ${now.toLocaleString()}`,
    'User-prepared information only. This is not a verified medical record, diagnosis, or clinical interpretation.',
    '',
  ]

  if (includeName) lines.push(`Display name: ${displayName || 'Not entered'}`, '')
  if (includeMeds) {
    lines.push('MEDICATION REMINDERS (user-entered; not pharmacy-verified)')
    lines.push(`Schedule reviewed in CareSphere: ${medsConfirmed ? 'Yes' : 'No — schedule is unconfirmed and reminders are paused.'}`)
    if (meds.length === 0) lines.push('No medication reminders are saved.')
    meds.forEach(med => {
      const markedTakenToday = isMedicationTakenToday(med, now)
      lines.push(`- ${med.name || 'Unnamed entry'} · ${med.time || 'time not set'}${medsConfirmed ? (markedTakenToday ? ' · marked taken by user today' : ' · not marked taken today') : ''}`)
    })
    lines.push('')
  }
  if (includeMoods) {
    lines.push('MOOD CHECK-INS (optional self-reports; not a clinical measure)')
    if (moods.length === 0) lines.push('No mood check-ins are saved.')
    moods.slice(-30).forEach(mood => {
      const label = moodLabels[mood.score] || `Score ${mood.score}`
      lines.push(`- ${mood.date || 'Date not recorded'} · ${label}`)
    })
    lines.push('')
  }
  if (includeNotes) {
    lines.push('CARE NOTES (user-entered; not clinician-verified)')
    if (notes.length === 0) lines.push('No care notes are saved.')
    notes.slice(0, 50).forEach(note => lines.push(`- ${noteDateLabel(note.date)} · ${note.author || 'Author not recorded'}: ${note.note || ''}`))
    lines.push('')
  }
  if (includeLiveVitals) {
    lines.push('LIVE BLUETOOTH HEART RATE (source-labeled session samples; not a diagnosis)')
    if (liveRecords.length === 0) lines.push('No live BLE heart-rate samples are available in this browser session.')
    liveRecords.forEach(record => lines.push(`- ${dateLabel(record.timestamp)} · ${record.value} bpm · ${record.source}`))
    lines.push('')
  }
  if (includeManualVitals) {
    lines.push('MANUALLY ENTERED VITALS (self-entered values; not sensor-verified)')
    if (manualVitals.length === 0) lines.push('No manually entered vital records are saved.')
    manualVitals.slice(-30).forEach(record => {
      const value = record.kind === 'bp'
        ? `${record.first}/${record.second} mmHg`
        : record.kind === 'oxygen' ? `${record.first}% SpO₂` : 'Unrecognized reading'
      lines.push(`- ${dateLabel(record.at)} · ${value} · entered by user`)
    })
    lines.push('')
  }
  if (visitQuestions.trim()) {
    lines.push('QUESTIONS OR TOPICS I WANT TO DISCUSS', visitQuestions.trim(), '')
  }

  return lines.join('\n')
}

/** Build a local SHA-256 fingerprint for the exact selected text, not an identity signature. */
export async function createReportFingerprint(text, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.subtle || typeof TextEncoder === 'undefined') {
    throw new Error('Secure SHA-256 is not available in this browser.')
  }
  const bytes = await cryptoProvider.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]))

const SECTION_TITLES = new Set([
  'MEDICATION REMINDERS (user-entered; not pharmacy-verified)',
  'MOOD CHECK-INS (optional self-reports; not a clinical measure)',
  'CARE NOTES (user-entered; not clinician-verified)',
  'LIVE BLUETOOTH HEART RATE (source-labeled session samples; not a diagnosis)',
  'MANUALLY ENTERED VITALS (self-entered values; not sensor-verified)',
  'QUESTIONS OR TOPICS I WANT TO DISCUSS',
])

function renderBriefBody(brief) {
  const lines = brief.split('\n')
  const body = []
  let section = null
  let list = []
  const target = () => section || body
  const flushList = () => {
    if (!list.length) return
    target().push(`<ul>${list.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`)
    list = []
  }
  const flushSection = () => {
    flushList()
    if (section) body.push(`<section>${section.join('')}</section>`)
    section = null
  }

  lines.forEach((line, index) => {
    if (!line.trim() || index === 0 || line.startsWith('Prepared:')) return
    if (SECTION_TITLES.has(line)) {
      flushSection()
      const sourceStart = line.indexOf('(')
      const source = sourceStart >= 0 && line.endsWith(')') ? line.slice(sourceStart + 1, -1) : ''
      section = [`<h2>${escapeHtml(line.split(' (')[0])}</h2>`]
      if (source) section.push(`<p class="source-note">${escapeHtml(source)}</p>`)
      return
    }
    if (line.startsWith('- ')) {
      list.push(line.slice(2))
      return
    }
    flushList()
    if (line.startsWith('User-prepared information only.')) {
      flushSection()
      body.push(`<div class="context-note">${escapeHtml(line)}</div>`)
    } else if (/^Display name:/.test(line) || /^Schedule reviewed in CareSphere:/.test(line)) {
      const [label, ...value] = line.split(':')
      target().push(`<p class="key-value"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value.join(':').trim())}</span></p>`)
    } else {
      target().push(`<p>${escapeHtml(line)}</p>`)
    }
  })
  flushSection()
  return body.join('\n')
}

function selectedDataLedger(brief) {
  const sections = []
  let current = null
  const profile = []
  for (const line of brief.split('\n')) {
    if (SECTION_TITLES.has(line)) {
      current = {
        title: line.split(' (')[0],
        source: line.includes('(') ? line.slice(line.indexOf('(') + 1, -1) : '',
        entries: [],
      }
      sections.push(current)
    } else if (line.startsWith('Display name:')) {
      profile.push(line)
    } else if (current && line.trim() && !line.startsWith('Prepared:') && !line.startsWith('User-prepared information only.')) {
      current.entries.push(line.startsWith('- ') ? line.slice(2) : line)
    }
  }
  if (profile.length) sections.unshift({ title: 'Profile information', source: 'included at the user’s request', entries: profile })
  return sections
}

function renderSelectedDataLedger(brief) {
  const sections = selectedDataLedger(brief)
  if (!sections.length) return '<p class="empty-ledger">No personal data sections were selected for this copy.</p>'
  return sections.map(({ title, source, entries }) => `<section class="ledger-card"><div class="ledger-heading"><h2>${escapeHtml(title)}</h2><span>${entries.length} ${entries.length === 1 ? 'item' : 'items'}</span></div>${source ? `<p class="ledger-source">${escapeHtml(source)}</p>` : ''}<ul>${entries.map(entry => `<li>${escapeHtml(entry)}</li>`).join('')}</ul></section>`).join('')
}

/** Print-ready HTML. The browser's print dialog can save it as a PDF. */
export function buildVisitBriefHtml({ brief, fingerprint, generatedAt = new Date() }) {
  const digest = String(fingerprint || '').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('A valid SHA-256 report fingerprint is required.')
  const date = escapeHtml(generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))
  const preparedAt = escapeHtml(generatedAt.toLocaleString())
  const shortId = digest.slice(0, 12).toUpperCase()
  const safeDigest = escapeHtml(digest)
  const sealArtwork = '<div class="seal-fallback" role="img" aria-label="CareSphere personal-copy seal"><span class="seal-initials">CS</span><span class="seal-name">CARESPHERE<br>PERSONAL COPY</span></div>'

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CareSphere Visit Preparation Report</title>
<style>
@page { size: A4; margin: 16mm 16mm 18mm; }
:root { color-scheme: light; --ink:#111; --muted:#444; --rule:#777; --soft:#eee; --paper:#fff; }
* { box-sizing:border-box; }
body { margin:0; color:var(--ink); background:#fff; font:10.5pt/1.55 Arial, Helvetica, sans-serif; }
.screen-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; max-width:820px; margin:16px auto 0; padding:12px 18px; border:1px solid #888; background:#fff; font-size:10pt; }
.screen-toolbar p { margin:0; color:#333; }
.screen-toolbar-actions { display:flex; gap:8px; flex-wrap:wrap; }
.screen-toolbar button { min-height:42px; padding:8px 14px; border:1px solid #111; background:#fff; color:#111; font:700 10pt Arial, sans-serif; cursor:pointer; }
.screen-toolbar button:first-child { background:#111; color:#fff; }
.screen-toolbar button:focus-visible { outline:3px solid #555; outline-offset:3px; }
.sheet { max-width:820px; margin:20px auto; padding:42px 58px 34px; background:#fff; border:1px solid #999; }
.hero { margin:-42px -58px 30px; padding:26px 58px 25px; border-bottom:2px solid #111; background:#fff; color:#111; }
.brand { display:flex; align-items:center; gap:11px; font-size:9pt; font-weight:700; letter-spacing:.13em; text-transform:uppercase; color:#222; }
.brand-mark { display:grid; place-items:center; width:36px; height:36px; border:2px solid #111; color:#111; font:700 15pt Georgia,serif; }
h1 { max-width:560px; margin:25px 0 8px; color:#111; font:700 29pt/1.1 Georgia, "Times New Roman", serif; letter-spacing:0; }
.subtitle { margin:0; color:#333; font-size:10.5pt; }
.report-meta { display:flex; justify-content:space-between; gap:16px; margin-top:23px; color:#222; font-size:8.5pt; }
.report-meta > span:first-child { font-weight:700; letter-spacing:.13em; }
.report-meta b { color:#111; }
.kicker { color:#222; font-weight:700; letter-spacing:.13em; text-transform:uppercase; font-size:8pt; }
.context-note { margin:0 0 22px; padding:10px 13px; border:1px solid #888; border-left:3px solid #111; background:#f5f5f5; color:#222; font-size:9pt; }
section { margin:20px 0 24px; break-inside:avoid; }
h2 { margin:0; padding-bottom:5px; border-bottom:1px solid #555; color:#111; font:700 13pt/1.25 Georgia, "Times New Roman", serif; text-transform:capitalize; }
.source-note { margin:5px 0 9px; color:#444; font-size:8pt; }
p { margin:8px 0; }
ul { margin:8px 0 0; padding:0; list-style:none; }
li { position:relative; margin:0; padding:7px 0 7px 17px; border-bottom:1px solid #ddd; overflow-wrap:anywhere; }
li:before { content:"—"; position:absolute; left:0; top:7px; color:#111; }
.key-value { display:grid; grid-template-columns:220px 1fr; gap:12px; padding:8px 0; border-bottom:1px solid #ddd; }
.key-value strong { color:#333; font-size:9pt; }
.reverse-hint { margin-top:26px; padding:10px 12px; border:1px solid #777; background:#f5f5f5; color:#222; font-size:8.5pt; }
.reverse-side { break-before:page; page-break-before:always; }
.reverse-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:18px; padding-bottom:13px; border-bottom:2px solid #111; }
.reverse-heading h1 { margin:0; color:#111; font-size:23pt; }
.reverse-heading .kicker { margin-bottom:6px; }
.reverse-heading .back-label { color:#333; font-size:8pt; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.back-layout { display:grid; grid-template-columns:170px 1fr; gap:22px; align-items:start; margin:18px 0 22px; padding:16px; border:1px solid #555; background:#fff; break-inside:avoid; }
.seal-fallback { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; width:160px; height:160px; border:4px double #111; border-radius:50%; color:#111; text-align:center; }
.seal-initials { font:700 28pt Georgia, "Times New Roman", serif; letter-spacing:.04em; }
.seal-name { padding-top:6px; border-top:1px solid #111; font:700 7pt/1.5 Arial,sans-serif; letter-spacing:.12em; }
.stamp-title { margin:0 0 8px; color:#111; font:700 9pt Arial,sans-serif; letter-spacing:.09em; text-transform:uppercase; }
.stamp-copy { margin:0 0 8px; color:#333; font-size:8pt; }
.stamp-meta { display:grid; grid-template-columns:92px 1fr; gap:4px 10px; margin:10px 0; font-size:8pt; }
.stamp-meta dt { color:#333; font-weight:700; }
.stamp-meta dd { margin:0; color:#111; overflow-wrap:anywhere; }
.fingerprint { display:block; padding:8px; border:1px dashed #555; background:#fff; color:#111; font:700 7pt/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap:anywhere; }
.ledger-title { margin:22px 0 10px; padding-bottom:5px; border-bottom:1px solid #555; color:#111; font:700 13pt Georgia,"Times New Roman",serif; }
.ledger-card { margin:10px 0; padding:11px 13px; border:1px solid #777; break-inside:avoid; }
.ledger-heading { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.ledger-heading h2 { padding:0; border:0; color:#111; font:700 10pt Arial,sans-serif; }
.ledger-heading span { color:#333; font-size:7.5pt; white-space:nowrap; }
.ledger-source { margin:3px 0 6px; color:#444; font-size:7.3pt; }
.ledger-card ul { margin:5px 0 0; }
.ledger-card li { padding:5px 0 5px 16px; font-size:8pt; }
.ledger-card li:before { top:5px; }
.empty-ledger { padding:14px; border:1px solid #777; color:#222; }
.reverse-footer { margin-top:21px; padding-top:10px; border-top:1px solid #777; color:#333; font-size:7.5pt; }
.footer { display:flex; justify-content:space-between; gap:14px; margin-top:23px; padding-top:10px; border-top:1px solid #777; color:#333; font-size:7.5pt; }
@media print { .screen-toolbar { display:none !important; } body { background:#fff; } .sheet { max-width:none; margin:0; padding:0; border:0; } .hero { margin:0 0 24px; padding:0 0 18px; } a { color:inherit; text-decoration:none; } }
@media screen { .sheet { box-shadow:0 3px 16px #00000012; } }
@media screen and (max-width:620px) { .screen-toolbar { margin:8px; align-items:flex-start; flex-direction:column; } .screen-toolbar-actions { width:100%; } .screen-toolbar button { flex:1; } .sheet { margin:8px; padding:28px 22px 24px; } .hero { margin:-28px -22px 24px; padding:22px; } .back-layout { grid-template-columns:1fr; } .seal-fallback { margin-inline:auto; } .reverse-heading { align-items:flex-start; flex-direction:column; } }
</style></head><body><nav class="screen-toolbar" aria-label="Report actions"><p>Review this personal report before sharing.</p><div class="screen-toolbar-actions"><button type="button" id="print-report">Print or save as PDF</button><button type="button" id="close-report">Close report</button></div></nav><main class="sheet">
<header class="hero"><div class="brand"><span class="brand-mark">C</span><span>CareSphere · Personal care tools</span></div><div class="report-meta"><span>VISIT PREPARATION</span><span>Prepared <b>${date}</b></span></div><h1>Care visit<br>preparation</h1><p class="subtitle">A clear, personal briefing made from the items you chose.</p></header>
<div class="kicker">Your selected information</div>
${renderBriefBody(brief)}
<div class="reverse-hint">The reverse side contains the selected-data ledger and electronic integrity stamp. For a physical double-sided copy, enable duplex printing in the print dialog.</div>
<footer class="footer"><span>CareSphere · Visit preparation report</span><span>Personal copy · review before sharing</span></footer>
</main>
<main class="sheet reverse-side" aria-label="Report reverse side">
<header class="reverse-heading"><div><div class="kicker">Reverse side · selected data record</div><h1>Data &amp; electronic stamp</h1></div><span class="back-label">Personal copy · not a signed medical record</span></header>
<div class="back-layout">${sealArtwork}<div><p class="stamp-title">Electronic integrity stamp · ${shortId}</p><p class="stamp-copy">A content fingerprint and selected-data ledger for this exact report text. The decorative seal is not a clinician credential, PDF signature, or proof of identity.</p><dl class="stamp-meta"><dt>Prepared</dt><dd>${preparedAt}</dd><dt>Data source</dt><dd>Items selected by the user in CareSphere</dd><dt>Fingerprint</dt><dd>SHA-256 · selected report text</dd><dt>Use</dt><dd>Review the listed data before sharing</dd></dl><code class="fingerprint">${safeDigest}</code></div></div>
<h2 class="ledger-title">Selected data included in this copy</h2>
${renderSelectedDataLedger(brief)}
<footer class="reverse-footer">CareSphere · This stamp fingerprints report text only. It does not authenticate a clinician, clinic, medical record, or certified electronic signature.</footer>
</main><script>document.getElementById('print-report')?.addEventListener('click',()=>window.print());document.getElementById('close-report')?.addEventListener('click',()=>window.close());</script></body></html>`
}
