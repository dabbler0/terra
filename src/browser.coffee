types = require './types.coffee'
assets = require './assets.coffee'
items = require './items.coffee'

healthBar = $ '#health-bar'
healthIndicator = $ '#health-indicator'

manaBar = $ '#mana-bar'
manaIndicator = $ '#mana-indicator'

VISION_MAX = 11
FRAME_RATE = 30
SIM_RATE = 50
SERVER_SIM_RATE = 50
SIZE = 40
RANGE = 2 # TODO move to items
SPEED = 10 / SIM_RATE # Tiles per Second
ITEM_DISPLAY_SIZE = 35
USING_ITEM = 0

STARTED = false

canvas = document.getElementById 'viewport'
ctx = canvas.getContext '2d'
inventoryCanvases = null

PLAYER = new types.Player()
MOBS = []
BULLETS = []
ROTATION = Math.PI / 4
BOARD = new types.GhostBoard new types.BoardCoordinate 500, 500

TARGET_FLASHING = false
TARGET_FLASH_TIME = 20

RAW_MOUSE_POS = new types.Vector 0, 0
MOUSE_POS = new types.Vector 0, 0
MOUSEDOWN = false

socket = null

scheduledActions = {}

time = 0

setServerTickTimeout = (fn, ticks) ->
  scheduledActions[time + ticks] ?= []
  scheduledActions[time + ticks].push fn

assets.loadAssets ->
  socket = io()

  socket.on 'update', (data) ->
    time = data.time
    # Perform all the timeouts
    for key, val of scheduledActions when key < time
      for fn in scheduledActions[key]
        fn()
      delete scheduledActions[key]

    PLAYER.pos = types.Vector.parse(data.pos).value
    PLAYER.velocity = types.Vector.parse(data.vel).value

    field = types.VisionField.parse(data.vision).value
    healthBar.width 190 * data.health / 100
    healthIndicator.text "#{data.health}/100"
    manaBar.width 190 * data.mana / 100
    manaIndicator.text "#{Math.round(data.mana)}/100"
    BOARD.update field.tiles
    MOBS = field.mobs
    BULLETS = field.bullets

    unless STARTED
      STARTED = true
      start()

  socket.on 'inventory', (inventory) ->
    PLAYER.inventory = types.Inventory.parse(inventory).value
    if USING_ITEM >= PLAYER.inventory.length()
      USING_ITEM = PLAYER.inventory.length() - 1
    redrawInventory()

start = ->
  canvas.addEventListener 'mousewheel', (event) ->
    if event.wheelDelta > 0
      ROTATION += 0.1
    else
      ROTATION -= 0.1
    checkMove()

  keysdown = {}
  document.body.addEventListener 'keydown', (event) ->
    keysdown[event.which] = true

    if event.which is 88
      socket.emit 'pickup'

    else if event.which is 90
      socket.emit 'drop', {
        index: USING_ITEM
        item: PLAYER.inventory.get(USING_ITEM).serialize()
      }

    checkMove()

  checkMove = ->
    movement = new types.Vector(0, 0)
    if keysdown[87]
      movement.translate new types.Vector(Math.sin(ROTATION), Math.cos(ROTATION)).mult -1
    if keysdown[83]
      movement.translate new types.Vector(Math.sin(ROTATION), Math.cos(ROTATION))
    if keysdown[65]
      movement.translate new types.Vector(-Math.cos(ROTATION), Math.sin(ROTATION))
    if keysdown[68]
      movement.translate new types.Vector(-Math.cos(ROTATION), Math.sin(ROTATION)).mult -1

    socket.emit 'move', movement.normalize().mult(SPEED).serialize()

  document.body.addEventListener 'keyup', (event) ->
    keysdown[event.which] = false
    checkMove()

  tick()
  toolUseTick()

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
      if inventoryCanvases[USING_ITEM]?
        inventoryCanvases[USING_ITEM].style.outline = 'none'
      USING_ITEM = i * 5 + j
      inventoryCanvas.style.outline = '1px solid #FF0'
    tr.appendChild td
  inventoryTable.appendChild tr

$('.inventory-canvas').tooltipster()

# Inventory redraw
redrawInventory = ->
  for i in [0...20]
    iCtx = inventoryCanvases[i].getContext '2d'
    iCtx.clearRect 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE
    if PLAYER.inventory.contents[i]?
      iCtx.drawImage PLAYER.inventory.contents[i].texture().get(), 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE

      # Item stack count, if applicable
      if PLAYER.inventory.contents[i].count > 1
        iCtx.fillStyle = '#000'
        iCtx.font = '12px Arial'
        iCtx.fillText PLAYER.inventory.contents[i].count, 0, 12
      $(inventoryCanvases[i]).tooltipster 'content', PLAYER.inventory.contents[i].name()
    else
      $(inventoryCanvases[i]).tooltipster 'content', ''

    if i is USING_ITEM
      inventoryCanvases[i].style.outline = '1px solid #FF0'
    else
      inventoryCanvases[i].style.outline = 'none'

  renderRecipes()

# Recipe redraw
getRecipes = -> items.RECIPES.filter (recipe) -> recipe.canWork PLAYER.inventory

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
      socket.emit 'craft', recipe.id

    icon.getContext('2d').drawImage new types.Texture(items.ITEM_TEMPLATES[recipe.creates[0]].texture).get(), 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE
    recipeList.appendChild icon

tick = ->
  updateMousePos()

  ctx.clearRect 0, 0, canvas.width, canvas.height
  tiles = BOARD.getTileArea PLAYER.pos.round(), VISION_MAX
  visible = BOARD.shadowcast PLAYER.pos.round(), types.PLAYER_SEE, VISION_MAX

  dir = new types.Vector Math.sin(ROTATION), Math.cos(ROTATION)

  terrains = tiles.filter (x) -> not x.obstacle?

  for view in terrains
    coord = view.pos.dump()
    ctx.globalAlpha = 0.5 unless coord of visible
    view.render canvas, ctx, ROTATION, PLAYER.pos
    ctx.globalAlpha = 1 unless coord of visible

  protrusions = tiles.filter((x) -> x.obstacle?).concat(MOBS).concat(BULLETS)

  protrusions.sort (a, b) ->
    if PLAYER.pos.to(a.pos).scalarProject(dir) > PLAYER.pos.to(b.pos).scalarProject(dir)
      return 1
    else
      return -1

  for view in protrusions
    coord = view.pos.round().dump()
    ctx.globalAlpha = 0.5 unless coord of visible
    view.render canvas, ctx, ROTATION, PLAYER.pos
    ctx.globalAlpha = 1 unless coord of visible

  # Draw the target square manually
  ctx.translate canvas.width / 2, canvas.height / 2
  ctx.rotate ROTATION
  target = getTarget()
  ctx.strokeStyle = if TARGET_FLASHING then '#000' else '#FF0'
  ctx.strokeRect (target.pos.x - PLAYER.pos.x) * SIZE - SIZE/2, (target.pos.y - PLAYER.pos.y) * SIZE - SIZE/2, SIZE, SIZE
  ctx.resetTransform()

  for mob in MOBS
    types.translateOKComponent BOARD, mob.pos, mob.velocity
  types.translateOKComponent BOARD, PLAYER.pos, PLAYER.velocity

  setTimeout tick, 1000 / SIM_RATE

getTarget = ->
  candidates = BOARD.getCoordinateArea PLAYER.pos.round(), RANGE
  best = null; min = Infinity
  for candidate in candidates
    if candidate.distance(MOUSE_POS) < min and candidate.distance(PLAYER.pos) <= RANGE
      best = candidate; min = candidate.distance(MOUSE_POS)
  return BOARD.get best.x, best.y

# Mouse pos tracking
canvas.addEventListener 'mousemove', (ev) ->
  RAW_MOUSE_POS = new types.Vector ev.offsetX - canvas.width / 2, ev.offsetY - canvas.width / 2

updateMousePos = ->
  MOUSE_POS = RAW_MOUSE_POS.rotate(-ROTATION).mult 1 / SIZE
  MOUSE_POS.translate PLAYER.pos

# Mousedown tracking
canvas.addEventListener 'mousedown', (event) ->
  if event.which is 1
    MOUSEDOWN = true
  else if event.which is 3
    console.log getTarget(), getTarget().pos
    socket.emit 'use-tile', getTarget().pos.serialize() # TODO will require server-side distance check

canvas.addEventListener 'mouseup', (event) ->
  if event.which is 1
    MOUSEDOWN = false

toolUseTick = ->
  if MOUSEDOWN
    best = getTarget()
    if best.pos.distance(PLAYER.pos) >= 1
      item = PLAYER.inventory.contents[USING_ITEM]
      if item?
        # Flash the target red
        TARGET_FLASHING = true
        setTimeout (-> TARGET_FLASHING = false), TARGET_FLASH_TIME

        # Update inventory if consumed
        if item.canUseOnTile()
          console.log item, item.useOnTile
          socket.emit 'use-on-tile', {
            item: item.serialize()
            tile: best.serialize()
            index: USING_ITEM
          }
        else if item.canShoot()
          socket.emit 'shoot', {
            item: item.serialize()
            direction: PLAYER.pos.to(MOUSE_POS).serialize()
            index: USING_ITEM
          }

        setServerTickTimeout toolUseTick, item.cooldown()
        return
  setTimeout toolUseTick, 1000 / FRAME_RATE
