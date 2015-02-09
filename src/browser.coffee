canvas = document.getElementById 'viewport'
ctx = canvas.getContext '2d'

stone = document.getElementById 'stone-image'
dirt = document.getElementById 'dirt-image'
grass = document.getElementById 'grass-image'
wiz = document.getElementById 'wizard-image'
pickaxe = document.getElementById 'pickaxe-image'
axe = document.getElementById 'axe-image'
treeSide = document.getElementById 'tree-side-image'
treeTop = document.getElementById 'tree-top-image'
wood = document.getElementById 'wood-image'
battleaxe = document.getElementById 'battle-axe-image'
sword = document.getElementById 'sword-image'

SPEED = 0.3
SIZE = 40
RANGE = 2
ITEMSIZE = 15
ITEM_DISPLAY_SIZE = 35
MOB_INVENTORY_SIZE = 20

class IdObject
  constructor: ->
    @id = IdObject.id++

IdObject.id = 0

# VECTOR STUFF
class Vector
  constructor: (@x, @y) ->

  translate: (other) ->
    @x += other.x
    @y += other.y

  mult: (scalar) ->
    return c @x * scalar, @y * scalar

  to: (other) -> c other.x - @x, other.y - @y

  mag: -> Math.sqrt @x * @x + @y * @y

  distance: (other) ->
    @to(other).mag()

  dot: (other) -> @x * other.x + @y * other.y

  scalarProject: (other) -> @dot(other) / other.mag()

  round: ->
    c Math.round(@x), Math.round(@y)

  rotate: (rot) ->
    c Math.cos(rot) * @x - Math.sin(rot) * @y, Math.sin(rot) * @x + Math.cos(rot) * @y

c = (x, y) -> new Vector x, y
s = (x, y) -> x + ' ' + y
uns = (s) ->
  [x, y] = s.split(' ').map (n) -> Number(n)
  return c x, y

class Obstacle extends IdObject
  constructor: (@sideTexture, @topTexture) ->
    super
    @drops = new Inventory 1

class Terrain extends IdObject
  constructor: (@texture) ->
    super

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
      if opts.constructor? then opts.constructor.call this, arguments

    useOnTile: (tile) ->
      if opts.useOnTile?
        opts.useOnTile.call this, tile

  Item.idMap[opts.id] = resultantItem

  resultantItem.name = opts.name
  resultantItem._item_name = opts.name
  resultantItem._item_texture = opts.texture
  resultantItem._item_id = opts.id

  return resultantItem

# Stone
class StoneObstacle extends Obstacle
  constructor: ->
    super stone, stone
    @drops.push new Stone()

Stone = itemType
  texture: stone
  name: 'Stone'
  id: 0

  useOnTile: (tile) ->
    if tile.obstacle?
      return false
    else
      tile.obstacle = new StoneObstacle()

      # Now consumed:
      return true

# Dirt
class TreeObstacle extends Obstacle
  constructor: ->
    super treeSide, treeTop
    @drops.push new Wood()

class WoodObstacle extends Obstacle
  constructor: ->
    super wood, wood
    @drops.push new Wood()

Wood = itemType
  texture: wood
  name: 'Wood'
  id: 1

  useOnTile: (tile) ->
    if tile.obstacle?
      return false
    else
      tile.obstacle = new WoodObstacle()

      # Now consumed:
      return true

# Pickaxe
Pickaxe = itemType
  texture: pickaxe
  name: 'Pickaxe'
  id: 2

  constructor: ->
    @quality = 0.3 # Not so good axe

  useOnTile: (tile) ->
    if tile.obstacle?
      if (tile.obstacle instanceof StoneObstacle)
        if Math.random() < @quality
          tile.destroyObstacle()
      else if Math.random() < @quality / 10
        tile.destroyObstacle()

    # Not consumed:
    return false

# Axe
Axe = itemType
  texture: axe
  name: 'Axe'
  id: 3

  constructor: ->
    @quality = 0.3 # Not so good axe

  useOnTile: (tile) ->
    if tile.obstacle?
      if (tile.obstacle instanceof TreeObstacle or tile.obstacle instanceof WoodObstacle)
        if Math.random() < @quality
          tile.destroyObstacle()
      else if Math.random() < @quality / 10
        tile.destroyObstacle()

    # Not consumed:
    return false

# Battle-Axe
BattleAxe = itemType
  texture: battleaxe
  name: 'Battle-Axe'
  id: 4

  constructor: ->
    @quality = 0.5

Word = itemType
  texture: sword
  name: 'Sword'
  id: 5

  constructor: ->
    @quality = 0.5

class Recipe
  constructor: (@needs, @creates) ->

  canWork: (inventory) ->
    console.log inventory.counts, @needs
    for key, val of @needs
      unless key of inventory.counts and inventory.counts[key] >= val
        return false

    return true

  attempt: (inventory) ->
    if @canWork inventory
      for key, val of @needs
        inventory.removeType(Number(key)) for i in [0...val]
      inventory.push new Item.idMap[@creates]()
    else
      return false

RECIPES = [
  new Recipe {1: 3, 0: 2}, 2 # 3 Wood + 2 Stone = 1 Pickaxe
  new Recipe {1: 3, 0: 2}, 3 # 3 Wood + 2 Stone = 1 Axe
  new Recipe {3: 2}, 4 # 2 Axe = 1 Battle-Axe
  new Recipe {1: 1, 0: 4}, 5 # 1 Wood + 4 Stone = 1 Sword
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

  render: (ctx) ->
    if @obstacle?
      # Translate to the proper position
      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate PLAYER.cameraRotation
      ctx.translate SIZE * @pos.x - PLAYER.pos.x * SIZE, SIZE * @pos.y - PLAYER.pos.y * SIZE
      ctx.rotate -PLAYER.cameraRotation
      ctx.translate 0, -SIZE
      ctx.rotate PLAYER.cameraRotation

      # Draw the top qquare
      ctx.drawImage @obstacle.topTexture, -SIZE / 2, -SIZE / 2, SIZE, SIZE

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

class Inventory extends IdObject
  constructor: (@size) ->
    super
    @contents = []
    @handlers = {
      'change': []
    }
    @counts = {}

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
    console.log 'removing type', id
    for el, i in @contents
      console.log 'considering removing', el.item_id, id, el.item_id is id
      if el.item_id is id
        console.log 'ACTUALLY removing now'
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

class Player extends Mob
  constructor: (@board) ->
    super
    @cameraRotation = Math.PI / 4
    @seen = {}
    @usingItem = 0

  render: (ctx) ->
    ctx.translate canvas.width / 2, canvas.height / 2
    ctx.rotate @cameraRotation
    ctx.strokeStyle = '#F00'
    ctx.strokeRect -SIZE / 2, -SIZE / 2, SIZE, SIZE
    ctx.rotate -@cameraRotation
    ctx.drawImage wiz, -SIZE/2, -SIZE, SIZE, SIZE
    ctx.resetTransform()

  drawPerspective: (ctx) ->
    # Clear canvas
    ctx.clearRect 0, 0, canvas.width, canvas.height

    # Get all renderable tiles
    renderables = @board.getTileArea @pos, canvas.width * Math.sqrt(2) / (2 * SIZE) + 1

    # Add the player to the things that need to be rendered
    renderables.push @

    # Sort those renderables by their center positions
    # relative to our rotation, so that the ones at the end of the
    # array appear "farther" to us
    dir = c Math.sin(@cameraRotation), Math.cos(@cameraRotation)
    renderables.sort (a, b) =>
      if (a instanceof Mob) and (b instanceof Tile)
        if @pos.to(a.pos).scalarProject(dir) > @pos.to(b.pos).scalarProject(dir) or
            a.pos.distance(b.pos) <= 1
          return 1
        else
          return -1
      else if (a instanceof Tile) and (b instanceof Mob)
        if @pos.to(a.pos).scalarProject(dir) > @pos.to(b.pos).scalarProject(dir) and
            a.pos.distance(b.pos) > 1
          return 1
        else
          return -1
      else
        if @pos.to(a.pos).scalarProject(dir) > @pos.to(b.pos).scalarProject(dir)
          return 1
        else
          return -1

    # Determine which of the tiles we can see
    visible = @board.shadowcast @pos, ((n) -> not n.passable()), 250 * Math.sqrt(2) / SIZE + 1

    # Render all the renderables in order
    for renderable in renderables
      if renderable.id of visible
        @seen[renderable.id] = true
        renderable.render ctx
      else if renderable.id of @seen
        ctx.globalAlpha = 0.5
        renderable.render ctx
        ctx.globalAlpha = 1
      else if renderable instanceof Mob
        renderable.render ctx

    # Draw the target square
    ctx.translate canvas.width / 2, canvas.height / 2
    ctx.rotate @cameraRotation
    target = @getTarget()
    ctx.strokeStyle = '#FF0'
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
      BOARD.get(Math.ceil(pos.x + v.x), Math.floor(pos.y)).passable() or
      BOARD.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y)).passable()
    )
    pos.x = Math.ceil pos.x
  else if v.x < 0 and (
      BOARD.get(Math.floor(pos.x + v.x), Math.floor(pos.y)).passable() or
      BOARD.get(Math.floor(pos.x + v.x), Math.ceil(pos.y)).passable()
    )
    pos.x = Math.floor pos.x
  else
    pos.x += v.x
  if v.y > 0 and (
      BOARD.get(Math.floor(pos.x), Math.ceil(pos.y + v.y)).passable() or
      BOARD.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y)).passable()
    )
    pos.y = Math.ceil pos.y
  else if v.y < 0 and (
      BOARD.get(Math.floor(pos.x), Math.floor(pos.y + v.y)).passable() or
      BOARD.get(Math.ceil(pos.x), Math.floor(pos.y + v.y)).passable()
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

canvas.addEventListener 'click', (ev) ->
  best = PLAYER.getTarget()
  if best.pos.distance(PLAYER.pos) >= 1
    item = PLAYER.inventory.contents[PLAYER.usingItem]
    if item? and item.useOnTile best
      PLAYER.inventory.remove item
      if PLAYER.inventory.contents.length <= PLAYER.usingItem
        PLAYER.usingItem = PLAYER.inventory.contents.length - 1
        redrawInventory()

tick = ->
  if keysdown[87]
    translateOKComponent PLAYER.pos, c(Math.sin(PLAYER.cameraRotation), Math.cos(PLAYER.cameraRotation)).mult(-SPEED)
  if keysdown[83]
    translateOKComponent PLAYER.pos, c(Math.sin(PLAYER.cameraRotation), Math.cos(PLAYER.cameraRotation)).mult(SPEED)
  if keysdown[65]
    translateOKComponent PLAYER.pos, c(-Math.cos(PLAYER.cameraRotation), Math.sin(PLAYER.cameraRotation)).mult(SPEED)
  if keysdown[68]
    translateOKComponent PLAYER.pos, c(-Math.cos(PLAYER.cameraRotation), Math.sin(PLAYER.cameraRotation)).mult(-SPEED)
  updateMousePos()

  PLAYER.drawPerspective ctx
  setTimeout tick, 1000 / 50

# Generate board
BOARD = new Board c(500, 500)

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
      BOARD.cells[x][y].terrain = new Terrain dirt
      BOARD.cells[x][y].obstacle = new StoneObstacle()
    else
      BOARD.cells[x][y].terrain = new Terrain dirt


# The forests, which get thicker as you go out
for x in [0...500]
  for y in [250...500]
    if Math.random() < 0.05 * 20 ** (y / 250 - 1)
      BOARD.cells[x][y].obstacle = new TreeObstacle()
      BOARD.cells[x][y].terrain = new Terrain dirt
    else
      BOARD.cells[x][y].terrain = new Terrain grass

# Make player
PLAYER = new Player BOARD
PLAYER.pos = c(250, 250)
PLAYER.cameraRotation = Math.PI / 4

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

    icon.getContext('2d').drawImage Item.idMap[recipe.creates]._item_texture, 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE
    recipeList.appendChild icon

PLAYER.inventory.on 'change', redrawInventory

PLAYER.inventory.push new Pickaxe()
PLAYER.inventory.push new Axe()

tick()
