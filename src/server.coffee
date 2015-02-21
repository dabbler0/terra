types = require './types.coffee'
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
BOARD.each (x, y, tile) ->
  if Math.random() < 0.1
    tile.obstacle = new types.Obstacle (new types.Texture 'stone'), (new types.Texture 'stone')
    tile.terrain = new types.Terrain (new types.Texture 'dirt')
  else
    tile.terrain = new types.Terrain (new types.Texture 'grass')

io.on 'connection', (socket) ->
  player = new types.Player()
  PLAYERS.push {player, socket, board: new types.GhostBoard(BOARD.dimensions)}
  MOBS.push player

  socket.on 'move', (vector) ->
    player.velocity = types.Vector.parse(vector).value

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
    visible = BOARD.shadowcast(player.player.pos.round(), ((tile) -> not tile.obstacle?), VISION_MAX)
    # Tile vision -- only the updates
    tileVision = BOARD.getTileArea(player.player.pos.round(), VISION_MAX)
      .filter((x) -> (x.pos.dump() of visible))
      .map((x) -> x.view())
      .filter((x) -> (not x.equals(player.board.get(x.pos))))

    # Apply updates
    player.board.update tileVision

    mobVision = MOBS.filter((x) -> x.pos.round().dump() of visible)

    # Package in a known-type VisionField
    field = new types.VisionField tileVision, mobVision

    player.socket.emit 'update', {
      self: player.player.serialize()
      vision: (buffer = field.serialize())
    }

    load /= 2
    load += buffer.byteLength

  setTimeout emit, 1000 / EMIT_RATE

emit()

sim = ->
  for player in PLAYERS
    types.translateOKComponent BOARD, player.player.pos, player.player.velocity
  setTimeout sim, 1000 / SIM_RATE

sim()

http.listen process.env.PORT, ->
  console.log 'Listening on', process.env.PORT
