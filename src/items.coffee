assets = require './assets.coffee'
types = require './types.coffee'

exports.ITEM_TEMPLATES = ITEM_TEMPLATES = {}
exports.ITEM_NAMES = ITEM_NAMES = {}

exports.OBSTACLE_TEMPLATES = OBSTACLE_TEMPLATES = {}
exports.OBSTACLE_NAMES = OBSTACLE_NAMES = {}

d = (x) -> Math.ceil Math.random() * x

# ITEMS
# =====

BASE_ITEM = {
  ancestors: []
}

item_id = 0


item = (name, extend, properties) ->
  if(typeof extend  is 'string')
    extend = ITEM_TEMPLATES[ITEM_NAMES[extend]]
  else
    properties = extend
    extend = BASE_ITEM

  id = item_id++

  ITEM_TEMPLATES[id] = itemTemplate = {name: name, ancestors: extend.ancestors.concat([name])}
  ITEM_NAMES[name] = id

  for property, val of extend when property isnt 'ancestors'
    itemTemplate[property] = val
  for property, val of properties
    itemTemplate[property] = val

# LIST OF ITEMS
# -------------
item 'Stone',
  texture: assets.TEXTURE_IDS['stone']

  useOnTile: (tile) ->
    unless tile.obstacle?
      tile.obstacle = new types.Obstacle 'stone'

      return true
    return false

  cooldown: 500

item 'Wood',
  texture: assets.TEXTURE_IDS['wood']

  useOnTile: (tile) ->
    unless tile.obstacle?
      tile.obstacle = new types.Obstacle 'wood'
      return true
    return false

  cooldown: 500

item 'Axe',
  texture: assets.TEXTURE_IDS['axe']

  useOnTile: (tile) ->
    if tile.obstacle? and tile.obstacle.subclass('wood')
      tile.damageObstacle 1 * d(3)
    return false

  cooldown: 500

# OBSTAACLES
# ==========

BASE_OBSTACLE = {
  ancestors: []
}

obstacle_id = 0

obstacle = (name, extend, properties) ->
  if(typeof extend  is 'string')
    extend = OBSTACLE_TEMPLATES[OBSTACLE_NAMES[extend]]
  else
    properties = extend
    extend = BASE_OBSTACLE

  id = obstacle_id++

  OBSTACLE_TEMPLATES[id] = obstacleTemplate = {
    name: name,
    ancestors: extend.ancestors.concat([name])
  }
  OBSTACLE_NAMES[name] = id

  for property, val of extend when property isnt 'ancestors'
    obstacleTemplate[property] = val
  for property, val of properties
    obstacleTemplate[property] = val

# LIST OF OBSTACLES
# -----------------
obstacle 'stone',
  top: assets.TEXTURE_IDS['stone']
  side: assets.TEXTURE_IDS['stone']
  health: 10

  drops: ['Stone']

obstacle 'wood',
  top: assets.TEXTURE_IDS['wood']
  side: assets.TEXTURE_IDS['wood']
  health: 10

  drops: ['Wood']

obstacle 'tree', 'wood',
  top: assets.TEXTURE_IDS['tree-top']
  side: assets.TEXTURE_IDS['tree-side']
  health: 10

  drops: ['Wood']

