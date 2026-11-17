import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (sandi: string, salt: Buffer, panjang: number) => Promise<Buffer>
const PANJANG_KUNCI = 64

// Format: "<salt hex>:<hash hex>"
export async function hashSandi(sandi: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(sandi, salt, PANJANG_KUNCI)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export async function cocokSandi(sandi: string, tersimpan: string): Promise<boolean> {
  const [saltHex, hashHex] = tersimpan.split(':')
  if (!saltHex || !hashHex) return false
  const hashTersimpan = Buffer.from(hashHex, 'hex')
  const hash = await scrypt(sandi, Buffer.from(saltHex, 'hex'), hashTersimpan.length)
  return hash.length === hashTersimpan.length && timingSafeEqual(hash, hashTersimpan)
}
