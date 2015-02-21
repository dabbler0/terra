serial = require './serialization.coffee'

RESOURCES = [
  '/assets/wizard.png'
  '/assets/stone.png'
  '/assets/dirt.png'
  '/assets/grass.png'
  '/assets/black.png'
]

SIZE = 40
ITEMSIZE = 15

# loadAssets, which works on client-side only
exports.loadAssets = (cb) ->
  loaded = 0

  for resource, i in RESOURCES
    RESOURCES[i] = new Image()
    RESOURCES[i].src = resource
    RESOURCES[i].onload = ->
      loaded += 1
      if loaded is RESOURCES.length and cb?
        console.log 'Loaded all resources'
        cb()

TEXTURE_IDS = {
  'wizard': 0
  'stone': 1
  'dirt': 2
  'grass': 3
  'black': 4
}

exports.Vector = Vector = serial.SerialType [
  [serial.Float, 'x']
  [serial.Float, 'y']
], {
  constructor: (@x, @y) ->

  equals: (other) -> @x is other.x and @y is other.y

  touches: ->
    [
      new BoardCoordinate Math.floor(@x), Math.floor(@y)
      new BoardCoordinate Math.floor(@x), Math.ceil(@y)
      new BoardCoordinate Math.ceil(@x), Math.floor(@y)
      new BoardCoordinate Math.ceil(@x), Math.ceil(@y)
    ]

  translate: (other) ->
    @x += other.x
    @y += other.y

  touchesTile: (tile) ->
    Math.abs(tile.x - @x) < 1 and
    Math.abs(tile.y - @y) < 1

  mult: (scalar) ->
    return new Vector @x * scalar, @y * scalar

  to: (other) -> new Vector other.x - @x, other.y - @y

  mag: -> Math.sqrt @x * @x + @y * @y

  normalize: ->
    mag = @mag()
    if mag is 0 then new Vector 0, 0
    else @mult(1 / @mag())

  distance: (other) ->
    @to(other).mag()

  dot: (other) -> @x * other.x + @y * other.y

  scalarProject: (other) -> @dot(other) / other.mag()

  rotate: (rot) ->
    new Vector Math.cos(rot) * @x - Math.sin(rot) * @y, Math.sin(rot) * @x + Math.cos(rot) * @y

  dump: -> @x + ',' + @y

  clone: -> c @x, @y

  round: -> new BoardCoordinate Math.round(@x), Math.round(@y)
}

exports.Texture = Texture = serial.SerialType [
  [serial.Uint8, 'texture_id']
], {
  constructor: (@texture_id) ->
    if @texture_id instanceof String or typeof @texture_id is 'string'
      @texture_id = TEXTURE_IDS[@texture_id]

  get: -> RESOURCES[@texture_id]
}
exports.BoardCoordinate = BoardCoordinate = serial.SerialType Vector, [
  [serial.Int, 'x']
  [serial.Int, 'y']
], {
  constructor: (@x, @y) ->

  round: -> @

  dump: -> @x + ',' + @y
}

exports.Terrain = Terrain = serial.SerialType [
  [Texture, 'texture']
], {
  constructor: (@texture) ->
}

exports.Item = Item = serial.SerialType [
  [Texture, 'texture']
  [serial.String, 'name']
], {
  constructor: (@texture, @name) ->
}

exports.Obstacle = Obstacle = serial.SerialType [
  [Texture, 'topTexture']
  [Texture, 'sideTexture']
  [serial.Int, 'health']
  [Item, 'drops']
], {
  constructor: (@topTexture, @sideTexture, @health, @drops) ->

  view: -> new ObstacleView @
}

exports.ObstacleView = ObstacleView = serial.SerialType [
  [Texture, 'top']
  [Texture, 'side']
], {
  constructor: (obstacle) ->
    if obstacle?
      @top = obstacle.topTexture; @side = obstacle.sideTexture

  equals: (other) ->
    @top.texture_id is other.top.texture_id and
    @side.texture_id is other.side.texture_id
}

exports.Inventory = Inventory = serial.SerialType [
  [serial.Array(Item), 'contents']
  [serial.Int, 'capacity']
], {
  constructor: (@capacity = 20) ->
    @contents = []

  length: -> @contents.length
  get: (i) -> @contents[i]
}

exports.Tile = Tile = serial.SerialType [
  [serial.Int, 'id']
  [BoardCoordinate, 'pos']
  [Terrain, 'terrain']
  [serial.Possibly(Obstacle), 'obstacle']
  [serial.Array(Item), 'inventory']
], {
  constructor: (@pos, @terrain, @obstacle) ->
    @id = Tile._id++
    @inventory = new Inventory()

  impassable: -> @obstacle?

  view: -> new TileView @
}

Tile._id = 0

exports.TileView = TileView = serial.SerialType [
  [BoardCoordinate, 'pos']
  [Texture, 'terrain']
  [serial.Possibly(ObstacleView), 'obstacle']
  [serial.Possibly(Texture), 'item']
], {
  constructor: (tile) ->
    if tile?
      @pos = tile.pos
      @terrain = tile.terrain.texture

      @obstacle = @item = null
      if tile.obstacle?
        @obstacle = tile.obstacle.view()
      if tile.inventory.length() > 0
        @item = tile.inventory.get(0).texture

  equals: (other) ->
    @pos.equals(other.pos) and
    @terrain.texture_id is other.terrain.texture_id and
    @obstacle? is other.obstacle? and
    ((not @obstacle?) or @obstacle.equals(other.obstacle))

  impassable: -> @obstacle?

  # Render works only in the browser, operates on a canvas object
  render: (canvas, ctx, cameraRotation, pos) ->
    if @obstacle?
      #obstacleHealth = @obstacle.health / @obstacle.maxHealth

      # Translate to the proper position
      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate cameraRotation
      ctx.translate SIZE * (@pos.x - pos.x), SIZE * (@pos.y - pos.y)
      ctx.rotate -cameraRotation
      ctx.translate 0, -SIZE
      ctx.rotate cameraRotation

      # Draw the top square
      ctx.drawImage @obstacle.top.get(), -SIZE / 2, -SIZE / 2, SIZE, SIZE

      # Draw each of the four sides, when applicable.
      # Tis entails doing a horizontal scaling and then
      # a skew transformation.
      #
      # The percieved width of a side is always cos(r), where r
      # is the amount of cameraRotation from flat. Since the
      # length of the slanted side must always remain 1, this means
      # that we need to skew by sin(r).
      drawCorner = (n) =>
        if ((cameraRotation + n) %% (2 * Math.PI)) < Math.PI
          ctx.save()
          ctx.rotate -cameraRotation
          ctx.transform Math.cos(cameraRotation + n + Math.PI / 2), Math.sin(cameraRotation + n + Math.PI / 2), 0, 1, 0, 0
          ctx.drawImage @obstacle.side.get(), 0, 0, SIZE, SIZE
          ctx.restore()

      ctx.translate -SIZE / 2, - SIZE / 2
      drawCorner -Math.PI / 2
      ctx.translate SIZE, 0
      drawCorner 0
      ctx.translate 0, SIZE
      drawCorner Math.PI / 2
      ctx.translate -SIZE, 0
      drawCorner Math.PI
      ctx.resetTransform()
    else
      terrain = @terrain.get()

      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate cameraRotation
      ctx.translate SIZE * @pos.x - pos.x * SIZE, SIZE * @pos.y - pos.y * SIZE
      ctx.drawImage terrain, -SIZE / 2, -SIZE / 2, SIZE, SIZE

      # Draw first thing in the inventory, if existent
      ctx.rotate -cameraRotation
      if @item?
        ctx.drawImage @item.get(), -ITEMSIZE / 2, -ITEMSIZE / 2, ITEMSIZE, ITEMSIZE
      ctx.resetTransform()
}

exports.Mob = Mob = serial.SerialType [
  [Texture, 'texture']
  [Vector, 'pos']
  [Vector, 'velocity']
  [serial.Int, 'health']
  [Inventory, 'inventory']
], {
  constructor: (@texture, @pos) ->
    @velocity = new Vector 0, 0
    @inventory = new Inventory()

  # Render works on the client only
  render: (canvas, ctx, cameraRotation, pos)->
    ctx.translate canvas.width / 2, canvas.height / 2
    ctx.rotate cameraRotation
    ctx.translate SIZE * (@pos.x - pos.x), SIZE * (@pos.y - pos.y)
    ctx.strokeStyle = '#F00'
    ctx.strokeRect -SIZE / 2, -SIZE / 2, SIZE, SIZE
    ctx.rotate -cameraRotation
    ctx.drawImage @texture.get(), -SIZE/2, -SIZE, SIZE, SIZE
    ctx.resetTransform()
}

exports.Player = Player = serial.SerialType Mob, [
], {
  constructor: ->
    @texture = new Texture 'wizard'
    @health = 100
    @pos = new Vector 250, 250 # TODO this is arbitrary
    @velocity = new Vector 0, 0
    @inventory = new Inventory()
}

exports.VisionField = VisionField = serial.SerialType [
  [serial.Array(TileView), 'tiles']
  [serial.Array(Mob), 'mobs']
], {
  constructor: (@tiles, @mobs) ->
}

# Functional classes
exports.ShadowQueue = class ShadowQueue
  constructor: ->
    @queue = []

  emplace: (startAngle, endAngle) ->
    startAngle %%= 360; unless endAngle is 360 then endAngle %%= 360
    if startAngle > endAngle
      @emplace 0, endAngle
      @emplace startAngle, 360
      return
    start = 0
    start++ until @queue[start] >= startAngle or start >= @queue.length

    end = @queue.length
    end-- until @queue[end] <= endAngle or end < 0

    remove = end - start + 1

    if remove %% 2 is 1
      if start %% 2 is 1
        @queue.splice start, remove, endAngle
      else
        @queue.splice start, remove, startAngle
    else
      if start %% 2 is 1
        @queue.splice start, remove
      else
        @queue.splice start, remove, startAngle, endAngle

  check: (startAngle, endAngle) ->
    startAngle %%= 360; unless endAngle is 360 then endAngle %%= 360
    if startAngle > endAngle
      begin = @check 0, endAngle
      end = @check startAngle, 360
      if ShadowQueue.PARTIAL in [begin, end] or begin isnt end
        return ShadowQueue.PARTIAL
      else
        return begin
    start = 0
    start++ until @queue[start] > startAngle or start >= @queue.length

    if @queue[start] < endAngle
      return ShadowQueue.PARTIAL
    else
      if start %% 2 is 1
        return ShadowQueue.FULL
      else
        return ShadowQueue.NONE

ShadowQueue.PARTIAL = 'PARTIAL'
ShadowQueue.FULL = 'FULL'
ShadowQueue.NONE = 'NONE'

exports.Board = class Board
  constructor: (@dimensions) ->
    @cells = ((new Tile(new Vector(i, j), null, null) for j in [0...@dimensions.y]) for i in [0...@dimensions.x])

  getCircle: ({x, y}, r) ->
    x = Math.round(x); y = Math.round(y)
    r = Math.ceil r
    coords = []
    for i in [0...r * 2]
      coords.push new BoardCoordinate x - r, y + r - i
    for i in [0...r * 2]
      coords.push new BoardCoordinate x - r + i, y - r
    for i in [0...r * 2]
      coords.push new BoardCoordinate x + r, y - r + i
    for i in [0...r * 2]
      coords.push new BoardCoordinate x + r - i, y + r

    return coords

  getCoordinateArea: (coord, max) ->
    all = [coord]
    for r in [0..max]
      circle = @getCircle coord, r
      for el in circle when 0 <= el.x < @dimensions.x and 0 <= el.y < @dimensions.y
        all.push el
    return all

  getTileArea: (coord, max) -> @getCoordinateArea(coord, max).map((x) => @get(x))

  shadowcast: (coord, see, max) ->
    visible = {}
    queue = new ShadowQueue()
    r = 0

    visible[coord.dump()] = true

    until r >= max
      r++
      circle = @getCircle coord,  r
      for target, i in circle when 0 <= target.x < @dimensions.x and 0 <= target.y < @dimensions.y
        start = 360 * (2 * i - 1 %% (2 * circle.length)) / (2 * circle.length)
        end = 360 * (2 * i + 1 %% (2 * circle.length)) / (2 * circle.length)

        if queue.check(start, end) is ShadowQueue.PARTIAL
          visible[target.dump()] = false
        else if queue.check(start, end) is ShadowQueue.NONE
          visible[target.dump()] = true
        unless see @get(target)
          queue.emplace start, end

    return visible

  getVision: (coord, see, max) ->
    visible = @shadowcast coord, see, max
    return @getTileArea(coord, max).filter (tile) -> tile.pos.dump() of visible

  get: (coord, opt_y) ->
    if opt_y?
      x = coord; y = opt_y
    else
      {x, y} = coord
    if 0 <= x < @dimensions.x and 0 <= y < @dimensions.y
      return @cells[x][y]
    else
      return null

  each: (fn) ->
    for x in [0...@dimensions.x]
      for y in [0...@dimensions.y]
        fn x, y, @get x, y
    return null

exports.GhostBoard = class GhostBoard extends Board
  constructor: (@dimensions) ->
    @cells = ((new TileView() for j in [0...@dimensions.y]) for i in [0...@dimensions.x])
    @each (x, y, view) ->
      view.pos = new BoardCoordinate x, y
      view.terrain = new Texture 'black'

  update: (views) ->
    for view in views
      @cells[view.pos.x][view.pos.y] = view
    return true

exports.translateOKComponent = (board, pos, v) ->
  if v.x > 0 and (
      board.get(Math.ceil(pos.x + v.x), Math.floor(pos.y))?.impassable?() or
      board.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y))?.impassable?()
    )
    pos.x = Math.ceil pos.x
  else if v.x < 0 and (
      board.get(Math.floor(pos.x + v.x), Math.floor(pos.y))?.impassable?() or
      board.get(Math.floor(pos.x + v.x), Math.ceil(pos.y))?.impassable?()
    )
    pos.x = Math.floor pos.x
  else
    pos.x += v.x
  if v.y > 0 and (
      board.get(Math.floor(pos.x), Math.ceil(pos.y + v.y))?.impassable?() or
      board.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y))?.impassable?()
    )
    pos.y = Math.ceil pos.y
  else if v.y < 0 and (
      board.get(Math.floor(pos.x), Math.floor(pos.y + v.y))?.impassable?() or
      board.get(Math.ceil(pos.x), Math.floor(pos.y + v.y))?.impassable?()
    )
    pos.y = Math.floor pos.y
  else
    pos.y += v.y
