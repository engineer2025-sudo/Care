import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {resolveLanguage,translate,voiceMatches,LANGUAGES,setLanguagePreference,getLanguage} from '../src/lib/i18n.js'
import {filterActivities} from '../src/lib/activityLibrary.js'
import {normalizeSupport,speak} from '../src/lib/support.js'

test('device locale aliases resolve to the five supported groups with safe fallback',()=>{
 for(const [tags,want] of [[['es-MX'],'es'],[['zh-TW'],'zh-Hans'],[['tl-PH'],'fil'],[['fil_PH'],'fil'],[['vi-VN'],'vi'],[['fr','es-US'],'es'],[['fr'],'en'],[[],'en']])assert.equal(resolveLanguage(tags),want)
 assert.equal(LANGUAGES.length,6) // five languages + automatic
 assert.throws(()=>setLanguagePreference('not-a-language'))
})
test('all platforms have byte-identical complete catalogs and matching placeholder sets',()=>{
 const bytes=fs.readFileSync('src/locales/interface.json','utf8')
 for(const file of ['ios/ActivityKit/Sources/CareActivityKit/Resources/InterfaceTranslations.json','android/app/src/main/assets/interface.json'])assert.equal(fs.readFileSync(file,'utf8'),bytes)
 const entries=JSON.parse(bytes);assert.ok(Object.keys(entries).length>400)
 for(const [key,entry] of Object.entries(entries))for(const lang of ['es','zh-Hans','fil','vi']){
  assert.ok(entry[lang]?.length,key+': '+lang)
  assert.deepEqual([...entry[lang].matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),[...key.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort())
 }
})
test('translation fallback and nonrecursive placeholders never reinterpret personal text',()=>{
 assert.equal(translate(' Save ',[],'es'),' Guardar ')
 assert.equal(translate('Save',[],'fr'),'Save')
 assert.equal(translate('__proto__',[],'es'),'__proto__')
 assert.equal(translate('Hello, {0}.',['Save {1} <script>'],'es'),'Hola, Save {1} <script>.')
 const support={phrases:['Save','Yes'],contacts:[{id:'id',name:'Save',phone:'123',video:''}]}
 assert.deepEqual(normalizeSupport(support).phrases,support.phrases)
 assert.equal(normalizeSupport(support).contacts[0].name,'Save')
})
test('activity search uses translated display text without changing stable activity IDs',()=>{
 const results=filterActivities({query:'patrón',translate:key=>translate(key,[],'es')})
 assert.ok(results.some(a=>a.id==='completePattern'))
 assert.equal(results.find(a=>a.id==='completePattern').title,'Complete the pattern')
})
test('speech only uses installed local voices matching language, never English fallback',()=>{
 assert.equal(voiceMatches('fil','tl-PH'),true)
 assert.equal(voiceMatches('vi','en-US'),false)
 assert.equal(voiceMatches('zh-Hans','zh-CN'),true)
 assert.equal(voiceMatches('zh-Hans','zh-HK'),false)
 const old=globalThis.speechSynthesis
 let spoke=false
 globalThis.speechSynthesis={getVoices:()=>[{lang:getLanguage(),localService:false}],speak:()=>{spoke=true},cancel:()=>{}}
 try{assert.throws(()=>speak('Save'),/installed voice/);assert.equal(spoke,false)}finally{globalThis.speechSynthesis=old}
})

test('required home, setup, comfort and routine messages cannot silently lose translations',()=>{
 const required=JSON.parse(fs.readFileSync('localization/required-core.json','utf8'))
 const entries=JSON.parse(fs.readFileSync('src/locales/interface.json','utf8'))
 for(const keys of Object.values(required))for(const key of keys)for(const lang of ['es','zh-Hans','fil','vi'])assert.equal(typeof entries[key]?.[lang],'string',key+': '+lang)
})
test('greetings allow locale word order without translating or reparsing the display name',()=>{
 assert.equal(translate('{0}, {1}.',['早上好','Save {0}'],'zh-Hans'),'Save {0}，早上好。')
 for(const lang of ['es','zh-Hans','fil','vi'])assert.notEqual(translate('Good morning',[],lang),'Good morning')
})
