canvas = document.getElementById 'viewport'
ctx = canvas.getContext '2d'
stone = document.getElementById 'stone-image'
dirt = document.getElementById 'dirt-image'
grass = document.getElementById 'grass-image'
wiz = document.getElementById 'wizard-image'

SPEED = 0.3
SIZE = 40
RANGE = 2

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

class Obstacle extends IdObject
  constructor: (@texture) ->
    super

class Terrain extends IdObject
  constructor: (@texture) ->
    super

class Inventory extends IdObject
  constructor: ->
    @contents = []

class Tile extends IdObject
  constructor: (@board, @pos, @terrain, @obstacle) ->
    super
    @seen = false
    @inventory = new Inventory()

  render: (ctx) ->
    if @obstacle?
      img = @obstacle.texture

      # Translate to the proper position
      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate ROTATION
      ctx.translate SIZE * @pos.x - POS.x * SIZE, SIZE * @pos.y - POS.y * SIZE

      # Draw the base square
      ctx.drawImage img, -SIZE / 2, -SIZE / 2, SIZE, SIZE

      # Move to the top
      ctx.rotate -ROTATION
      ctx.translate 0, -SIZE
      ctx.rotate ROTATION

      # Draw the top qquare
      ctx.drawImage img, -SIZE / 2, -SIZE / 2, SIZE, SIZE

      # Draw each of the four sides, when applicable.
      # This entails doing a horizontal scaling and then
      # a skew transformation.
      #
      # The percieved width of a side is always cos(r), where r
      # is the amount of ROTATION from flat. Since the
      # length of the slanted side must always remain 1, this means
      # that we need to skew by sin(r).
      drawCorner = (n) ->
        if ((ROTATION + n) %% (2 * Math.PI)) < Math.PI
          ctx.save()
          ctx.rotate -ROTATION
          ctx.transform Math.cos(ROTATION + n + Math.PI / 2), Math.sin(ROTATION + n + Math.PI / 2), 0, 1, 0, 0
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
    else
      img = @terrain.texture

      ctx.translate canvas.width / 2, canvas.height / 2
      ctx.rotate ROTATION
      ctx.translate SIZE * @pos.x - POS.x * SIZE, SIZE * @pos.y - POS.y * SIZE
      ctx.drawImage img, -SIZE / 2, -SIZE / 2, SIZE, SIZE
      ctx.resetTransform()

  passable: -> @obstacle?

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

drawBlock = (img, rotation, vector) ->

drawTile = (img, rotation, vector) ->

# Might need quadtree
board = new Board c 500, 500
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
      board.cells[x][y].terrain = new Terrain dirt
      board.cells[x][y].obstacle = new Obstacle stone
    else
      board.cells[x][y].terrain = new Terrain dirt

for x in [0...500]
  for y in [250...500]
    if Math.random() < 0.05
      board.cells[x][y].obstacle = new Obstacle dirt
      board.cells[x][y].terrain = new Terrain dirt
    else
      board.cells[x][y].terrain = new Terrain grass

ROTATION = Math.PI / 4
redraw = ->
  ctx.clearRect 0, 0, 500, 500
  queue = []

  queue = board.shadowcast POS, ((n) -> not n.passable()), 250 * Math.sqrt(2) / SIZE + 1
  rendered = {}

  dir = c Math.sin(ROTATION), Math.cos(ROTATION)
  queue.sort (a, b) ->
    if POS.to(a).scalarProject(dir) > POS.to(b).scalarProject(dir)
      return 1
    else
      return -1
  area = board.getArea POS.x, POS.y,  250 * Math.sqrt(2) / SIZE + 1

  for coord in queue when POS.to(coord).scalarProject(dir) < 0.5
    rendered[s(coord.x, coord.y)] = true
    board.cells[coord.x][coord.y].seen = true
    board.cells[coord.x][coord.y].render ctx

  ctx.globalAlpha = 0.5
  for coord in area when (s(coord.x, coord.y) not of rendered) and  POS.to(coord).scalarProject(dir) < 0.5
    if board.cells[coord.x][coord.y].seen
      board.cells[coord.x][coord.y].render ctx
  ctx.globalAlpha = 1

  ctx.translate canvas.width / 2, canvas.height / 2
  ctx.rotate ROTATION
  ctx.strokeStyle = '#F00'
  ctx.strokeRect -SIZE / 2, -SIZE / 2, SIZE, SIZE
  ctx.rotate -ROTATION
  ctx.drawImage wiz, -SIZE/2, -SIZE, SIZE, SIZE
  ctx.resetTransform()

  for coord in queue when POS.to(coord).scalarProject(dir) >= 0.5
    rendered[s(coord.x, coord.y)] = true
    board.cells[coord.x][coord.y].seen = true
    board.cells[coord.x][coord.y].render ctx

  ctx.globalAlpha = 0.5
  for coord in area when (s(coord.x, coord.y) not of rendered) and POS.to(coord).scalarProject(dir) >= 0.5
    if board.cells[coord.x][coord.y].seen
      board.cells[coord.x][coord.y].render ctx
  ctx.globalAlpha = 1

  ctx.translate canvas.width / 2, canvas.height / 2
  ctx.rotate ROTATION
  target = getTarget()
  ctx.strokeStyle = '#FF0'
  ctx.strokeRect (target.pos.x - POS.x) * SIZE - SIZE/2, (target.pos.y - POS.y) * SIZE - SIZE/2, SIZE, SIZE
  ctx.resetTransform()

document.body.addEventListener 'mousewheel', (event) ->
  if event.wheelDelta > 0
    ROTATION += 0.1
  else
    ROTATION -= 0.1

keysdown = {}
tool = false
document.body.addEventListener 'keydown', (event) ->
  keysdown[event.which] = true
  if event.which is 49
    tool = false
  if event.which is 50
    tool = true
document.body.addEventListener 'keyup', (event) ->
  keysdown[event.which] = false

bad = (pos) ->
  touches = board.touches pos
  for touch in touches
    if touch.passable()
      return true
  return false

translateOKComponent = (pos, v) ->
  if v.x > 0 and (
      board.get(Math.ceil(pos.x + v.x), Math.floor(pos.y)).passable() or
      board.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y)).passable()
    )
    pos.x = Math.ceil pos.x
  else if v.x < 0 and (
      board.get(Math.floor(pos.x + v.x), Math.floor(pos.y)).passable() or
      board.get(Math.floor(pos.x + v.x), Math.ceil(pos.y)).passable()
    )
    pos.x = Math.floor pos.x
  else
    pos.x += v.x
  if v.y > 0 and (
      board.get(Math.floor(pos.x), Math.ceil(pos.y + v.y)).passable() or
      board.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y)).passable()
    )
    pos.y = Math.ceil pos.y
  else if v.y < 0 and (
      board.get(Math.floor(pos.x), Math.floor(pos.y + v.y)).passable() or
      board.get(Math.ceil(pos.x), Math.floor(pos.y + v.y)).passable()
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
  MOUSE_POS = RAW_MOUSE_POS.rotate(-ROTATION).mult 1 / SIZE
  MOUSE_POS.translate POS

canvas.addEventListener 'click', (ev) ->
  best = getTarget()
  if tool
    best.obstacle = null
  else
    best.obstacle = new Obstacle stone

getTarget = ->
  candidates = board.getArea POS.x, POS.y, RANGE
  best = null; min = Infinity
  for candidate in candidates
    if candidate.distance(MOUSE_POS) < min and candidate.distance(POS) <= RANGE
      best = candidate; min = candidate.distance(MOUSE_POS)
  return board.get best.x, best.y

tick = ->
  if keysdown[87]
    translateOKComponent POS, c(Math.sin(ROTATION), Math.cos(ROTATION)).mult(-SPEED)
  if keysdown[83]
    translateOKComponent POS, c(Math.sin(ROTATION), Math.cos(ROTATION)).mult(SPEED)
  if keysdown[65]
    translateOKComponent POS, c(-Math.cos(ROTATION), Math.sin(ROTATION)).mult(SPEED)
  if keysdown[68]
    translateOKComponent POS, c(-Math.cos(ROTATION), Math.sin(ROTATION)).mult(-SPEED)
  updateMousePos()

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
