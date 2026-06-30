import { describe, it, expect } from 'vitest'
import { encryptAesGcm, decryptAesGcm, generateAesKey, aesKeyFromPassword } from '../src/security/index.js'

function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0')
  }
  return hex
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

describe('encryptAesGcm / decryptAesGcm', () => {
  it('roundtrip encrypts and decrypts a string', async () => {
    const key = await generateAesKey()
    const plaintext = 'Hello, AES-256-GCM!'

    const { ciphertext, iv, tag } = await encryptAesGcm(plaintext, key)
    expect(ciphertext.byteLength).toBeGreaterThan(0)
    expect(iv.byteLength).toBe(12)
    expect(tag.byteLength).toBe(16)

    const decrypted = await decryptAesGcm(ciphertext, key, iv, tag)
    expect(new TextDecoder().decode(decrypted)).toBe(plaintext)
  })

  it('roundtrip with Uint8Array input', async () => {
    const key = await generateAesKey()
    const plaintext = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe])

    const { ciphertext, iv, tag } = await encryptAesGcm(plaintext, key)
    const decrypted = await decryptAesGcm(ciphertext, key, iv, tag)

    expect(Array.from(decrypted)).toEqual(Array.from(plaintext))
  })

  it('fails decryption with wrong key', async () => {
    const key = await generateAesKey()
    const wrongKey = await generateAesKey()
    const { ciphertext, iv, tag } = await encryptAesGcm('secret', key)

    await expect(decryptAesGcm(ciphertext, wrongKey, iv, tag)).rejects.toThrow()
  })

  it('fails decryption with wrong IV', async () => {
    const key = await generateAesKey()
    const { ciphertext, iv, tag } = await encryptAesGcm('secret', key)

    const wrongIv = new Uint8Array(iv)
    wrongIv[0]! ^= 0xff

    await expect(decryptAesGcm(ciphertext, key, wrongIv, tag)).rejects.toThrow()
  })

  it('fails decryption with tampered tag', async () => {
    const key = await generateAesKey()
    const { ciphertext, iv, tag } = await encryptAesGcm('secret', key)

    const tamperedTag = new Uint8Array(tag)
    tamperedTag[0]! ^= 0xff

    await expect(decryptAesGcm(ciphertext, key, iv, tamperedTag)).rejects.toThrow()
  })

  it('fails with wrong key length', async () => {
    const shortKey = new Uint8Array(16)

    await expect(encryptAesGcm('data', shortKey)).rejects.toThrow(TypeError)
    await expect(decryptAesGcm(new Uint8Array(4), shortKey, new Uint8Array(12), new Uint8Array(16))).rejects.toThrow(TypeError)
  })

  it('fails with wrong tag length', async () => {
    const key = await generateAesKey()
    const badTag = new Uint8Array(8)

    await expect(decryptAesGcm(new Uint8Array(4), key, new Uint8Array(12), badTag)).rejects.toThrow(TypeError)
  })

  it('encrypts and decrypts 1MB of data', async () => {
    const key = await generateAesKey()
    const size = 1024 * 1024
    const plaintext = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      plaintext[i] = i & 0xff
    }

    const { ciphertext, iv, tag } = await encryptAesGcm(plaintext, key)
    const decrypted = await decryptAesGcm(ciphertext, key, iv, tag)

    expect(decrypted.byteLength).toBe(size)
    expect(Array.from(decrypted)).toEqual(Array.from(plaintext))
  }, 30_000)

  it('encrypts binary data (null bytes, high bytes)', async () => {
    const key = await generateAesKey()
    const binary = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      binary[i] = i
    }

    const { ciphertext, iv, tag } = await encryptAesGcm(binary, key)
    const decrypted = await decryptAesGcm(ciphertext, key, iv, tag)

    expect(Array.from(decrypted)).toEqual(Array.from(binary))
  })

  it('produces unique ciphertexts for same plaintext (different IV)', async () => {
    const key = await generateAesKey()
    const r1 = await encryptAesGcm('same data', key)
    const r2 = await encryptAesGcm('same data', key)

    expect(bytesToHex(r1.iv)).not.toBe(bytesToHex(r2.iv))
    expect(bytesToHex(r1.ciphertext)).not.toBe(bytesToHex(r2.ciphertext))
  })

  it('produces unique IVs on each call', async () => {
    const key = await generateAesKey()
    const count = 100
    const ivs = new Set<string>()

    for (let i = 0; i < count; i++) {
      const { iv } = await encryptAesGcm('data', key)
      ivs.add(bytesToHex(iv))
    }

    expect(ivs.size).toBe(count)
  })
})

describe('generateAesKey', () => {
  it('returns a 32-byte key', async () => {
    const key = await generateAesKey()
    expect(key.byteLength).toBe(32)
  })

  it('produces unique keys on each call', async () => {
    const k1 = await generateAesKey()
    const k2 = await generateAesKey()
    expect(bytesToHex(k1)).not.toBe(bytesToHex(k2))
  })
})

describe('aesKeyFromPassword', () => {
  it('derives a 32-byte key with auto-generated salt', async () => {
    const { key, salt } = await aesKeyFromPassword('my-passphrase')

    expect(key.byteLength).toBe(32)
    expect(salt.byteLength).toBe(16)
  })

  it('same password + salt produces same key', async () => {
    const salt = new Uint8Array(16)
    for (let i = 0; i < 16; i++) salt[i] = i

    const r1 = await aesKeyFromPassword('password', salt)
    const r2 = await aesKeyFromPassword('password', salt)

    expect(bytesToHex(r1.key)).toBe(bytesToHex(r2.key))
    expect(bytesToHex(r1.salt)).toBe(bytesToHex(r2.salt))
  })

  it('different passwords produce different keys', async () => {
    const salt = new Uint8Array(16)
    for (let i = 0; i < 16; i++) salt[i] = i

    const r1 = await aesKeyFromPassword('password-a', salt)
    const r2 = await aesKeyFromPassword('password-b', salt)

    expect(bytesToHex(r1.key)).not.toBe(bytesToHex(r2.key))
  })

  it('same password + different salt produces different key', async () => {
    const salt1 = new Uint8Array(16)
    for (let i = 0; i < 16; i++) salt1[i] = i

    const salt2 = new Uint8Array(16)
    for (let i = 0; i < 16; i++) salt2[i] = i + 128

    const r1 = await aesKeyFromPassword('password', salt1)
    const r2 = await aesKeyFromPassword('password', salt2)

    expect(bytesToHex(r1.key)).not.toBe(bytesToHex(r2.key))
  })

  it('derived key works for encrypt/decrypt roundtrip', async () => {
    const { key } = await aesKeyFromPassword('opensesame')

    const { ciphertext, iv, tag } = await encryptAesGcm('protected content', key)
    const decrypted = await decryptAesGcm(ciphertext, key, iv, tag)

    expect(new TextDecoder().decode(decrypted)).toBe('protected content')
  })

  it('auto-generates different salts each call', async () => {
    const r1 = await aesKeyFromPassword('password')
    const r2 = await aesKeyFromPassword('password')

    expect(bytesToHex(r1.salt)).not.toBe(bytesToHex(r2.salt))
    expect(bytesToHex(r1.key)).not.toBe(bytesToHex(r2.key))
  })
})
