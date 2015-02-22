exports.RESOURCES = RESOURCES = [
  '/assets/wizard.png'
  '/assets/stone.png'
  '/assets/dirt.png'
  '/assets/grass.png'
  '/assets/black.png'
  '/assets/tree-top.png'
  '/assets/tree-side.png'
  '/assets/axe.png'
  '/assets/wood.png'
  '/assets/crack1.png'
  '/assets/crack2.png'
  '/assets/crack3.png'
]

# loadAssets, which works on client-side only
exports.loadAssets = (cb) ->
  loaded = 0

  for resource, i in RESOURCES
    RESOURCES[i] = new Image()
    RESOURCES[i].src = resource
    RESOURCES[i].onload = ->
      loaded += 1
      if loaded is RESOURCES.length and cb?
        console.log 'Loaded all resources'
        cb()

exports.TEXTURE_IDS = {
  'wizard': 0
  'stone': 1
  'dirt': 2
  'grass': 3
  'black': 4
  'tree-top': 5
  'tree-side': 6
  'axe': 7
  'wood': 8
  'crack-1': 9
  'crack-2': 10
  'crack-3': 11
}