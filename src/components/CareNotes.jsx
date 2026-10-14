import React, { useEffect, useState } from 'react'
import { useDialog } from '../hooks/useDialog'
import { matchesSearch } from '../lib/activityLibrary'
import { RESET_LOCAL_DATA_EVENT } from '../lib/careStorage'
const dateLabel = date => Number.isNaN(new Date(date).valueOf()) ? 'Date not recorded' : new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function CareNotes({ notes, setNotes, displayName, onDelete }) {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [discard, setDiscard] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [status, setStatus] = useState('')
  const close = () => {
    if (editing && editDraft !== editing.note) { setDiscard(true); return }
    setEditing(null); setDeleting(null); setDiscard(false)
  }
  const dialog = useDialog(!!editing || !!deleting, close)
  const visible = notes.filter(n => matchesSearch(`${n.note} ${n.author}`, query))
  useEffect(() => {
    const reset = () => { setDraft(''); setQuery(''); setEditing(null); setDeleting(null); setEditDraft(''); setDiscard(false); setStatus('') }
    window.addEventListener(RESET_LOCAL_DATA_EVENT, reset)
    return () => window.removeEventListener(RESET_LOCAL_DATA_EVENT, reset)
  }, [])
  return <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
    <div><h3 className="text-lg font-bold text-white">Care notes · local only</h3><p className="text-sm text-slate-400 mt-1">Keep your questions and reminders together. Nothing is sent to anyone.</p></div>
    <form onSubmit={e => {
      e.preventDefault(); if(!draft.trim()) return
      setNotes(current => [{ id: crypto.randomUUID(), date: new Date().toISOString(), author: displayName.trim() ? `You (${displayName})` : 'You', note: draft.trim() }, ...current])
      setDraft(''); setQuery(''); setStatus('Note saved on this device.')
    }} className="space-y-3">
      <label className="block"><span className="block text-sm font-bold mb-2">New care note</span><textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} maxLength={4000} placeholder="A question, update, or reminder for your next visit…" className="library-input resize-y" /></label>
      <div className="flex justify-between gap-3 items-center"><span className="text-xs text-slate-400">{draft.length}/4,000 characters</span><button type="submit" disabled={!draft.trim() || notes.length >= 500} className="library-primary disabled:opacity-40">Save</button></div>
    </form>
    <label className="block"><span className="block text-sm font-bold mb-2">Search care notes</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a word or a person" className="library-input" /></label>
    <p role="status" className="text-sm text-emerald-300">{status}</p>
    {!notes.length && <p className="text-sm text-slate-400 py-4">No care notes yet. Save a question, update, or reminder for your next visit.</p>}
    {!!notes.length && !visible.length && <div className="library-empty"><p>No notes match your search.</p><button className="library-secondary" onClick={() => setQuery('')}>Clear search</button></div>}
    <div className="space-y-3">{visible.map(note => <article key={note.id} className="care-note-item">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400"><span>{note.author}</span><span>Created {dateLabel(note.date)}</span></div>
      <p className="text-base text-slate-200 whitespace-pre-wrap break-words">{note.note}</p>
      {note.editedAt && <p className="text-xs text-slate-400">Edited {dateLabel(note.editedAt)}</p>}
      <div className="flex flex-wrap gap-2"><button className="library-secondary" onClick={() => { setEditing(note); setEditDraft(note.note) }}>Edit note</button><button className="library-secondary" onClick={() => setDeleting(note)}>Delete note</button></div>
    </article>)}</div>
    {(editing || deleting) && <div className="library-modal-backdrop"><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="note-dialog-title" className="library-session max-w-xl">
      <h2 id="note-dialog-title" className="text-xl font-bold text-white">{deleting ? 'Delete this note?' : discard ? 'Discard unsaved changes?' : 'Edit note'}</h2>
      {deleting ? <><p>This moves the note to Recently deleted for 30 days. Restore or permanently erase it in My support tools → Recovery & backup. Previously shared copies cannot be removed.</p><p className="max-h-40 overflow-auto break-words text-slate-300">{deleting.note}</p><div className="flex flex-wrap gap-3"><button className="library-secondary" onClick={close}>Cancel</button><button className="library-primary" onClick={() => { onDelete?.(deleting); setNotes(current => current.filter(n => n.id !== deleting.id)); setDeleting(null); setStatus('Note deleted from this device.') }}>Move to recently deleted</button></div></> : discard ? <><p>Your saved note has not changed.</p><div className="flex flex-wrap gap-3"><button autoFocus className="library-secondary" onClick={() => setDiscard(false)}>Keep editing</button><button className="library-primary" onClick={() => { setEditing(null); setDiscard(false) }}>Discard changes</button></div></> : <>
        <div><label htmlFor="edit-care-note" className="block mb-2">Edit care note</label><textarea id="edit-care-note" value={editDraft} onChange={e => setEditDraft(e.target.value)} maxLength={4000} rows={7} className="library-input" /></div>
        <p className="text-sm text-slate-400">{editDraft.length}/4,000 characters. The creation date is preserved.</p>
        <div className="flex flex-wrap gap-3"><button className="library-secondary" onClick={close}>Cancel</button><button className="library-primary" disabled={!editDraft.trim() || editDraft.length > 4000} onClick={() => { setNotes(current => current.map(n => n.id === editing.id ? { ...n, note: editDraft.trim(), editedAt: new Date().toISOString() } : n)); setEditing(null); setStatus('Note updated on this device.') }}>Save changes</button></div>
      </>}
    </section></div>}
  </section>
}
