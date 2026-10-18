const enc = new TextEncoder(), dec = new TextDecoder()
const b64 = a => btoa(Array.from(a, b=>String.fromCharCode(b)).join(''))
const bytes = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0))
async function keyFor(password, salt) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) throw new Error('Use a passphrase of 12–1,024 characters. Keep it somewhere safe; it cannot be recovered.')
  const base = await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey'])
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])
}
export async function makeBackup(data, password) {
  const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12))
  const key=await keyFor(password,salt)
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('CareSphere:web:backup:1')},key,enc.encode(JSON.stringify(data)))
  return JSON.stringify({format:'CareSphere-web-backup',version:1,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))})
}
export async function openBackup(raw, password) {
  if (raw.length > 6000000) throw new Error('Backup is too large.')
  const v=JSON.parse(raw)
  if(v.format!=='CareSphere-web-backup'||v.version!==1||typeof v.ciphertext!=='string'||typeof v.salt!=='string'||typeof v.iv!=='string') throw new Error('Choose a CareSphere web backup. Native backups are not interchangeable.')
  const salt=bytes(v.salt),iv=bytes(v.iv)
  if(salt.length!==16||iv.length!==12) throw new Error('Invalid backup.')
  try {
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode('CareSphere:web:backup:1')},await keyFor(password,salt),bytes(v.ciphertext))
    const value=JSON.parse(dec.decode(plaintext)); if(!value || Array.isArray(value) || typeof value !== 'object') throw Error()
    return value
  } catch { throw new Error('Could not unlock this backup. Check the passphrase and file. Nothing has been changed.') }
}
