!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.terra=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Board, IdObject, POS, SIZE, SPEED, ShadowQueue, Tile, Vector, bad, board, c, canvas, ctx, drawBlock, drawTile, grass, img, keysdown, redraw, rot, s, stroke, tick, translateOKComponent, uns,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __modulo = function(a, b) { return (a % b + +b) % b; };

canvas = document.getElementById('viewport');

ctx = canvas.getContext('2d');

img = document.getElementById('stone-image');

grass = document.getElementById('grass-image');

SPEED = 0.3;

SIZE = 40;

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

POS = c(250, 250);

Tile = (function(_super) {
  __extends(Tile, _super);

  function Tile(board, pos, hasObstacle) {
    this.board = board;
    this.pos = pos;
    this.hasObstacle = hasObstacle;
    this.seen = false;
  }

  return Tile;

})(IdObject);

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
            _results1.push(new Tile(this, c(i, j), Math.random() < 0.3));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    }).call(this);
  }

  Board.prototype.getCircle = function(x, y, r) {
    var coords, i, _i, _j, _k, _l, _ref, _ref1, _ref2, _ref3;
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

  Board.prototype.getArea = function(x, y, max) {
    var all, circle, el, r, _i, _j, _len;
    all = [];
    for (r = _i = 0; 0 <= max ? _i <= max : _i >= max; r = 0 <= max ? ++_i : --_i) {
      circle = this.getCircle(x, y, r);
      for (_j = 0, _len = circle.length; _j < _len; _j++) {
        el = circle[_j];
        all.push(el);
      }
    }
    return all;
  };

  Board.prototype.shadowcast = function(coord, see, max, qp) {
    var circle, end, i, key, queue, r, result, start, val, visible, x, y, _i, _len, _ref;
    if (max == null) {
      max = 10;
    }
    if (qp == null) {
      qp = [];
    }
    coord = coord.round();
    visible = {};
    queue = new ShadowQueue();
    r = 0;
    visible[s(coord.x, coord.y)] = true;
    while (!(r >= max)) {
      r++;
      circle = this.getCircle(coord.x, coord.y, r);
      for (i = _i = 0, _len = circle.length; _i < _len; i = ++_i) {
        _ref = circle[i], x = _ref.x, y = _ref.y;
        if (!((0 <= x && x < this.dimensions.x) && (0 <= y && y < this.dimensions.y))) {
          continue;
        }
        start = 360 * (2 * i - __modulo(1, 2 * circle.length)) / (2 * circle.length);
        end = 360 * (2 * i + __modulo(1, 2 * circle.length)) / (2 * circle.length);
        if (queue.check(start, end) === ShadowQueue.PARTIAL) {
          visible[s(x, y)] = false;
        } else if (queue.check(start, end) === ShadowQueue.NONE) {
          visible[s(x, y)] = true;
        }
        if (!see(this.cells[x][y])) {
          queue.emplace(start, end);
        }
      }
    }
    qp.push(queue);
    result = [];
    for (key in visible) {
      val = visible[key];
      if (val) {
        result.push(uns(key));
      }
    }
    return result;
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

  Board.prototype.get = function(x, y) {
    return this.cells[x][y];
  };

  Board.prototype.touches = function(vector) {
    var highx, highy, lowx, lowy;
    lowx = Math.floor(vector.x);
    highx = Math.ceil(vector.x);
    lowy = Math.floor(vector.y);
    highy = Math.ceil(vector.y);
    return [this.get(lowx, lowy), this.get(lowx, highy), this.get(highx, lowy), this.get(highx, highy)];
  };

  Board.prototype.on = function(vector) {
    return this.get(Math.round(vector.x), Math.round(vector.y));
  };

  return Board;

})(IdObject);

stroke = function(ctx, path) {
  var vector, _i, _len;
  ctx.beginPath();
  ctx.moveto(path[0].x, path[0].y);
  for (_i = 0, _len = path.length; _i < _len; _i++) {
    vector = path[_i];
    ctx.moveto(vector.x, vector.y);
  }
  return ctx.stroke();
};

drawBlock = function(rotation, vector) {
  var drawCorner;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotation);
  ctx.translate(vector.x - POS.x * SIZE, vector.y - POS.y * SIZE);
  ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
  ctx.rotate(-rotation);
  ctx.translate(0, -SIZE);
  ctx.rotate(rotation);
  ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
  drawCorner = function(n) {
    if ((__modulo(rotation + n, 2 * Math.PI)) < Math.PI) {
      ctx.save();
      ctx.rotate(-rotation);
      ctx.transform(Math.cos(rotation + n + Math.PI / 2), Math.sin(rotation + n + Math.PI / 2), 0, 1, 0, 0);
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
};

drawTile = function(rotation, vector) {
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotation);
  ctx.translate(vector.x - POS.x * SIZE, vector.y - POS.y * SIZE);
  ctx.drawImage(grass, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
  ctx.rotate(-rotation);
  return ctx.resetTransform();
};

board = new Board(c(500, 500));

rot = Math.PI / 4;

redraw = function() {
  var area, coord, dir, queue, _i, _j, _len, _len1;
  ctx.clearRect(0, 0, 500, 500);
  queue = [];
  ctx.globalAlpha = 0.5;
  area = board.getArea(POS.x, POS.y, 250 * Math.sqrt(2) / SIZE + 1);
  for (_i = 0, _len = area.length; _i < _len; _i++) {
    coord = area[_i];
    if (board.cells[coord.x][coord.y].seen) {
      if (board.cells[coord.x][coord.y].hasObstacle) {
        drawBlock(rot, coord.mult(SIZE));
      } else {
        drawTile(rot, coord.mult(SIZE));
      }
    }
  }
  ctx.globalAlpha = 1;
  queue = board.shadowcast(POS, (function(n) {
    return !n.hasObstacle;
  }), 250 * Math.sqrt(2) / SIZE + 1);
  dir = c(Math.sin(rot), Math.cos(rot));
  queue.sort(function(a, b) {
    if (POS.to(a).scalarProject(dir) > POS.to(b).scalarProject(dir)) {
      return 1;
    } else {
      return -1;
    }
  });
  for (_j = 0, _len1 = queue.length; _j < _len1; _j++) {
    coord = queue[_j];
    board.cells[coord.x][coord.y].seen = true;
    if (board.cells[coord.x][coord.y].hasObstacle) {
      drawBlock(rot, coord.mult(SIZE));
    } else {
      drawTile(rot, coord.mult(SIZE));
    }
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rot);
  ctx.strokeStyle = '#F00';
  ctx.strokeRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
  return ctx.resetTransform();
};

document.body.addEventListener('mousewheel', function(event) {
  if (event.wheelDelta > 0) {
    return rot += 0.1;
  } else {
    return rot -= 0.1;
  }
});

keysdown = {};

document.body.addEventListener('keydown', function(event) {
  return keysdown[event.which] = true;
});

document.body.addEventListener('keyup', function(event) {
  return keysdown[event.which] = false;
});

bad = function(pos) {
  var touch, touches, _i, _len;
  touches = board.touches(pos);
  for (_i = 0, _len = touches.length; _i < _len; _i++) {
    touch = touches[_i];
    if (touch.hasObstacle) {
      return true;
    }
  }
  return false;
};

translateOKComponent = function(pos, v) {
  if (v.x > 0 && (board.get(Math.ceil(pos.x + v.x), Math.floor(pos.y)).hasObstacle || board.get(Math.ceil(pos.x + v.x), Math.ceil(pos.y)).hasObstacle)) {
    pos.x = Math.ceil(pos.x);
  } else if (v.x < 0 && (board.get(Math.floor(pos.x + v.x), Math.floor(pos.y)).hasObstacle || board.get(Math.floor(pos.x + v.x), Math.ceil(pos.y)).hasObstacle)) {
    pos.x = Math.floor(pos.x);
  } else {
    pos.x += v.x;
  }
  if (v.y > 0 && (board.get(Math.floor(pos.x), Math.ceil(pos.y + v.y)).hasObstacle || board.get(Math.ceil(pos.x), Math.ceil(pos.y + v.y)).hasObstacle)) {
    return pos.y = Math.ceil(pos.y);
  } else if (v.y < 0 && (board.get(Math.floor(pos.x), Math.floor(pos.y + v.y)).hasObstacle || board.get(Math.ceil(pos.x), Math.floor(pos.y + v.y)).hasObstacle)) {
    return pos.y = Math.floor(pos.y);
  } else {
    return pos.y += v.y;
  }
};

canvas.addEventListener('click', function(ev) {
  var coord, rawCoord, result, tile;
  rawCoord = c(ev.offsetX - canvas.width / 2, ev.offsetY - canvas.width / 2);
  coord = rawCoord.rotate(-rot);
  coord.translate(POS.mult(SIZE));
  result = coord.mult(1 / SIZE).round();
  console.log('resultant coord', result, POS);
  tile = board.get(result.x, result.y);
  return tile.hasObstacle = !tile.hasObstacle;
});

tick = function() {
  if (keysdown[87]) {
    translateOKComponent(POS, c(Math.sin(rot), Math.cos(rot)).mult(-SPEED));
  }
  if (keysdown[83]) {
    translateOKComponent(POS, c(Math.sin(rot), Math.cos(rot)).mult(SPEED));
  }
  if (keysdown[65]) {
    translateOKComponent(POS, c(-Math.cos(rot), Math.sin(rot)).mult(SPEED));
  }
  if (keysdown[68]) {
    translateOKComponent(POS, c(-Math.cos(rot), Math.sin(rot)).mult(-SPEED));
  }
  redraw();
  return setTimeout(tick, 1000 / 50);
};

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