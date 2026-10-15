import { useSyncExternalStore } from 'react'
import catalog from '../locales/interface.json' with { type: 'json' }
export const LANGUAGE_KEY = 'CareSphere.interfaceLanguage'
export const LANGUAGES = [
  {id:'auto',name:'Use device language'}, {id:'en',name:'English'},
  {id:'es',name:'Español'}, {id:'zh-Hans',name:'中文（简体）'},
  {id:'fil',name:'Filipino / Tagalog'}, {id:'vi',name:'Tiếng Việt'},
]
export const LANGUAGE_EVENT = 'caresphere-language-change'
export function resolveLanguage(tags = []) {
  for (const tag of tags) {
    const base=String(tag).toLowerCase().replaceAll('_','-').split('-')[0]
    if(base==='zh')return 'zh-Hans'
    if(base==='tl'||base==='fil')return 'fil'
    if(['en','es','vi'].includes(base))return base
  }
  return 'en'
}
let preference='auto'
try { const value=globalThis.localStorage?.getItem(LANGUAGE_KEY);if(LANGUAGES.some(l=>l.id===value))preference=value } catch {}
export const getLanguagePreference=()=>preference
export const getLanguage=()=>preference==='auto'?resolveLanguage(globalThis.navigator?.languages||[]):preference
export const languageTag=(language=getLanguage())=>({'en':'en-US','es':'es-US','zh-Hans':'zh-CN','fil':'fil-PH','vi':'vi-VN'}[language]||'en-US')
export function translate(source,args=[],language=getLanguage()) {
  if(typeof source!=='string')return source
  const key=source.trim(), entry=catalog[key]?.[language]
  const template=typeof entry==='string'?source.slice(0,source.indexOf(key))+entry+source.slice(source.indexOf(key)+key.length):source
  // Replace only placeholders in the catalog template, never tokens inside personal data.
  return template.replace(/\{(\d+)\}/g,(whole,index)=>index<args.length?String(args[index]):whole)
}
export const tr=translate
export function setLanguagePreference(value) {
  if(!LANGUAGES.some(l=>l.id===value))throw new Error('Unsupported language')
  let saved=true
  try { globalThis.localStorage.setItem(LANGUAGE_KEY,value) } catch { saved=false }
  preference=value
  globalThis.speechSynthesis?.cancel()
  globalThis.dispatchEvent?.(new Event(LANGUAGE_EVENT))
  return saved
}
function subscribe(callback) {
  const changed=e=>{
    if(e.type==='storage' && e.key===LANGUAGE_KEY)preference=LANGUAGES.some(l=>l.id===e.newValue)?e.newValue:'auto'
    callback()
  }
  for(const event of [LANGUAGE_EVENT,'storage','languagechange'])globalThis.addEventListener?.(event,changed)
  return()=>{for(const event of [LANGUAGE_EVENT,'storage','languagechange'])globalThis.removeEventListener?.(event,changed)}
}
export function useLanguage(){return useSyncExternalStore(subscribe,()=>`${preference}:${getLanguage()}`,()=> 'auto:en')}
export function voiceMatches(language,tag) {
  const base=String(tag).toLowerCase().split('-')[0]
  return language==='fil'?['tl','fil'].includes(base):language==='zh-Hans'?base==='zh'&&!/-(hk|mo)(-|$)/i.test(tag):base===language
}
