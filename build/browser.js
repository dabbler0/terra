!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.terra=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var BOARD, Board, IdObject, Inventory, MOUSE_POS, Mob, Obstacle, PLAYER, Player, RANGE, RAW_MOUSE_POS, SIZE, SPEED, ShadowQueue, Terrain, Tile, Vector, aliveNeighbors, c, canvas, cell, col, ctx, dirt, grass, keysdown, neighbor, newFlags, oldFlags, s, stone, tick, tool, translateOKComponent, uns, updateMousePos, wiz, x, y, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _o, _p, _q, _r, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __modulo = function(a, b) { return (a % b + +b) % b; };

canvas = document.getElementById('viewport');

ctx = canvas.getContext('2d');

stone = document.getElementById('stone-image');

dirt = document.getElementById('dirt-image');

grass = document.getElementById('grass-image');

wiz = document.getElementById('wizard-image');

SPEED = 0.3;

SIZE = 40;

RANGE = 2;

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

  Vector.prototype.translate = function(other) {
    this.x += other.x;
    return this.y += other.y;
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

  return Vector;

})();

c = function(x, y) {
  return new Vector(x, y);
};

s = function(x, y) {
  return x + ' ' + y;
};

uns = function(s) {
  var x, y, _ref;
  _ref = s.split(' ').map(function(n) {
    return Number(n);
  }), x = _ref[0], y = _ref[1];
  return c(x, y);
};

Obstacle = (function(_super) {
  __extends(Obstacle, _super);

  function Obstacle(texture) {
    this.texture = texture;
    Obstacle.__super__.constructor.apply(this, arguments);
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

Inventory = (function(_super) {
  __extends(Inventory, _super);

  function Inventory() {
    this.contents = [];
  }

  return Inventory;

})(IdObject);

Obstacle = (function(_super) {
  __extends(Obstacle, _super);

  function Obstacle(texture) {
    this.texture = texture;
    Obstacle.__super__.constructor.apply(this, arguments);
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

Inventory = (function(_super) {
  __extends(Inventory, _super);

  function Inventory() {
    this.contents = [];
  }

  return Inventory;

})(IdObject);

Tile = (function(_super) {
  __extends(Tile, _super);

  function Tile(board, pos, terrain, obstacle) {
    this.board = board;
    this.pos = pos;
    this.terrain = terrain;
    this.obstacle = obstacle;
    Tile.__super__.constructor.apply(this, arguments);
    this.seen = false;
    this.inventory = new Inventory();
  }

  Tile.prototype.render = function(ctx) {
    var drawCorner, img;
    if (this.obstacle != null) {
      img = this.obstacle.texture;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.translate(SIZE * this.pos.x - PLAYER.pos.x * SIZE, SIZE * this.pos.y - PLAYER.pos.y * SIZE);
      ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      ctx.rotate(-PLAYER.cameraRotation);
      ctx.translate(0, -SIZE);
      ctx.rotate(PLAYER.cameraRotation);
      ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
      drawCorner = function(n) {
        if ((__modulo(PLAYER.cameraRotation + n, 2 * Math.PI)) < Math.PI) {
          ctx.save();
          ctx.rotate(-PLAYER.cameraRotation);
          ctx.transform(Math.cos(PLAYER.cameraRotation + n + Math.PI / 2), Math.sin(PLAYER.cameraRotation + n + Math.PI / 2), 0, 1, 0, 0);
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          return ctx.restore();
        }
      };
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
      return ctx.resetTransform();
    }
  };

  Tile.prototype.passable = function() {
    return this.obstacle != null;
  };

  return Tile;

})(IdObject);

Mob = (function() {
  function Mob(board) {
    this.board = board;
    this.pos = c(0, 0);
  }

  return Mob;

})();

Player = (function(_super) {
  __extends(Player, _super);

  function Player(board) {
    this.board = board;
    Player.__super__.constructor.apply(this, arguments);
    this.cameraRotation = Math.PI / 4;
    this.seen = {};
  }

  Player.prototype.render = function(ctx) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.cameraRotation);
    ctx.strokeStyle = '#F00';
    ctx.strokeRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
    ctx.rotate(-this.cameraRotation);
    ctx.drawImage(wiz, -SIZE / 2, -SIZE, SIZE, SIZE);
    return ctx.resetTransform();
  };

  Player.prototype.drawPerspective = function(ctx) {
    var dir, renderable, renderables, target, visible, _i, _len;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderables = this.board.getTileArea(this.pos, canvas.width * Math.sqrt(2) / (2 * SIZE) + 1);
    renderables.push(this);
    dir = c(Math.sin(this.cameraRotation), Math.cos(this.cameraRotation));
    renderables.sort((function(_this) {
      return function(a, b) {
        if ((a instanceof Mob) && (b instanceof Tile)) {
          if (_this.pos.to(a.pos).scalarProject(dir) > _this.pos.to(b.pos).scalarProject(dir) || a.pos.distance(b.pos) <= 1) {
            return 1;
          } else {
            return -1;
          }
        } else if ((a instanceof Tile) && (b instanceof Mob)) {
          if (_this.pos.to(a.pos).scalarProject(dir) > _this.pos.to(b.pos).scalarProject(dir) && a.pos.distance(b.pos) > 1) {
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
    visible = this.board.shadowcast(this.pos, (function(n) {
      return !n.passable();
    }), 250 * Math.sqrt(2) / SIZE + 1);
    for (_i = 0, _len = renderables.length; _i < _len; _i++) {
      renderable = renderables[_i];
      if (renderable.id in visible) {
        this.seen[renderable.id] = true;
        renderable.render(ctx);
      } else if (renderable.id in this.seen) {
        ctx.globalAlpha = 0.5;
        renderable.render(ctx);
        ctx.globalAlpha = 1;
      } else if (renderable instanceof Mob) {
        renderable.render(ctx);
      }
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.cameraRotation);
    target = this.getTarget();
    ctx.strokeStyle = '#FF0';
    ctx.strokeRect((target.pos.x - this.pos.x) * SIZE - SIZE / 2, (target.pos.y - this.pos.y) * SIZE - SIZE / 2, SIZE, SIZE);
    return ctx.resetTransform();
  };

  Player.prototype.getTarget = function() {
    var best, candidate, candidates, min, _i, _len;
    candidates = this.board.getCoordinateArea(this.pos, RANGE);
    best = null;
    min = Infinity;
    for (_i = 0, _len = candidates.length; _i < _len; _i++) {
      candidate = candidates[_i];
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
    var begin, end, start, _ref;
    startAngle = __modulo(startAngle, 360);
    if (endAngle !== 360) {
      endAngle = __modulo(endAngle, 360);
    }
    if (startAngle > endAngle) {
      begin = this.check(0, endAngle);
      end = this.check(startAngle, 360);
      if (((_ref = ShadowQueue.PARTIAL) === begin || _ref === end) || begin !== end) {
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
      var _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = this.dimensions.x; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push((function() {
          var _j, _ref1, _results1;
          _results1 = [];
          for (j = _j = 0, _ref1 = this.dimensions.y; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
            _results1.push(new Tile(this, c(i, j), null, null));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    }).call(this);
  }

  Board.prototype.getCircle = function(_arg, r) {
    var coords, i, x, y, _i, _j, _k, _l, _ref, _ref1, _ref2, _ref3;
    x = _arg.x, y = _arg.y;
    x = Math.round(x);
    y = Math.round(y);
    r = Math.ceil(r);
    coords = [];
    for (i = _i = 0, _ref = r * 2; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      coords.push(c(x - r, y + r - i));
    }
    for (i = _j = 0, _ref1 = r * 2; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      coords.push(c(x - r + i, y - r));
    }
    for (i = _k = 0, _ref2 = r * 2; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
      coords.push(c(x + r, y - r + i));
    }
    for (i = _l = 0, _ref3 = r * 2; 0 <= _ref3 ? _l < _ref3 : _l > _ref3; i = 0 <= _ref3 ? ++_l : --_l) {
      coords.push(c(x + r - i, y + r));
    }
    return coords;
  };

  Board.prototype.getCoordinateArea = function(coord, max) {
    var all, circle, el, r, _i, _j, _len;
    all = [coord.round()];
    for (r = _i = 0; 0 <= max ? _i <= max : _i >= max; r = 0 <= max ? ++_i : --_i) {
      circle = this.getCircle(coord, r);
      for (_j = 0, _len = circle.length; _j < _len; _j++) {
        el = circle[_j];
        all.push(el);
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
    var circle, end, i, queue, r, start, visible, x, y, _i, _len, _ref;
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
      for (i = _i = 0, _len = circle.length; _i < _len; i = ++_i) {
        _ref = circle[i], x = _ref.x, y = _ref.y;
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
    var cell, col, i, j, strs, _i, _j, _len, _len1, _ref;
    strs = (function() {
      var _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = this.dimensions.height; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push('');
      }
      return _results;
    }).call(this);
    _ref = this.cells;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      col = _ref[i];
      for (j = _j = 0, _len1 = col.length; _j < _len1; j = ++_j) {
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
    return this.cells[x][y];
  };

  return Board;

})(IdObject);

document.body.addEventListener('mousewheel', function(event) {
  if (event.wheelDelta > 0) {
    return PLAYER.cameraRotation += 0.1;
  } else {
    return PLAYER.cameraRotation -= 0.1;
  }
});

keysdown = {};

tool = false;

document.body.addEventListener('keydown', function(event) {
  keysdown[event.which] = true;
  if (event.which === 49) {
    tool = false;
  }
  if (event.which === 50) {
    return tool = true;
  }
});

document.body.addEventListener('keyup', function(event) {
  return keysdown[event.which] = false;
});

translateOKComponent = function(pos, v) {
  if (v.x > 0 && (BOARD.get(Math.ceil(pos.x + v.x), Math.floor(pos.y)).passable() || BOARD.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y)).passable())) {
    pos.x = Math.ceil(pos.x);
  } else if (v.x < 0 && (BOARD.get(Math.floor(pos.x + v.x), Math.floor(pos.y)).passable() || BOARD.get(Math.floor(pos.x + v.x), Math.ceil(pos.y)).passable())) {
    pos.x = Math.floor(pos.x);
  } else {
    pos.x += v.x;
  }
  if (v.y > 0 && (BOARD.get(Math.floor(pos.x), Math.ceil(pos.y + v.y)).passable() || BOARD.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y)).passable())) {
    return pos.y = Math.ceil(pos.y);
  } else if (v.y < 0 && (BOARD.get(Math.floor(pos.x), Math.floor(pos.y + v.y)).passable() || BOARD.get(Math.ceil(pos.x), Math.floor(pos.y + v.y)).passable())) {
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

canvas.addEventListener('click', function(ev) {
  var best;
  best = PLAYER.getTarget();
  if (tool) {
    return best.obstacle = null;
  } else {
    return best.obstacle = new Obstacle(stone);
  }
});

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
  PLAYER.drawPerspective(ctx);
  return setTimeout(tick, 1000 / 50);
};

BOARD = new Board(c(500, 500));

oldFlags = (function() {
  var _i, _results;
  _results = [];
  for (_i = 0; _i < 500; _i++) {
    _results.push((function() {
      var _j, _results1;
      _results1 = [];
      for (y = _j = 0; _j < 250; y = ++_j) {
        _results1.push(Math.random() < 0.3);
      }
      return _results1;
    })());
  }
  return _results;
})();

newFlags = (function() {
  var _i, _results;
  _results = [];
  for (_i = 0; _i < 500; _i++) {
    _results.push((function() {
      var _j, _results1;
      _results1 = [];
      for (y = _j = 0; _j < 250; y = ++_j) {
        _results1.push(false);
      }
      return _results1;
    })());
  }
  return _results;
})();

for (_i = 1; _i <= 30; _i++) {
  for (x = _j = 0, _len = oldFlags.length; _j < _len; x = ++_j) {
    col = oldFlags[x];
    for (y = _k = 0, _len1 = col.length; _k < _len1; y = ++_k) {
      cell = col[y];
      aliveNeighbors = 0;
      _ref8 = [(_ref = oldFlags[x + 1]) != null ? _ref[y] : void 0, (_ref1 = oldFlags[x]) != null ? _ref1[y + 1] : void 0, (_ref2 = oldFlags[x + 1]) != null ? _ref2[y + 1] : void 0, (_ref3 = oldFlags[x + 1]) != null ? _ref3[y - 1] : void 0, (_ref4 = oldFlags[x - 1]) != null ? _ref4[y + 1] : void 0, (_ref5 = oldFlags[x - 1]) != null ? _ref5[y - 1] : void 0, (_ref6 = oldFlags[x - 1]) != null ? _ref6[y] : void 0, (_ref7 = oldFlags[x]) != null ? _ref7[y - 1] : void 0];
      for (_l = 0, _len2 = _ref8.length; _l < _len2; _l++) {
        neighbor = _ref8[_l];
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
  for (x = _m = 0, _len3 = newFlags.length; _m < _len3; x = ++_m) {
    col = newFlags[x];
    for (y = _n = 0, _len4 = col.length; _n < _len4; y = ++_n) {
      cell = col[y];
      oldFlags[x][y] = cell;
    }
  }
}

for (x = _o = 0, _len5 = oldFlags.length; _o < _len5; x = ++_o) {
  col = oldFlags[x];
  for (y = _p = 0, _len6 = col.length; _p < _len6; y = ++_p) {
    cell = col[y];
    if (cell) {
      BOARD.cells[x][y].terrain = new Terrain(dirt);
      BOARD.cells[x][y].obstacle = new Obstacle(stone);
    } else {
      BOARD.cells[x][y].terrain = new Terrain(dirt);
    }
  }
}

for (x = _q = 0; _q < 500; x = ++_q) {
  for (y = _r = 250; _r < 500; y = ++_r) {
    if (Math.random() < 0.05) {
      BOARD.cells[x][y].obstacle = new Obstacle(dirt);
      BOARD.cells[x][y].terrain = new Terrain(dirt);
    } else {
      BOARD.cells[x][y].terrain = new Terrain(grass);
    }
  }
}

PLAYER = new Player(BOARD);

PLAYER.pos = c(250, 250);

PLAYER.cameraRotation = Math.PI / 4;

tick();


/*
 * Helpers
dedupe = (array) ->
  result = []
  for el, i in array
    result.push el unless el in result
  return result

 * Basic game entities
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

 * An Inventory is a collection of items,
 * like that in a bag, chest, mob inventory, or on the floor
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
 */


},{}]},{},[1])(1)
});