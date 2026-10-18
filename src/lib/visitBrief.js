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
export function buildVisitBriefHtml({ brief, fingerprint, generatedAt = new Date(), sealImageUrl = '' }) {
  const digest = String(fingerprint || '').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('A valid SHA-256 report fingerprint is required.')
  const date = escapeHtml(generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))
  const preparedAt = escapeHtml(generatedAt.toLocaleString())
  const shortId = digest.slice(0, 12).toUpperCase()
  const safeDigest = escapeHtml(digest)
  const safeSealImageUrl = /^(?:data:image\/jpeg;base64,[A-Za-z0-9+/=]+|\/[A-Za-z0-9_./-]+\.jpe?g(?:\?[A-Za-z0-9._=-]+)?)$/.test(sealImageUrl) ? sealImageUrl : ''
  const sealArtwork = safeSealImageUrl
    ? `<img class="seal-artwork" src="${safeSealImageUrl}" alt="CareSphere visit preparation personal-copy seal">`
    : '<div class="seal-fallback" aria-hidden="true">CARE<br><span>VISIT PREP</span></div>'

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CareSphere Visit Preparation Report</title>
<style>
@page { size: A4; margin: 15mm 15mm 18mm; }
:root { color-scheme: light; --ink:#132c36; --muted:#60767a; --teal:#126e68; --mint:#eaf5ef; --gold:#d0a659; }
* { box-sizing:border-box; }
body { margin:0; color:var(--ink); background:#edf2f0; font: 11pt/1.55 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.sheet { max-width:820px; margin:28px auto; padding:48px 58px 36px; background:#fff; box-shadow:0 18px 55px #173b4020; }
.hero { position:relative; overflow:hidden; margin:-48px -58px 32px; padding:38px 58px 34px; color:#f3fbf7; background:linear-gradient(125deg,#103e46 0%,#146e68 62%,#208879 100%); }
.hero:after { content:""; position:absolute; width:250px; height:250px; right:-75px; top:-115px; border:1px solid #ffffff30; border-radius:50%; box-shadow:0 0 0 22px #ffffff0d,0 0 0 45px #ffffff08; }
.brand { display:flex; align-items:center; gap:12px; font-size:10pt; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:#d5eee4; }
.brand-mark { display:grid; place-items:center; width:38px; height:38px; border:1px solid #9bd9bf; border-radius:13px 13px 13px 4px; background:linear-gradient(145deg,#e9fff5,#92d5b3); color:#14574d; font-size:15pt; font-weight:900; box-shadow:inset 0 0 0 3px #ffffff65; }
h1 { max-width:550px; margin:25px 0 8px; color:#fff; font-size:31pt; line-height:1.07; letter-spacing:-.04em; }
.subtitle { margin:0; color:#d7eee7; font-size:11pt; }
.report-meta { display:flex; justify-content:space-between; gap:16px; margin-top:25px; color:#e2f3ed; font-size:9pt; }
.report-meta b { color:#fff; }
.kicker { color:var(--teal); font-weight:800; letter-spacing:.14em; text-transform:uppercase; font-size:8pt; }
.context-note { margin:0 0 25px; padding:13px 16px; border-left:3px solid #65a99b; border-radius:0 10px 10px 0; background:#f1f7f4; color:#36555a; font-size:9.5pt; }
section { margin:22px 0 27px; break-inside:avoid; }
h2 { margin:0; color:#164d50; font-size:14pt; line-height:1.25; letter-spacing:-.015em; text-transform:capitalize; }
.source-note { margin:5px 0 11px; color:var(--muted); font-size:8.2pt; }
p { margin:8px 0; }
ul { margin:10px 0 0; padding:0; list-style:none; }
li { position:relative; margin:0; padding:9px 0 9px 19px; border-bottom:1px solid #e7eeeb; overflow-wrap:anywhere; }
li:before { content:""; position:absolute; left:2px; top:17px; width:6px; height:6px; border-radius:50%; background:#42a080; }
.key-value { display:grid; grid-template-columns:220px 1fr; gap:12px; padding:9px 0; border-bottom:1px solid #e7eeeb; }
.key-value strong { color:#557173; font-size:9pt; }
.reverse-hint { margin-top:28px; padding:11px 14px; border:1px solid #d6e8de; border-radius:10px; background:#f4f9f5; color:#315a53; font-size:8.5pt; }
.reverse-side { break-before:page; page-break-before:always; }
.reverse-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:18px; padding-bottom:15px; border-bottom:2px solid #d7e9df; }
.reverse-heading h1 { margin:0; color:#164d50; font-size:24pt; }
.reverse-heading .kicker { margin-bottom:7px; }
.reverse-heading .back-label { color:#738784; font-size:8pt; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
.back-layout { display:grid; grid-template-columns:190px 1fr; gap:22px; align-items:start; margin:20px 0 25px; padding:18px; border:1px solid #e1eae4; border-radius:16px; background:linear-gradient(135deg,#f7faf7,#eef6f0); break-inside:avoid; }
.seal-artwork { display:block; width:100%; max-width:190px; aspect-ratio:1; object-fit:contain; border-radius:50%; clip-path:circle(49% at 50% 50%); }
.seal-fallback { display:grid; place-content:center; width:100%; max-width:190px; aspect-ratio:1; border:5px double #a77d2b; border-radius:50%; background:#153e32; color:#f7e7b3; text-align:center; font:900 20pt Georgia,serif; }
.seal-fallback span { font-size:12pt; }
.stamp-title { margin:0 0 8px; color:#72531f; font-size:10pt; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
.stamp-copy { margin:0 0 9px; color:#425d58; font-size:8.2pt; }
.stamp-meta { display:grid; grid-template-columns:92px 1fr; gap:4px 10px; margin:11px 0; font-size:8pt; }
.stamp-meta dt { color:#647a73; font-weight:700; }
.stamp-meta dd { margin:0; color:#183f3d; overflow-wrap:anywhere; }
.fingerprint { display:block; padding:9px 10px; border:1px dashed #b7cfc1; border-radius:8px; background:#fff; color:#214c50; font:700 7pt/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap:anywhere; }
.ledger-title { margin:23px 0 12px; color:#164d50; font-size:14pt; }
.ledger-card { margin:12px 0; padding:12px 14px; border:1px solid #e3ece7; border-radius:11px; break-inside:avoid; }
.ledger-heading { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.ledger-heading h2 { color:#164d50; font-size:10.5pt; }
.ledger-heading span { color:#60767a; font-size:7.5pt; white-space:nowrap; }
.ledger-source { margin:3px 0 6px; color:#738784; font-size:7.3pt; }
.ledger-card ul { margin:5px 0 0; }
.ledger-card li { padding:5px 0 5px 15px; font-size:8pt; }
.ledger-card li:before { top:12px; width:5px; height:5px; }
.empty-ledger { padding:18px; border-radius:10px; background:#f3f7f4; color:#60767a; }
.reverse-footer { margin-top:23px; padding-top:11px; border-top:1px solid #dfe9e3; color:#6c807e; font-size:7.5pt; }
.footer { display:flex; justify-content:space-between; gap:14px; margin-top:25px; padding-top:12px; border-top:1px solid #e2ebe6; color:#6c807e; font-size:7.5pt; }
@media print { body { background:#fff; } .sheet { max-width:none; margin:0; padding:0; box-shadow:none; } .hero { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .back-layout,.reverse-hint,.ledger-card { -webkit-print-color-adjust:exact; print-color-adjust:exact; } a { color:inherit; text-decoration:none; } }
@media screen { .sheet { border-radius:18px; } }
@media screen and (max-width:620px) { .back-layout { grid-template-columns:1fr; } .seal-artwork,.seal-fallback { max-width:170px; margin-inline:auto; } .reverse-heading { align-items:flex-start; flex-direction:column; } }
</style></head><body><main class="sheet">
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
</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`
}
