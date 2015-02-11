canvas = document.getElementById 'viewport'
ctx = canvas.getContext '2d'

MOBS = []
MOB_SPEED = 0.2

assets = {}
for assetName in [
      'stone'
      'dirt'
      'grass'
      'wizard'
      'pickaxe'
      'axe'
      'tree-side'
      'tree-top'
      'wood'
      'battle-axe'
      'sword'
      'crack1'
      'crack2'
      'crack3'
      'planks'
      'tile'
      'bullet'
      'bow'
      'spear'
      'copper'
      'copper-ore'
      'dagger'
      'warrior'
      'rogue'
    ]
  assets[assetName] = document.getElementById "#{assetName}-image"

SPEED = 0.3
SIZE = 40
RANGE = 2
ITEMSIZE = 15
ITEM_DISPLAY_SIZE = 35
MOB_INVENTORY_SIZE = 20
FRAME_RATE = 50
TARGET_FLASH_TIME = 20

class IdObject
  constructor: ->
    @id = IdObject.id++

IdObject.id = 0

# VECTOR STUFF
class Vector
  constructor: (@x, @y) ->

  touches: ->
    [
      c Math.floor(@x), Math.floor(@y)
      c Math.floor(@x), Math.ceil(@y)
      c Math.ceil(@x), Math.floor(@y)
      c Math.ceil(@x), Math.ceil(@y)
    ]

  translate: (other) ->
    @x += other.x
    @y += other.y

  touchesTile: (tile) ->
    Math.abs(tile.x - @x) < 1 and
    Math.abs(tile.y - @y) < 1

  mult: (scalar) ->
    return c @x * scalar, @y * scalar

  to: (other) -> c other.x - @x, other.y - @y

  mag: -> Math.sqrt @x * @x + @y * @y

  normalize: -> @mult(1 / @mag())

  distance: (other) ->
    @to(other).mag()

  dot: (other) -> @x * other.x + @y * other.y

  scalarProject: (other) -> @dot(other) / other.mag()

  round: ->
    c Math.round(@x), Math.round(@y)

  rotate: (rot) ->
    c Math.cos(rot) * @x - Math.sin(rot) * @y, Math.sin(rot) * @x + Math.cos(rot) * @y

  clone: -> c @x, @y

c = (x, y) -> new Vector x, y
s = (x, y) -> x + ' ' + y
uns = (s) ->
  [x, y] = s.split(' ').map (n) -> Number(n)
  return c x, y

class Obstacle extends IdObject
  constructor: (@sideTexture, @topTexture) ->
    super
    @maxHealth = @health = 10
    @drops = new Inventory 1

class Terrain extends IdObject
  constructor: (@texture) ->
    super

class WoodTerrain extends Terrain
  constructor: ->
    super
    @texture = assets['wood']

class StoneTerrain extends Terrain
  constructor: ->
    super
    @texture = assets['stone']

class Item extends IdObject
  constructor: (@name, @texture) ->

Item.idMap = {}

itemType = (opts) ->
  resultantItem = class extends Item
    constructor: ->
      super
      @texture = opts.texture
      @name = opts.name
      @item_id = opts.id

      @canUseOnTile = opts.useOnTile?
      @useOnTileTime = opts.useOnTileTime ? 1000 / FRAME_RATE

      @canShoot = opts.canShoot
      @shootTime = opts.shootTime ? 1000 / FRAME_RATE
      @bullet = -> opts.bullet.call this, arguments
      if opts.constructor? then opts.constructor.call this, arguments

    useOnTile: (tile) ->
      if opts.useOnTile?
        return opts.useOnTile.call this, tile
      else
        return false

  Item.idMap[opts.id] = resultantItem

  resultantItem.name = opts.name
  resultantItem._item_name = opts.name
  resultantItem._item_texture = opts.texture
  resultantItem._item_id = opts.id

  return resultantItem

class Bullet extends IdObject
  constructor: (@shooter, @pos, vector, @template) ->
    super
    @pos = @pos.clone()
    @texture = @template.texture
    @hit = @template.hit
    @velocity = vector.normalize().mult(@template.speed)
    @ticksPassed = 0

  tick: ->
    @ticksPassed += 1
    @pos.translate @velocity
    # Check collision. May need board usage or quadtree if this gets slowsaw
    for mob in MOBS when mob isnt @shooter
      if @pos.touchesTile(mob.pos)
        @hit mob
        return true
    if @template.tick?
      return @template.tick.call this, arguments
    else
      return (@ticksPassed * 1000 / FRAME_RATE) >= @template.duration


  render: (ctx) ->
    ctx.translate canvas.width / 2, canvas.height / 2
    ctx.rotate PLAYER.cameraRotation
    ctx.translate SIZE * @pos.x - PLAYER.pos.x * SIZE, SIZE * @pos.y - PLAYER.pos.y * SIZE
    ctx.rotate Math.atan2 @velocity.y, @velocity.x
    ctx.drawImage @texture, -SIZE / 2, -SIZE / 2, SIZE, SIZE
    ctx.resetTransform()

# Stone
class StoneObstacle extends Obstacle
  constructor: ->
    super assets['stone'], assets['stone']
    @drops.push new Stone()

Stone = itemType
  texture: assets['stone']
  name: 'Stone'
  id: 0

  useOnTileTime: 500
  useOnTile: (tile) ->
    if tile.obstacle?
      return false
    else
      tile.obstacle = new StoneObstacle()

      # Now consumed:
      return true

# Copper
class CopperObstacle extends StoneObstacle
  constructor: ->
    super
    @topTexture = @sideTexture = assets['copper']
    @drops.clear()
    @drops.push new Copper()

Copper = itemType
  texture: assets['copper-ore']
  name: 'Copper ore'
  id: 10

# Dirt
class TreeObstacle extends Obstacle
  constructor: ->
    super assets['tree-side'], assets['tree-top']
    @drops.push new Wood()

class WoodObstacle extends Obstacle
  constructor: ->
    super assets['wood'], assets['wood']
    @drops.push new Wood()

Wood = itemType
  texture: assets['wood']
  name: 'Wood'
  id: 1

  useOnTileTime: 500
  useOnTile: (tile) ->
    if tile.obstacle?
      return false
    else
      tile.obstacle = new WoodObstacle()

      # Now consumed:
      return true

WoodPlank = itemType
  texture: assets['planks']
  name: 'Wood plank'
  id: 6
  useOnTileTime: 500
  useOnTile: (tile) ->
    if tile.obstacle? or tile.terrain instanceof WoodTerrain
      return false
    else
      tile.terrain = new WoodTerrain()

      # Now consumed:
      return true

StoneTile = itemType
  texture: assets['tile']
  name: 'Stone tile'
  id: 7
  useOnTileTime: 500
  useOnTile: (tile) ->
    if tile.obstacle? or tile.terrain instanceof StoneTerrain
      return false
    else
      tile.terrain = new StoneTerrain()

      # Now consumed:
      return true

# Pickaxe
Pickaxe = itemType
  texture: assets['pickaxe']
  name: 'Pickaxe'
  id: 2

  constructor: ->
    @quality = 3 # Not so good axe

  useOnTileTime: 700
  useOnTile: (tile) ->
    if tile.obstacle?
      if (tile.obstacle instanceof StoneObstacle)
        tile.damageObstacle @quality
      else
        tile.damageObstacle @quality / 5

    # Not consumed:
    return false

# Axe
Axe = itemType
  texture: assets['axe']
  name: 'Axe'
  id: 3

  constructor: ->
    @quality = 3 # Not so good axe

  useOnTileTime: 500
  useOnTile: (tile) ->
    if tile.obstacle?
      if (tile.obstacle instanceof TreeObstacle or tile.obstacle instanceof WoodObstacle)
        tile.damageObstacle @quality
      else
        tile.damageObstacle @quality / 10

    # Not consumed:
    return false

# Battle-Axe
BattleAxe = itemType
  texture: assets['battle-axe']
  name: 'Battle-Axe'
  id: 4

  canShoot: true
  shootTime: 1000
  bullet: ->
    texture: assets['bullet']
    speed: 0.3
    duration: 200
    hit: (mob) =>
      mob.damage 5

Spear = itemType
  texture: assets['spear']
  name: 'Spear'
  id: 9

  canShoot: true
  shootTime: 700
  bullet: ->
    texture: assets['bullet']
    speed: 0.5
    duration: 100
    hit: (mob) =>
      mob.damage 3

Sword = itemType
  texture: assets['sword']
  name: 'Sword'
  id: 5

  constructor: ->

  canShoot: true
  shootTime: 500
  bullet: ->
    texture: assets['bullet']
    speed: 0.5
    duration: 100
    hit: (mob) =>
      mob.damage 4

Dagger = itemType
  texture: assets['dagger']
  name: 'Dagger'
  id: 11

  constructor: ->

  canShoot: true
  shootTime: 150
  bullet: ->
    texture: assets['bullet']
    speed: 1
    duration: 30
    hit: (mob) =>
      mob.damage 1

Bow = itemType
  texture: assets['bow']
  name: 'Bow'
  id: 8

  constructor: ->

  canShoot: true
  shootTime: 1000
  bullet: ->
    texture: assets['bullet']
    speed: 0.7
    duration: 500
    hit: (mob) =>
      mob.damage 2

class Recipe
  constructor: (@needs, @creates) ->

  canWork: (inventory) ->
    for key, val of @needs
      unless key of inventory.counts and inventory.counts[key] >= val
        return false

    return true

  attempt: (inventory) ->
    if @canWork inventory
      for key, val of @needs
        inventory.removeType(Number(key)) for i in [0...val]
      inventory.push new Item.idMap[created]() for created in @creates
    else
      return false

RECIPES = [
  new Recipe {1: 3, 10: 2}, [2] # 3 Wood + 2 Copper = 1 Pickaxe
  new Recipe {1: 3, 10: 2}, [3] # 3 Wood + 2 Copper = 1 Axe
  new Recipe {3: 2}, [4] # 2 Axe = 1 Battle-Axe
  new Recipe {1: 1, 10: 4}, [5] # 1 Wood + 4 Copper = 1 Sword
  new Recipe {1: 1}, [6, 6, 6] # 1 Wood = 3 Wood plank
  new Recipe {0: 1}, [7, 7] # 1 Stone = 2 Stone tile
  new Recipe {1: 5}, [8] # 5 Wood = 1 Bow
  new Recipe {1: 4, 0: 1}, [9] # 4 Wood + 1 Stone = 1 Spear
  new Recipe {1: 1, 10: 1}, [11] # 1 Wood + 1 Copper = 1 Dagger
]

class Tile extends IdObject
  constructor: (@board, @pos, @terrain, @obstacle) ->
    super
    @seen = false
    @inventory = new Inventory 20

  destroyObstacle: ->
    if @obstacle?
      for el in @obstacle.drops.contents
        @inventory.push el
      @obstacle = null

  damageObstacle: (damage) ->
    if @obstacle?
      @obstacle.health -= damage
      if @obstacle.health < 0
        @destroyObstacle()

  render: (ctx) ->
    if @obstacle?
      obstacleHealth = @obstacle.health / @obstacle.maxHealth

      # Translate to the proper position
      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate PLAYER.cameraRotation
      ctx.translate SIZE * @pos.x - PLAYER.pos.x * SIZE, SIZE * @pos.y - PLAYER.pos.y * SIZE
      ctx.rotate -PLAYER.cameraRotation
      ctx.translate 0, -SIZE
      ctx.rotate PLAYER.cameraRotation

      # Draw the top qquare
      ctx.drawImage @obstacle.topTexture, -SIZE / 2, -SIZE / 2, SIZE, SIZE

      # Draw cracks if applicable
      if 0.5 < obstacleHealth <= 0.7
        ctx.drawImage assets['crack1'], -SIZE/2, -SIZE/2, SIZE, SIZE
      else if 0.3 < obstacleHealth <= 0.5
        ctx.drawImage assets['crack2'], -SIZE/2, -SIZE/2, SIZE, SIZE
      else if obstacleHealth <= 0.3
        ctx.drawImage assets['crack3'], -SIZE/2, -SIZE/2, SIZE, SIZE

      # Draw each of the four sides, when applicable.
      # Tis entails doing a horizontal scaling and then
      # a skew transformation.
      #
      # The percieved width of a side is always cos(r), where r
      # is the amount of PLAYER.cameraRotation from flat. Since the
      # length of the slanted side must always remain 1, this means
      # that we need to skew by sin(r).
      drawCorner = (n) =>
        if ((PLAYER.cameraRotation + n) %% (2 * Math.PI)) < Math.PI
          ctx.save()
          ctx.rotate -PLAYER.cameraRotation
          ctx.transform Math.cos(PLAYER.cameraRotation + n + Math.PI / 2), Math.sin(PLAYER.cameraRotation + n + Math.PI / 2), 0, 1, 0, 0
          ctx.drawImage @obstacle.sideTexture, 0, 0, SIZE, SIZE
          # Draw cracks if applicable
          if 0.5 < obstacleHealth <= 0.7
            ctx.drawImage assets['crack1'], 0, 0, SIZE, SIZE
          else if 0.3 < obstacleHealth <= 0.5
            ctx.drawImage assets['crack2'], 0, 0, SIZE, SIZE
          else if obstacleHealth <= 0.3
            ctx.drawImage assets['crack3'], 0, 0, SIZE, SIZE
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
      img = @terrain.texture

      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate PLAYER.cameraRotation
      ctx.translate SIZE * @pos.x - PLAYER.pos.x * SIZE, SIZE * @pos.y - PLAYER.pos.y * SIZE
      ctx.drawImage img, -SIZE / 2, -SIZE / 2, SIZE, SIZE
      # Draw first thing in the inventory, if existent
      ctx.rotate -PLAYER.cameraRotation
      if @inventory.contents.length > 0
        ctx.drawImage @inventory.contents[@inventory.contents.length - 1].texture,
          -ITEMSIZE / 2, -ITEMSIZE / 2, ITEMSIZE, ITEMSIZE
      ctx.resetTransform()

  passable: -> @obstacle?

# A RememberedTile knows nothinge except how to render itself.
class RememberedTile extends IdObject
  constructor: ->
    @pos = c 0, 0

  update: (tile) ->
    @obstacle = tile.obstacle?
    @pos.x = tile.pos.x
    @pos.y = tile.pos.y
    if @obstacle
      @sideTexture = tile.obstacle.sideTexture
      @topTexture = tile.obstacle.topTexture
      @obstacleHealth = tile.obstacle.health / tile.obstacle.maxHealth
    else
      @texture = tile.terrain.texture

  render: (ctx) ->
    if @obstacle
      # Translate to the proper position
      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate PLAYER.cameraRotation
      ctx.translate SIZE * @pos.x - PLAYER.pos.x * SIZE, SIZE * @pos.y - PLAYER.pos.y * SIZE
      ctx.rotate -PLAYER.cameraRotation
      ctx.translate 0, -SIZE
      ctx.rotate PLAYER.cameraRotation

      # Draw the top qquare
      ctx.drawImage @topTexture, -SIZE / 2, -SIZE / 2, SIZE, SIZE

      # Draw cracks if applicable
      if 0.5 < @obstacleHealth <= 0.7
        ctx.drawImage assets['crack1'], -SIZE/2, -SIZE/2, SIZE, SIZE
      else if 0.3 < @obstacleHealth <= 0.5
        ctx.drawImage assets['crack2'], -SIZE/2, -SIZE/2, SIZE, SIZE
      else if @obstacleHealth <= 0.3
        ctx.drawImage assets['crack3'], -SIZE/2, -SIZE/2, SIZE, SIZE

      # Draw each of the four sides, when applicable.
      # Tis entails doing a horizontal scaling and then
      # a skew transformation.
      #
      # The percieved width of a side is always cos(r), where r
      # is the amount of PLAYER.cameraRotation from flat. Since the
      # length of the slanted side must always remain 1, this means
      # that we need to skew by sin(r).
      drawCorner = (n) =>
        if ((PLAYER.cameraRotation + n) %% (2 * Math.PI)) < Math.PI
          ctx.save()
          ctx.rotate -PLAYER.cameraRotation
          ctx.transform Math.cos(PLAYER.cameraRotation + n + Math.PI / 2), Math.sin(PLAYER.cameraRotation + n + Math.PI / 2), 0, 1, 0, 0
          ctx.drawImage @sideTexture, 0, 0, SIZE, SIZE
          # Draw cracks if applicable
          if 0.5 < @obstacleHealth <= 0.7
            ctx.drawImage assets['crack1'], 0, 0, SIZE, SIZE
          else if 0.3 < @obstacleHealth <= 0.5
            ctx.drawImage assets['crack2'], 0, 0, SIZE, SIZE
          else if @obstacleHealth <= 0.3
            ctx.drawImage assets['crack3'], 0, 0, SIZE, SIZE
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
      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate PLAYER.cameraRotation
      ctx.translate SIZE * @pos.x - PLAYER.pos.x * SIZE, SIZE * @pos.y - PLAYER.pos.y * SIZE
      ctx.drawImage @texture, -SIZE / 2, -SIZE / 2, SIZE, SIZE
      ctx.resetTransform()

class Inventory extends IdObject
  constructor: (@size) ->
    super
    @contents = []
    @handlers = {
      'change': []
    }
    @counts = {}

  clear: ->
    @contents.length = 0
    @counts = {}
    fn() for fn in @handlers.change

  push: (item) ->
    if @contents.length >= @size
      return false
    else
      @contents.push item
      @counts[item.item_id] ?= 0
      @counts[item.item_id] += 1
      fn() for fn in @handlers.change
      return true

  remove: (item) ->
    for el, i in @contents
      if el is item
        @contents.splice i, 1
        @counts[item.item_id] -= 1
        fn() for fn in @handlers.change
        return item
    return null

  removeType: (id) ->
    for el, i in @contents
      if el.item_id is id
        @contents.splice i, 1
        @counts[id] -= 1
        fn() for fn in @handlers.change
        return el
    return null

  on: (event, fn) ->
    @handlers[event] ?= []
    @handlers[event].push fn

class Mob extends IdObject
  constructor: (@board) ->
    super
    @pos = c 0, 0
    @inventory = new Inventory MOB_INVENTORY_SIZE
    @health = 10
    @handlers = {
      'status-change': []
    }

  tick: ->

  on: (event, fn) ->
    @handlers[event]?.push fn

  render: (ctx)->
    ctx.translate canvas.width / 2, canvas.height / 2
    ctx.rotate PLAYER.cameraRotation
    ctx.translate SIZE * (@pos.x - PLAYER.pos.x), SIZE * (@pos.y - PLAYER.pos.y)
    ctx.strokeStyle = '#F00'
    ctx.strokeRect -SIZE / 2, -SIZE / 2, SIZE, SIZE
    ctx.rotate -PLAYER.cameraRotation
    ctx.drawImage @texture, -SIZE/2, -SIZE, SIZE, SIZE
    ctx.resetTransform()

  kill: ->
    console.log @board.get(@pos.round())
    targetInventory = @board.get(@pos.round()).inventory
    targetInventory.push item for item in @inventory.contents

  damage: (damage) ->
    @health -= damage
    fn() for fn in @handlers['status-change']
    if @health < 0
      @kill()
      return true
    else
      return false

class Wanderer extends Mob
  constructor: (@board) ->
    super
    @currentDirection = Math.random() * 2 * Math.PI
    @lastShotTime = new Date()

  tick: ->
    translateOKComponent @pos, c(Math.sin(@currentDirection), Math.cos(@currentDirection)).mult(MOB_SPEED)
    unless 0 < @pos.x < @board.dimensions.x and 0 < @pos.y < @board.dimensions.y
      @currentDirection *= -1
    if Math.random() < 0.01
      @currentDirection = Math.random() * 2 * Math.PI

    if @inventory.contents.length > 0 and (new Date()) - @lastShotTime > @inventory.contents[0].shootTime
      BULLETS.push new Bullet @, @pos, @pos.to(PLAYER.pos), @inventory.contents[0].bullet()
      @lastShotTime = new Date()

class Warrior extends Wanderer
  constructor: ->
    super
    @health = 20
    @texture = assets['warrior']
    @inventory.push new Sword()

class Rogue extends Wanderer
  constructor: ->
    super
    @texture = assets['rogue']
    @inventory.push new Dagger()

class Player extends Mob
  constructor: (@board) ->
    super
    @cameraRotation = Math.PI / 4
    @seen = {}
    @usingItem = 0
    @health = 100
    @texture = assets['wizard']

  tick: ->
    if @health < 100
      @health += 0.01

  drawPerspective: (ctx) ->
    # Clear canvas
    ctx.clearRect 0, 0, canvas.width, canvas.height

    # Get all renderable tiles
    renderables = @board.getTileArea @pos, canvas.width * Math.sqrt(2) / (2 * SIZE) + 1

    # Determine which of the tiles we can see
    visible = @board.shadowcast @pos, ((n) -> not n.passable()), 250 * Math.sqrt(2) / SIZE + 1

    dir = c Math.sin(@cameraRotation), Math.cos(@cameraRotation)
    assumedPositions = {}

    best = -Infinity
    for tile in PLAYER.pos.touches()
      distance = PLAYER.pos.to(tile).scalarProject(dir)
      if distance > best
        assumedPositions[PLAYER.id] = tile
        best = distance

    # Add the bullets to the things that need to be rendered
    for bullet in BULLETS when BOARD.get(bullet.pos.round()).id of visible
      renderables.push bullet
      best = -Infinity
      for tile in bullet.pos.touches()
        distance = PLAYER.pos.to(tile).scalarProject(dir)
        if distance > best
          assumedPositions[bullet.id] = tile
          best = distance

    # Add the mobs to the things that need to be rendered
    for mob in MOBS when BOARD.get(mob.pos.round()).id of visible
      renderables.push mob
      best = -Infinity
      for tile in mob.pos.touches()
        distance = PLAYER.pos.to(tile).scalarProject(dir)
        if distance > best
          assumedPositions[mob.id] = tile
          best = distance

    # Sort those renderables by their center positions
    # relative to our rotation, so that the ones at the end of the
    # array appear "farther" to us
    renderables.sort (a, b) =>
      if (a instanceof Mob or a instanceof Bullet) and (b instanceof Tile)
        if @pos.to(assumedPositions[a.id]).scalarProject(dir) >= @pos.to(b.pos).scalarProject(dir)
          return 1
        else
          return -1
      else if (a instanceof Tile) and (b instanceof Mob or b instanceof Bullet)
        if @pos.to(a.pos).scalarProject(dir) > @pos.to(assumedPositions[b.id]).scalarProject(dir)
          return 1
        else
          return -1
      else
        if @pos.to(a.pos).scalarProject(dir) > @pos.to(b.pos).scalarProject(dir)
          return 1
        else
          return -1

    # Render all the renderables in order
    for renderable in renderables
      if renderable.id of visible
        @seen[renderable.id] ?= new RememberedTile()
        @seen[renderable.id].update renderable
        renderable.render ctx
      else if renderable.id of @seen
        ctx.globalAlpha = 0.5
        @seen[renderable.id].render ctx
        ctx.globalAlpha = 1
      else if renderable instanceof Mob or renderable instanceof Bullet
        renderable.render ctx

    # Draw the target square
    ctx.translate canvas.width / 2, canvas.height / 2
    ctx.rotate @cameraRotation
    target = @getTarget()
    ctx.strokeStyle = if TARGET_FLASHING then '#000' else '#FF0'
    ctx.strokeRect (target.pos.x - @pos.x) * SIZE - SIZE/2, (target.pos.y - @pos.y) * SIZE - SIZE/2, SIZE, SIZE
    ctx.resetTransform()

  getTarget: ->
    candidates = @board.getCoordinateArea @pos, RANGE
    best = null; min = Infinity
    for candidate in candidates
      if candidate.distance(MOUSE_POS) < min and candidate.distance(@pos) <= RANGE
        best = candidate; min = candidate.distance(MOUSE_POS)
    return @board.get best.x, best.y

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

class Board extends IdObject
  constructor: (@dimensions) ->
    super
    @cells = ((new Tile(@, c(i, j), null, null) for j in [0...@dimensions.y]) for i in [0...@dimensions.x])

  getCircle: ({x, y}, r) ->
    x = Math.round(x); y = Math.round(y)
    r = Math.ceil r
    coords = []
    for i in [0...r * 2]
      coords.push c x - r, y + r - i
    for i in [0...r * 2]
      coords.push c x - r + i, y - r
    for i in [0...r * 2]
      coords.push c x + r, y - r + i
    for i in [0...r * 2]
      coords.push c x + r - i, y + r

    return coords

  getCoordinateArea: (coord, max) ->
    all = [coord.round()]
    for r in [0..max]
      circle = @getCircle coord, r
      for el in circle when 0 <= el.x < @dimensions.x and 0 <= el.y < @dimensions.y
        all.push el
    return all

  getTileArea: (coord, max) -> @getCoordinateArea(coord, max).map (x) => @get(x)

  shadowcast: (coord, see, max = 10) ->
    coord = coord.round()

    visible = {}
    queue = new ShadowQueue()
    r = 0

    visible[@get(coord).id] = true

    until r >= max
      r++
      circle = @getCircle coord,  r
      for {x, y}, i in circle when 0 <= x < @dimensions.x and 0 <= y < @dimensions.y
        start = 360 * (2 * i - 1 %% (2 * circle.length)) / (2 * circle.length)
        end = 360 * (2 * i + 1 %% (2 * circle.length)) / (2 * circle.length)

        if queue.check(start, end) is ShadowQueue.PARTIAL
          visible[@cells[x][y].id] = false
        else if queue.check(start, end) is ShadowQueue.NONE
          visible[@cells[x][y].id] = true
        unless see @cells[x][y]
          queue.emplace start, end

    return visible

  allCells: ->
    strs = ('' for i in [0...@dimensions.height])
    for col, i in @cells
      for cell, j in col
        strs[j] += cell.charRepr()
    return strs.join '\n'

  get: (coord, opt_y) ->
    if opt_y?
      x = coord; y = opt_y
    else
      {x, y} = coord
    if 0 <= x < @dimensions.x and 0 <= y < @dimensions.y
      return @cells[x][y]
    else
      return null

canvas.addEventListener 'mousewheel', (event) ->
  if event.wheelDelta > 0
    PLAYER.cameraRotation += 0.1
  else
    PLAYER.cameraRotation -= 0.1

keysdown = {}
document.body.addEventListener 'keydown', (event) ->
  keysdown[event.which] = true

  if event.which is 90
    item = PLAYER.inventory.contents[PLAYER.usingItem]
    PLAYER.inventory.remove item
    BOARD.get(PLAYER.pos.round()).inventory.push item
    if PLAYER.inventory.contents.length <= PLAYER.usingItem
      PLAYER.usingItem = PLAYER.inventory.contents.length - 1
      redrawInventory()
  else if event.which is 88
    playerTile = BOARD.get PLAYER.pos.round()
    flagForPickup = []
    for el, i in playerTile.inventory.contents
      flagForPickup.push el
    for el, i in flagForPickup
      if PLAYER.inventory.push el
        playerTile.inventory.remove el

document.body.addEventListener 'keyup', (event) ->
  keysdown[event.which] = false

translateOKComponent = (pos, v) ->
  if v.x > 0 and (
      BOARD.get(Math.ceil(pos.x + v.x), Math.floor(pos.y))?.passable?() or
      BOARD.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y))?.passable?()
    )
    pos.x = Math.ceil pos.x
  else if v.x < 0 and (
      BOARD.get(Math.floor(pos.x + v.x), Math.floor(pos.y))?.passable?() or
      BOARD.get(Math.floor(pos.x + v.x), Math.ceil(pos.y))?.passable?()
    )
    pos.x = Math.floor pos.x
  else
    pos.x += v.x
  if v.y > 0 and (
      BOARD.get(Math.floor(pos.x), Math.ceil(pos.y + v.y))?.passable?() or
      BOARD.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y))?.passable?()
    )
    pos.y = Math.ceil pos.y
  else if v.y < 0 and (
      BOARD.get(Math.floor(pos.x), Math.floor(pos.y + v.y))?.passable?() or
      BOARD.get(Math.ceil(pos.x), Math.floor(pos.y + v.y))?.passable?()
    )
    pos.y = Math.floor pos.y
  else
    pos.y += v.y

RAW_MOUSE_POS = c 0, 0
MOUSE_POS = c 0, 0
canvas.addEventListener 'mousemove', (ev) ->
  RAW_MOUSE_POS = c ev.offsetX - canvas.width / 2, ev.offsetY - canvas.width / 2
  updateMousePos()

updateMousePos = ->
  MOUSE_POS = RAW_MOUSE_POS.rotate(-PLAYER.cameraRotation).mult 1 / SIZE
  MOUSE_POS.translate PLAYER.pos

MOUSEDOWN = false
canvas.addEventListener 'mousedown', (ev) ->
  MOUSEDOWN = true
canvas.addEventListener 'mouseup', (ev) ->
  MOUSEDOWN = false

BULLETS = []

TARGET_FLASHING = false
toolUseTick = ->
  if MOUSEDOWN
    best = PLAYER.getTarget()
    if best.pos.distance(PLAYER.pos) >= 1
      item = PLAYER.inventory.contents[PLAYER.usingItem]
      if item? and item.canUseOnTile
        # Flash the target red
        TARGET_FLASHING = true
        setTimeout (-> TARGET_FLASHING = false), TARGET_FLASH_TIME

        # Update inventory if consumed
        if item.useOnTile best
            PLAYER.inventory.remove item
            if PLAYER.inventory.contents.length <= PLAYER.usingItem
              PLAYER.usingItem = PLAYER.inventory.contents.length - 1
              redrawInventory()
        setTimeout toolUseTick, item.useOnTileTime
        return
      else if item? and item.canShoot
        BULLETS.push new Bullet PLAYER, PLAYER.pos, PLAYER.pos.to(MOUSE_POS), item.bullet()
        setTimeout toolUseTick, item.shootTime
        return
  setTimeout toolUseTick, 1000 / FRAME_RATE

healthBar = document.getElementById 'health-bar'
healthIndicator = document.getElementById 'health-indicator'
tick = ->
  # Player movement
  if keysdown[87]
    translateOKComponent PLAYER.pos, c(Math.sin(PLAYER.cameraRotation), Math.cos(PLAYER.cameraRotation)).mult(-SPEED)
  if keysdown[83]
    translateOKComponent PLAYER.pos, c(Math.sin(PLAYER.cameraRotation), Math.cos(PLAYER.cameraRotation)).mult(SPEED)
  if keysdown[65]
    translateOKComponent PLAYER.pos, c(-Math.cos(PLAYER.cameraRotation), Math.sin(PLAYER.cameraRotation)).mult(SPEED)
  if keysdown[68]
    translateOKComponent PLAYER.pos, c(-Math.cos(PLAYER.cameraRotation), Math.sin(PLAYER.cameraRotation)).mult(-SPEED)
  updateMousePos()

  healthBar.style.width = Math.round(190 * PLAYER.health / 100) + 'px'
  healthIndicator.innerText = "HP: #{Math.round(PLAYER.health)}/100"

  # Bullet movement
  BULLETS = BULLETS.filter (x) -> not x.tick()

  # Mob movement
  MOBS = MOBS.filter (x) ->
    x.tick()
    if x.health <= 0
      return false
    else
      return true

  PLAYER.drawPerspective ctx

  if PLAYER.health > 0
    setTimeout tick, 1000 / FRAME_RATE
  else
    ctx.font = '40px Arial'
    ctx.fillText 'You die...', (canvas.width / 2 - ctx.measureText('You die...').width / 2), canvas.height / 2

# Generate board
BOARD = new Board c(500, 500)

for [1...200]
  for tile in BOARD.getTileArea(
      c(Math.floor(Math.random() * 500), Math.floor(Math.random() * 200)),
      Math.ceil(Math.random() * 3) + 1)
    tile.obstacle = new CopperObstacle()

# The caverns, generated by Game of Life
oldFlags = (((Math.random() < 0.3) for y in [0...250]) for [0...500])
newFlags = ((false for y in [0...250]) for [0...500])

for [1..30]
  for col, x in oldFlags
    for cell, y in col
      aliveNeighbors = 0
      aliveNeighbors++ for neighbor in [oldFlags[x + 1]?[y],
        oldFlags[x]?[y + 1],
        oldFlags[x + 1]?[y + 1],
        oldFlags[x + 1]?[y - 1],
        oldFlags[x - 1]?[y + 1],
        oldFlags[x - 1]?[y - 1],
        oldFlags[x - 1]?[y],
        oldFlags[x]?[y - 1]] when neighbor

      if aliveNeighbors in [2, 3]
        newFlags[x][y] = true
      else
        newFlags[x][y] = false

  for col, x in newFlags
    for cell, y in col
      oldFlags[x][y] = cell

for col, x in oldFlags
  for cell, y in col
    if cell
      BOARD.cells[x][y].terrain = new Terrain assets['dirt']
      BOARD.cells[x][y].obstacle ?= new StoneObstacle()
    else
      BOARD.cells[x][y].terrain = new Terrain assets['dirt']
      BOARD.cells[x][y].obstacle = null


# The forests, which get thicker as you go out
for x in [0...500]
  for y in [250...500]
    if Math.random() < 0.05 * 20 ** (y / 250 - 1)
      BOARD.cells[x][y].obstacle = new TreeObstacle()
      BOARD.cells[x][y].terrain = new Terrain assets['dirt']
    else
      BOARD.cells[x][y].terrain = new Terrain assets['grass']

# Add some enemies
MOBS = []
for [1..100]
  if Math.random() < 0.5
    mob = new Warrior BOARD
  else
    mob = new Rogue BOARD
  mob.pos = c(Math.random() * 100 - 50 + 250, Math.random() * 100 - 50 + 250)
  MOBS.push mob

# Make player
PLAYER = new Player BOARD
PLAYER.pos = c(250, 250)
PLAYER.cameraRotation = Math.PI / 4
MOBS.push PLAYER

# Make the inventory list UI
inventoryList = document.getElementById 'inventory-list'

# Populate the inventory list
inventoryTable = document.createElement 'table'
inventoryList.appendChild inventoryTable
inventoryCanvases = []

for i in [0...4]
  tr = document.createElement 'tr'
  for j in [0...5] then do (i, j) ->
    td = document.createElement 'td'
    inventoryCanvas = document.createElement 'canvas'
    inventoryCanvas.width = inventoryCanvas.height = ITEM_DISPLAY_SIZE
    inventoryCanvas.style.borderRadius = '2px'
    inventoryCanvas.className = 'inventory-canvas'
    inventoryCanvases.push inventoryCanvas
    td.appendChild inventoryCanvas
    td.addEventListener 'click', ->
      if inventoryCanvases[PLAYER.usingItem]?
        inventoryCanvases[PLAYER.usingItem].style.outline = 'none'
      PLAYER.usingItem = i * 5 + j
      inventoryCanvas.style.outline = '1px solid #FF0'
    tr.appendChild td
  inventoryTable.appendChild tr

$('.inventory-canvas').tooltipster()

redrawInventory = ->
  for i in [0...20]
    iCtx = inventoryCanvases[i].getContext '2d'
    iCtx.clearRect 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE
    if PLAYER.inventory.contents[i]?
      iCtx.drawImage PLAYER.inventory.contents[i].texture, 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE
      $(inventoryCanvases[i]).tooltipster 'content', PLAYER.inventory.contents[i].name
    else
      $(inventoryCanvases[i]).tooltipster 'content', ''

    if i is PLAYER.usingItem
      inventoryCanvases[i].style.outline = '1px solid #FF0'
    else
      inventoryCanvases[i].style.outline = 'none'

  renderRecipes()

getRecipes = -> RECIPES.filter (recipe) -> recipe.canWork PLAYER.inventory

recipeList = document.getElementById 'recipe-list'
renderRecipes = ->
  recipeList.innerHTML = ''
  recipes = getRecipes()
  for recipe in recipes then do (recipe) ->
    icon = document.createElement 'canvas'
    icon.width = icon.height = ITEM_DISPLAY_SIZE
    icon.style.backgroundColor = '#FFF'
    icon.style.borderRadius = '2px'
    icon.className = 'recipe-canvas'

    icon.addEventListener 'click', ->
      recipe.attempt PLAYER.inventory

    icon.getContext('2d').drawImage Item.idMap[recipe.creates[0]]._item_texture, 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE
    recipeList.appendChild icon

PLAYER.inventory.on 'change', redrawInventory

PLAYER.inventory.push new Pickaxe()
PLAYER.inventory.push new Axe()
PLAYER.inventory.push new Spear()

tick()
toolUseTick()
