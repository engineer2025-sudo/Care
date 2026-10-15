import React,{useState} from 'react'
import {LANGUAGES,tr,useLanguage,getLanguagePreference,setLanguagePreference} from '../lib/i18n'
export default function LanguagePicker(){
  useLanguage()
  const [error,setError]=useState(false)
  return <section className="support-card" aria-label={tr('App language')}>
    <label className="block font-semibold">🌐 {tr('App language')}
      <select data-testid="app-language" className="library-input block w-full mt-2" value={getLanguagePreference()} onChange={e=>setError(!setLanguagePreference(e.target.value))}>
        {LANGUAGES.map(l=><option key={l.id} value={l.id}>{l.id==='auto'?tr(l.name):l.name}</option>)}
      </select>
    </label>
    <p className="text-sm mt-2">{tr('Your notes and care records stay in their original language.')}</p>
    <p className="text-sm mt-2">{tr('Some advanced instructions and external content remain in English.')}</p>
    {error&&<p role="alert">{tr('Language preference could not be saved.')}</p>}
  </section>
}
