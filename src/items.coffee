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

  useOnTile: (player, tile) ->
    unless tile.obstacle?
      tile.obstacle = new types.Obstacle 'stone'

      return true
    return false

  cooldown: 500

item 'Rock',
  texture: assets.TEXTURE_IDS['rock']

item 'Spear',
  texture: assets.TEXTURE_IDS['wizard'] # TODO a spear is not a wizard

item 'Wood',
  texture: assets.TEXTURE_IDS['wood']

  useOnTile: (player, tile) ->
    unless tile.obstacle?
      tile.obstacle = new types.Obstacle 'wood'
      return true
    return false

  cooldown: 500

item 'Wood Plank',
  texture: assets.TEXTURE_IDS['wood-plank']

  useOnTile: (player, tile) ->
    unless tile.obstacle?
      tile.terrain = new types.Terrain 'wood'
      return true
    return false

  cooldown: 500

item 'Stone Tile',
  texture: assets.TEXTURE_IDS['stone-tile']

  useOnTile: (player, tile) ->
    unless tile.obstacle?
      tile.terrain = new types.Terrain 'stone'
      return true
    return false

  cooldown: 500

item 'Axe',
  texture: assets.TEXTURE_IDS['axe']

  useOnTile: (player, tile) ->
    if tile.obstacle? and tile.obstacle.subclass('wood')
      tile.damageObstacle 1 * d(3)
    return false

  cooldown: 500

item 'Pickaxe',
  texture: assets.TEXTURE_IDS['pickaxe']

  useOnTile: (player, tile) ->
    if tile.obstacle? and tile.obstacle.subclass('stone')
      tile.damageObstacle 1 * d(3)
    return false

  cooldown: 1000

item 'Door',
  texture: assets.TEXTURE_IDS['door-side']

  useOnTile: (player, tile) ->
    unless tile.obstacle?
      tile.obstacle = new types.Obstacle 'door-closed'
      return true
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

  for property, val of extend when property not in ['ancestors', 'name']
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

obstacle 'door-closed', 'wood',
  top: assets.TEXTURE_IDS['door-top']
  side: assets.TEXTURE_IDS['door-side']
  health: 10

  use: (player, tile) ->
    tile.obstacle = new types.Obstacle 'door-open'
    tile.obstacle.health = @health

obstacle 'door-open', 'wood',
  top: assets.TEXTURE_IDS['door-top']
  side: assets.TEXTURE_IDS['transparent']

  translucent: true
  passable: true

  use: (player, tile) ->
    tile.obstacle = new types.Obstacle 'door-closed'
    tile.obstacle.health = @health

# RECIPES
# =======
exports.RECIPES = RECIPES = []

class Recipe
  constructor: (@id, @needs, @creates) ->

  canWork: (inventory) ->
    counts = inventory.counts()
    for key, val of @needs
      unless key of counts and counts[key] >= val
        return false

    return true

  attempt: (inventory) ->
    if @canWork inventory
      for key, val of @needs
        inventory.removeType(Number(key)) for i in [0...val]
      inventory.add(new types.Item(el)) for el, i in @creates
    else
      return false

recipe = (needs, creates) ->
  result = {
    needs: {}
    creates: []
  }

  for key, val of needs
    if (typeof key is 'string')
      key = ITEM_NAMES[key]
    result.needs[key] = val

  for key, val of creates
    if (typeof key is 'string')
      key = ITEM_NAMES[key]
    result.creates.push(key) for i in [0...val]

  RECIPES.push new Recipe RECIPES.length, result.needs, result.creates

# LIST OF RECIPES
# ---------------
recipe {
  'Wood': 1
}, {
  'Wood Plank': 3
}

recipe {
  'Stone': 1
}, {
  'Stone Tile': 2
}

recipe {
  'Stone': 1
}, {
  'Rock': 3
}

recipe {
  'Rock': 1
  'Wood': 4
}, {
  'Spear': 1
}

recipe {
  'Wood': 2
  'Rock': 1
}, {
  'Door': 1
}

console.log RECIPES
