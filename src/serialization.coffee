base64 = require './base64.js'

# Extend ArrayBuffer to convert to string and base64
ArrayBuffer::toASCII = ->
  return String.fromCharCode.apply(null, new Uint16Array(@))

ArrayBuffer.fromASCII = (ascii) ->
  dest = new Uint16Array new ArrayBuffer ascii.length * 2
  for i in [0...ascii.length]
    dest[i] = ascii.charCodeAt(i)
  return dest.buffer

# To convert from node.js buffers
ArrayBuffer.fromBuffer = (buffer) ->
  ab = new ArrayBuffer buffer.length
  view = new Uint8Array ab
  for el, i in buffer
    view[i] = buffer[i]
  return ab

# SerialProperty, a simple interface for informing SerialType of the components of our new type.
exports.SerialProperty = class SerialProperty
  constructor: (@type, @name) ->

# Arbitrary superclass of types.
exports.SerialObject = class SerialObject

NativeType = ({read, write, size}) ->
  return {
    parse: (buffer, offset) -> read buffer, offset
    serialize: (object, buffer, offset = 0) ->
      buffer ?= new DataView(new ArrayBuffer(size(object)))
      value: buffer
      offset: offset + write(object, buffer, offset)
    size: size
    properties: []
  }

_Char = exports.Char = NativeType
  read: (buffer, offset = 0) ->
    value: String.fromCharCode(buffer.getUint16(offset))
    offset: offset + 2
  write: (object, buffer, offset) -> buffer.setUint16 offset, object.charCodeAt(0); 2
  size: -> 2

_Uint8 = exports.Uint8 = NativeType
  read: (buffer, offset = 0) ->
    value: buffer.getUint8(offset)
    offset: offset + 1
  write: (object, buffer, offset) -> buffer.setUint8 offset, object; 1
  size: -> 1

_Int = exports.Int = NativeType
  read: (buffer, offset = 0) ->
    value: buffer.getInt32(offset)
    offset: offset + 4
  write: (object, buffer, offset) -> buffer.setInt32 offset, object; 4
  size: -> 4

_Float = exports.Float = NativeType
  read: (buffer, offset = 0) ->
    value: buffer.getFloat64(offset)
    offset: offset + 8
  write: (object, buffer, offset) ->
    buffer.setFloat64 offset, object; 8
  size: -> 8

_String = exports.String = NativeType
  read: (buffer, offset = 0) ->
    length = buffer.getUint16 offset; str = ''
    return {
      value: String.fromCharCode.apply(null,
        new Uint16Array(buffer.slice(offset + 2, offset + 2 * (length + 1))))
      offset: offset + 2 * (length + 1)
    }

  write: (string, buffer, offset) ->
    buffer.setUint16 offset, string.length
    for char, i in string
      buffer.setUint16 offset + 2 * (i + 1), string.charCodeAt(i)
    return string.length * 2

  size: (object) -> object.length * 2 + 2

_Array = exports.Array = (Type) ->
  size = (object) -> object.reduce ((a, b) -> a + Type.size(b)), 2
  return {
    parse: (buffer, offset = 0) ->
      length = buffer.getUint16 offset; offset += 2
      array = new Array length
      for i in [0...length]
        {value: array[i], offset} = Type.parse buffer, offset
      return {
        value: array
        offset: offset
      }

    serialize: (object, buffer, offset) ->
      buffer ?= new DataView new ArrayBuffer size(object)
      buffer.setUint16 offset, object.length
      offset += 2
      for el, i in object
        {offset} = Type.serialize el, buffer, offset
      return {value: buffer, offset}

    size: (object) -> object.reduce ((a, b) -> a + Type.size(b)), 2
    properties: []
  }

_Possibly = exports.Possibly = (Type) ->
  size = (object) -> Type.size(object) + 1
  return {
    parse: (buffer, offset = 0) ->
      if buffer.getUint8(offset) is 0
        return {
          value: null
          offset: offset + 1
        }
      else
        return Type.parse buffer, offset + 1

    serialize: (object, buffer, offset) ->
      buffer ?= new DataView new ArrayBuffer size(object)
      if object?
        buffer.setUint8(offset, 1); offset += 1
        {offset} = Type.serialize(object, buffer, offset)
      else
        buffer.setUint8(offset, 0); offset += 1
      return {value: buffer, offset}
    size: (object) ->
      if object? then Type.size(object) + 1
      else 1
    properties: []
  }

# SerialType
exports.SerialType = SerialType = (extend, properties, methods) ->
  # Default extends SerialObject directly
  unless extend.prototype instanceof SerialObject
    methods = properties
    properties = extend
    extend = SerialObject

  usedPropertyNames = {}
  for property, i in properties
    usedPropertyNames[property[1]] = true
    properties[i] = new SerialProperty property[0], property[1]

  # Add properties for extension
  unless extend is SerialObject
    for property in extend.properties when not (property.name of usedPropertyNames)
      properties.push property

  class Type extends extend
    # Parse can happen with instantiation
    constructor: ->
      if methods.constructor? then methods.constructor.apply @, arguments

    # Two-pass serialization. First pass: determine serialized size.
    serialSize: -> Type.size @

    # Second pass: fill a buffer with the serialization.
    serialize: (buffer, offset = 0) -> Type.serialize(@, buffer, offset).value.buffer

  unless extend is SerialObject
    for key, val of extend.prototype when not (key of methods) and not (key in ['serialize', 'serialSize'])
      Type::[key] = val

  # Filter through other methods
  for key, val of methods when key isnt 'constructor' and not (key in ['serialize', 'serialSize'])
    Type::[key] = val

  Type.size = (object) ->
      size = 0
      for property in properties
        size += property.type.size(object[property.name])
      return size

  Type.properties = properties

  # Actual serialization.
  Type.serialize = (object, buffer, offset = 0) ->
      # Get serial size
      size = Type.size(object)

      # Make a buffer if one was not provided
      buffer ?= new ArrayBuffer size

      # Assure that buffer is a DataView
      if buffer instanceof ArrayBuffer
        buffer = new DataView buffer

      # Copy all properties in
      for property in properties
        {offset} = property.type.serialize object[property.name], buffer, offset

      return {value: buffer, offset}

  Type.parse = (buffer, offset = 0, value = new Type()) ->
    #console.log buffer, Buffer, buffer instanceof Buffer
    if (typeof buffer is 'string') or buffer instanceof String
      buffer = ArrayBuffer.fromASCII buffer
    else if Buffer? and buffer instanceof Buffer
      buffer = ArrayBuffer.fromBuffer buffer

    # Assure that buffer is a DataView
    if buffer instanceof ArrayBuffer
      buffer = new DataView buffer

    # Recursively assign subelements.
    for property in properties
      {value: value[property.name], offset} = property.type.parse(buffer, offset)

    return {value, offset}

  return Type
