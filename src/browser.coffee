types = require './types.coffee'
VISION_MAX = 15
FRAME_RATE = 30
SPEED = 0.3

types.loadAssets ->
  canvas = document.getElementById 'viewport'
  ctx = canvas.getContext '2d'

  PLAYER = null
  ROTATION = Math.PI / 4
  BOARD = new types.GhostBoard new types.BoardCoordinate 500, 500

  socket = io()

  socket.on 'update', (data) ->
    ctx.clearRect 0, 0, canvas.width, canvas.height
    PLAYER = types.Player.parse(data.self).value

    field = types.VisionField.parse(data.vision).value
    BOARD.update field.tiles

    renderables = BOARD.getTileArea PLAYER.pos.round(), VISION_MAX
    visible = BOARD.shadowcast PLAYER.pos.round(), ((tile) -> not tile.obstacle?), VISION_MAX

    dir = new types.Vector Math.sin(ROTATION), Math.cos(ROTATION)

    renderables.sort (a, b) ->
      if PLAYER.pos.to(a.pos).scalarProject(dir) > PLAYER.pos.to(b.pos).scalarProject(dir)
        return 1
      else
        return -1

    for view in renderables
      coord = view.pos.dump()
      ctx.globalAlpha = 0.5 unless coord of visible
      view.render canvas, ctx, ROTATION, PLAYER.pos
      ctx.globalAlpha = 1 unless coord of visible

  canvas.addEventListener 'mousewheel', (event) ->
    if event.wheelDelta > 0
      ROTATION += 0.1
    else
      ROTATION -= 0.1

  keysdown = {}
  document.body.addEventListener 'keydown', (event) ->
    keysdown[event.which] = true
  document.body.addEventListener 'keyup', (event) ->
    keysdown[event.which] = false

  tick = ->
    if keysdown[87]
      socket.emit 'move', new types.Vector(Math.sin(ROTATION), Math.cos(ROTATION)).mult(-SPEED).serialize()
    if keysdown[83]
      socket.emit 'move', new types.Vector(Math.sin(ROTATION), Math.cos(ROTATION)).mult(SPEED).serialize()
    if keysdown[65]
      socket.emit 'move', new types.Vector(-Math.cos(ROTATION), Math.sin(ROTATION)).mult(SPEED).serialize()
    if keysdown[68]
      socket.emit 'move', new types.Vector(-Math.cos(ROTATION), Math.sin(ROTATION)).mult(-SPEED).serialize()
    setTimeout tick, 1000 / FRAME_RATE
  tick()
