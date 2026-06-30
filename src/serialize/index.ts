/**
 * Low-level binary buffer reader.
 * Reads primitive types from a Uint8Array at a given offset using a DataView.
 */
export class BufferReader {
  private buf: Uint8Array
  private offset: number
  private view: DataView

  constructor(buf: Uint8Array, offset: number = 0) {
    this.buf = buf
    this.offset = offset
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  }

  /** Read a single unsigned 8-bit integer. */
  readUint8(): number {
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  /** Read a big-endian unsigned 16-bit integer. */
  readUint16(): number {
    const value = this.view.getUint16(this.offset, false)
    this.offset += 2
    return value
  }

  /** Read a big-endian unsigned 32-bit integer. */
  readUint32(): number {
    const value = this.view.getUint32(this.offset, false)
    this.offset += 4
    return value
  }

  /** Read a single signed 8-bit integer. */
  readInt8(): number {
    const value = this.view.getInt8(this.offset)
    this.offset += 1
    return value
  }

  /** Read a big-endian signed 16-bit integer. */
  readInt16(): number {
    const value = this.view.getInt16(this.offset, false)
    this.offset += 2
    return value
  }

  /** Read a big-endian signed 32-bit integer. */
  readInt32(): number {
    const value = this.view.getInt32(this.offset, false)
    this.offset += 4
    return value
  }

  /** Read a big-endian IEEE-754 32-bit float. */
  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, false)
    this.offset += 4
    return value
  }

  /** Read a big-endian IEEE-754 64-bit float. */
  readFloat64(): number {
    const value = this.view.getFloat64(this.offset, false)
    this.offset += 8
    return value
  }

  /** Read `length` bytes as a new Uint8Array. */
  readBytes(length: number): Uint8Array {
    const slice = this.buf.slice(this.offset, this.offset + length)
    this.offset += length
    return slice
  }

  /**
   * Read a variable-length unsigned integer (protobuf-style varint).
   * Each byte uses 7 bits for data; MSB = 1 signals continuation.
   */
  readVarint(): number {
    let result = 0
    let shift = 0
    while (true) {
      const byte = this.readUint8()
      result |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) break
      shift += 7
    }
    return result >>> 0
  }

  /** Read `length` bytes and decode as UTF-8 string. */
  readString(length: number): string {
    const bytes = this.readBytes(length)
    return decodeUtf8(bytes)
  }

  /** Get the current read offset. */
  getOffset(): number {
    return this.offset
  }

  /** Get the number of remaining readable bytes. */
  getRemaining(): number {
    return this.buf.byteLength - this.offset
  }
}

/**
 * Low-level binary buffer writer.
 * Writes primitive types into a dynamically-growing internal buffer.
 */
export class BufferWriter {
  private buffer: Uint8Array
  private view: DataView
  private pos: number

  constructor(initialSize: number = 256) {
    this.buffer = new Uint8Array(initialSize)
    this.view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength)
    this.pos = 0
  }

  /** Ensure capacity for `extra` more bytes. */
  private ensure(extra: number): void {
    const needed = this.pos + extra
    if (needed <= this.buffer.byteLength) return
    let newSize = this.buffer.byteLength
    while (newSize < needed) newSize *= 2
    const newBuf = new Uint8Array(newSize)
    newBuf.set(this.buffer.subarray(0, this.pos))
    this.buffer = newBuf
    this.view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength)
  }

  /** Write a single unsigned 8-bit integer. */
  writeUint8(value: number): void {
    this.ensure(1)
    this.view.setUint8(this.pos, value)
    this.pos += 1
  }

  /** Write a big-endian unsigned 16-bit integer. */
  writeUint16(value: number): void {
    this.ensure(2)
    this.view.setUint16(this.pos, value, false)
    this.pos += 2
  }

  /** Write a big-endian unsigned 32-bit integer. */
  writeUint32(value: number): void {
    this.ensure(4)
    this.view.setUint32(this.pos, value, false)
    this.pos += 4
  }

  /** Write a single signed 8-bit integer. */
  writeInt8(value: number): void {
    this.ensure(1)
    this.view.setInt8(this.pos, value)
    this.pos += 1
  }

  /** Write a big-endian signed 16-bit integer. */
  writeInt16(value: number): void {
    this.ensure(2)
    this.view.setInt16(this.pos, value, false)
    this.pos += 2
  }

  /** Write a big-endian signed 32-bit integer. */
  writeInt32(value: number): void {
    this.ensure(4)
    this.view.setInt32(this.pos, value, false)
    this.pos += 4
  }

  /** Write a big-endian IEEE-754 32-bit float. */
  writeFloat32(value: number): void {
    this.ensure(4)
    this.view.setFloat32(this.pos, value, false)
    this.pos += 4
  }

  /** Write a big-endian IEEE-754 64-bit float. */
  writeFloat64(value: number): void {
    this.ensure(8)
    this.view.setFloat64(this.pos, value, false)
    this.pos += 8
  }

  /** Write raw bytes from a Uint8Array. */
  writeBytes(data: Uint8Array): void {
    this.ensure(data.byteLength)
    this.buffer.set(data, this.pos)
    this.pos += data.byteLength
  }

  /**
   * Write a variable-length unsigned integer (protobuf-style varint).
   * Each byte uses 7 bits for data; MSB = 1 signals continuation.
   */
  writeVarint(value: number): void {
    value = value >>> 0
    while (value > 0x7f) {
      this.writeUint8((value & 0x7f) | 0x80)
      value >>>= 7
    }
    this.writeUint8(value & 0x7f)
  }

  /** Encode a string to UTF-8 bytes and write them. */
  writeString(value: string): void {
    const bytes = encodeUtf8(value)
    this.writeBytes(bytes)
  }

  /** Return the accumulated buffer as a fresh Uint8Array. */
  toBuffer(): Uint8Array {
    return this.buffer.subarray(0, this.pos)
  }

  /** Get the current number of bytes written. */
  getSize(): number {
    return this.pos
  }
}

// ---------------------------------------------------------------------------
// UTF-8 helpers
// ---------------------------------------------------------------------------

/** Encode a string to UTF-8 bytes. */
function encodeUtf8(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str)
  }
  // Fallback for environments without TextEncoder
  const buf = new Uint8Array(str.length * 4)
  let outIdx = 0
  for (let i = 0; i < str.length; i++) {
    let cp = str.charCodeAt(i)
    if (cp < 0x80) {
      buf[outIdx++] = cp
    } else if (cp < 0x800) {
      buf[outIdx++] = 0xc0 | (cp >> 6)
      buf[outIdx++] = 0x80 | (cp & 0x3f)
    } else if (cp < 0xd800 || cp >= 0xe000) {
      buf[outIdx++] = 0xe0 | (cp >> 12)
      buf[outIdx++] = 0x80 | ((cp >> 6) & 0x3f)
      buf[outIdx++] = 0x80 | (cp & 0x3f)
    } else {
      // Surrogate pair
      i++
      const cp2 = str.charCodeAt(i)
      cp = 0x10000 + ((cp & 0x3ff) << 10) + (cp2 & 0x3ff)
      buf[outIdx++] = 0xf0 | (cp >> 18)
      buf[outIdx++] = 0x80 | ((cp >> 12) & 0x3f)
      buf[outIdx++] = 0x80 | ((cp >> 6) & 0x3f)
      buf[outIdx++] = 0x80 | (cp & 0x3f)
    }
  }
  return buf.subarray(0, outIdx)
}

/** Decode UTF-8 bytes to a string. */
function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes)
  }
  // Fallback for environments without TextDecoder
  let result = ''
  let i = 0
  while (i < bytes.length) {
    const b1 = bytes[i++]!
    if (b1 < 0x80) {
      result += String.fromCharCode(b1)
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++]!
      result += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f))
    } else if (b1 < 0xf0) {
      const b2 = bytes[i++]!
      const b3 = bytes[i++]!
      result += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f))
    } else {
      const b2 = bytes[i++]!
      const b3 = bytes[i++]!
      const b4 = bytes[i++]!
      const cp = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)
      result += String.fromCharCode(((cp - 0x10000) >> 10) + 0xd800, ((cp - 0x10000) & 0x3ff) + 0xdc00)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Integer detection helper
// ---------------------------------------------------------------------------

/** Check whether a finite number represents an integer value. */
function isIntegerValue(v: number): boolean {
  return Number.isFinite(v) && Math.floor(v) === v
}

/** Check whether a number can be represented as a 32-bit IEEE-754 float without loss. */
function canBeFloat32(v: number): boolean {
  if (Number.isNaN(v)) return true
  if (!Number.isFinite(v)) return true
  const buf = new ArrayBuffer(4)
  const view = new DataView(buf)
  view.setFloat32(0, v)
  return view.getFloat32(0) === v
}

// ---------------------------------------------------------------------------
// MessagePack encoder entry points
// ---------------------------------------------------------------------------

/**
 * Encode a JavaScript value into a MessagePack binary buffer.
 *
 * Supports: null / undefined → nil, boolean, 32-bit integer, float32/64,
 * UTF-8 string, array, plain object / Map, and Uint8Array → bin.
 *
 * @param value - The value to encode.
 * @returns A Uint8Array containing the MessagePack-encoded bytes.
 */
export function encodeMsgPack(value: unknown): Uint8Array {
  const writer = new BufferWriter()
  encodeValue(writer, value)
  return writer.toBuffer()
}

/**
 * Decode a MessagePack binary buffer back into a JavaScript value.
 *
 * @param buffer - The MessagePack-encoded bytes.
 * @returns The decoded JavaScript value.
 */
export function decodeMsgPack(buffer: Uint8Array): unknown {
  const reader = new BufferReader(buffer)
  const result = decodeValue(reader)
  if (reader.getRemaining() > 0) {
    throw new Error(`Trailing bytes after MessagePack decode (${reader.getRemaining()} remaining)`)
  }
  return result
}

// ---------------------------------------------------------------------------
// MessagePack encoder internals
// ---------------------------------------------------------------------------

function encodeValue(writer: BufferWriter, value: unknown): void {
  if (value === null || value === undefined) {
    writer.writeUint8(0xc0) // nil
    return
  }

  if (typeof value === 'boolean') {
    writer.writeUint8(value ? 0xc3 : 0xc2)
    return
  }

  if (typeof value === 'number') {
    encodeNumber(writer, value)
    return
  }

  if (typeof value === 'string') {
    encodeString(writer, value)
    return
  }

  if (value instanceof Uint8Array) {
    encodeBinary(writer, value)
    return
  }

  if (Array.isArray(value)) {
    encodeArray(writer, value)
    return
  }

  if (value instanceof Map) {
    encodeMapFromEntries(writer, value.entries())
    return
  }

  if (typeof value === 'object') {
    // Plain object
    const entries = Object.entries(value as Record<string, unknown>)
    encodeMapFromEntries(writer, entries)
    return
  }

  throw new Error(`Cannot encode value of type ${typeof value}`)
}

function encodeNumber(writer: BufferWriter, value: number): void {
  if (isIntegerValue(value)) {
    // Integer path
    if (value >= 0) {
      if (value <= 0x7f) {
        writer.writeUint8(value) // positive fixint 0x00-0x7f
      } else if (value <= 0xff) {
        writer.writeUint8(0xcc) // uint 8
        writer.writeUint8(value)
      } else if (value <= 0xffff) {
        writer.writeUint8(0xcd) // uint 16
        writer.writeUint16(value)
      } else {
        writer.writeUint8(0xce) // uint 32
        writer.writeUint32(value)
      }
    } else {
      if (value >= -32) {
        writer.writeUint8(value & 0xff) // negative fixint 0xe0-0xff
      } else if (value >= -128) {
        writer.writeUint8(0xd0) // int 8
        writer.writeInt8(value)
      } else if (value >= -32768) {
        writer.writeUint8(0xd1) // int 16
        writer.writeInt16(value)
      } else {
        writer.writeUint8(0xd2) // int 32
        writer.writeInt32(value)
      }
    }
    return
  }

  // Float path
  if (canBeFloat32(value)) {
    writer.writeUint8(0xca) // float 32
    writer.writeFloat32(value)
  } else {
    writer.writeUint8(0xcb) // float 64
    writer.writeFloat64(value)
  }
}

function encodeString(writer: BufferWriter, value: string): void {
  const bytes = encodeUtf8(value)
  const len = bytes.byteLength

  if (len <= 31) {
    writer.writeUint8(0xa0 | len) // fixstr
  } else if (len <= 0xff) {
    writer.writeUint8(0xd9) // str 8
    writer.writeUint8(len)
  } else if (len <= 0xffff) {
    writer.writeUint8(0xda) // str 16
    writer.writeUint16(len)
  } else {
    writer.writeUint8(0xdb) // str 32
    writer.writeUint32(len)
  }

  writer.writeBytes(bytes)
}

function encodeBinary(writer: BufferWriter, value: Uint8Array): void {
  const len = value.byteLength

  if (len <= 0xff) {
    writer.writeUint8(0xc4) // bin 8
    writer.writeUint8(len)
  } else if (len <= 0xffff) {
    writer.writeUint8(0xc5) // bin 16
    writer.writeUint16(len)
  } else {
    writer.writeUint8(0xc6) // bin 32
    writer.writeUint32(len)
  }

  writer.writeBytes(value)
}

function encodeArray(writer: BufferWriter, value: unknown[]): void {
  const len = value.length

  if (len <= 15) {
    writer.writeUint8(0x90 | len) // fixarray
  } else if (len <= 0xffff) {
    writer.writeUint8(0xdc) // array 16
    writer.writeUint16(len)
  } else {
    writer.writeUint8(0xdd) // array 32
    writer.writeUint32(len)
  }

  for (let i = 0; i < len; i++) {
    encodeValue(writer, value[i])
  }
}

function encodeMapFromEntries(writer: BufferWriter, entries: Iterable<[string, unknown]>): void {
  const arr = Array.from(entries)
  const len = arr.length

  if (len <= 15) {
    writer.writeUint8(0x80 | len) // fixmap
  } else if (len <= 0xffff) {
    writer.writeUint8(0xde) // map 16
    writer.writeUint16(len)
  } else {
    writer.writeUint8(0xdf) // map 32
    writer.writeUint32(len)
  }

  for (let i = 0; i < len; i++) {
    const [key, val] = arr[i]!
    encodeString(writer, key)
    encodeValue(writer, val)
  }
}

// ---------------------------------------------------------------------------
// MessagePack decoder internals
// ---------------------------------------------------------------------------

function decodeValue(reader: BufferReader): unknown {
  const byte = reader.readUint8()

  // nil
  if (byte === 0xc0) return null

  // boolean
  if (byte === 0xc2) return false
  if (byte === 0xc3) return true

  // positive fixint 0x00-0x7f
  if (byte <= 0x7f) return byte

  // negative fixint 0xe0-0xff
  if (byte >= 0xe0) return byte - 256

  // fixstr 0xa0-0xbf
  if (byte >= 0xa0 && byte <= 0xbf) {
    const len = byte & 0x1f
    return reader.readString(len)
  }

  // fixarray 0x90-0x9f
  if (byte >= 0x90 && byte <= 0x9f) {
    const len = byte & 0x0f
    return readArrayItems(reader, len)
  }

  // fixmap 0x80-0x8f
  if (byte >= 0x80 && byte <= 0x8f) {
    const len = byte & 0x0f
    return readMapItems(reader, len)
  }

  switch (byte) {
    // uint
    case 0xcc:
      return reader.readUint8()
    case 0xcd:
      return reader.readUint16()
    case 0xce:
      return reader.readUint32()

    // int
    case 0xd0:
      return reader.readInt8()
    case 0xd1:
      return reader.readInt16()
    case 0xd2:
      return reader.readInt32()

    // float
    case 0xca:
      return reader.readFloat32()
    case 0xcb:
      return reader.readFloat64()

    // str
    case 0xd9:
      return reader.readString(reader.readUint8())
    case 0xda:
      return reader.readString(reader.readUint16())
    case 0xdb:
      return reader.readString(reader.readUint32())

    // bin
    case 0xc4:
      return reader.readBytes(reader.readUint8())
    case 0xc5:
      return reader.readBytes(reader.readUint16())
    case 0xc6:
      return reader.readBytes(reader.readUint32())

    // array
    case 0xdc:
      return readArrayItems(reader, reader.readUint16())
    case 0xdd:
      return readArrayItems(reader, reader.readUint32())

    // map
    case 0xde:
      return readMapItems(reader, reader.readUint16())
    case 0xdf:
      return readMapItems(reader, reader.readUint32())

    default:
      throw new Error(`Unknown MessagePack byte: 0x${byte.toString(16)}`)
  }
}

function readArrayItems(reader: BufferReader, length: number): unknown[] {
  const arr: unknown[] = new Array(length)
  for (let i = 0; i < length; i++) {
    arr[i] = decodeValue(reader)
  }
  return arr
}

function readMapItems(reader: BufferReader, length: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < length; i++) {
    const key = decodeValue(reader)
    const value = decodeValue(reader)
    obj[String(key)] = value
  }
  return obj
}

// ---------------------------------------------------------------------------
// Base62 alphabet: 0-9, A-Z, a-z
// ---------------------------------------------------------------------------

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE62_MAP: Record<string, number> = {}
for (let i = 0; i < BASE62_ALPHABET.length; i++) {
  BASE62_MAP[BASE62_ALPHABET[i]!] = i
}

/**
 * Encode a Uint8Array into a base62 string (0-9 A-Z a-z).
 *
 * Leading zero bytes are preserved as leading '0' characters.
 *
 * @param data - The binary data to encode.
 * @returns A base62-encoded string.
 */
export function encodeBase62(data: Uint8Array): string {
  return encodeBaseN(data, BASE62_ALPHABET)
}

/**
 * Decode a base62 string back into a Uint8Array.
 *
 * @param str - The base62-encoded string.
 * @returns The decoded binary data.
 */
export function decodeBase62(str: string): Uint8Array {
  return decodeBaseN(str, BASE62_ALPHABET, BASE62_MAP)
}

// ---------------------------------------------------------------------------
// Base58 alphabet: no 0/O/I/l
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE58_MAP: Record<string, number> = {}
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET[i]!] = i
}

/**
 * Encode a Uint8Array into a base58 string (no 0/O/I/l).
 *
 * Leading zero bytes are preserved as leading '1' characters.
 *
 * @param data - The binary data to encode.
 * @returns A base58-encoded string.
 */
export function encodeBase58(data: Uint8Array): string {
  return encodeBaseN(data, BASE58_ALPHABET)
}

/**
 * Decode a base58 string back into a Uint8Array.
 *
 * @param str - The base58-encoded string.
 * @returns The decoded binary data.
 */
export function decodeBase58(str: string): Uint8Array {
  return decodeBaseN(str, BASE58_ALPHABET, BASE58_MAP)
}

// ---------------------------------------------------------------------------
// Generic bigint-based base-N encoder / decoder
// ---------------------------------------------------------------------------

/**
 * Encode binary data to a base-N string using the given alphabet.
 * Leading zero bytes map to the first character of the alphabet.
 */
function encodeBaseN(data: Uint8Array, alphabet: string): string {
  const base = BigInt(alphabet.length)
  const zeroChar = alphabet[0]!

  // Count leading zero bytes
  let zeroCount = 0
  while (zeroCount < data.byteLength && data[zeroCount] === 0) {
    zeroCount++
  }

  // Convert remaining bytes to a bigint (big-endian)
  let value = 0n
  for (let i = zeroCount; i < data.byteLength; i++) {
    value = (value << 8n) + BigInt(data[i]!)
  }

  // Convert bigint to base-N digits (least significant first)
  const digits: string[] = []
  if (value === 0n && zeroCount === 0) {
    return zeroChar
  }

  while (value > 0n) {
    digits.push(alphabet[Number(value % base)]!)
    value /= base
  }

  // Prepend leading zeros and reverse (digits are LS-first)
  return zeroChar.repeat(zeroCount) + digits.reverse().join('')
}

/**
 * Decode a base-N string back into binary data.
 */
function decodeBaseN(str: string, alphabet: string, charMap: Record<string, number>): Uint8Array {
  const base = BigInt(alphabet.length)
  const zeroChar = alphabet[0]!

  // Count leading zero characters
  let zeroCount = 0
  while (zeroCount < str.length && str[zeroCount] === zeroChar) {
    zeroCount++
  }

  if (zeroCount === str.length) {
    return new Uint8Array(zeroCount)
  }

  // Convert from base-N to bigint
  let value = 0n
  for (let i = zeroCount; i < str.length; i++) {
    const digit = charMap[str[i]!]
    if (digit === undefined) {
      throw new Error(`Invalid base character: ${str[i]}`)
    }
    value = value * base + BigInt(digit)
  }

  // Convert bigint to bytes (big-endian)
  const bytes: number[] = []
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn))
    value >>= 8n
  }

  // Prepend leading zero bytes
  const result = new Uint8Array(zeroCount + bytes.length)
  if (zeroCount > 0) {
    result.fill(0, 0, zeroCount)
  }
  result.set(bytes, zeroCount)
  return result
}
