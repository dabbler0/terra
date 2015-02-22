!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.terra=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":2,"ieee754":3,"is-array":4}],2:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],3:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],5:[function(require,module,exports){
var RESOURCES;

exports.RESOURCES = RESOURCES = ['/assets/wizard.png', '/assets/stone.png', '/assets/dirt.png', '/assets/grass.png', '/assets/black.png', '/assets/tree-top.png', '/assets/tree-side.png', '/assets/axe.png', '/assets/wood.png', '/assets/crack1.png', '/assets/crack2.png', '/assets/crack3.png'];

exports.loadAssets = function(cb) {
  var i, loaded, resource, _i, _len, _results;
  loaded = 0;
  _results = [];
  for (i = _i = 0, _len = RESOURCES.length; _i < _len; i = ++_i) {
    resource = RESOURCES[i];
    RESOURCES[i] = new Image();
    RESOURCES[i].src = resource;
    _results.push(RESOURCES[i].onload = function() {
      loaded += 1;
      if (loaded === RESOURCES.length && (cb != null)) {
        console.log('Loaded all resources');
        return cb();
      }
    });
  }
  return _results;
};

exports.TEXTURE_IDS = {
  'wizard': 0,
  'stone': 1,
  'dirt': 2,
  'grass': 3,
  'black': 4,
  'tree-top': 5,
  'tree-side': 6,
  'axe': 7,
  'wood': 8,
  'crack-1': 9,
  'crack-2': 10,
  'crack-3': 11
};


},{}],6:[function(require,module,exports){
// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
// use window.btoa' step. According to my tests, this appears to be a faster approach:
// http://jsperf.com/encoding-xhr-image-data/5

exports.encode = function base64ArrayBuffer(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }

  return base64
}

},{}],7:[function(require,module,exports){
var BOARD, FRAME_RATE, ITEM_DISPLAY_SIZE, MOBS, MOUSEDOWN, MOUSE_POS, PLAYER, RANGE, RAW_MOUSE_POS, ROTATION, SIM_RATE, SIZE, SPEED, STARTED, TARGET_FLASHING, TARGET_FLASH_TIME, USING_ITEM, VISION_MAX, assets, canvas, ctx, getTarget, i, inventoryCanvases, inventoryList, inventoryTable, j, redrawInventory, socket, start, tick, toolUseTick, tr, types, updateMousePos, _fn, _i, _j;

types = require('./types.coffee');

assets = require('./assets.coffee');

VISION_MAX = 11;

FRAME_RATE = 30;

SIM_RATE = 50;

SIZE = 40;

RANGE = 2;

SPEED = 10 / SIM_RATE;

ITEM_DISPLAY_SIZE = 35;

USING_ITEM = 0;

STARTED = false;

canvas = document.getElementById('viewport');

ctx = canvas.getContext('2d');

inventoryCanvases = null;

PLAYER = new types.Player();

MOBS = [];

ROTATION = Math.PI / 4;

BOARD = new types.GhostBoard(new types.BoardCoordinate(500, 500));

TARGET_FLASHING = false;

TARGET_FLASH_TIME = 20;

RAW_MOUSE_POS = new types.Vector(0, 0);

MOUSE_POS = new types.Vector(0, 0);

MOUSEDOWN = false;

socket = null;

assets.loadAssets(function() {
  socket = io();
  socket.on('update', function(data) {
    var field;
    PLAYER.pos = types.Vector.parse(data.pos).value;
    field = types.VisionField.parse(data.vision).value;
    BOARD.update(field.tiles);
    MOBS = field.mobs;
    if (!STARTED) {
      STARTED = true;
      return start();
    }
  });
  return socket.on('inventory', function(inventory) {
    PLAYER.inventory = types.Inventory.parse(inventory).value;
    if (USING_ITEM >= PLAYER.inventory.length()) {
      USING_ITEM = PLAYER.inventory.length() - 1;
    }
    return redrawInventory();
  });
});

start = function() {
  var checkMove, keysdown;
  canvas.addEventListener('mousewheel', function(event) {
    if (event.wheelDelta > 0) {
      ROTATION += 0.1;
    } else {
      ROTATION -= 0.1;
    }
    return checkMove();
  });
  keysdown = {};
  document.body.addEventListener('keydown', function(event) {
    keysdown[event.which] = true;
    if (event.which === 88) {
      socket.emit('pickup');
    } else if (event.which === 90) {
      socket.emit('drop', {
        index: USING_ITEM,
        item: PLAYER.inventory.get(USING_ITEM).serialize()
      });
    }
    return checkMove();
  });
  checkMove = function() {
    var movement;
    movement = new types.Vector(0, 0);
    if (keysdown[87]) {
      movement.translate(new types.Vector(Math.sin(ROTATION), Math.cos(ROTATION)).mult(-1));
    }
    if (keysdown[83]) {
      movement.translate(new types.Vector(Math.sin(ROTATION), Math.cos(ROTATION)));
    }
    if (keysdown[65]) {
      movement.translate(new types.Vector(-Math.cos(ROTATION), Math.sin(ROTATION)));
    }
    if (keysdown[68]) {
      movement.translate(new types.Vector(-Math.cos(ROTATION), Math.sin(ROTATION)).mult(-1));
    }
    return socket.emit('move', movement.normalize().mult(SPEED).serialize());
  };
  document.body.addEventListener('keyup', function(event) {
    keysdown[event.which] = false;
    return checkMove();
  });
  tick();
  return toolUseTick();
};

inventoryList = document.getElementById('inventory-list');

inventoryTable = document.createElement('table');

inventoryList.appendChild(inventoryTable);

inventoryCanvases = [];

for (i = _i = 0; _i < 4; i = ++_i) {
  tr = document.createElement('tr');
  _fn = function(i, j) {
    var inventoryCanvas, td;
    td = document.createElement('td');
    inventoryCanvas = document.createElement('canvas');
    inventoryCanvas.width = inventoryCanvas.height = ITEM_DISPLAY_SIZE;
    inventoryCanvas.style.borderRadius = '2px';
    inventoryCanvas.className = 'inventory-canvas';
    inventoryCanvases.push(inventoryCanvas);
    td.appendChild(inventoryCanvas);
    td.addEventListener('click', function() {
      if (inventoryCanvases[USING_ITEM] != null) {
        inventoryCanvases[USING_ITEM].style.outline = 'none';
      }
      USING_ITEM = i * 5 + j;
      return inventoryCanvas.style.outline = '1px solid #FF0';
    });
    return tr.appendChild(td);
  };
  for (j = _j = 0; _j < 5; j = ++_j) {
    _fn(i, j);
  }
  inventoryTable.appendChild(tr);
}

$('.inventory-canvas').tooltipster();

redrawInventory = function() {
  var iCtx, _k, _results;
  _results = [];
  for (i = _k = 0; _k < 20; i = ++_k) {
    iCtx = inventoryCanvases[i].getContext('2d');
    iCtx.clearRect(0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE);
    if (PLAYER.inventory.contents[i] != null) {
      iCtx.drawImage(PLAYER.inventory.contents[i].texture().get(), 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE);
      $(inventoryCanvases[i]).tooltipster('content', PLAYER.inventory.contents[i].name());
    } else {
      $(inventoryCanvases[i]).tooltipster('content', '');
    }
    if (i === USING_ITEM) {
      _results.push(inventoryCanvases[i].style.outline = '1px solid #FF0');
    } else {
      _results.push(inventoryCanvases[i].style.outline = 'none');
    }
  }
  return _results;
};

tick = function() {
  var coord, dir, mob, protrusions, target, terrains, tiles, view, visible, _k, _l, _len, _len1, _len2, _m;
  updateMousePos();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  tiles = BOARD.getTileArea(PLAYER.pos.round(), VISION_MAX);
  visible = BOARD.shadowcast(PLAYER.pos.round(), (function(tile) {
    return tile.obstacle == null;
  }), VISION_MAX);
  dir = new types.Vector(Math.sin(ROTATION), Math.cos(ROTATION));
  terrains = tiles.filter(function(x) {
    return x.obstacle == null;
  });
  for (_k = 0, _len = terrains.length; _k < _len; _k++) {
    view = terrains[_k];
    coord = view.pos.dump();
    if (!(coord in visible)) {
      ctx.globalAlpha = 0.5;
    }
    view.render(canvas, ctx, ROTATION, PLAYER.pos);
    if (!(coord in visible)) {
      ctx.globalAlpha = 1;
    }
  }
  protrusions = tiles.filter(function(x) {
    return x.obstacle != null;
  }).concat(MOBS);
  protrusions.sort(function(a, b) {
    if (PLAYER.pos.to(a.pos).scalarProject(dir) > PLAYER.pos.to(b.pos).scalarProject(dir)) {
      return 1;
    } else {
      return -1;
    }
  });
  for (_l = 0, _len1 = protrusions.length; _l < _len1; _l++) {
    view = protrusions[_l];
    coord = view.pos.round().dump();
    if (!(coord in visible)) {
      ctx.globalAlpha = 0.5;
    }
    view.render(canvas, ctx, ROTATION, PLAYER.pos);
    if (!(coord in visible)) {
      ctx.globalAlpha = 1;
    }
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(ROTATION);
  target = getTarget();
  ctx.strokeStyle = TARGET_FLASHING ? '#000' : '#FF0';
  ctx.strokeRect((target.pos.x - PLAYER.pos.x) * SIZE - SIZE / 2, (target.pos.y - PLAYER.pos.y) * SIZE - SIZE / 2, SIZE, SIZE);
  ctx.resetTransform();
  for (_m = 0, _len2 = MOBS.length; _m < _len2; _m++) {
    mob = MOBS[_m];
    types.translateOKComponent(BOARD, mob.pos, mob.velocity);
  }
  types.translateOKComponent(BOARD, PLAYER.pos, PLAYER.velocity);
  return setTimeout(tick, 1000 / SIM_RATE);
};

getTarget = function() {
  var best, candidate, candidates, min, _k, _len;
  candidates = BOARD.getCoordinateArea(PLAYER.pos.round(), RANGE);
  best = null;
  min = Infinity;
  for (_k = 0, _len = candidates.length; _k < _len; _k++) {
    candidate = candidates[_k];
    if (candidate.distance(MOUSE_POS) < min && candidate.distance(PLAYER.pos) <= RANGE) {
      best = candidate;
      min = candidate.distance(MOUSE_POS);
    }
  }
  return BOARD.get(best.x, best.y);
};

canvas.addEventListener('mousemove', function(ev) {
  return RAW_MOUSE_POS = new types.Vector(ev.offsetX - canvas.width / 2, ev.offsetY - canvas.width / 2);
});

updateMousePos = function() {
  MOUSE_POS = RAW_MOUSE_POS.rotate(-ROTATION).mult(1 / SIZE);
  return MOUSE_POS.translate(PLAYER.pos);
};

canvas.addEventListener('mousedown', function(ev) {
  return MOUSEDOWN = true;
});

canvas.addEventListener('mouseup', function(ev) {
  return MOUSEDOWN = false;
});

toolUseTick = function() {
  var best, item;
  if (MOUSEDOWN) {
    best = getTarget();
    if (best.pos.distance(PLAYER.pos) >= 1) {
      item = PLAYER.inventory.contents[USING_ITEM];
      if (item != null) {
        TARGET_FLASHING = true;
        setTimeout((function() {
          return TARGET_FLASHING = false;
        }), TARGET_FLASH_TIME);
        socket.emit('use-on-tile', {
          item: item.serialize(),
          tile: best.serialize(),
          index: USING_ITEM
        });
        setTimeout(toolUseTick, item.cooldown());
        return;
      }
    }
  }
  return setTimeout(toolUseTick, 1000 / FRAME_RATE);
};


},{"./assets.coffee":5,"./types.coffee":10}],8:[function(require,module,exports){
var BASE_ITEM, BASE_OBSTACLE, ITEM_NAMES, ITEM_TEMPLATES, OBSTACLE_NAMES, OBSTACLE_TEMPLATES, assets, d, item, item_id, obstacle, obstacle_id, types;

assets = require('./assets.coffee');

types = require('./types.coffee');

exports.ITEM_TEMPLATES = ITEM_TEMPLATES = {};

exports.ITEM_NAMES = ITEM_NAMES = {};

exports.OBSTACLE_TEMPLATES = OBSTACLE_TEMPLATES = {};

exports.OBSTACLE_NAMES = OBSTACLE_NAMES = {};

d = function(x) {
  return Math.ceil(Math.random() * x);
};

BASE_ITEM = {
  ancestors: []
};

item_id = 0;

item = function(name, extend, properties) {
  var id, itemTemplate, property, val, _results;
  if (typeof extend === 'string') {
    extend = ITEM_TEMPLATES[ITEM_NAMES[extend]];
  } else {
    properties = extend;
    extend = BASE_ITEM;
  }
  id = item_id++;
  ITEM_TEMPLATES[id] = itemTemplate = {
    name: name,
    ancestors: extend.ancestors.concat([name])
  };
  ITEM_NAMES[name] = id;
  for (property in extend) {
    val = extend[property];
    if (property !== 'ancestors') {
      itemTemplate[property] = val;
    }
  }
  _results = [];
  for (property in properties) {
    val = properties[property];
    _results.push(itemTemplate[property] = val);
  }
  return _results;
};

item('Stone', {
  texture: assets.TEXTURE_IDS['stone'],
  useOnTile: function(tile) {
    if (tile.obstacle == null) {
      tile.obstacle = new types.Obstacle('stone');
      return true;
    }
    return false;
  },
  cooldown: 500
});

item('Wood', {
  texture: assets.TEXTURE_IDS['wood'],
  useOnTile: function(tile) {
    if (tile.obstacle == null) {
      tile.obstacle = new types.Obstacle('wood');
      return true;
    }
    return false;
  },
  cooldown: 500
});

item('Axe', {
  texture: assets.TEXTURE_IDS['axe'],
  useOnTile: function(tile) {
    if ((tile.obstacle != null) && tile.obstacle.subclass('wood')) {
      tile.damageObstacle(1 * d(3));
    }
    return false;
  },
  cooldown: 500
});

BASE_OBSTACLE = {
  ancestors: []
};

obstacle_id = 0;

obstacle = function(name, extend, properties) {
  var id, obstacleTemplate, property, val, _results;
  if (typeof extend === 'string') {
    extend = OBSTACLE_TEMPLATES[OBSTACLE_NAMES[extend]];
  } else {
    properties = extend;
    extend = BASE_OBSTACLE;
  }
  id = obstacle_id++;
  OBSTACLE_TEMPLATES[id] = obstacleTemplate = {
    name: name,
    ancestors: extend.ancestors.concat([name])
  };
  OBSTACLE_NAMES[name] = id;
  for (property in extend) {
    val = extend[property];
    if (property !== 'ancestors') {
      obstacleTemplate[property] = val;
    }
  }
  _results = [];
  for (property in properties) {
    val = properties[property];
    _results.push(obstacleTemplate[property] = val);
  }
  return _results;
};

obstacle('stone', {
  top: assets.TEXTURE_IDS['stone'],
  side: assets.TEXTURE_IDS['stone'],
  health: 10,
  drops: ['Stone']
});

obstacle('wood', {
  top: assets.TEXTURE_IDS['wood'],
  side: assets.TEXTURE_IDS['wood'],
  health: 10,
  drops: ['Wood']
});

obstacle('tree', 'wood', {
  top: assets.TEXTURE_IDS['tree-top'],
  side: assets.TEXTURE_IDS['tree-side'],
  health: 10,
  drops: ['Wood']
});


},{"./assets.coffee":5,"./types.coffee":10}],9:[function(require,module,exports){
(function (Buffer){
var NativeType, SerialObject, SerialProperty, SerialType, base64, _Array, _Char, _Float, _Int, _Possibly, _String, _Uint8,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

base64 = require('./base64.js');

ArrayBuffer.prototype.toASCII = function() {
  return String.fromCharCode.apply(null, new Uint16Array(this));
};

ArrayBuffer.fromASCII = function(ascii) {
  var dest, i, _i, _ref;
  dest = new Uint16Array(new ArrayBuffer(ascii.length * 2));
  for (i = _i = 0, _ref = ascii.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
    dest[i] = ascii.charCodeAt(i);
  }
  return dest.buffer;
};

ArrayBuffer.fromBuffer = function(buffer) {
  var ab, el, i, view, _i, _len;
  ab = new ArrayBuffer(buffer.length);
  view = new Uint8Array(ab);
  for (i = _i = 0, _len = buffer.length; _i < _len; i = ++_i) {
    el = buffer[i];
    view[i] = buffer[i];
  }
  return ab;
};

exports.SerialProperty = SerialProperty = (function() {
  function SerialProperty(type, name) {
    this.type = type;
    this.name = name;
  }

  return SerialProperty;

})();

exports.SerialObject = SerialObject = (function() {
  function SerialObject() {}

  return SerialObject;

})();

NativeType = function(_arg) {
  var read, size, write;
  read = _arg.read, write = _arg.write, size = _arg.size;
  return {
    parse: function(buffer, offset) {
      return read(buffer, offset);
    },
    serialize: function(object, buffer, offset) {
      if (offset == null) {
        offset = 0;
      }
      if (buffer == null) {
        buffer = new DataView(new ArrayBuffer(size(object)));
      }
      return {
        value: buffer,
        offset: offset + write(object, buffer, offset)
      };
    },
    size: size,
    properties: []
  };
};

_Char = exports.Char = NativeType({
  read: function(buffer, offset) {
    if (offset == null) {
      offset = 0;
    }
    return {
      value: String.fromCharCode(buffer.getUint16(offset)),
      offset: offset + 2
    };
  },
  write: function(object, buffer, offset) {
    buffer.setUint16(offset, object.charCodeAt(0));
    return 2;
  },
  size: function() {
    return 2;
  }
});

_Uint8 = exports.Uint8 = NativeType({
  read: function(buffer, offset) {
    if (offset == null) {
      offset = 0;
    }
    return {
      value: buffer.getUint8(offset),
      offset: offset + 1
    };
  },
  write: function(object, buffer, offset) {
    buffer.setUint8(offset, object);
    return 1;
  },
  size: function() {
    return 1;
  }
});

_Int = exports.Int = NativeType({
  read: function(buffer, offset) {
    if (offset == null) {
      offset = 0;
    }
    return {
      value: buffer.getInt32(offset),
      offset: offset + 4
    };
  },
  write: function(object, buffer, offset) {
    buffer.setInt32(offset, object);
    return 4;
  },
  size: function() {
    return 4;
  }
});

_Float = exports.Float = NativeType({
  read: function(buffer, offset) {
    if (offset == null) {
      offset = 0;
    }
    return {
      value: buffer.getFloat64(offset),
      offset: offset + 8
    };
  },
  write: function(object, buffer, offset) {
    buffer.setFloat64(offset, object);
    return 8;
  },
  size: function() {
    return 8;
  }
});

_String = exports.String = NativeType({
  read: function(buffer, offset) {
    var length, str;
    if (offset == null) {
      offset = 0;
    }
    length = buffer.getUint16(offset);
    str = '';
    return {
      value: String.fromCharCode.apply(null, new Uint16Array(buffer.slice(offset + 2, offset + 2 * (length + 1)))),
      offset: offset + 2 * (length + 1)
    };
  },
  write: function(string, buffer, offset) {
    var char, i, _i, _len;
    buffer.setUint16(offset, string.length);
    for (i = _i = 0, _len = string.length; _i < _len; i = ++_i) {
      char = string[i];
      buffer.setUint16(offset + 2 * (i + 1), string.charCodeAt(i));
    }
    return string.length * 2;
  },
  size: function(object) {
    return object.length * 2 + 2;
  }
});

_Array = exports.Array = function(Type) {
  var size;
  size = function(object) {
    return object.reduce((function(a, b) {
      return a + Type.size(b);
    }), 2);
  };
  return {
    parse: function(buffer, offset) {
      var array, i, length, _i, _ref;
      if (offset == null) {
        offset = 0;
      }
      length = buffer.getUint16(offset);
      offset += 2;
      array = new Array(length);
      for (i = _i = 0; 0 <= length ? _i < length : _i > length; i = 0 <= length ? ++_i : --_i) {
        _ref = Type.parse(buffer, offset), array[i] = _ref.value, offset = _ref.offset;
      }
      return {
        value: array,
        offset: offset
      };
    },
    serialize: function(object, buffer, offset) {
      var el, i, _i, _len;
      if (buffer == null) {
        buffer = new DataView(new ArrayBuffer(size(object)));
      }
      buffer.setUint16(offset, object.length);
      offset += 2;
      for (i = _i = 0, _len = object.length; _i < _len; i = ++_i) {
        el = object[i];
        offset = Type.serialize(el, buffer, offset).offset;
      }
      return {
        value: buffer,
        offset: offset
      };
    },
    size: function(object) {
      return object.reduce((function(a, b) {
        return a + Type.size(b);
      }), 2);
    },
    properties: []
  };
};

_Possibly = exports.Possibly = function(Type) {
  var size;
  size = function(object) {
    return Type.size(object) + 1;
  };
  return {
    parse: function(buffer, offset) {
      if (offset == null) {
        offset = 0;
      }
      if (buffer.getUint8(offset) === 0) {
        return {
          value: null,
          offset: offset + 1
        };
      } else {
        return Type.parse(buffer, offset + 1);
      }
    },
    serialize: function(object, buffer, offset) {
      if (buffer == null) {
        buffer = new DataView(new ArrayBuffer(size(object)));
      }
      if (object != null) {
        buffer.setUint8(offset, 1);
        offset += 1;
        offset = Type.serialize(object, buffer, offset).offset;
      } else {
        buffer.setUint8(offset, 0);
        offset += 1;
      }
      return {
        value: buffer,
        offset: offset
      };
    },
    size: function(object) {
      if (object != null) {
        return Type.size(object) + 1;
      } else {
        return 1;
      }
    },
    properties: []
  };
};

exports.SerialType = SerialType = function(extend, properties, methods) {
  var Type, i, key, property, usedPropertyNames, val, _i, _j, _len, _len1, _ref, _ref1;
  if (!(extend.prototype instanceof SerialObject)) {
    methods = properties;
    properties = extend;
    extend = SerialObject;
  }
  usedPropertyNames = {};
  for (i = _i = 0, _len = properties.length; _i < _len; i = ++_i) {
    property = properties[i];
    usedPropertyNames[property[1]] = true;
    properties[i] = new SerialProperty(property[0], property[1]);
  }
  if (extend !== SerialObject) {
    _ref = extend.properties;
    for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
      property = _ref[_j];
      if (!(property.name in usedPropertyNames)) {
        properties.push(property);
      }
    }
  }
  Type = (function(_super) {
    __extends(Type, _super);

    function Type() {
      if (methods.constructor != null) {
        methods.constructor.apply(this, arguments);
      }
    }

    Type.prototype.serialSize = function() {
      return Type.size(this);
    };

    Type.prototype.serialize = function(buffer, offset) {
      if (offset == null) {
        offset = 0;
      }
      return Type.serialize(this, buffer, offset).value.buffer;
    };

    return Type;

  })(extend);
  if (extend !== SerialObject) {
    _ref1 = extend.prototype;
    for (key in _ref1) {
      val = _ref1[key];
      if (!(key in methods)) {
        Type.prototype[key] = val;
      }
    }
  }
  for (key in methods) {
    val = methods[key];
    if (key !== 'constructor') {
      Type.prototype[key] = val;
    }
  }
  Type.size = function(object) {
    var size, _k, _len2;
    size = 0;
    for (_k = 0, _len2 = properties.length; _k < _len2; _k++) {
      property = properties[_k];
      size += property.type.size(object[property.name]);
    }
    return size;
  };
  Type.properties = properties;
  Type.serialize = function(object, buffer, offset) {
    var size, _k, _len2;
    if (offset == null) {
      offset = 0;
    }
    size = Type.size(object);
    if (buffer == null) {
      buffer = new ArrayBuffer(size);
    }
    if (buffer instanceof ArrayBuffer) {
      buffer = new DataView(buffer);
    }
    for (_k = 0, _len2 = properties.length; _k < _len2; _k++) {
      property = properties[_k];
      offset = property.type.serialize(object[property.name], buffer, offset).offset;
    }
    return {
      value: buffer,
      offset: offset
    };
  };
  Type.parse = function(buffer, offset, value) {
    var _k, _len2, _ref2;
    if (offset == null) {
      offset = 0;
    }
    if (value == null) {
      value = new Type();
    }
    if ((typeof buffer === 'string') || buffer instanceof String) {
      buffer = ArrayBuffer.fromASCII(buffer);
    } else if ((typeof Buffer !== "undefined" && Buffer !== null) && buffer instanceof Buffer) {
      buffer = ArrayBuffer.fromBuffer(buffer);
    }
    if (buffer instanceof ArrayBuffer) {
      buffer = new DataView(buffer);
    }
    for (_k = 0, _len2 = properties.length; _k < _len2; _k++) {
      property = properties[_k];
      _ref2 = property.type.parse(buffer, offset), value[property.name] = _ref2.value, offset = _ref2.offset;
    }
    return {
      value: value,
      offset: offset
    };
  };
  return Type;
};


}).call(this,require("buffer").Buffer)
},{"./base64.js":6,"buffer":1}],10:[function(require,module,exports){
var Board, BoardCoordinate, CRACK_1, CRACK_2, CRACK_3, GhostBoard, ITEMSIZE, Inventory, Item, Mob, Obstacle, ObstacleView, Player, SIZE, ShadowQueue, Terrain, Texture, Tile, TileView, Vector, VisionField, assets, items, serial,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __modulo = function(a, b) { return (a % b + +b) % b; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

serial = require('./serialization.coffee');

items = require('./items.coffee');

assets = require('./assets.coffee');

SIZE = 40;

ITEMSIZE = 15;

exports.Vector = Vector = serial.SerialType([[serial.Float, 'x'], [serial.Float, 'y']], {
  constructor: function(x, y) {
    this.x = x;
    this.y = y;
  },
  equals: function(other) {
    return this.x === other.x && this.y === other.y;
  },
  touches: function() {
    return [new BoardCoordinate(Math.floor(this.x), Math.floor(this.y)), new BoardCoordinate(Math.floor(this.x), Math.ceil(this.y)), new BoardCoordinate(Math.ceil(this.x), Math.floor(this.y)), new BoardCoordinate(Math.ceil(this.x), Math.ceil(this.y))];
  },
  translate: function(other) {
    this.x += other.x;
    return this.y += other.y;
  },
  touchesTile: function(tile) {
    return Math.abs(tile.x - this.x) < 1 && Math.abs(tile.y - this.y) < 1;
  },
  mult: function(scalar) {
    return new Vector(this.x * scalar, this.y * scalar);
  },
  to: function(other) {
    return new Vector(other.x - this.x, other.y - this.y);
  },
  mag: function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  },
  normalize: function() {
    var mag;
    mag = this.mag();
    if (mag === 0) {
      return new Vector(0, 0);
    } else {
      return this.mult(1 / this.mag());
    }
  },
  distance: function(other) {
    return this.to(other).mag();
  },
  dot: function(other) {
    return this.x * other.x + this.y * other.y;
  },
  scalarProject: function(other) {
    return this.dot(other) / other.mag();
  },
  rotate: function(rot) {
    return new Vector(Math.cos(rot) * this.x - Math.sin(rot) * this.y, Math.sin(rot) * this.x + Math.cos(rot) * this.y);
  },
  dump: function() {
    return this.x + ',' + this.y;
  },
  clone: function() {
    return c(this.x, this.y);
  },
  round: function() {
    return new BoardCoordinate(Math.round(this.x), Math.round(this.y));
  }
});

exports.Texture = Texture = serial.SerialType([[serial.Uint8, 'texture_id']], {
  constructor: function(texture_id) {
    this.texture_id = texture_id;
    if (this.texture_id instanceof String || typeof this.texture_id === 'string') {
      return this.texture_id = assets.TEXTURE_IDS[this.texture_id];
    }
  },
  get: function() {
    return assets.RESOURCES[this.texture_id];
  }
});

CRACK_1 = new Texture('crack-1');

CRACK_2 = new Texture('crack-2');

CRACK_3 = new Texture('crack-3');

exports.BoardCoordinate = BoardCoordinate = serial.SerialType(Vector, [[serial.Int, 'x'], [serial.Int, 'y']], {
  constructor: function(x, y) {
    this.x = x;
    this.y = y;
  },
  round: function() {
    return this;
  },
  dump: function() {
    return this.x + ',' + this.y;
  }
});

exports.Terrain = Terrain = serial.SerialType([[Texture, 'texture']], {
  constructor: function(texture) {
    this.texture = texture;
  }
});

exports.Item = Item = serial.SerialType([[serial.Int, 'item_id']], {
  constructor: function(item_id) {
    this.item_id = item_id;
    if (typeof this.item_id === 'string') {
      return this.item_id = items.ITEM_NAMES[this.item_id];
    }
  },
  texture: function() {
    return new Texture(items.ITEM_TEMPLATES[this.item_id].texture);
  },
  name: function() {
    return items.ITEM_TEMPLATES[this.item_id].name;
  },
  cooldown: function() {
    return items.ITEM_TEMPLATES[this.item_id].cooldown;
  },
  useOnTile: function(tile) {
    return items.ITEM_TEMPLATES[this.item_id].useOnTile(tile);
  }
});

exports.Obstacle = Obstacle = serial.SerialType([[serial.Int, 'obstacle_id'], [serial.Int, 'health'], [serial.Int, 'maxHealth'], [Inventory, 'drops']], {
  constructor: function(obstacle_id) {
    var el, i, _i, _len, _ref, _results;
    this.obstacle_id = obstacle_id;
    if (typeof this.obstacle_id === 'string') {
      this.obstacle_id = items.OBSTACLE_NAMES[this.obstacle_id];
    }
    this.health = this.maxHealth = items.OBSTACLE_TEMPLATES[this.obstacle_id].health;
    this.drops = new Inventory(items.OBSTACLE_TEMPLATES[this.obstacle_id].drops.length);
    _ref = items.OBSTACLE_TEMPLATES[this.obstacle_id].drops;
    _results = [];
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      el = _ref[i];
      _results.push(this.drops.add(new Item(el)));
    }
    return _results;
  },
  topTexture: function() {
    return new Texture(items.OBSTACLE_TEMPLATES[this.obstacle_id].top);
  },
  sideTexture: function() {
    return new Texture(items.OBSTACLE_TEMPLATES[this.obstacle_id].side);
  },
  subclass: function(name) {
    return __indexOf.call(items.OBSTACLE_TEMPLATES[this.obstacle_id].ancestors, name) >= 0;
  },
  view: function() {
    return new ObstacleView(this);
  }
});

exports.ObstacleView = ObstacleView = serial.SerialType([[Texture, 'top'], [Texture, 'side'], [serial.Uint8, 'damaged']], {
  constructor: function(obstacle) {
    if (obstacle != null) {
      this.top = obstacle.topTexture();
      this.side = obstacle.sideTexture();
      return this.damaged = Math.floor(obstacle.health * 4 / obstacle.maxHealth);
    }
  },
  equals: function(other) {
    return this.top.texture_id === other.top.texture_id && this.side.texture_id === other.side.texture_id && this.damaged === other.damaged;
  }
});

exports.Inventory = Inventory = serial.SerialType([[serial.Array(Item), 'contents'], [serial.Int, 'capacity']], {
  constructor: function(capacity) {
    this.capacity = capacity != null ? capacity : 20;
    this.contents = [];
    return this.handlers = {
      change: []
    };
  },
  on: function(event, fn) {
    return this.handlers[event].push(fn);
  },
  length: function() {
    return this.contents.length;
  },
  add: function(item) {
    var fn, _i, _len, _ref;
    if (this.contents.length < this.capacity) {
      this.contents.push(item);
      _ref = this.handlers.change;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        fn = _ref[_i];
        fn();
      }
      return true;
    } else {
      return false;
    }
  },
  remove: function(item) {
    var el, fn, i, _i, _j, _len, _len1, _ref, _ref1;
    _ref = this.contents;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      el = _ref[i];
      if (el === item) {
        this.contents.splice(i, 1);
        _ref1 = this.handlers.change;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          fn = _ref1[_j];
          fn();
        }
        return true;
      }
    }
    return false;
  },
  removeIndex: function(index) {
    var fn, _i, _len, _ref;
    if (index < this.contents.length) {
      this.contents.splice(index, 1);
      _ref = this.handlers.change;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        fn = _ref[_i];
        fn();
      }
      return true;
    }
    return false;
  },
  dump: function(destination) {
    while (this.contents.length !== 0) {
      if (!destination.add(this.contents.splice(0, 1)[0])) {
        return this.contents.length;
      }
    }
    return 0;
  },
  get: function(i) {
    return this.contents[i];
  }
});

exports.Tile = Tile = serial.SerialType([[serial.Int, 'id'], [BoardCoordinate, 'pos'], [Terrain, 'terrain'], [serial.Possibly(Obstacle), 'obstacle'], [serial.Array(Item), 'inventory']], {
  constructor: function(pos, terrain, obstacle) {
    this.pos = pos;
    this.terrain = terrain;
    this.obstacle = obstacle;
    this.id = Tile._id++;
    return this.inventory = new Inventory();
  },
  impassable: function() {
    return this.obstacle != null;
  },
  destroyObstacle: function() {
    if (this.obstacle != null) {
      this.obstacle.drops.dump(this.inventory);
      return this.obstacle = null;
    }
  },
  damageObstacle: function(damage) {
    if (this.obstacle != null) {
      this.obstacle.health -= damage;
      if (this.obstacle.health < 0) {
        return this.destroyObstacle();
      }
    }
  },
  view: function() {
    return new TileView(this);
  }
});

Tile._id = 0;

exports.TileView = TileView = serial.SerialType([[BoardCoordinate, 'pos'], [Texture, 'terrain'], [serial.Possibly(ObstacleView), 'obstacle'], [serial.Possibly(Texture), 'item']], {
  constructor: function(tile) {
    if (tile != null) {
      this.pos = tile.pos;
      this.terrain = tile.terrain.texture;
      this.obstacle = this.item = null;
      if (tile.obstacle != null) {
        this.obstacle = tile.obstacle.view();
      }
      if (tile.inventory.length() > 0) {
        return this.item = tile.inventory.get(0).texture();
      }
    }
  },
  equals: function(other) {
    var _ref, _ref1;
    return this.pos.equals(other.pos) && this.terrain.texture_id === other.terrain.texture_id && (this.obstacle != null) === (other.obstacle != null) && ((this.obstacle == null) || this.obstacle.equals(other.obstacle)) && ((_ref = this.item) != null ? _ref.texture_id : void 0) === ((_ref1 = other.item) != null ? _ref1.texture_id : void 0);
  },
  impassable: function() {
    return this.obstacle != null;
  },
  render: function(canvas, ctx, cameraRotation, pos) {
    var drawCorner, terrain;
    if (this.obstacle != null) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(cameraRotation);
      ctx.translate(SIZE * (this.pos.x - pos.x), SIZE * (this.pos.y - pos.y));
      ctx.rotate(-cameraRotation);
      ctx.translate(0, -SIZE);
      ctx.rotate(cameraRotation);
      ctx.drawImage(this.obstacle.top.get(), -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      switch (this.obstacle.damaged) {
        case 2:
          ctx.drawImage(CRACK_1.get(), -SIZE / 2, -SIZE / 2, SIZE, SIZE);
          break;
        case 1:
          ctx.drawImage(CRACK_2.get(), -SIZE / 2, -SIZE / 2, SIZE, SIZE);
          break;
        case 0:
          ctx.drawImage(CRACK_3.get(), -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      }
      drawCorner = (function(_this) {
        return function(n) {
          if ((__modulo(cameraRotation + n, 2 * Math.PI)) < Math.PI) {
            ctx.save();
            ctx.rotate(-cameraRotation);
            ctx.transform(Math.cos(cameraRotation + n + Math.PI / 2), Math.sin(cameraRotation + n + Math.PI / 2), 0, 1, 0, 0);
            ctx.drawImage(_this.obstacle.side.get(), 0, 0, SIZE, SIZE);
            switch (_this.obstacle.damaged) {
              case 2:
                ctx.drawImage(CRACK_1.get(), 0, 0, SIZE, SIZE);
                break;
              case 1:
                ctx.drawImage(CRACK_2.get(), 0, 0, SIZE, SIZE);
                break;
              case 0:
                ctx.drawImage(CRACK_3.get(), 0, 0, SIZE, SIZE);
            }
            return ctx.restore();
          }
        };
      })(this);
      ctx.translate(-SIZE / 2, -SIZE / 2);
      drawCorner(-Math.PI / 2);
      ctx.translate(SIZE, 0);
      drawCorner(0);
      ctx.translate(0, SIZE);
      drawCorner(Math.PI / 2);
      ctx.translate(-SIZE, 0);
      drawCorner(Math.PI);
      return ctx.resetTransform();
    } else {
      terrain = this.terrain.get();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(cameraRotation);
      ctx.translate(SIZE * this.pos.x - pos.x * SIZE, SIZE * this.pos.y - pos.y * SIZE);
      ctx.drawImage(terrain, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      ctx.rotate(-cameraRotation);
      if (this.item != null) {
        ctx.drawImage(this.item.get(), -ITEMSIZE / 2, -ITEMSIZE / 2, ITEMSIZE, ITEMSIZE);
      }
      return ctx.resetTransform();
    }
  }
});

exports.Mob = Mob = serial.SerialType([[Texture, 'texture'], [Vector, 'pos'], [Vector, 'velocity'], [serial.Int, 'health'], [Inventory, 'inventory']], {
  constructor: function(texture, pos) {
    this.texture = texture;
    this.pos = pos;
    this.velocity = new Vector(0, 0);
    return this.inventory = new Inventory();
  },
  render: function(canvas, ctx, cameraRotation, pos) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(cameraRotation);
    ctx.translate(SIZE * (this.pos.x - pos.x), SIZE * (this.pos.y - pos.y));
    ctx.strokeStyle = '#F00';
    ctx.strokeRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
    ctx.rotate(-cameraRotation);
    ctx.drawImage(this.texture.get(), -SIZE / 2, -SIZE, SIZE, SIZE);
    return ctx.resetTransform();
  }
});

exports.Player = Player = serial.SerialType(Mob, [], {
  constructor: function() {
    this.texture = new Texture('wizard');
    this.health = 100;
    this.pos = new Vector(250, 250);
    this.velocity = new Vector(0, 0);
    return this.inventory = new Inventory();
  }
});

exports.VisionField = VisionField = serial.SerialType([[serial.Array(TileView), 'tiles'], [serial.Array(Mob), 'mobs']], {
  constructor: function(tiles, mobs) {
    this.tiles = tiles;
    this.mobs = mobs;
  }
});

exports.ShadowQueue = ShadowQueue = (function() {
  function ShadowQueue() {
    this.queue = [];
  }

  ShadowQueue.prototype.emplace = function(startAngle, endAngle) {
    var end, remove, start;
    startAngle = __modulo(startAngle, 360);
    if (endAngle !== 360) {
      endAngle = __modulo(endAngle, 360);
    }
    if (startAngle > endAngle) {
      this.emplace(0, endAngle);
      this.emplace(startAngle, 360);
      return;
    }
    start = 0;
    while (!(this.queue[start] >= startAngle || start >= this.queue.length)) {
      start++;
    }
    end = this.queue.length;
    while (!(this.queue[end] <= endAngle || end < 0)) {
      end--;
    }
    remove = end - start + 1;
    if (__modulo(remove, 2) === 1) {
      if (__modulo(start, 2) === 1) {
        return this.queue.splice(start, remove, endAngle);
      } else {
        return this.queue.splice(start, remove, startAngle);
      }
    } else {
      if (__modulo(start, 2) === 1) {
        return this.queue.splice(start, remove);
      } else {
        return this.queue.splice(start, remove, startAngle, endAngle);
      }
    }
  };

  ShadowQueue.prototype.check = function(startAngle, endAngle) {
    var begin, end, start, _ref;
    startAngle = __modulo(startAngle, 360);
    if (endAngle !== 360) {
      endAngle = __modulo(endAngle, 360);
    }
    if (startAngle > endAngle) {
      begin = this.check(0, endAngle);
      end = this.check(startAngle, 360);
      if (((_ref = ShadowQueue.PARTIAL) === begin || _ref === end) || begin !== end) {
        return ShadowQueue.PARTIAL;
      } else {
        return begin;
      }
    }
    start = 0;
    while (!(this.queue[start] > startAngle || start >= this.queue.length)) {
      start++;
    }
    if (this.queue[start] < endAngle) {
      return ShadowQueue.PARTIAL;
    } else {
      if (__modulo(start, 2) === 1) {
        return ShadowQueue.FULL;
      } else {
        return ShadowQueue.NONE;
      }
    }
  };

  return ShadowQueue;

})();

ShadowQueue.PARTIAL = 'PARTIAL';

ShadowQueue.FULL = 'FULL';

ShadowQueue.NONE = 'NONE';

exports.Board = Board = (function() {
  function Board(dimensions) {
    var i, j;
    this.dimensions = dimensions;
    this.cells = (function() {
      var _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = this.dimensions.x; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push((function() {
          var _j, _ref1, _results1;
          _results1 = [];
          for (j = _j = 0, _ref1 = this.dimensions.y; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
            _results1.push(new Tile(new Vector(i, j), null, null));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    }).call(this);
  }

  Board.prototype.getCircle = function(_arg, r) {
    var coords, i, x, y, _i, _j, _k, _l, _ref, _ref1, _ref2, _ref3;
    x = _arg.x, y = _arg.y;
    x = Math.round(x);
    y = Math.round(y);
    r = Math.ceil(r);
    coords = [];
    for (i = _i = 0, _ref = r * 2; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      coords.push(new BoardCoordinate(x - r, y + r - i));
    }
    for (i = _j = 0, _ref1 = r * 2; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      coords.push(new BoardCoordinate(x - r + i, y - r));
    }
    for (i = _k = 0, _ref2 = r * 2; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
      coords.push(new BoardCoordinate(x + r, y - r + i));
    }
    for (i = _l = 0, _ref3 = r * 2; 0 <= _ref3 ? _l < _ref3 : _l > _ref3; i = 0 <= _ref3 ? ++_l : --_l) {
      coords.push(new BoardCoordinate(x + r - i, y + r));
    }
    return coords;
  };

  Board.prototype.getCoordinateArea = function(coord, max) {
    var all, circle, el, r, _i, _j, _len, _ref, _ref1;
    all = [coord];
    for (r = _i = 0; 0 <= max ? _i <= max : _i >= max; r = 0 <= max ? ++_i : --_i) {
      circle = this.getCircle(coord, r);
      for (_j = 0, _len = circle.length; _j < _len; _j++) {
        el = circle[_j];
        if ((0 <= (_ref = el.x) && _ref < this.dimensions.x) && (0 <= (_ref1 = el.y) && _ref1 < this.dimensions.y)) {
          all.push(el);
        }
      }
    }
    return all;
  };

  Board.prototype.getTileArea = function(coord, max) {
    return this.getCoordinateArea(coord, max).map((function(_this) {
      return function(x) {
        return _this.get(x);
      };
    })(this));
  };

  Board.prototype.shadowcast = function(coord, see, max) {
    var circle, end, i, queue, r, start, target, visible, _i, _len, _ref, _ref1;
    visible = {};
    queue = new ShadowQueue();
    r = 0;
    visible[coord.dump()] = true;
    while (!(r >= max)) {
      r++;
      circle = this.getCircle(coord, r);
      for (i = _i = 0, _len = circle.length; _i < _len; i = ++_i) {
        target = circle[i];
        if (!((0 <= (_ref = target.x) && _ref < this.dimensions.x) && (0 <= (_ref1 = target.y) && _ref1 < this.dimensions.y))) {
          continue;
        }
        start = 360 * (2 * i - __modulo(1, 2 * circle.length)) / (2 * circle.length);
        end = 360 * (2 * i + __modulo(1, 2 * circle.length)) / (2 * circle.length);
        if (queue.check(start, end) === ShadowQueue.PARTIAL) {
          visible[target.dump()] = false;
        } else if (queue.check(start, end) === ShadowQueue.NONE) {
          visible[target.dump()] = true;
        }
        if (!see(this.get(target))) {
          queue.emplace(start, end);
        }
      }
    }
    return visible;
  };

  Board.prototype.getVision = function(coord, see, max) {
    var visible;
    visible = this.shadowcast(coord, see, max);
    return this.getTileArea(coord, max).filter(function(tile) {
      return tile.pos.dump() in visible;
    });
  };

  Board.prototype.get = function(coord, opt_y) {
    var x, y;
    if (opt_y != null) {
      x = coord;
      y = opt_y;
    } else {
      x = coord.x, y = coord.y;
    }
    if ((0 <= x && x < this.dimensions.x) && (0 <= y && y < this.dimensions.y)) {
      return this.cells[x][y];
    } else {
      return null;
    }
  };

  Board.prototype.each = function(fn) {
    var x, y, _i, _j, _ref, _ref1;
    for (x = _i = 0, _ref = this.dimensions.x; 0 <= _ref ? _i < _ref : _i > _ref; x = 0 <= _ref ? ++_i : --_i) {
      for (y = _j = 0, _ref1 = this.dimensions.y; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
        fn(x, y, this.get(x, y));
      }
    }
    return null;
  };

  return Board;

})();

exports.GhostBoard = GhostBoard = (function(_super) {
  __extends(GhostBoard, _super);

  function GhostBoard(dimensions) {
    var i, j;
    this.dimensions = dimensions;
    this.cells = (function() {
      var _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = this.dimensions.x; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push((function() {
          var _j, _ref1, _results1;
          _results1 = [];
          for (j = _j = 0, _ref1 = this.dimensions.y; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
            _results1.push(new TileView());
          }
          return _results1;
        }).call(this));
      }
      return _results;
    }).call(this);
    this.each(function(x, y, view) {
      view.pos = new BoardCoordinate(x, y);
      return view.terrain = new Texture('black');
    });
  }

  GhostBoard.prototype.update = function(views) {
    var view, _i, _len;
    for (_i = 0, _len = views.length; _i < _len; _i++) {
      view = views[_i];
      this.cells[view.pos.x][view.pos.y] = view;
    }
    return true;
  };

  return GhostBoard;

})(Board);

exports.translateOKComponent = function(board, pos, v) {
  var _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
  if (v.x > 0 && (((_ref = board.get(Math.ceil(pos.x + v.x), Math.floor(pos.y))) != null ? typeof _ref.impassable === "function" ? _ref.impassable() : void 0 : void 0) || ((_ref1 = board.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y))) != null ? typeof _ref1.impassable === "function" ? _ref1.impassable() : void 0 : void 0))) {
    pos.x = Math.ceil(pos.x);
  } else if (v.x < 0 && (((_ref2 = board.get(Math.floor(pos.x + v.x), Math.floor(pos.y))) != null ? typeof _ref2.impassable === "function" ? _ref2.impassable() : void 0 : void 0) || ((_ref3 = board.get(Math.floor(pos.x + v.x), Math.ceil(pos.y))) != null ? typeof _ref3.impassable === "function" ? _ref3.impassable() : void 0 : void 0))) {
    pos.x = Math.floor(pos.x);
  } else {
    pos.x += v.x;
  }
  if (v.y > 0 && (((_ref4 = board.get(Math.floor(pos.x), Math.ceil(pos.y + v.y))) != null ? typeof _ref4.impassable === "function" ? _ref4.impassable() : void 0 : void 0) || ((_ref5 = board.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y))) != null ? typeof _ref5.impassable === "function" ? _ref5.impassable() : void 0 : void 0))) {
    return pos.y = Math.ceil(pos.y);
  } else if (v.y < 0 && (((_ref6 = board.get(Math.floor(pos.x), Math.floor(pos.y + v.y))) != null ? typeof _ref6.impassable === "function" ? _ref6.impassable() : void 0 : void 0) || ((_ref7 = board.get(Math.ceil(pos.x), Math.floor(pos.y + v.y))) != null ? typeof _ref7.impassable === "function" ? _ref7.impassable() : void 0 : void 0))) {
    return pos.y = Math.floor(pos.y);
  } else {
    return pos.y += v.y;
  }
};


},{"./assets.coffee":5,"./items.coffee":8,"./serialization.coffee":9}]},{},[7])(7)
});