types = require './types.coffee'
FRAME_RATE = 30
VISION_MAX = 15
SPEED = 0.3

# Set up the server with socket.io
express = require 'express'; app = express()
http = require('http').Server app
io = require('socket.io')(http)

app.use '/', express.static __dirname + '/..'

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
  PLAYERS.push {player, socket}

  socket.on 'move', (vector) ->
    vector = types.Vector.parse(vector).value
    translateOKComponent player.pos, vector

translateOKComponent = (pos, v) ->
  if v.x > 0 and (
      BOARD.get(Math.ceil(pos.x + v.x), Math.floor(pos.y))?.impassable?() or
      BOARD.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y))?.impassable?()
    )
    pos.x = Math.ceil pos.x
  else if v.x < 0 and (
      BOARD.get(Math.floor(pos.x + v.x), Math.floor(pos.y))?.impassable?() or
      BOARD.get(Math.floor(pos.x + v.x), Math.ceil(pos.y))?.impassable?()
    )
    pos.x = Math.floor pos.x
  else
    pos.x += v.x
  if v.y > 0 and (
      BOARD.get(Math.floor(pos.x), Math.ceil(pos.y + v.y))?.impassable?() or
      BOARD.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y))?.impassable?()
    )
    pos.y = Math.ceil pos.y
  else if v.y < 0 and (
      BOARD.get(Math.floor(pos.x), Math.floor(pos.y + v.y))?.impassable?() or
      BOARD.get(Math.ceil(pos.x), Math.floor(pos.y + v.y))?.impassable?()
    )
    pos.y = Math.floor pos.y
  else
    pos.y += v.y

tick = ->
  for player in PLAYERS
    player.socket.emit 'update', {
      self: player.player.serialize()
      vision: new types.VisionField(
        BOARD.getVision(player.player.pos.round(), ((tile) -> not tile.obstacle?), VISION_MAX).map (tile) -> tile.view()
      ).serialize()
    }
  setTimeout tick, 1000 / FRAME_RATE

tick()

http.listen 8080, ->
  console.log 'Listening on 8080'
