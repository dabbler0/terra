serial = require './serialization.coffee'
items = require './items.coffee'
assets = require './assets.coffee'

SIZE = 40
ITEMSIZE = 15

exports.PLAYER_SEE = (tile) -> tile.translucent()

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

  add: (other) -> new Vector @x + other.x, @y + other.y

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

  clone: -> new Vector @x, @y

  round: -> new BoardCoordinate Math.round(@x), Math.round(@y)
}

exports.Texture = Texture = serial.SerialType [
  [serial.Uint8, 'texture_id']
], {
  constructor: (@texture_id) ->
    if @texture_id instanceof String or typeof @texture_id is 'string'
      @texture_id = assets.TEXTURE_IDS[@texture_id]

  get: ->
    assets.RESOURCES[@texture_id]
}

CRACK_1 = new Texture 'crack-1'
CRACK_2 = new Texture 'crack-2'
CRACK_3 = new Texture 'crack-3'

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
    if (typeof @texture is 'string')
      @texture = assets.TEXTURE_IDS[@texture]
    if (typeof @texture is 'number')
      @texture = new Texture @texture

  use: -> # TODO stub
}

exports.Item = Item = serial.SerialType [
  [serial.Int, 'item_id']
  [serial.Uint8, 'count']
], {
  constructor: (@item_id, @count = 1) ->
    if (typeof @item_id is 'string')
      @item_id = items.ITEM_NAMES[@item_id]

  texture: -> new Texture items.ITEM_TEMPLATES[@item_id].texture
  name: -> items.ITEM_TEMPLATES[@item_id].name
  cooldown: -> items.ITEM_TEMPLATES[@item_id].cooldown

  canShoot: -> items.ITEM_TEMPLATES[@item_id].shoot?
  shoot: (player, dir) -> items.ITEM_TEMPLATES[@item_id].shoot.call @, player, dir
  bulletLifetime: -> items.ITEM_TEMPLATES[@item_id].bulletLifetime
  bulletStrike: (player, mob) -> items.ITEM_TEMPLATES[@item_id].bulletStrike.call @, player, mob

  canUseOnTile: -> items.ITEM_TEMPLATES[@item_id].useOnTile?
  useOnTile: (player, tile) -> items.ITEM_TEMPLATES[@item_id].useOnTile.call @, player, tile
}

exports.Obstacle = Obstacle = serial.SerialType [
  [serial.Int, 'obstacle_id']
  [serial.Int, 'health']
  [serial.Int, 'maxHealth']
  [Inventory, 'drops']
], {
  constructor: (@obstacle_id) ->
    if (typeof @obstacle_id is 'string')
      @obstacle_id = items.OBSTACLE_NAMES[@obstacle_id]

    @health = @maxHealth = items.OBSTACLE_TEMPLATES[@obstacle_id].health
    @drops = new Inventory(items.OBSTACLE_TEMPLATES[@obstacle_id].drops.length)
    for el, i in items.OBSTACLE_TEMPLATES[@obstacle_id].drops
      @drops.add new Item el

  topTexture: -> new Texture items.OBSTACLE_TEMPLATES[@obstacle_id].top
  sideTexture: -> new Texture items.OBSTACLE_TEMPLATES[@obstacle_id].side

  subclass: (name) ->
    (name in items.OBSTACLE_TEMPLATES[@obstacle_id].ancestors)

  translucent: -> items.OBSTACLE_TEMPLATES[@obstacle_id].translucent ? false
  passable: -> items.OBSTACLE_TEMPLATES[@obstacle_id].passable ? false

  view: -> new ObstacleView @

  use: (player, tile) -> items.OBSTACLE_TEMPLATES[@obstacle_id].use?.call @, player, tile
}

exports.ObstacleView = ObstacleView = serial.SerialType [
  [serial.Int, 'obstacle_id']
  [serial.Uint8, 'damaged']
], {
  constructor: (obstacle) ->
    if obstacle?
      @obstacle_id = obstacle.obstacle_id
      @damaged = Math.floor(obstacle.health * 4 / obstacle.maxHealth)

  top: -> new Texture items.OBSTACLE_TEMPLATES[@obstacle_id].top
  side: -> new Texture items.OBSTACLE_TEMPLATES[@obstacle_id].side

  translucent: -> items.OBSTACLE_TEMPLATES[@obstacle_id].translucent ? false
  passable: -> items.OBSTACLE_TEMPLATES[@obstacle_id].passable ? false

  equals: (other) ->
    @obstacle_id is other.obstacle_id and
    @damaged is other.damaged
}

exports.Inventory = Inventory = serial.SerialType [
  [serial.Array(Item), 'contents']
  [serial.Int, 'capacity']
], {
  constructor: (@capacity = 20) ->
    @contents = []

    @handlers = {
      change: []
    }

  on: (event, fn) ->
    @handlers[event].push fn

  counts: ->
    counts = {}
    for el, i in @contents
      counts[el.item_id] ?= 0
      counts[el.item_id] += el.count
    return counts

  length: -> @contents.length

  add: (item) ->
    for el, i in @contents
      if el.item_id is item.item_id
        el.count += item.count
        fn() for fn in @handlers.change
        return true
    if @contents.length < @capacity
      @contents.push item
      # Callbacks
      fn() for fn in @handlers.change
      return true
    else
      return false

  remove: (item) ->
    for el, i in @contents
      if el is item
        el.count--
        @contents.splice(i, 1) if el.count <= 0
        # Callbacks
        fn() for fn in @handlers.change
        return true
    return false

  removeType: (item_id) ->
    for el, i in @contents
      if el.item_id is item_id
        el.count--
        @contents.splice(i, 1) if el.count <= 0
        # Callbacks
        fn() for fn in @handlers.change
        return true
    return false

  removeIndex: (index) ->
    if index < @contents.length
      @contents[index].count--
      @contents.splice index, 1 if @contents[index].count <= 0
      # Callbacks
      fn() for fn in @handlers.change
      return true
    return false

  dump: (destination) ->
    until @contents.length is 0
      unless destination.add @contents.splice(0, 1)[0]
        return @contents.length
    return 0

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

  impassable: -> if @obstacle? then (not @obstacle.passable()) else false

  translucent: -> if @obstacle? then @obstacle.translucent() else true

  destroyObstacle: ->
    if @obstacle?
      @obstacle.drops.dump(@inventory)
      @obstacle = null

  damageObstacle: (damage) ->
    if @obstacle?
      @obstacle.health -= damage
      if @obstacle.health < 0
        @destroyObstacle()

  view: -> new TileView @

  use: (player) ->
    if @obstacle?
      @obstacle.use player, @
    else
      @terrain.use player, @
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
        @item = tile.inventory.get(0).texture()

  equals: (other) ->
    @pos.equals(other.pos) and
    @terrain.texture_id is other.terrain.texture_id and
    @obstacle? is other.obstacle? and
    ((not @obstacle?) or @obstacle.equals(other.obstacle)) and
    @item?.texture_id is other.item?.texture_id

  impassable: -> if @obstacle? then (not @obstacle.passable()) else false

  translucent: -> if @obstacle? then @obstacle.translucent() else true

  # Render works only in the browser, operates on a canvas object
  render: (canvas, ctx, cameraRotation, pos) ->
    if @obstacle?
      # Translate to the proper position
      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate cameraRotation
      ctx.translate SIZE * (@pos.x - pos.x), SIZE * (@pos.y - pos.y)

      # Draw the "bottom" square, usually invisible, possibly. TODO decide.
      #ctx.drawImage @obstacle.top().get(), -SIZE / 2, -SIZE / 2, SIZE, SIZE

      ctx.rotate -cameraRotation
      ctx.translate 0, -SIZE
      ctx.rotate cameraRotation

      # Draw the top square
      ctx.drawImage @obstacle.top().get(), -SIZE / 2, -SIZE / 2, SIZE, SIZE

      # Draw cracks if applicable
      switch @obstacle.damaged
        when 2
          ctx.drawImage CRACK_1.get(), -SIZE/2, -SIZE/2, SIZE, SIZE
        when 1
          ctx.drawImage CRACK_2.get(), -SIZE/2, -SIZE/2, SIZE, SIZE
        when 0
          ctx.drawImage CRACK_3.get(), -SIZE/2, -SIZE/2, SIZE, SIZE

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
          ctx.drawImage @obstacle.side().get(), 0, 0, SIZE, SIZE
          switch @obstacle.damaged
            when 2
              ctx.drawImage CRACK_1.get(), 0, 0, SIZE, SIZE
            when 1
              ctx.drawImage CRACK_2.get(), 0, 0, SIZE, SIZE
            when 0
              ctx.drawImage CRACK_3.get(), 0, 0, SIZE, SIZE
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

  touches: (vector) ->
    @pos.x - 0.5 < vector.x < @pos.x + 0.5 and
    @pos.y - 0.5 < vector.y < @pos.y + 0.5

  damage: (n) ->
    @health -= n

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

exports.Bullet = Bullet = serial.SerialType [
  [serial.Int, 'bullet_id']
  [serial.Int, 'lifetime']
  [Vector, 'pos']
  [Vector, 'velocity']
], {
  constructor: (@player, @item, @pos, @velocity) ->
    @lifetime = @item.bulletLifetime()

  tick: ->
    @lifetime--
    @pos.translate @velocity
    return true

  strike: (mob) -> @item.bulletStrike @player, mob

  view: -> new BulletView @
}

exports.BulletView = BulletView = serial.SerialType [
  [Vector, 'pos']
  [Vector, 'velocity']
], {
  constructor: (bullet) ->
    if bullet?
      @pos = bullet.pos
      @velocity = bullet.velocity

  tick: ->
    @lifetime--
    @pos.translate @velocity
    return true

  # Render works on the client only
  render: (canvas, ctx, cameraRotation, pos) ->
    ctx.translate canvas.width / 2, canvas.height / 2
    ctx.rotate cameraRotation
    ctx.translate SIZE * (@pos.x - pos.x), SIZE * (@pos.y - pos.y)
    ctx.rotate Math.atan2 @velocity.y, @velocity.x
    ctx.fillStyle = '#FFF'
    ctx.fillRect -SIZE, -2, SIZE, 4
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
  [serial.Array(BulletView), 'bullets']
], {
  constructor: (@tiles, @mobs, @bullets) ->
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
