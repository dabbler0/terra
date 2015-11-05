types = require './types.coffee'
items = require './items.coffee'

b64 = require './base64.js'
EMIT_RATE = 30
SIM_RATE = 50
VISION_MAX = 11
SPEED = 6 / SIM_RATE # Tiles per Second

# Set up the server with socket.io
express = require 'express'; app = express()
http = require('http').Server app
io = require('socket.io')(http)

app.use '/', express.static __dirname + '/..'

MOBS = []
PLAYERS = []
BOARD = new types.Board new types.BoardCoordinate 500, 500
freeTiles = []
BOARD.each (x, y, tile) ->
  if Math.sqrt((x - 250) ** 2 + (y - 0) ** 2) < 200
    tile.obstacle = new types.Obstacle 'stone'
    tile.terrain = new types.Terrain (new types.Texture 'dirt')

  else if Math.random() < Math.sqrt((x - 250) ** 2 + (y - 250) ** 2) / 250
    tile.obstacle = new types.Obstacle 'tree'
    tile.terrain = new types.Terrain (new types.Texture 'dirt')

  else
    tile.terrain = new types.Terrain (new types.Texture 'grass')
    if 200 < x < 300 and 200 < y < 300
      freeTiles.push [x, y]

for [0...20]
  position = freeTiles[Math.floor Math.random() * freeTiles.length]
  console.log 'creating at', position
  weapon = if Math.random() < 0.5 then new types.Item('Stone Spear') else new types.Item('Copper Sword')

  MOBS.push denizen = new types.LurkingDenizen(
    (new types.Texture 'warrior'),
    new types.Vector(position[0], position[1])
    SPEED * 2 / 3,
    weapon,
    [
      new types.Item('Health Potion')
    ]
  )

  console.log denizen.inventory

io.on 'connection', (socket) ->
  player = new types.Player()
  PLAYERS.push {player, socket, board: new types.GhostBoard(BOARD.dimensions)}
  MOBS.push player

  player.inventory.on 'change', ->
    socket.emit 'inventory', player.inventory.serialize()

  player.inventory.add new types.Item 'Axe'
  player.inventory.add new types.Item 'Pickaxe'
  player.inventory.add new types.Item 'Copper Sword'

  socket.on 'move', (vector) ->
    player.velocity = types.Vector.parse(vector).value

  usageQueue = []; awaitingUsage = false
  socket.on 'use-on-tile', (data) ->
    item = types.Item.parse(data.item).value
    index = data.index
    tile = BOARD.get types.BoardCoordinate.parse(data.tile).value

    # Queue the usage
    # Use it
    usageQueue.push {
      type: 'tile'
      item, tile, index
    }

    unless awaitingUsage
      consumeUsageQueue()

  socket.on 'use-tile', (coord) ->
    coord = types.BoardCoordinate.parse(coord).value
    BOARD.get(coord).use(player)

  socket.on 'drop', (data) ->
    index = data.index
    item = types.Item.parse(data.item).value

    if player.inventory.get(index)?.item_id is item.item_id
      player.inventory.removeIndex index
      BOARD.get(player.pos.round()).inventory.add item

  socket.on 'pickup', ->
    BOARD.get(player.pos.round()).inventory.dump player.inventory

  socket.on 'craft', (id) ->
    items.RECIPES[id].attempt player.inventory

  socket.on 'shoot', (data) ->
    item = types.Item.parse(data.item).value
    index = data.index
    direction = types.Vector.parse(data.direction).value

    usageQueue.push {
      type: 'shoot'
      item, direction, index
    }

    unless awaitingUsage
      consumeUsageQueue()

  consumeUsageQueue = ->
    if usageQueue.length is 0
      awaitingUsage = false
    else
      awaitingUsage = true
      usage = usageQueue.shift()

      if usage.type is 'tile'
        {item, index, tile} = usage

        # Verify that the player indeed owns such an item
        if player.inventory.get(index)?.item_id is item.item_id
          if item.useOnTile player, tile
            player.inventory.removeIndex index

        setTickTimeout consumeUsageQueue, item.cooldown()

      else if usage.type is 'shoot'
        {item, index, direction} = usage

        # Verify that the player indeed owns such an item
        if player.inventory.get(index)?.item_id is item.item_id
          bullet = item.shoot player, direction
          if bullet?
            BOARD.bullets.push bullet

        setTickTimeout consumeUsageQueue, item.cooldown()

  socket.on 'disconnect', ->
    # Remove from players
    for el, i in PLAYERS
      if el.socket is socket
        PLAYERS.splice i, 1
        break

    # Remove from mobs
    for el, i in MOBS
      if el is player
        MOBS.splice i, 1
        break
    return null

load = 0

emit = ->
  for player, i in PLAYERS
    visible = BOARD.shadowcast(player.player.pos.round(), types.PLAYER_SEE, VISION_MAX)
    # Tile vision -- only the updates
    tileVision = BOARD.getTileArea(player.player.pos.round(), VISION_MAX)
      .filter((x) -> (x.pos.dump() of visible))
      .map((x) -> x.view())
      .filter((x) -> (not x.equals(player.board.get(x.pos))))

    # Apply updates
    player.board.update tileVision

    mobVision = MOBS.filter((x) -> x.pos.round().dump() of visible)
    bulletVision = BOARD.bullets.filter((x) -> x.pos.round().dump() of visible).map (x) -> x.view()

    # Package in a known-type VisionField
    field = new types.VisionField tileVision, mobVision, bulletVision

    player.socket.emit 'update', {
      health: player.player.health
      pos: player.player.pos.serialize()
      vel: player.player.velocity.serialize()
      vision: (buffer = field.serialize())
    }

    load /= 2
    load += buffer.byteLength

  setTimeout emit, 1000 / EMIT_RATE

emit()

time = 0
scheduled = {}
setTickTimeout = (fn, ticks) ->
  scheduled[time + ticks] ?= []
  scheduled[time + ticks].push fn

sim = ->
  # Do all the delayed stuff
  time += 1
  if time of scheduled
    fn() for fn in scheduled[time]
    delete scheduled[time]

  # Tick any intelligent mobs. For performance purposes, disregard mobs that are very far off-screen.
  activeMobs = MOBS.filter (mob) ->
    PLAYERS.length > 0 and PLAYERS.map((player) -> player.player.pos.distance(mob.pos)).reduce(Math.min) < 15
  activeMobs.forEach (mob) ->
    if mob.tick?
      vision = BOARD.shadowcast mob.pos, types.PLAYER_SEE, 6 # TODO 10 is arbitrary
      seenMobs = PLAYERS.map((x) -> x.player).filter (x) -> (x.pos.round().dump() of vision)
      mob.tick BOARD, seenMobs

  for mob in MOBS
    types.translateOKComponent BOARD, mob.pos, mob.velocity

  BOARD.bullets = BOARD.bullets.filter (bullet) ->
    bullet.tick()

    if bullet.lifetime < 0
      return false
    else
      for mob in MOBS
        if mob.touches(bullet.pos)
          if bullet.strike(mob)
            return false
    return true

  MOBS = MOBS.filter (mob) ->
    if mob.health <= 0
      mob.inventory.dump BOARD.get(mob.pos.round()).inventory
      return false
    else
      return true

  setTimeout sim, 1000 / SIM_RATE

sim()

http.listen process.env.PORT, ->
  console.log 'Listening on', process.env.PORT
