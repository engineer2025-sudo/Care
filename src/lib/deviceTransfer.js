// Interoperable with the native iPhone/Android implementations. No network calls.
const enc = new TextEncoder(), dec = new TextDecoder('utf-8', {fatal:true})
const aad = enc.encode('CareSphere transfer v1')
const b64 = a => { let s=''; for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s) }
const bytes = s => { if(typeof s!=='string'||!(/^[A-Za-z0-9+/]*={0,2}$/).test(s))throw Error('Invalid encoding');return Uint8Array.from(atob(s),c=>c.charCodeAt(0)) }
export function validateTransfer(v) {
  if(!v || v.version!==1 || typeof v.id!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v.id) || !Array.isArray(v.records) || !v.records.length || v.records.length>100)throw Error('Not a supported CareSphere transfer.')
  const ids=new Set()
  for(const r of v.records){
    if(!r || typeof r.id!=='string' || !r.id || r.id.length>120 || ids.has(r.id) || !['note','routine'].includes(r.type) || typeof r.text!=='string' || !r.text.trim() || r.text.length>(r.type==='note'?4000:240))throw Error('The transfer contains invalid or oversized records. Nothing was imported.')
    ids.add(r.id)
  }
  return {version:1,id:v.id,records:v.records.map(({id,type,text})=>({id,type,text}))}
}
async function derive(password,salt) {
  if(typeof password!=='string')throw Error('Enter a passphrase.')
  const input=enc.encode(password.normalize('NFC'))
  if(input.length<12||input.length>1024)throw Error('Use a passphrase with at least 12 characters (up to 1,024 UTF-8 bytes). Share it separately from the file.')
  const key=await crypto.subtle.importKey('raw',input,'PBKDF2',false,['deriveKey'])
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])
}
export async function encryptTransfer(payload,password) {
  const plain=enc.encode(JSON.stringify(validateTransfer(payload)))
  if(plain.length>699984)throw Error('Selected text is too large for one transfer. Choose fewer records.')
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12))
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},await derive(password,salt),plain)
  return JSON.stringify({format:'CareSphere Transfer',version:1,iterations:310000,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))})
}
export async function decryptTransfer(raw,password) {
  try {
    if(typeof raw!=='string'||raw.length>1000000)throw Error()
    const e=JSON.parse(raw)
    if(e.format!=='CareSphere Transfer'||e.version!==1||e.iterations!==310000)throw Error()
    const salt=bytes(e.salt),iv=bytes(e.iv),ciphertext=bytes(e.ciphertext)
    if(salt.length!==16||iv.length!==12||ciphertext.length<16||ciphertext.length>700000)throw Error()
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},await derive(password,salt),ciphertext)
    return validateTransfer(JSON.parse(dec.decode(plaintext)))
  } catch { throw Error('Cannot unlock this CareSphere transfer. Check the passphrase and file. Nothing has been imported.') }
}
export function prepareTransferImport(payload,selected,notes,routines,receivedItems,makeID=()=>crypto.randomUUID()) {
  const checked=validateTransfer(payload), chosen=checked.records.filter(r=>selected.includes(r.id)&&!receivedItems.includes(`${checked.id}:${r.id}`))
  if(!chosen.length)throw Error('Choose records that have not already been imported.')
  if(notes.length+chosen.filter(r=>r.type==='note').length>500||routines.length+chosen.filter(r=>r.type==='routine').length>200)throw Error('Not enough local capacity. Import fewer records or remove items first.')
  const now=new Date().toISOString()
  return {notes:[...notes,...chosen.filter(r=>r.type==='note').map(r=>({id:makeID(),note:r.text,author:'Imported copy',date:now}))],routines:[...routines,...chosen.filter(r=>r.type==='routine').map(r=>({id:makeID(),text:r.text,completedOn:null}))],receivedItems:[...receivedItems,...chosen.map(r=>`${checked.id}:${r.id}`)].slice(-2000),chosen}
}
