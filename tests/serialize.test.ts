import { describe, it, expect } from 'vitest'
import {
  encodeMsgPack,
  decodeMsgPack,
  BufferReader,
  BufferWriter,
  encodeBase58,
  decodeBase58,
  encodeBase62,
  decodeBase62,
} from '../src/serialize/index.js'

function roundtrip(val: unknown): unknown {
  return decodeMsgPack(encodeMsgPack(val))
}

function hex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

describe('MsgPack encode/decode', () => {
  it('encodes null to nil and decodes back', () => {
    const buf = encodeMsgPack(null)
    expect(hex(buf)).toBe('c0')
    expect(decodeMsgPack(buf)).toBeNull()
  })

  it('encodes undefined to nil and decodes back', () => {
    const buf = encodeMsgPack(undefined)
    expect(hex(buf)).toBe('c0')
    expect(decodeMsgPack(buf)).toBeNull()
  })

  it('encodes empty string and decodes back', () => {
    expect(roundtrip('')).toBe('')
  })

  it('encodes 0 and decodes back', () => {
    expect(roundtrip(0)).toBe(0)
  })

  it('encodes -1 and decodes back', () => {
    expect(roundtrip(-1)).toBe(-1)
  })

  it('encodes Infinity and decodes back', () => {
    expect(roundtrip(Infinity)).toBe(Infinity)
  })

  it('encodes -Infinity and decodes back', () => {
    expect(roundtrip(-Infinity)).toBe(-Infinity)
  })

  it('encodes NaN and decodes back as NaN', () => {
    const result = roundtrip(NaN)
    expect(Number.isNaN(result)).toBe(true)
  })

  it('encodes true and decodes back', () => {
    expect(roundtrip(true)).toBe(true)
  })

  it('encodes false and decodes back', () => {
    expect(roundtrip(false)).toBe(false)
  })

  it('encodes a plain object and decodes back', () => {
    expect(roundtrip({ a: 1 })).toEqual({ a: 1 })
  })

  it('encodes an empty array and decodes back', () => {
    expect(roundtrip([])).toEqual([])
  })

  it('encodes an array with mixed types and decodes back', () => {
    const result = roundtrip([1, 'a', null, {}])
    expect(result).toEqual([1, 'a', null, {}])
  })

  it('encodes a deeply nested object and decodes back', () => {
    const val = { nested: { deep: [1, { x: 2 }] } }
    expect(roundtrip(val)).toEqual(val)
  })

  it('encodes a string with unicode characters', () => {
    expect(roundtrip('héllo wörld 🎉')).toBe('héllo wörld 🎉')
  })

  it('encodes a large array of integers', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i)
    expect(roundtrip(arr)).toEqual(arr)
  })

  it('encodes an empty object', () => {
    expect(roundtrip({})).toEqual({})
  })

  it('encodes a Uint8Array and decodes back', () => {
    const buf = new Uint8Array([0, 1, 255, 128])
    const encoded = encodeMsgPack(buf)
    const decoded = decodeMsgPack(encoded)
    expect(decoded instanceof Uint8Array).toBe(true)
    expect(Array.from(decoded as Uint8Array)).toEqual([0, 1, 255, 128])
  })

  it('encodes a Map and decodes as a plain object', () => {
    const m = new Map([
      ['x', 10],
      ['y', 20],
    ])
    const result = roundtrip(m)
    expect(result).toEqual({ x: 10, y: 20 })
  })

  it('encodes 42 as positive fixint (single byte)', () => {
    const buf = encodeMsgPack(42)
    expect(hex(buf)).toBe('2a')
    expect(decodeMsgPack(buf)).toBe(42)
  })

  it('encodes 255 as uint8 marker', () => {
    const buf = encodeMsgPack(255)
    expect(hex(buf)).toBe('ccff')
    expect(decodeMsgPack(buf)).toBe(255)
  })

  it('encodes 65535 as uint16 marker', () => {
    const buf = encodeMsgPack(65535)
    expect(hex(buf)).toBe('cdffff')
    expect(decodeMsgPack(buf)).toBe(65535)
  })

  it('encodes 100000 as uint32 marker', () => {
    expect(roundtrip(100000)).toBe(100000)
  })

  it('encodes -32 as negative fixint (single byte)', () => {
    const buf = encodeMsgPack(-32)
    expect(decodeMsgPack(buf)).toBe(-32)
  })

  it('encodes -128 as int8 marker', () => {
    const buf = encodeMsgPack(-128)
    expect(decodeMsgPack(buf)).toBe(-128)
  })

  it('encodes -32768 as int16 marker', () => {
    const buf = encodeMsgPack(-32768)
    expect(decodeMsgPack(buf)).toBe(-32768)
  })

  it('encodes negative large int as int32 marker', () => {
    expect(roundtrip(-100000)).toBe(-100000)
  })

  it('encodes 3.14 as float and decodes back', () => {
    const result = roundtrip(3.14)
    expect(typeof result).toBe('number')
    expect(result).toBeCloseTo(3.14, 5)
  })

  it('throws on trailing bytes after decode', () => {
    const buf = new Uint8Array([0xc0, 0x01])
    expect(() => decodeMsgPack(buf)).toThrow('Trailing bytes')
  })

  it('throws on unknown marker byte', () => {
    const buf = new Uint8Array([0xc1])
    expect(() => decodeMsgPack(buf)).toThrow('Unknown MessagePack byte')
  })

  it('throws on unsupported type (function)', () => {
    expect(() => encodeMsgPack(() => {})).toThrow('Cannot encode')
  })

  it('encodes the string "hello" with fixstr prefix', () => {
    const buf = encodeMsgPack('hello')
    expect(buf[0]!.toString(16)).toBe('a5')
    expect(decodeMsgPack(buf)).toBe('hello')
  })
})

describe('BufferReader', () => {
  it('readInt32 from empty buffer throws', () => {
    const buf = new Uint8Array(0)
    const r = new BufferReader(buf)
    expect(() => r.readInt32()).toThrow()
  })

  it('readBytes reads correct slice', () => {
    const buf = new Uint8Array([10, 20, 30, 40, 50])
    const r = new BufferReader(buf)
    expect(Array.from(r.readBytes(3))).toEqual([10, 20, 30])
    expect(r.readInt8()).toBe(40)
  })

  it('readVarint decodes correctly', () => {
    const buf = new Uint8Array([0xac, 0x02])
    const r = new BufferReader(buf)
    expect(r.readVarint()).toBe(300)
  })

  it('readUint8 progresses offset', () => {
    const buf = new Uint8Array([1, 2, 3])
    const r = new BufferReader(buf)
    expect(r.readUint8()).toBe(1)
    expect(r.readUint8()).toBe(2)
    expect(r.getOffset()).toBe(2)
  })

  it('getRemaining returns correct count', () => {
    const buf = new Uint8Array([1, 2, 3])
    const r = new BufferReader(buf)
    r.readUint8()
    expect(r.getRemaining()).toBe(2)
  })

  it('readFloat32 round-trips', () => {
    const w = new BufferWriter()
    w.writeFloat32(1.5)
    const r = new BufferReader(w.toBuffer())
    expect(r.readFloat32()).toBeCloseTo(1.5, 5)
  })

  it('readFloat64 round-trips', () => {
    const w = new BufferWriter()
    w.writeFloat64(1.23456789)
    const r = new BufferReader(w.toBuffer())
    expect(r.readFloat64()).toBeCloseTo(1.23456789, 8)
  })
})

describe('BufferWriter', () => {
  it('writeString / readString round-trip', () => {
    const w = new BufferWriter()
    w.writeString('hi')
    const buf = w.toBuffer()
    const r = new BufferReader(buf)
    expect(r.readString(2)).toBe('hi')
  })

  it('writeString with large string survives', () => {
    const w = new BufferWriter()
    const large = 'x'.repeat(10000)
    w.writeString(large)
    const buf = w.toBuffer()
    const r = new BufferReader(buf)
    expect(r.readString(10000)).toBe(large)
  })

  it('writeString with unicode', () => {
    const w = new BufferWriter()
    w.writeString('✓ é ø')
    const buf = w.toBuffer()
    const r = new BufferReader(buf)
    expect(r.readString(buf.byteLength)).toBe('✓ é ø')
  })

  it('writeInt32 / readInt32 round-trip', () => {
    const w = new BufferWriter()
    w.writeInt32(-12345)
    const r = new BufferReader(w.toBuffer())
    expect(r.readInt32()).toBe(-12345)
  })

  it('writeBytes / readBytes round-trip', () => {
    const w = new BufferWriter()
    const data = new Uint8Array([100, 200, 255])
    w.writeBytes(data)
    const r = new BufferReader(w.toBuffer())
    expect(Array.from(r.readBytes(3))).toEqual([100, 200, 255])
  })

  it('writeVarint encodes correctly', () => {
    const w = new BufferWriter()
    w.writeVarint(300)
    const buf = w.toBuffer()
    expect(Array.from(buf)).toEqual([0xac, 0x02])
  })

  it('grows buffer automatically', () => {
    const w = new BufferWriter(4)
    w.writeString('hello world!')
    expect(w.getSize()).toBe(12)
    expect(w.toBuffer().byteLength).toBe(12)
  })

  it('writeUint32 round-trips', () => {
    const w = new BufferWriter()
    w.writeUint32(3000000000)
    const r = new BufferReader(w.toBuffer())
    expect(r.readUint32()).toBe(3000000000)
  })

  it('writeUint16 round-trips', () => {
    const w = new BufferWriter()
    w.writeUint16(65000)
    const r = new BufferReader(w.toBuffer())
    expect(r.readUint16()).toBe(65000)
  })

  it('writeInt8 round-trips', () => {
    const w = new BufferWriter()
    w.writeInt8(-100)
    const r = new BufferReader(w.toBuffer())
    expect(r.readInt8()).toBe(-100)
  })

  it('writeInt16 round-trips', () => {
    const w = new BufferWriter()
    w.writeInt16(-30000)
    const r = new BufferReader(w.toBuffer())
    expect(r.readInt16()).toBe(-30000)
  })
})

describe('base58 encode/decode', () => {
  it('encodes empty buffer to "1"', () => {
    const buf = new Uint8Array(0)
    expect(encodeBase58(buf)).toBe('1')
    expect(Array.from(decodeBase58('1'))).toEqual([0x00])
  })

  it('encodes "hello" utf-8 and round-trips', () => {
    const enc = new TextEncoder()
    const bytes = enc.encode('hello')
    const encoded = encodeBase58(bytes)
    const decoded = decodeBase58(encoded)
    expect(new TextDecoder().decode(decoded)).toBe('hello')
  })

  it('encodes bytes [0x00] leading zero', () => {
    const encoded = encodeBase58(new Uint8Array([0x00]))
    expect(encoded).toBe('1')
    expect(Array.from(decodeBase58(encoded))).toEqual([0x00])
  })

  it('round-trips arbitrary bytes', () => {
    const buf = new Uint8Array([255, 128, 64, 32, 16, 8, 4, 2, 1])
    const encoded = encodeBase58(buf)
    const decoded = decodeBase58(encoded)
    expect(Array.from(decoded)).toEqual(Array.from(buf))
  })

  it('encodeBase58(null) throws', () => {
    expect(() => (encodeBase58 as Function)(null)).toThrow()
  })

  it('decodeBase58 with invalid char 0 throws', () => {
    expect(() => decodeBase58('10')).toThrow('Invalid base character')
  })

  it('decodeBase58 with invalid char O throws', () => {
    expect(() => decodeBase58('O')).toThrow('Invalid base character')
  })

  it('decodeBase58 with invalid char I throws', () => {
    expect(() => decodeBase58('I')).toThrow('Invalid base character')
  })

  it('decodeBase58 with invalid char l throws', () => {
    expect(() => decodeBase58('l')).toThrow('Invalid base character')
  })
})

describe('base62 encode/decode', () => {
  it('encodes empty buffer to "0"', () => {
    const buf = new Uint8Array(0)
    expect(encodeBase62(buf)).toBe('0')
    expect(Array.from(decodeBase62('0'))).toEqual([0x00])
  })

  it('encodes "hello" utf-8 and round-trips', () => {
    const enc = new TextEncoder()
    const bytes = enc.encode('hello')
    const encoded = encodeBase62(bytes)
    const decoded = decodeBase62(encoded)
    expect(new TextDecoder().decode(decoded)).toBe('hello')
  })

  it('round-trips large binary (10000 bytes)', () => {
    const buf = new Uint8Array(10000)
    for (let i = 0; i < buf.length; i++) {
      buf[i] = i & 0xff
    }
    const encoded = encodeBase62(buf)
    const decoded = decodeBase62(encoded)
    expect(Array.from(decoded)).toEqual(Array.from(buf))
  })

  it('round-trips single byte values', () => {
    for (let b = 0; b <= 255; b++) {
      const buf = new Uint8Array([b])
      const encoded = encodeBase62(buf)
      const decoded = decodeBase62(encoded)
      expect(Array.from(decoded)).toEqual([b])
    }
  })

  it('decodeBase62 with invalid char ! throws', () => {
    expect(() => decodeBase62('!@#')).toThrow('Invalid base character')
  })

  it('decodeBase62 with invalid char space throws', () => {
    expect(() => decodeBase62('ab c')).toThrow('Invalid base character')
  })

  it('encodeBase62(null) throws', () => {
    expect(() => (encodeBase62 as Function)(null)).toThrow()
  })

  it('round-trips leading zeros preserved', () => {
    const buf = new Uint8Array([0, 0, 1])
    const encoded = encodeBase62(buf)
    const decoded = decodeBase62(encoded)
    expect(Array.from(decoded)).toEqual([0, 0, 1])
  })
})
