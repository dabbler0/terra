types = require './types.coffee'
VISION_MAX = 11
FRAME_RATE = 30
SIM_RATE = 50
SIZE = 40
RANGE = 2 # TODO move to items
SPEED = 10 / SIM_RATE # Tiles per Second

STARTED = false

canvas = document.getElementById 'viewport'
ctx = canvas.getContext '2d'

PLAYER = null
MOBS = []
ROTATION = Math.PI / 4
BOARD = new types.GhostBoard new types.BoardCoordinate 500, 500

TARGET_FLASHING = false

RAW_MOUSE_POS = new types.Vector 0, 0
MOUSE_POS = new types.Vector 0, 0

socket = null

types.loadAssets ->
  socket = io()

  socket.on 'update', (data) ->
    PLAYER = types.Player.parse(data.self).value

    field = types.VisionField.parse(data.vision).value
    BOARD.update field.tiles
    MOBS = field.mobs

    unless STARTED
      STARTED = true
      start()

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

  tick = ->
    updateMousePos()

    ctx.clearRect 0, 0, canvas.width, canvas.height
    tiles = BOARD.getTileArea PLAYER.pos.round(), VISION_MAX
    visible = BOARD.shadowcast PLAYER.pos.round(), ((tile) -> not tile.obstacle?), VISION_MAX

    dir = new types.Vector Math.sin(ROTATION), Math.cos(ROTATION)

    terrains = tiles.filter (x) -> not x.obstacle?

    for view in terrains
      coord = view.pos.dump()
      ctx.globalAlpha = 0.5 unless coord of visible
      view.render canvas, ctx, ROTATION, PLAYER.pos
      ctx.globalAlpha = 1 unless coord of visible

    protrusions = tiles.filter((x) -> x.obstacle?).concat MOBS

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

  tick()
