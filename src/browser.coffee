canvas = document.getElementById 'viewport'
ctx = canvas.getContext '2d'
img = document.getElementById 'stone-image'
grass = document.getElementById 'grass-image'

SPEED = 0.3
SIZE = 40

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

# Player position
POS = c(250, 250)

class Tile extends IdObject
  constructor: (@board, @pos, @hasObstacle) ->
    @seen = false

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
    @cells = ((new Tile(@, c(i, j), Math.random() < 0.3) for j in [0...@dimensions.y]) for i in [0...@dimensions.x])

  getCircle: (x, y, r) ->
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

  getArea: (x, y, max) ->
    all = []
    for r in [0..max]
      circle = @getCircle x, y, r
      for el in circle
        all.push el
    return all

  shadowcast: (coord, see, max = 10, qp = []) ->
    coord = coord.round()

    visible = {}
    queue = new ShadowQueue()
    r = 0

    visible[s(coord.x, coord.y)] = true

    until r >= max
      r++
      circle = @getCircle coord.x, coord.y, r
      for {x, y}, i in circle when 0 <= x < @dimensions.x and 0 <= y < @dimensions.y
        start = 360 * (2 * i - 1 %% (2 * circle.length)) / (2 * circle.length)
        end = 360 * (2 * i + 1 %% (2 * circle.length)) / (2 * circle.length)

        if queue.check(start, end) is ShadowQueue.PARTIAL
          visible[s(x, y)] = false
        else if queue.check(start, end) is ShadowQueue.NONE
          visible[s(x, y)] = true
        unless see @cells[x][y]
          queue.emplace start, end

    qp.push queue
    result = []
    for key, val of visible when val
      result.push uns(key)

    return result

  allCells: ->
    strs = ('' for i in [0...@dimensions.height])
    for col, i in @cells
      for cell, j in col
        strs[j] += cell.charRepr()
    return strs.join '\n'

  get: (x, y) -> @cells[x][y]

  touches: (vector) ->
    lowx = Math.floor(vector.x); highx = Math.ceil(vector.x)
    lowy = Math.floor(vector.y); highy = Math.ceil(vector.y)
    return [@get(lowx, lowy), @get(lowx, highy), @get(highx, lowy), @get(highx, highy)]

  on: (vector) -> @get Math.round(vector.x), Math.round(vector.y)

stroke = (ctx, path) ->
  ctx.beginPath()
  ctx.moveto path[0].x, path[0].y
  for vector in path
    ctx.moveto vector.x, vector.y
  ctx.stroke()

drawBlock = (rotation, vector) ->
  ctx.translate canvas.width / 2, canvas.height / 2
  ctx.rotate rotation
  ctx.translate vector.x - POS.x * SIZE, vector.y - POS.y * SIZE
  ctx.drawImage img, -SIZE / 2, -SIZE / 2, SIZE, SIZE
  #ctx.strokeRect -SIZE / 2, -SIZE / 2, SIZE, SIZE
  ctx.rotate -rotation

  ctx.translate 0, -SIZE
  ctx.rotate rotation
  ctx.drawImage img, -SIZE / 2, -SIZE / 2, SIZE, SIZE
  #ctx.strokeRect -SIZE / 2, -SIZE / 2, SIZE, SIZE

  drawCorner = (n) ->
    if ((rotation + n) %% (2 * Math.PI)) < Math.PI
      ctx.save()
      ctx.rotate -rotation
      ctx.transform Math.cos(rotation + n + Math.PI / 2), Math.sin(rotation + n + Math.PI / 2), 0, 1, 0, 0
      ctx.drawImage img, 0, 0, SIZE, SIZE
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

drawTile = (rotation, vector) ->
  ctx.translate canvas.width / 2, canvas.height / 2
  ctx.rotate rotation
  ctx.translate vector.x - POS.x * SIZE, vector.y - POS.y * SIZE
  ctx.drawImage grass, -SIZE / 2, -SIZE / 2, SIZE, SIZE
  ctx.rotate -rotation
  ctx.resetTransform()

# Might need quadtree
board = new Board c 500, 500

rot = Math.PI / 4
redraw = ->
  ctx.clearRect 0, 0, 500, 500
  queue = []

  ctx.globalAlpha = 0.5
  area = board.getArea POS.x, POS.y,  250 * Math.sqrt(2) / SIZE + 1
  for coord in area
    if board.cells[coord.x][coord.y].seen
      if board.cells[coord.x][coord.y].hasObstacle
        drawBlock rot, coord.mult(SIZE)
      else
        drawTile rot, coord.mult(SIZE)

  ctx.globalAlpha = 1

  queue = board.shadowcast POS, ((n) -> not n.hasObstacle), 250 * Math.sqrt(2) / SIZE + 1

  dir = c Math.sin(rot), Math.cos(rot)
  queue.sort (a, b) ->
    if POS.to(a).scalarProject(dir) > POS.to(b).scalarProject(dir)
      return 1
    else
      return -1

  for coord in queue
    board.cells[coord.x][coord.y].seen = true
    if board.cells[coord.x][coord.y].hasObstacle
      drawBlock rot, coord.mult(SIZE)
    else
      drawTile rot, coord.mult(SIZE)

  ctx.translate canvas.width / 2, canvas.height / 2
  ctx.rotate rot
  ctx.strokeStyle = '#F00'
  ctx.strokeRect -SIZE / 2, -SIZE / 2, SIZE, SIZE
  ctx.resetTransform()

document.body.addEventListener 'mousewheel', (event) ->
  if event.wheelDelta > 0
    rot += 0.1
  else
    rot -= 0.1

keysdown = {}
document.body.addEventListener 'keydown', (event) ->
  keysdown[event.which] = true
document.body.addEventListener 'keyup', (event) ->
  keysdown[event.which] = false

bad = (pos) ->
  touches = board.touches pos
  for touch in touches
    if touch.hasObstacle
      return true
  return false

translateOKComponent = (pos, v) ->
  if v.x > 0 and (
      board.get(Math.ceil(pos.x + v.x), Math.floor(pos.y)).hasObstacle or
      board.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y)).hasObstacle
    )
    pos.x = Math.ceil pos.x
  else if v.x < 0 and (
      board.get(Math.floor(pos.x + v.x), Math.floor(pos.y)).hasObstacle or
      board.get(Math.floor(pos.x + v.x), Math.ceil(pos.y)).hasObstacle
    )
    pos.x = Math.floor pos.x
  else
    pos.x += v.x
  if v.y > 0 and (
      board.get(Math.floor(pos.x), Math.ceil(pos.y + v.y)).hasObstacle or
      board.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y)).hasObstacle
    )
    pos.y = Math.ceil pos.y
  else if v.y < 0 and (
      board.get(Math.floor(pos.x), Math.floor(pos.y + v.y)).hasObstacle or
      board.get(Math.ceil(pos.x), Math.floor(pos.y + v.y)).hasObstacle
    )
    pos.y = Math.floor pos.y
  else
    pos.y += v.y

canvas.addEventListener 'click', (ev) ->
  rawCoord = c ev.offsetX - canvas.width / 2, ev.offsetY - canvas.width / 2
  coord = rawCoord.rotate -rot
  coord.translate POS.mult(SIZE)
  result = coord.mult(1 / SIZE).round()
  console.log 'resultant coord', result, POS
  tile = board.get(result.x, result.y)
  tile.hasObstacle = not tile.hasObstacle

tick = ->
  if keysdown[87]
    translateOKComponent POS, c(Math.sin(rot), Math.cos(rot)).mult(-SPEED)
  if keysdown[83]
    translateOKComponent POS, c(Math.sin(rot), Math.cos(rot)).mult(SPEED)
  if keysdown[65]
    translateOKComponent POS, c(-Math.cos(rot), Math.sin(rot)).mult(SPEED)
  if keysdown[68]
    translateOKComponent POS, c(-Math.cos(rot), Math.sin(rot)).mult(-SPEED)

  redraw()
  setTimeout tick, 1000 / 50
tick()

###
# Helpers
dedupe = (array) ->
  result = []
  for el, i in array
    result.push el unless el in result
  return result

# Basic game entities
class Tile
  constructor: (@terrain, @pos) ->
    @obstacle = null
    @items = new Inventory @

  render: (center) ->

class Obstacle
  constructor: ->
    @hp = 1000
    @parent = null # The tile on which this obstacle is placed

  render: ->

# An Inventory is a collection of items,
# like that in a bag, chest, mob inventory, or on the floor
class Inventory
  constructor: (@parent) ->
    @items = []

class Item
  constructor: ->
    @parent = null # The Inventory in which this item is placed

  render: ->

class Mob
  constructor: ->
    @hp = 100
    @inventory = new Inventory @
    @pos = c 0, 0

  render: (center) ->

###
