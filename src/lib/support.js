import {getLanguage,languageTag,voiceMatches,tr} from './i18n.js'
const text = (v, n = 240) => typeof v === 'string' ? v.slice(0, n).trim() : ''
const rows = (v, n) => Array.isArray(v) ? v.filter(x => x && typeof x === 'object').slice(0, n) : []
export const PHRASES = ['I need a break', 'It is too loud', 'Please explain again', 'Yes', 'No', 'I would like some help']
export const PACKS = {
  nature: ['What do you notice outside?', 'Would you choose a garden, beach, or forest?', 'Name or point to something that grows.'],
  music: ['What sounds do you enjoy?', 'Would you like music or quiet?', 'Tell a story about a song, or skip.'],
  familiar: ['What makes a place comfortable?', 'What object do you like to have nearby?', 'Choose a familiar everyday task to talk about.'],
}
export function safeLink(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : '' } catch { return '' }
}
export function normalizeSupport(v = {}) {
  if (!v || typeof v !== 'object') v = {}
  return {
    simple: v.simple === true, onboarded: v.onboarded === true, speakSteps: v.speakSteps === true,
    choices: [2,3,4].includes(v.choices) ? v.choices : 3,
    phrases: Array.isArray(v.phrases) ? v.phrases.map(x => text(x)).filter(Boolean).slice(0,24) : [],
    contacts: rows(v.contacts,20).map(c => ({ id:text(c.id,100), name:text(c.name,80), phone:text(c.phone,32).replace(/[^+\d() .-]/g,''), video:safeLink(c.video) })).filter(c => c.id && c.name),
    plans: rows(v.plans,30).map(p => ({ id:text(p.id,100), title:text(p.title,120), steps: rows(p.steps,40).map(s => ({id:text(s.id,100),text:text(s.text),photoId:text(s.photoId,100)})).filter(s=>s.text) })).filter(p=>p.id && p.title && p.steps.length),
    photos: rows(v.photos,10).map(p => ({id:text(p.id,100),caption:text(p.caption,120),url:typeof p.url === 'string' && p.url.length < 180000 && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(p.url) ? p.url : ''})).filter(p=>p.id && p.url),
    questions: rows(v.questions,100).map(q => ({id:text(q.id,100),text:text(q.text,1000),priority:q.priority===true,done:q.done===true,followup:text(q.followup,2000)})).filter(q=>q.id && q.text),
    trash: rows(v.trash,100).filter(n=>Number.isFinite(n.deletedAt) && n.deletedAt > Date.now()-30*86400000 && n.deletedAt <= Date.now()).map(n=>({id:Number.isSafeInteger(n.id)?n.id:text(n.id,120),note:text(n.note,10000),date:text(n.date,80),author:text(n.author,120),deletedAt:n.deletedAt,...(typeof n.editedAt==='string'&&!Number.isNaN(new Date(n.editedAt).valueOf())?{editedAt:n.editedAt}:{})})).filter(n=>(Number.isSafeInteger(n.id)||!!n.id) && n.note),
    receivedItems: Array.isArray(v.receivedItems) ? [...new Set(v.receivedItems.filter(x=>typeof x==='string' && x.length<=200))].slice(-2000) : [],
  }
}
export function speak(text) {
  if (!globalThis.speechSynthesis) throw new Error('Speech is unavailable in this browser. The words remain visible.')
  const voice=speechSynthesis.getVoices().find(v=>v.localService&&voiceMatches(getLanguage(),v.lang));
  if(!voice)throw Error(tr('No installed voice for this language. The words remain visible.'));
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.voice=voice;utterance.lang=languageTag();utterance.rate = 0.85; speechSynthesis.speak(utterance)
}
export function downloadFile(name, value, type = 'application/json') {
  const url=URL.createObjectURL(new Blob([value],{type})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}
