!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.terra=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Axe, BOARD, BULLETS, BattleAxe, Board, Bow, Bullet, Copper, CopperObstacle, Dagger, FRAME_RATE, ITEMSIZE, ITEM_DISPLAY_SIZE, IdObject, Inventory, Item, MOBS, MOB_INVENTORY_SIZE, MOB_SPEED, MOUSEDOWN, MOUSE_POS, Mob, Obstacle, PLAYER, Pickaxe, Player, RANGE, RAW_MOUSE_POS, RECIPES, Recipe, RememberedTile, Rogue, SIZE, SPEED, ShadowQueue, Spear, Stone, StoneObstacle, StoneTerrain, StoneTile, Sword, TARGET_FLASHING, TARGET_FLASH_TIME, Terrain, Tile, TreeObstacle, Vector, Wanderer, Warrior, Wood, WoodObstacle, WoodPlank, WoodTerrain, assetName, assets, c, canvas, ctx, getRecipes, healthBar, healthIndicator, inventoryCanvases, itemType, keysdown, recipeList, redrawInventory, renderRecipes, s, tick, toolUseTick, translateOKComponent, uns, updateMousePos, _i, _len, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __modulo = function(a, b) { return (a % b + +b) % b; };

canvas = document.getElementById('viewport');

ctx = canvas.getContext('2d');

MOB_SPEED = 0.2;

BOARD = PLAYER = inventoryCanvases = null;

MOBS = BULLETS = [];

assets = {};

_ref = ['stone', 'dirt', 'grass', 'wizard', 'pickaxe', 'axe', 'tree-side', 'tree-top', 'wood', 'battle-axe', 'sword', 'crack1', 'crack2', 'crack3', 'planks', 'tile', 'bullet', 'bow', 'spear', 'copper', 'copper-ore', 'dagger', 'warrior', 'rogue'];
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  assetName = _ref[_i];
  assets[assetName] = document.getElementById("" + assetName + "-image");
}

SPEED = 0.3;

SIZE = 40;

RANGE = 2;

ITEMSIZE = 15;

ITEM_DISPLAY_SIZE = 35;

MOB_INVENTORY_SIZE = 20;

FRAME_RATE = 50;

TARGET_FLASH_TIME = 20;

IdObject = (function() {
  function IdObject() {
    this.id = IdObject.id++;
  }

  return IdObject;

})();

IdObject.id = 0;

Vector = (function() {
  function Vector(x, y) {
    this.x = x;
    this.y = y;
  }

  Vector.prototype.touches = function() {
    return [c(Math.floor(this.x), Math.floor(this.y)), c(Math.floor(this.x), Math.ceil(this.y)), c(Math.ceil(this.x), Math.floor(this.y)), c(Math.ceil(this.x), Math.ceil(this.y))];
  };

  Vector.prototype.translate = function(other) {
    this.x += other.x;
    return this.y += other.y;
  };

  Vector.prototype.touchesTile = function(tile) {
    return Math.abs(tile.x - this.x) < 1 && Math.abs(tile.y - this.y) < 1;
  };

  Vector.prototype.mult = function(scalar) {
    return c(this.x * scalar, this.y * scalar);
  };

  Vector.prototype.to = function(other) {
    return c(other.x - this.x, other.y - this.y);
  };

  Vector.prototype.mag = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  Vector.prototype.normalize = function() {
    return this.mult(1 / this.mag());
  };

  Vector.prototype.distance = function(other) {
    return this.to(other).mag();
  };

  Vector.prototype.dot = function(other) {
    return this.x * other.x + this.y * other.y;
  };

  Vector.prototype.scalarProject = function(other) {
    return this.dot(other) / other.mag();
  };

  Vector.prototype.round = function() {
    return c(Math.round(this.x), Math.round(this.y));
  };

  Vector.prototype.rotate = function(rot) {
    return c(Math.cos(rot) * this.x - Math.sin(rot) * this.y, Math.sin(rot) * this.x + Math.cos(rot) * this.y);
  };

  Vector.prototype.clone = function() {
    return c(this.x, this.y);
  };

  return Vector;

})();

c = function(x, y) {
  return new Vector(x, y);
};

s = function(x, y) {
  return x + ' ' + y;
};

uns = function(s) {
  var x, y, _ref1;
  _ref1 = s.split(' ').map(function(n) {
    return Number(n);
  }), x = _ref1[0], y = _ref1[1];
  return c(x, y);
};

Obstacle = (function(_super) {
  __extends(Obstacle, _super);

  function Obstacle(sideTexture, topTexture) {
    this.sideTexture = sideTexture;
    this.topTexture = topTexture;
    Obstacle.__super__.constructor.apply(this, arguments);
    this.maxHealth = this.health = 10;
    this.drops = new Inventory(1);
  }

  return Obstacle;

})(IdObject);

Terrain = (function(_super) {
  __extends(Terrain, _super);

  function Terrain(texture) {
    this.texture = texture;
    Terrain.__super__.constructor.apply(this, arguments);
  }

  return Terrain;

})(IdObject);

WoodTerrain = (function(_super) {
  __extends(WoodTerrain, _super);

  function WoodTerrain() {
    WoodTerrain.__super__.constructor.apply(this, arguments);
    this.texture = assets['wood'];
  }

  return WoodTerrain;

})(Terrain);

StoneTerrain = (function(_super) {
  __extends(StoneTerrain, _super);

  function StoneTerrain() {
    StoneTerrain.__super__.constructor.apply(this, arguments);
    this.texture = assets['stone'];
  }

  return StoneTerrain;

})(Terrain);

Item = (function(_super) {
  __extends(Item, _super);

  function Item(name, texture) {
    this.name = name;
    this.texture = texture;
  }

  return Item;

})(IdObject);

Item.idMap = {};

itemType = function(opts) {
  var resultantItem;
  resultantItem = (function(_super) {
    __extends(_Class, _super);

    function _Class() {
      var _ref1, _ref2;
      _Class.__super__.constructor.apply(this, arguments);
      this.texture = opts.texture;
      this.name = opts.name;
      this.item_id = opts.id;
      this.canUseOnTile = opts.useOnTile != null;
      this.useOnTileTime = (_ref1 = opts.useOnTileTime) != null ? _ref1 : 1000 / FRAME_RATE;
      this.canShoot = opts.canShoot;
      this.shootTime = (_ref2 = opts.shootTime) != null ? _ref2 : 1000 / FRAME_RATE;
      this.bullet = function() {
        return opts.bullet.call(this, arguments);
      };
      if (opts.constructor != null) {
        opts.constructor.call(this, arguments);
      }
    }

    _Class.prototype.useOnTile = function(tile) {
      if (opts.useOnTile != null) {
        return opts.useOnTile.call(this, tile);
      } else {
        return false;
      }
    };

    return _Class;

  })(Item);
  Item.idMap[opts.id] = resultantItem;
  resultantItem.name = opts.name;
  resultantItem._item_name = opts.name;
  resultantItem._item_texture = opts.texture;
  resultantItem._item_id = opts.id;
  return resultantItem;
};

Bullet = (function(_super) {
  __extends(Bullet, _super);

  function Bullet(shooter, pos, vector, template) {
    this.shooter = shooter;
    this.pos = pos;
    this.template = template;
    Bullet.__super__.constructor.apply(this, arguments);
    this.pos = this.pos.clone();
    this.texture = this.template.texture;
    this.hit = this.template.hit;
    this.velocity = vector.normalize().mult(this.template.speed);
    this.ticksPassed = 0;
  }

  Bullet.prototype.tick = function() {
    var mob, _j, _len1;
    this.ticksPassed += 1;
    this.pos.translate(this.velocity);
    for (_j = 0, _len1 = MOBS.length; _j < _len1; _j++) {
      mob = MOBS[_j];
      if (mob !== this.shooter) {
        if (this.pos.touchesTile(mob.pos)) {
          this.hit(mob);
          return true;
        }
      }
    }
    if (this.template.tick != null) {
      return this.template.tick.call(this, arguments);
    } else {
      return (this.ticksPassed * 1000 / FRAME_RATE) >= this.template.duration;
    }
  };

  Bullet.prototype.render = function(ctx) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(PLAYER.cameraRotation);
    ctx.translate(SIZE * this.pos.x - PLAYER.pos.x * SIZE, SIZE * this.pos.y - PLAYER.pos.y * SIZE);
    ctx.rotate(Math.atan2(this.velocity.y, this.velocity.x));
    ctx.drawImage(this.texture, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
    return ctx.resetTransform();
  };

  return Bullet;

})(IdObject);

StoneObstacle = (function(_super) {
  __extends(StoneObstacle, _super);

  function StoneObstacle() {
    StoneObstacle.__super__.constructor.call(this, assets['stone'], assets['stone']);
    this.drops.push(new Stone());
  }

  return StoneObstacle;

})(Obstacle);

Stone = itemType({
  texture: assets['stone'],
  name: 'Stone',
  id: 0,
  useOnTileTime: 500,
  useOnTile: function(tile) {
    if (tile.obstacle != null) {
      return false;
    } else {
      tile.obstacle = new StoneObstacle();
      return true;
    }
  }
});

CopperObstacle = (function(_super) {
  __extends(CopperObstacle, _super);

  function CopperObstacle() {
    CopperObstacle.__super__.constructor.apply(this, arguments);
    this.topTexture = this.sideTexture = assets['copper'];
    this.drops.clear();
    this.drops.push(new Copper());
  }

  return CopperObstacle;

})(StoneObstacle);

Copper = itemType({
  texture: assets['copper-ore'],
  name: 'Copper ore',
  id: 10
});

TreeObstacle = (function(_super) {
  __extends(TreeObstacle, _super);

  function TreeObstacle() {
    TreeObstacle.__super__.constructor.call(this, assets['tree-side'], assets['tree-top']);
    this.drops.push(new Wood());
  }

  return TreeObstacle;

})(Obstacle);

WoodObstacle = (function(_super) {
  __extends(WoodObstacle, _super);

  function WoodObstacle() {
    WoodObstacle.__super__.constructor.call(this, assets['wood'], assets['wood']);
    this.drops.push(new Wood());
  }

  return WoodObstacle;

})(Obstacle);

Wood = itemType({
  texture: assets['wood'],
  name: 'Wood',
  id: 1,
  useOnTileTime: 500,
  useOnTile: function(tile) {
    if (tile.obstacle != null) {
      return false;
    } else {
      tile.obstacle = new WoodObstacle();
      return true;
    }
  }
});

WoodPlank = itemType({
  texture: assets['planks'],
  name: 'Wood plank',
  id: 6,
  useOnTileTime: 500,
  useOnTile: function(tile) {
    if ((tile.obstacle != null) || tile.terrain instanceof WoodTerrain) {
      return false;
    } else {
      tile.terrain = new WoodTerrain();
      return true;
    }
  }
});

StoneTile = itemType({
  texture: assets['tile'],
  name: 'Stone tile',
  id: 7,
  useOnTileTime: 500,
  useOnTile: function(tile) {
    if ((tile.obstacle != null) || tile.terrain instanceof StoneTerrain) {
      return false;
    } else {
      tile.terrain = new StoneTerrain();
      return true;
    }
  }
});

Pickaxe = itemType({
  texture: assets['pickaxe'],
  name: 'Pickaxe',
  id: 2,
  constructor: function() {
    return this.quality = 3;
  },
  useOnTileTime: 700,
  useOnTile: function(tile) {
    if (tile.obstacle != null) {
      if (tile.obstacle instanceof StoneObstacle) {
        tile.damageObstacle(this.quality);
      } else {
        tile.damageObstacle(this.quality / 5);
      }
    }
    return false;
  }
});

Axe = itemType({
  texture: assets['axe'],
  name: 'Axe',
  id: 3,
  constructor: function() {
    return this.quality = 3;
  },
  useOnTileTime: 500,
  useOnTile: function(tile) {
    if (tile.obstacle != null) {
      if (tile.obstacle instanceof TreeObstacle || tile.obstacle instanceof WoodObstacle) {
        tile.damageObstacle(this.quality);
      } else {
        tile.damageObstacle(this.quality / 10);
      }
    }
    return false;
  }
});

BattleAxe = itemType({
  texture: assets['battle-axe'],
  name: 'Battle-Axe',
  id: 4,
  canShoot: true,
  shootTime: 1000,
  bullet: function() {
    return {
      texture: assets['bullet'],
      speed: 0.3,
      duration: 200,
      hit: (function(_this) {
        return function(mob) {
          return mob.damage(5);
        };
      })(this)
    };
  }
});

Spear = itemType({
  texture: assets['spear'],
  name: 'Spear',
  id: 9,
  canShoot: true,
  shootTime: 700,
  bullet: function() {
    return {
      texture: assets['bullet'],
      speed: 0.5,
      duration: 100,
      hit: (function(_this) {
        return function(mob) {
          return mob.damage(3);
        };
      })(this)
    };
  }
});

Sword = itemType({
  texture: assets['sword'],
  name: 'Sword',
  id: 5,
  constructor: function() {},
  canShoot: true,
  shootTime: 500,
  bullet: function() {
    return {
      texture: assets['bullet'],
      speed: 0.5,
      duration: 100,
      hit: (function(_this) {
        return function(mob) {
          return mob.damage(4);
        };
      })(this)
    };
  }
});

Dagger = itemType({
  texture: assets['dagger'],
  name: 'Dagger',
  id: 11,
  constructor: function() {},
  canShoot: true,
  shootTime: 150,
  bullet: function() {
    return {
      texture: assets['bullet'],
      speed: 1,
      duration: 30,
      hit: (function(_this) {
        return function(mob) {
          return mob.damage(1);
        };
      })(this)
    };
  }
});

Bow = itemType({
  texture: assets['bow'],
  name: 'Bow',
  id: 8,
  constructor: function() {},
  canShoot: true,
  shootTime: 1000,
  bullet: function() {
    return {
      texture: assets['bullet'],
      speed: 0.7,
      duration: 500,
      hit: (function(_this) {
        return function(mob) {
          return mob.damage(2);
        };
      })(this)
    };
  }
});

Recipe = (function() {
  function Recipe(needs, creates) {
    this.needs = needs;
    this.creates = creates;
  }

  Recipe.prototype.canWork = function(inventory) {
    var key, val, _ref1;
    _ref1 = this.needs;
    for (key in _ref1) {
      val = _ref1[key];
      if (!(key in inventory.counts && inventory.counts[key] >= val)) {
        return false;
      }
    }
    return true;
  };

  Recipe.prototype.attempt = function(inventory) {
    var created, i, key, val, _j, _k, _len1, _ref1, _ref2, _results;
    if (this.canWork(inventory)) {
      _ref1 = this.needs;
      for (key in _ref1) {
        val = _ref1[key];
        for (i = _j = 0; 0 <= val ? _j < val : _j > val; i = 0 <= val ? ++_j : --_j) {
          inventory.removeType(Number(key));
        }
      }
      _ref2 = this.creates;
      _results = [];
      for (_k = 0, _len1 = _ref2.length; _k < _len1; _k++) {
        created = _ref2[_k];
        _results.push(inventory.push(new Item.idMap[created]()));
      }
      return _results;
    } else {
      return false;
    }
  };

  return Recipe;

})();

RECIPES = [
  new Recipe({
    1: 3,
    10: 2
  }, [2]), new Recipe({
    1: 3,
    10: 2
  }, [3]), new Recipe({
    3: 2
  }, [4]), new Recipe({
    1: 1,
    10: 4
  }, [5]), new Recipe({
    1: 1
  }, [6, 6, 6]), new Recipe({
    0: 1
  }, [7, 7]), new Recipe({
    1: 5
  }, [8]), new Recipe({
    1: 4,
    0: 1
  }, [9]), new Recipe({
    1: 1,
    10: 1
  }, [11])
];

Tile = (function(_super) {
  __extends(Tile, _super);

  function Tile(board, pos, terrain, obstacle) {
    this.board = board;
    this.pos = pos;
    this.terrain = terrain;
    this.obstacle = obstacle;
    Tile.__super__.constructor.apply(this, arguments);
    this.seen = false;
    this.inventory = new Inventory(20);
  }

  Tile.prototype.destroyObstacle = function() {
    var el, _j, _len1, _ref1;
    if (this.obstacle != null) {
      _ref1 = this.obstacle.drops.contents;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        el = _ref1[_j];
        this.inventory.push(el);
      }
      return this.obstacle = null;
    }
  };

  Tile.prototype.damageObstacle = function(damage) {
    if (this.obstacle != null) {
      this.obstacle.health -= damage;
      if (this.obstacle.health < 0) {
        return this.destroyObstacle();
      }
    }
  };

  Tile.prototype.render = function(ctx) {
    var drawCorner, img, obstacleHealth;
    if (this.obstacle != null) {
      obstacleHealth = this.obstacle.health / this.obstacle.maxHealth;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.translate(SIZE * this.pos.x - PLAYER.pos.x * SIZE, SIZE * this.pos.y - PLAYER.pos.y * SIZE);
      ctx.rotate(-PLAYER.cameraRotation);
      ctx.translate(0, -SIZE);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.drawImage(this.obstacle.topTexture, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      if ((0.5 < obstacleHealth && obstacleHealth <= 0.7)) {
        ctx.drawImage(assets['crack1'], -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      } else if ((0.3 < obstacleHealth && obstacleHealth <= 0.5)) {
        ctx.drawImage(assets['crack2'], -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      } else if (obstacleHealth <= 0.3) {
        ctx.drawImage(assets['crack3'], -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      }
      drawCorner = (function(_this) {
        return function(n) {
          if ((__modulo(PLAYER.cameraRotation + n, 2 * Math.PI)) < Math.PI) {
            ctx.save();
            ctx.rotate(-PLAYER.cameraRotation);
            ctx.transform(Math.cos(PLAYER.cameraRotation + n + Math.PI / 2), Math.sin(PLAYER.cameraRotation + n + Math.PI / 2), 0, 1, 0, 0);
            ctx.drawImage(_this.obstacle.sideTexture, 0, 0, SIZE, SIZE);
            if ((0.5 < obstacleHealth && obstacleHealth <= 0.7)) {
              ctx.drawImage(assets['crack1'], 0, 0, SIZE, SIZE);
            } else if ((0.3 < obstacleHealth && obstacleHealth <= 0.5)) {
              ctx.drawImage(assets['crack2'], 0, 0, SIZE, SIZE);
            } else if (obstacleHealth <= 0.3) {
              ctx.drawImage(assets['crack3'], 0, 0, SIZE, SIZE);
            }
            return ctx.restore();
          }
        };
      })(this);
      ctx.translate(-SIZE / 2, -SIZE / 2);
      drawCorner(-Math.PI / 2);
      ctx.translate(SIZE, 0);
      drawCorner(0);
      ctx.translate(0, SIZE);
      drawCorner(Math.PI / 2);
      ctx.translate(-SIZE, 0);
      drawCorner(Math.PI);
      return ctx.resetTransform();
    } else {
      img = this.terrain.texture;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.translate(SIZE * this.pos.x - PLAYER.pos.x * SIZE, SIZE * this.pos.y - PLAYER.pos.y * SIZE);
      ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      ctx.rotate(-PLAYER.cameraRotation);
      if (this.inventory.contents.length > 0) {
        ctx.drawImage(this.inventory.contents[this.inventory.contents.length - 1].texture, -ITEMSIZE / 2, -ITEMSIZE / 2, ITEMSIZE, ITEMSIZE);
      }
      return ctx.resetTransform();
    }
  };

  Tile.prototype.passable = function() {
    return this.obstacle != null;
  };

  return Tile;

})(IdObject);

RememberedTile = (function(_super) {
  __extends(RememberedTile, _super);

  function RememberedTile() {
    this.pos = c(0, 0);
  }

  RememberedTile.prototype.update = function(tile) {
    this.obstacle = tile.obstacle != null;
    this.pos.x = tile.pos.x;
    this.pos.y = tile.pos.y;
    if (this.obstacle) {
      this.sideTexture = tile.obstacle.sideTexture;
      this.topTexture = tile.obstacle.topTexture;
      return this.obstacleHealth = tile.obstacle.health / tile.obstacle.maxHealth;
    } else {
      return this.texture = tile.terrain.texture;
    }
  };

  RememberedTile.prototype.render = function(ctx) {
    var drawCorner, _ref1, _ref2;
    if (this.obstacle) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.translate(SIZE * this.pos.x - PLAYER.pos.x * SIZE, SIZE * this.pos.y - PLAYER.pos.y * SIZE);
      ctx.rotate(-PLAYER.cameraRotation);
      ctx.translate(0, -SIZE);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.drawImage(this.topTexture, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      if ((0.5 < (_ref1 = this.obstacleHealth) && _ref1 <= 0.7)) {
        ctx.drawImage(assets['crack1'], -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      } else if ((0.3 < (_ref2 = this.obstacleHealth) && _ref2 <= 0.5)) {
        ctx.drawImage(assets['crack2'], -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      } else if (this.obstacleHealth <= 0.3) {
        ctx.drawImage(assets['crack3'], -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      }
      drawCorner = (function(_this) {
        return function(n) {
          var _ref3, _ref4;
          if ((__modulo(PLAYER.cameraRotation + n, 2 * Math.PI)) < Math.PI) {
            ctx.save();
            ctx.rotate(-PLAYER.cameraRotation);
            ctx.transform(Math.cos(PLAYER.cameraRotation + n + Math.PI / 2), Math.sin(PLAYER.cameraRotation + n + Math.PI / 2), 0, 1, 0, 0);
            ctx.drawImage(_this.sideTexture, 0, 0, SIZE, SIZE);
            if ((0.5 < (_ref3 = _this.obstacleHealth) && _ref3 <= 0.7)) {
              ctx.drawImage(assets['crack1'], 0, 0, SIZE, SIZE);
            } else if ((0.3 < (_ref4 = _this.obstacleHealth) && _ref4 <= 0.5)) {
              ctx.drawImage(assets['crack2'], 0, 0, SIZE, SIZE);
            } else if (_this.obstacleHealth <= 0.3) {
              ctx.drawImage(assets['crack3'], 0, 0, SIZE, SIZE);
            }
            return ctx.restore();
          }
        };
      })(this);
      ctx.translate(-SIZE / 2, -SIZE / 2);
      drawCorner(-Math.PI / 2);
      ctx.translate(SIZE, 0);
      drawCorner(0);
      ctx.translate(0, SIZE);
      drawCorner(Math.PI / 2);
      ctx.translate(-SIZE, 0);
      drawCorner(Math.PI);
      return ctx.resetTransform();
    } else {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.translate(SIZE * this.pos.x - PLAYER.pos.x * SIZE, SIZE * this.pos.y - PLAYER.pos.y * SIZE);
      ctx.drawImage(this.texture, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      return ctx.resetTransform();
    }
  };

  return RememberedTile;

})(IdObject);

Inventory = (function(_super) {
  __extends(Inventory, _super);

  function Inventory(size) {
    this.size = size;
    Inventory.__super__.constructor.apply(this, arguments);
    this.contents = [];
    this.handlers = {
      'change': []
    };
    this.counts = {};
  }

  Inventory.prototype.clear = function() {
    var fn, _j, _len1, _ref1, _results;
    this.contents.length = 0;
    this.counts = {};
    _ref1 = this.handlers.change;
    _results = [];
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      fn = _ref1[_j];
      _results.push(fn());
    }
    return _results;
  };

  Inventory.prototype.push = function(item) {
    var fn, _base, _j, _len1, _name, _ref1;
    if (this.contents.length >= this.size) {
      return false;
    } else {
      this.contents.push(item);
      if ((_base = this.counts)[_name = item.item_id] == null) {
        _base[_name] = 0;
      }
      this.counts[item.item_id] += 1;
      _ref1 = this.handlers.change;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        fn = _ref1[_j];
        fn();
      }
      return true;
    }
  };

  Inventory.prototype.remove = function(item) {
    var el, fn, i, _j, _k, _len1, _len2, _ref1, _ref2;
    _ref1 = this.contents;
    for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
      el = _ref1[i];
      if (el === item) {
        this.contents.splice(i, 1);
        this.counts[item.item_id] -= 1;
        _ref2 = this.handlers.change;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          fn = _ref2[_k];
          fn();
        }
        return item;
      }
    }
    return null;
  };

  Inventory.prototype.removeType = function(id) {
    var el, fn, i, _j, _k, _len1, _len2, _ref1, _ref2;
    _ref1 = this.contents;
    for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
      el = _ref1[i];
      if (el.item_id === id) {
        this.contents.splice(i, 1);
        this.counts[id] -= 1;
        _ref2 = this.handlers.change;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          fn = _ref2[_k];
          fn();
        }
        return el;
      }
    }
    return null;
  };

  Inventory.prototype.on = function(event, fn) {
    var _base;
    if ((_base = this.handlers)[event] == null) {
      _base[event] = [];
    }
    return this.handlers[event].push(fn);
  };

  return Inventory;

})(IdObject);

Mob = (function(_super) {
  __extends(Mob, _super);

  function Mob(board) {
    this.board = board;
    Mob.__super__.constructor.apply(this, arguments);
    this.pos = c(0, 0);
    this.inventory = new Inventory(MOB_INVENTORY_SIZE);
    this.health = 10;
    this.handlers = {
      'status-change': []
    };
  }

  Mob.prototype.tick = function() {};

  Mob.prototype.on = function(event, fn) {
    var _ref1;
    return (_ref1 = this.handlers[event]) != null ? _ref1.push(fn) : void 0;
  };

  Mob.prototype.render = function(ctx) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(PLAYER.cameraRotation);
    ctx.translate(SIZE * (this.pos.x - PLAYER.pos.x), SIZE * (this.pos.y - PLAYER.pos.y));
    ctx.strokeStyle = '#F00';
    ctx.strokeRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
    ctx.rotate(-PLAYER.cameraRotation);
    ctx.drawImage(this.texture, -SIZE / 2, -SIZE, SIZE, SIZE);
    return ctx.resetTransform();
  };

  Mob.prototype.kill = function() {
    var item, targetInventory, _j, _len1, _ref1, _results;
    console.log(this.board.get(this.pos.round()));
    targetInventory = this.board.get(this.pos.round()).inventory;
    _ref1 = this.inventory.contents;
    _results = [];
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      item = _ref1[_j];
      _results.push(targetInventory.push(item));
    }
    return _results;
  };

  Mob.prototype.damage = function(damage) {
    var fn, _j, _len1, _ref1;
    this.health -= damage;
    _ref1 = this.handlers['status-change'];
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      fn = _ref1[_j];
      fn();
    }
    if (this.health < 0) {
      this.kill();
      return true;
    } else {
      return false;
    }
  };

  return Mob;

})(IdObject);

Wanderer = (function(_super) {
  __extends(Wanderer, _super);

  function Wanderer(board) {
    this.board = board;
    Wanderer.__super__.constructor.apply(this, arguments);
    this.currentDirection = Math.random() * 2 * Math.PI;
    this.lastShotTime = new Date();
  }

  Wanderer.prototype.tick = function() {
    var _ref1, _ref2;
    translateOKComponent(this.pos, c(Math.sin(this.currentDirection), Math.cos(this.currentDirection)).mult(MOB_SPEED));
    if (!((0 < (_ref1 = this.pos.x) && _ref1 < this.board.dimensions.x) && (0 < (_ref2 = this.pos.y) && _ref2 < this.board.dimensions.y))) {
      this.currentDirection *= -1;
    }
    if (Math.random() < 0.01) {
      this.currentDirection = Math.random() * 2 * Math.PI;
    }
    if (this.inventory.contents.length > 0 && (new Date()) - this.lastShotTime > this.inventory.contents[0].shootTime) {
      BULLETS.push(new Bullet(this, this.pos, this.pos.to(PLAYER.pos), this.inventory.contents[0].bullet()));
      return this.lastShotTime = new Date();
    }
  };

  return Wanderer;

})(Mob);

Warrior = (function(_super) {
  __extends(Warrior, _super);

  function Warrior() {
    Warrior.__super__.constructor.apply(this, arguments);
    this.health = 20;
    this.texture = assets['warrior'];
    this.inventory.push(new Sword());
  }

  return Warrior;

})(Wanderer);

Rogue = (function(_super) {
  __extends(Rogue, _super);

  function Rogue() {
    Rogue.__super__.constructor.apply(this, arguments);
    this.texture = assets['rogue'];
    this.inventory.push(new Dagger());
  }

  return Rogue;

})(Wanderer);

Player = (function(_super) {
  __extends(Player, _super);

  function Player(board) {
    this.board = board;
    Player.__super__.constructor.apply(this, arguments);
    this.cameraRotation = Math.PI / 4;
    this.seen = {};
    this.usingItem = 0;
    this.health = 100;
    this.texture = assets['wizard'];
  }

  Player.prototype.tick = function() {
    if (this.health < 100) {
      return this.health += 0.01;
    }
  };

  Player.prototype.drawPerspective = function(ctx) {
    var assumedPositions, best, bullet, dir, distance, mob, renderable, renderables, target, tile, visible, _base, _j, _k, _l, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _name, _o, _ref1, _ref2, _ref3;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderables = this.board.getTileArea(this.pos, canvas.width * Math.sqrt(2) / (2 * SIZE) + 1);
    visible = this.board.shadowcast(this.pos, (function(n) {
      return !n.passable();
    }), 250 * Math.sqrt(2) / SIZE + 1);
    dir = c(Math.sin(this.cameraRotation), Math.cos(this.cameraRotation));
    assumedPositions = {};
    best = -Infinity;
    _ref1 = PLAYER.pos.touches();
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      tile = _ref1[_j];
      distance = PLAYER.pos.to(tile).scalarProject(dir);
      if (distance > best) {
        assumedPositions[PLAYER.id] = tile;
        best = distance;
      }
    }
    for (_k = 0, _len2 = BULLETS.length; _k < _len2; _k++) {
      bullet = BULLETS[_k];
      if (!(BOARD.get(bullet.pos.round()).id in visible)) {
        continue;
      }
      renderables.push(bullet);
      best = -Infinity;
      _ref2 = bullet.pos.touches();
      for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
        tile = _ref2[_l];
        distance = PLAYER.pos.to(tile).scalarProject(dir);
        if (distance > best) {
          assumedPositions[bullet.id] = tile;
          best = distance;
        }
      }
    }
    for (_m = 0, _len4 = MOBS.length; _m < _len4; _m++) {
      mob = MOBS[_m];
      if (!(BOARD.get(mob.pos.round()).id in visible)) {
        continue;
      }
      renderables.push(mob);
      best = -Infinity;
      _ref3 = mob.pos.touches();
      for (_n = 0, _len5 = _ref3.length; _n < _len5; _n++) {
        tile = _ref3[_n];
        distance = PLAYER.pos.to(tile).scalarProject(dir);
        if (distance > best) {
          assumedPositions[mob.id] = tile;
          best = distance;
        }
      }
    }
    renderables.sort((function(_this) {
      return function(a, b) {
        if ((a instanceof Mob || a instanceof Bullet) && (b instanceof Tile)) {
          if (_this.pos.to(assumedPositions[a.id]).scalarProject(dir) >= _this.pos.to(b.pos).scalarProject(dir)) {
            return 1;
          } else {
            return -1;
          }
        } else if ((a instanceof Tile) && (b instanceof Mob || b instanceof Bullet)) {
          if (_this.pos.to(a.pos).scalarProject(dir) > _this.pos.to(assumedPositions[b.id]).scalarProject(dir)) {
            return 1;
          } else {
            return -1;
          }
        } else {
          if (_this.pos.to(a.pos).scalarProject(dir) > _this.pos.to(b.pos).scalarProject(dir)) {
            return 1;
          } else {
            return -1;
          }
        }
      };
    })(this));
    for (_o = 0, _len6 = renderables.length; _o < _len6; _o++) {
      renderable = renderables[_o];
      if (renderable.id in visible) {
        if ((_base = this.seen)[_name = renderable.id] == null) {
          _base[_name] = new RememberedTile();
        }
        this.seen[renderable.id].update(renderable);
        renderable.render(ctx);
      } else if (renderable.id in this.seen) {
        ctx.globalAlpha = 0.5;
        this.seen[renderable.id].render(ctx);
        ctx.globalAlpha = 1;
      } else if (renderable instanceof Mob || renderable instanceof Bullet) {
        renderable.render(ctx);
      }
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.cameraRotation);
    target = this.getTarget();
    ctx.strokeStyle = TARGET_FLASHING ? '#000' : '#FF0';
    ctx.strokeRect((target.pos.x - this.pos.x) * SIZE - SIZE / 2, (target.pos.y - this.pos.y) * SIZE - SIZE / 2, SIZE, SIZE);
    return ctx.resetTransform();
  };

  Player.prototype.getTarget = function() {
    var best, candidate, candidates, min, _j, _len1;
    candidates = this.board.getCoordinateArea(this.pos, RANGE);
    best = null;
    min = Infinity;
    for (_j = 0, _len1 = candidates.length; _j < _len1; _j++) {
      candidate = candidates[_j];
      if (candidate.distance(MOUSE_POS) < min && candidate.distance(this.pos) <= RANGE) {
        best = candidate;
        min = candidate.distance(MOUSE_POS);
      }
    }
    return this.board.get(best.x, best.y);
  };

  return Player;

})(Mob);

exports.ShadowQueue = ShadowQueue = (function() {
  function ShadowQueue() {
    this.queue = [];
  }

  ShadowQueue.prototype.emplace = function(startAngle, endAngle) {
    var end, remove, start;
    startAngle = __modulo(startAngle, 360);
    if (endAngle !== 360) {
      endAngle = __modulo(endAngle, 360);
    }
    if (startAngle > endAngle) {
      this.emplace(0, endAngle);
      this.emplace(startAngle, 360);
      return;
    }
    start = 0;
    while (!(this.queue[start] >= startAngle || start >= this.queue.length)) {
      start++;
    }
    end = this.queue.length;
    while (!(this.queue[end] <= endAngle || end < 0)) {
      end--;
    }
    remove = end - start + 1;
    if (__modulo(remove, 2) === 1) {
      if (__modulo(start, 2) === 1) {
        return this.queue.splice(start, remove, endAngle);
      } else {
        return this.queue.splice(start, remove, startAngle);
      }
    } else {
      if (__modulo(start, 2) === 1) {
        return this.queue.splice(start, remove);
      } else {
        return this.queue.splice(start, remove, startAngle, endAngle);
      }
    }
  };

  ShadowQueue.prototype.check = function(startAngle, endAngle) {
    var begin, end, start, _ref1;
    startAngle = __modulo(startAngle, 360);
    if (endAngle !== 360) {
      endAngle = __modulo(endAngle, 360);
    }
    if (startAngle > endAngle) {
      begin = this.check(0, endAngle);
      end = this.check(startAngle, 360);
      if (((_ref1 = ShadowQueue.PARTIAL) === begin || _ref1 === end) || begin !== end) {
        return ShadowQueue.PARTIAL;
      } else {
        return begin;
      }
    }
    start = 0;
    while (!(this.queue[start] > startAngle || start >= this.queue.length)) {
      start++;
    }
    if (this.queue[start] < endAngle) {
      return ShadowQueue.PARTIAL;
    } else {
      if (__modulo(start, 2) === 1) {
        return ShadowQueue.FULL;
      } else {
        return ShadowQueue.NONE;
      }
    }
  };

  return ShadowQueue;

})();

ShadowQueue.PARTIAL = 'PARTIAL';

ShadowQueue.FULL = 'FULL';

ShadowQueue.NONE = 'NONE';

Board = (function(_super) {
  __extends(Board, _super);

  function Board(dimensions) {
    var i, j;
    this.dimensions = dimensions;
    Board.__super__.constructor.apply(this, arguments);
    this.cells = (function() {
      var _j, _ref1, _results;
      _results = [];
      for (i = _j = 0, _ref1 = this.dimensions.x; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        _results.push((function() {
          var _k, _ref2, _results1;
          _results1 = [];
          for (j = _k = 0, _ref2 = this.dimensions.y; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; j = 0 <= _ref2 ? ++_k : --_k) {
            _results1.push(new Tile(this, c(i, j), null, null));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    }).call(this);
  }

  Board.prototype.getCircle = function(_arg, r) {
    var coords, i, x, y, _j, _k, _l, _m, _ref1, _ref2, _ref3, _ref4;
    x = _arg.x, y = _arg.y;
    x = Math.round(x);
    y = Math.round(y);
    r = Math.ceil(r);
    coords = [];
    for (i = _j = 0, _ref1 = r * 2; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      coords.push(c(x - r, y + r - i));
    }
    for (i = _k = 0, _ref2 = r * 2; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
      coords.push(c(x - r + i, y - r));
    }
    for (i = _l = 0, _ref3 = r * 2; 0 <= _ref3 ? _l < _ref3 : _l > _ref3; i = 0 <= _ref3 ? ++_l : --_l) {
      coords.push(c(x + r, y - r + i));
    }
    for (i = _m = 0, _ref4 = r * 2; 0 <= _ref4 ? _m < _ref4 : _m > _ref4; i = 0 <= _ref4 ? ++_m : --_m) {
      coords.push(c(x + r - i, y + r));
    }
    return coords;
  };

  Board.prototype.getCoordinateArea = function(coord, max) {
    var all, circle, el, r, _j, _k, _len1, _ref1, _ref2;
    all = [coord.round()];
    for (r = _j = 0; 0 <= max ? _j <= max : _j >= max; r = 0 <= max ? ++_j : --_j) {
      circle = this.getCircle(coord, r);
      for (_k = 0, _len1 = circle.length; _k < _len1; _k++) {
        el = circle[_k];
        if ((0 <= (_ref1 = el.x) && _ref1 < this.dimensions.x) && (0 <= (_ref2 = el.y) && _ref2 < this.dimensions.y)) {
          all.push(el);
        }
      }
    }
    return all;
  };

  Board.prototype.getTileArea = function(coord, max) {
    return this.getCoordinateArea(coord, max).map((function(_this) {
      return function(x) {
        return _this.get(x);
      };
    })(this));
  };

  Board.prototype.shadowcast = function(coord, see, max) {
    var circle, end, i, queue, r, start, visible, x, y, _j, _len1, _ref1;
    if (max == null) {
      max = 10;
    }
    coord = coord.round();
    visible = {};
    queue = new ShadowQueue();
    r = 0;
    visible[this.get(coord).id] = true;
    while (!(r >= max)) {
      r++;
      circle = this.getCircle(coord, r);
      for (i = _j = 0, _len1 = circle.length; _j < _len1; i = ++_j) {
        _ref1 = circle[i], x = _ref1.x, y = _ref1.y;
        if (!((0 <= x && x < this.dimensions.x) && (0 <= y && y < this.dimensions.y))) {
          continue;
        }
        start = 360 * (2 * i - __modulo(1, 2 * circle.length)) / (2 * circle.length);
        end = 360 * (2 * i + __modulo(1, 2 * circle.length)) / (2 * circle.length);
        if (queue.check(start, end) === ShadowQueue.PARTIAL) {
          visible[this.cells[x][y].id] = false;
        } else if (queue.check(start, end) === ShadowQueue.NONE) {
          visible[this.cells[x][y].id] = true;
        }
        if (!see(this.cells[x][y])) {
          queue.emplace(start, end);
        }
      }
    }
    return visible;
  };

  Board.prototype.allCells = function() {
    var cell, col, i, j, strs, _j, _k, _len1, _len2, _ref1;
    strs = (function() {
      var _j, _ref1, _results;
      _results = [];
      for (i = _j = 0, _ref1 = this.dimensions.height; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        _results.push('');
      }
      return _results;
    }).call(this);
    _ref1 = this.cells;
    for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
      col = _ref1[i];
      for (j = _k = 0, _len2 = col.length; _k < _len2; j = ++_k) {
        cell = col[j];
        strs[j] += cell.charRepr();
      }
    }
    return strs.join('\n');
  };

  Board.prototype.get = function(coord, opt_y) {
    var x, y;
    if (opt_y != null) {
      x = coord;
      y = opt_y;
    } else {
      x = coord.x, y = coord.y;
    }
    if ((0 <= x && x < this.dimensions.x) && (0 <= y && y < this.dimensions.y)) {
      return this.cells[x][y];
    } else {
      return null;
    }
  };

  return Board;

})(IdObject);

canvas.addEventListener('mousewheel', function(event) {
  if (event.wheelDelta > 0) {
    return PLAYER.cameraRotation += 0.1;
  } else {
    return PLAYER.cameraRotation -= 0.1;
  }
});

keysdown = {};

document.body.addEventListener('keydown', function(event) {
  var el, flagForPickup, i, item, playerTile, _j, _k, _len1, _len2, _ref1, _results;
  keysdown[event.which] = true;
  if (event.which === 90) {
    item = PLAYER.inventory.contents[PLAYER.usingItem];
    PLAYER.inventory.remove(item);
    BOARD.get(PLAYER.pos.round()).inventory.push(item);
    if (PLAYER.inventory.contents.length <= PLAYER.usingItem) {
      PLAYER.usingItem = PLAYER.inventory.contents.length - 1;
      return redrawInventory();
    }
  } else if (event.which === 88) {
    playerTile = BOARD.get(PLAYER.pos.round());
    flagForPickup = [];
    _ref1 = playerTile.inventory.contents;
    for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
      el = _ref1[i];
      flagForPickup.push(el);
    }
    _results = [];
    for (i = _k = 0, _len2 = flagForPickup.length; _k < _len2; i = ++_k) {
      el = flagForPickup[i];
      if (PLAYER.inventory.push(el)) {
        _results.push(playerTile.inventory.remove(el));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  }
});

document.body.addEventListener('keyup', function(event) {
  return keysdown[event.which] = false;
});

translateOKComponent = function(pos, v) {
  var _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
  if (v.x > 0 && (((_ref1 = BOARD.get(Math.ceil(pos.x + v.x), Math.floor(pos.y))) != null ? typeof _ref1.passable === "function" ? _ref1.passable() : void 0 : void 0) || ((_ref2 = BOARD.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y))) != null ? typeof _ref2.passable === "function" ? _ref2.passable() : void 0 : void 0))) {
    pos.x = Math.ceil(pos.x);
  } else if (v.x < 0 && (((_ref3 = BOARD.get(Math.floor(pos.x + v.x), Math.floor(pos.y))) != null ? typeof _ref3.passable === "function" ? _ref3.passable() : void 0 : void 0) || ((_ref4 = BOARD.get(Math.floor(pos.x + v.x), Math.ceil(pos.y))) != null ? typeof _ref4.passable === "function" ? _ref4.passable() : void 0 : void 0))) {
    pos.x = Math.floor(pos.x);
  } else {
    pos.x += v.x;
  }
  if (v.y > 0 && (((_ref5 = BOARD.get(Math.floor(pos.x), Math.ceil(pos.y + v.y))) != null ? typeof _ref5.passable === "function" ? _ref5.passable() : void 0 : void 0) || ((_ref6 = BOARD.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y))) != null ? typeof _ref6.passable === "function" ? _ref6.passable() : void 0 : void 0))) {
    return pos.y = Math.ceil(pos.y);
  } else if (v.y < 0 && (((_ref7 = BOARD.get(Math.floor(pos.x), Math.floor(pos.y + v.y))) != null ? typeof _ref7.passable === "function" ? _ref7.passable() : void 0 : void 0) || ((_ref8 = BOARD.get(Math.ceil(pos.x), Math.floor(pos.y + v.y))) != null ? typeof _ref8.passable === "function" ? _ref8.passable() : void 0 : void 0))) {
    return pos.y = Math.floor(pos.y);
  } else {
    return pos.y += v.y;
  }
};

RAW_MOUSE_POS = c(0, 0);

MOUSE_POS = c(0, 0);

canvas.addEventListener('mousemove', function(ev) {
  RAW_MOUSE_POS = c(ev.offsetX - canvas.width / 2, ev.offsetY - canvas.width / 2);
  return updateMousePos();
});

updateMousePos = function() {
  MOUSE_POS = RAW_MOUSE_POS.rotate(-PLAYER.cameraRotation).mult(1 / SIZE);
  return MOUSE_POS.translate(PLAYER.pos);
};

MOUSEDOWN = false;

canvas.addEventListener('mousedown', function(ev) {
  return MOUSEDOWN = true;
});

canvas.addEventListener('mouseup', function(ev) {
  return MOUSEDOWN = false;
});

TARGET_FLASHING = false;

toolUseTick = function() {
  var best, item;
  if (MOUSEDOWN) {
    best = PLAYER.getTarget();
    if (best.pos.distance(PLAYER.pos) >= 1) {
      item = PLAYER.inventory.contents[PLAYER.usingItem];
      if ((item != null) && item.canUseOnTile) {
        TARGET_FLASHING = true;
        setTimeout((function() {
          return TARGET_FLASHING = false;
        }), TARGET_FLASH_TIME);
        if (item.useOnTile(best)) {
          PLAYER.inventory.remove(item);
          if (PLAYER.inventory.contents.length <= PLAYER.usingItem) {
            PLAYER.usingItem = PLAYER.inventory.contents.length - 1;
            redrawInventory();
          }
        }
        setTimeout(toolUseTick, item.useOnTileTime);
        return;
      } else if ((item != null) && item.canShoot) {
        BULLETS.push(new Bullet(PLAYER, PLAYER.pos, PLAYER.pos.to(MOUSE_POS), item.bullet()));
        setTimeout(toolUseTick, item.shootTime);
        return;
      }
    }
  }
  return setTimeout(toolUseTick, 1000 / FRAME_RATE);
};

healthBar = document.getElementById('health-bar');

healthIndicator = document.getElementById('health-indicator');

tick = function() {
  if (keysdown[87]) {
    translateOKComponent(PLAYER.pos, c(Math.sin(PLAYER.cameraRotation), Math.cos(PLAYER.cameraRotation)).mult(-SPEED));
  }
  if (keysdown[83]) {
    translateOKComponent(PLAYER.pos, c(Math.sin(PLAYER.cameraRotation), Math.cos(PLAYER.cameraRotation)).mult(SPEED));
  }
  if (keysdown[65]) {
    translateOKComponent(PLAYER.pos, c(-Math.cos(PLAYER.cameraRotation), Math.sin(PLAYER.cameraRotation)).mult(SPEED));
  }
  if (keysdown[68]) {
    translateOKComponent(PLAYER.pos, c(-Math.cos(PLAYER.cameraRotation), Math.sin(PLAYER.cameraRotation)).mult(-SPEED));
  }
  updateMousePos();
  healthBar.style.width = Math.round(190 * PLAYER.health / 100) + 'px';
  healthIndicator.innerText = "HP: " + (Math.round(PLAYER.health)) + "/100";
  BULLETS = BULLETS.filter(function(x) {
    return !x.tick();
  });
  MOBS = MOBS.filter(function(x) {
    x.tick();
    if (x.health <= 0) {
      return false;
    } else {
      return true;
    }
  });
  PLAYER.drawPerspective(ctx);
  if (PLAYER.health > 0) {
    return setTimeout(tick, 1000 / FRAME_RATE);
  } else {
    ctx.font = '40px Arial';
    ctx.fillStyle = '#000';
    return ctx.fillText('You die...', canvas.width / 2 - ctx.measureText('You die...').width / 2, canvas.height / 2);
  }
};

redrawInventory = function() {
  var i, iCtx, _j;
  for (i = _j = 0; _j < 20; i = ++_j) {
    iCtx = inventoryCanvases[i].getContext('2d');
    iCtx.clearRect(0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE);
    if (PLAYER.inventory.contents[i] != null) {
      iCtx.drawImage(PLAYER.inventory.contents[i].texture, 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE);
      $(inventoryCanvases[i]).tooltipster('content', PLAYER.inventory.contents[i].name);
    } else {
      $(inventoryCanvases[i]).tooltipster('content', '');
    }
    if (i === PLAYER.usingItem) {
      inventoryCanvases[i].style.outline = '1px solid #FF0';
    } else {
      inventoryCanvases[i].style.outline = 'none';
    }
  }
  return renderRecipes();
};

getRecipes = function() {
  return RECIPES.filter(function(recipe) {
    return recipe.canWork(PLAYER.inventory);
  });
};

recipeList = document.getElementById('recipe-list');

renderRecipes = function() {
  var recipe, recipes, _j, _len1, _results;
  recipeList.innerHTML = '';
  recipes = getRecipes();
  _results = [];
  for (_j = 0, _len1 = recipes.length; _j < _len1; _j++) {
    recipe = recipes[_j];
    _results.push((function(recipe) {
      var icon;
      icon = document.createElement('canvas');
      icon.width = icon.height = ITEM_DISPLAY_SIZE;
      icon.style.backgroundColor = '#FFF';
      icon.style.borderRadius = '2px';
      icon.className = 'recipe-canvas';
      icon.addEventListener('click', function() {
        return recipe.attempt(PLAYER.inventory);
      });
      icon.getContext('2d').drawImage(Item.idMap[recipe.creates[0]]._item_texture, 0, 0, ITEM_DISPLAY_SIZE, ITEM_DISPLAY_SIZE);
      return recipeList.appendChild(icon);
    })(recipe));
  }
  return _results;
};

ctx.font = '40px Arial';

ctx.fillStyle = '#FFF';

ctx.fillText('Generating map...', canvas.width / 2 - ctx.measureText('Generating map...').width / 2, canvas.height / 2);

setTimeout((function() {
  var aliveNeighbors, cell, col, i, inventoryList, inventoryTable, j, mob, neighbor, newFlags, oldFlags, tile, tr, x, y, _base, _fn, _j, _k, _l, _len1, _len2, _len3, _len4, _len5, _len6, _len7, _len8, _m, _n, _o, _p, _q, _r, _ref1, _ref10, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9, _s, _t, _u, _v, _w, _x;
  BOARD = new Board(c(500, 500));
  for (_j = 1; _j < 200; _j++) {
    _ref1 = BOARD.getTileArea(c(Math.floor(Math.random() * 500), Math.floor(Math.random() * 200)), Math.ceil(Math.random() * 3) + 1);
    for (_k = 0, _len1 = _ref1.length; _k < _len1; _k++) {
      tile = _ref1[_k];
      tile.obstacle = new CopperObstacle();
    }
  }
  oldFlags = (function() {
    var _l, _results;
    _results = [];
    for (_l = 0; _l < 500; _l++) {
      _results.push((function() {
        var _m, _results1;
        _results1 = [];
        for (y = _m = 0; _m < 250; y = ++_m) {
          _results1.push(Math.random() < 0.3);
        }
        return _results1;
      })());
    }
    return _results;
  })();
  newFlags = (function() {
    var _l, _results;
    _results = [];
    for (_l = 0; _l < 500; _l++) {
      _results.push((function() {
        var _m, _results1;
        _results1 = [];
        for (y = _m = 0; _m < 250; y = ++_m) {
          _results1.push(false);
        }
        return _results1;
      })());
    }
    return _results;
  })();
  for (_l = 1; _l <= 30; _l++) {
    for (x = _m = 0, _len2 = oldFlags.length; _m < _len2; x = ++_m) {
      col = oldFlags[x];
      for (y = _n = 0, _len3 = col.length; _n < _len3; y = ++_n) {
        cell = col[y];
        aliveNeighbors = 0;
        _ref10 = [(_ref2 = oldFlags[x + 1]) != null ? _ref2[y] : void 0, (_ref3 = oldFlags[x]) != null ? _ref3[y + 1] : void 0, (_ref4 = oldFlags[x + 1]) != null ? _ref4[y + 1] : void 0, (_ref5 = oldFlags[x + 1]) != null ? _ref5[y - 1] : void 0, (_ref6 = oldFlags[x - 1]) != null ? _ref6[y + 1] : void 0, (_ref7 = oldFlags[x - 1]) != null ? _ref7[y - 1] : void 0, (_ref8 = oldFlags[x - 1]) != null ? _ref8[y] : void 0, (_ref9 = oldFlags[x]) != null ? _ref9[y - 1] : void 0];
        for (_o = 0, _len4 = _ref10.length; _o < _len4; _o++) {
          neighbor = _ref10[_o];
          if (neighbor) {
            aliveNeighbors++;
          }
        }
        if (aliveNeighbors === 2 || aliveNeighbors === 3) {
          newFlags[x][y] = true;
        } else {
          newFlags[x][y] = false;
        }
      }
    }
    for (x = _p = 0, _len5 = newFlags.length; _p < _len5; x = ++_p) {
      col = newFlags[x];
      for (y = _q = 0, _len6 = col.length; _q < _len6; y = ++_q) {
        cell = col[y];
        oldFlags[x][y] = cell;
      }
    }
  }
  for (x = _r = 0, _len7 = oldFlags.length; _r < _len7; x = ++_r) {
    col = oldFlags[x];
    for (y = _s = 0, _len8 = col.length; _s < _len8; y = ++_s) {
      cell = col[y];
      if (cell) {
        BOARD.cells[x][y].terrain = new Terrain(assets['dirt']);
        if ((_base = BOARD.cells[x][y]).obstacle == null) {
          _base.obstacle = new StoneObstacle();
        }
      } else {
        BOARD.cells[x][y].terrain = new Terrain(assets['dirt']);
        BOARD.cells[x][y].obstacle = null;
      }
    }
  }
  for (x = _t = 0; _t < 500; x = ++_t) {
    for (y = _u = 250; _u < 500; y = ++_u) {
      if (Math.random() < 0.05 * Math.pow(20, y / 250 - 1)) {
        BOARD.cells[x][y].obstacle = new TreeObstacle();
        BOARD.cells[x][y].terrain = new Terrain(assets['dirt']);
      } else {
        BOARD.cells[x][y].terrain = new Terrain(assets['grass']);
      }
    }
  }
  MOBS = [];
  for (_v = 1; _v <= 100; _v++) {
    if (Math.random() < 0.5) {
      mob = new Warrior(BOARD);
    } else {
      mob = new Rogue(BOARD);
    }
    mob.pos = c(Math.random() * 100 - 50 + 250, Math.random() * 100 - 50 + 250);
    MOBS.push(mob);
  }
  PLAYER = new Player(BOARD);
  PLAYER.pos = c(250, 250);
  PLAYER.cameraRotation = Math.PI / 4;
  MOBS.push(PLAYER);
  inventoryList = document.getElementById('inventory-list');
  inventoryTable = document.createElement('table');
  inventoryList.appendChild(inventoryTable);
  inventoryCanvases = [];
  for (i = _w = 0; _w < 4; i = ++_w) {
    tr = document.createElement('tr');
    _fn = function(i, j) {
      var inventoryCanvas, td;
      td = document.createElement('td');
      inventoryCanvas = document.createElement('canvas');
      inventoryCanvas.width = inventoryCanvas.height = ITEM_DISPLAY_SIZE;
      inventoryCanvas.style.borderRadius = '2px';
      inventoryCanvas.className = 'inventory-canvas';
      inventoryCanvases.push(inventoryCanvas);
      td.appendChild(inventoryCanvas);
      td.addEventListener('click', function() {
        if (inventoryCanvases[PLAYER.usingItem] != null) {
          inventoryCanvases[PLAYER.usingItem].style.outline = 'none';
        }
        PLAYER.usingItem = i * 5 + j;
        return inventoryCanvas.style.outline = '1px solid #FF0';
      });
      return tr.appendChild(td);
    };
    for (j = _x = 0; _x < 5; j = ++_x) {
      _fn(i, j);
    }
    inventoryTable.appendChild(tr);
  }
  $('.inventory-canvas').tooltipster();
  PLAYER.inventory.on('change', redrawInventory);
  PLAYER.inventory.push(new Pickaxe());
  PLAYER.inventory.push(new Axe());
  PLAYER.inventory.push(new Spear());
  tick();
  return toolUseTick();
}), 1);


},{}]},{},[1])(1)
});