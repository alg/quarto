var _ = require("lodash");

var Piece = function(tall, round, white, hollow) {
  var self = this;

  var code = 0;
  if (tall) code = code | 1;
  if (!tall) code = code | (1 << 4);
  if (round) code = code | (1 << 8);
  if (!round) code = code | (1 << 12);
  if (white) code = code | (1 << 16);
  if (!white) code = code | (1 << 20);
  if (hollow) code = code | (1 << 24);
  if (!hollow) code = code | (1 << 28);

  self.isTall = function() { return tall; }
  self.isShort = function() { return !tall; }
  self.isRound = function() { return round; }
  self.isSquare = function() { return !round; }
  self.isHollow = function() { return hollow; }
  self.isSolid = function() { return !hollow; }
  self.isWhite = function() { return white; }
  self.isBlack = function() { return !white; }
  self.code = function() { return code; }

  self.toString = function() { return (tall ? "T" : "S") + (round ? "R" : "Q") + (white ? "W" : "B") + (hollow ? "H" : "O"); }

  return self;
}

var Move = function(x, y, pieceForOpponent) {
  this.x = x;
  this.y = y;
  this.pieceForOpponent = pieceForOpponent;

  this.toString = function() {
    return "Move x: " + x + " y: " + y + " pieceForOpponent: " + (pieceForOpponent && pieceForOpponent.toString());
  };

  return this;
}

var Board = function(width, height) {
  var self = this;
  var board = _.fill(Array(height * width), null);

  self.width = width;
  self.height = height;


  self.get = function(x, y) {
    if (x < 0 || x > width - 1 || y < 0 || y > height - 1) throw new Error("Out of board bounds");
    return board[y * width + x];
  }

  self.set = function(x, y, piece) {
    if (self.get(x, y)) throw new Error("Cell is already occupied");
    board[y * width + x] = piece;
  }

  self.placeAndCheck = function(x, y, piece) {
    self.set(x, y, piece);

    var hcode = 0;
    for (var i = 0; i < width; i++) {
      var piece = board[y * width + i];
      var code = piece ? piece.code() : 0;
      hcode = hcode + code;
    }

    var vcode = 0;
    for (var i = 0; i < height; i++) {
      var piece = board[i * width + x];
      var code = piece ? piece.code() : 0;
      vcode = vcode + code;
    };

    var dcode = 0;
    if (x == y) {
      for (var i = 0; i < width; i++) {
        var piece = board[i * width + i];
        var code = piece ? piece.code() : 0;
        dcode = dcode + code;
      }
    } else if (3 - x == y) {
      for (var i = 0; i < width; i++) {
        var piece = board[i * width + (3 - i)];
        var code = piece ? piece.code() : 0;
        dcode = dcode + code;
      }
    }

    // console.log("HCODE=" + hcode.toString(16) + " VCODE=" + vcode.toString(16) + " DCODE=" + dcode.toString(16));

    var win = false;
    for (var i = 0; !win && i < 8; i++) {
      win = ((hcode & 0x0f) == 4) || ((vcode & 0x0f) == 4) || ((dcode & 0x0f) == 4);
      hcode = hcode >> 4;
      vcode = vcode >> 4;
      dcode = dcode >> 4;
    }

    return win;
  }

  self.toString = function() {
    return _.map(_.chunk(board, width), function(l) { return _.map(l, function(i) { return i || "----"; }).join(" "); }).join("\n");
  }

  return self;
}

var Pool = function() {
  var self = this;

  var data = [];
  var t = true;
  var f = false;

  data.push(new Piece(t, t, t, t));
  data.push(new Piece(t, t, t, f));
  data.push(new Piece(t, t, f, t));
  data.push(new Piece(t, t, f, f));
  data.push(new Piece(t, f, t, t));
  data.push(new Piece(t, f, t, f));
  data.push(new Piece(t, f, f, t));
  data.push(new Piece(t, f, f, f));
  data.push(new Piece(f, t, t, t));
  data.push(new Piece(f, t, t, f));
  data.push(new Piece(f, t, f, t));
  data.push(new Piece(f, t, f, f));
  data.push(new Piece(f, f, t, t));
  data.push(new Piece(f, f, t, f));
  data.push(new Piece(f, f, f, t));
  data.push(new Piece(f, f, f, f));
  data = _.shuffle(data);

  self.size = function() {
    return data.length;
  }

  self.at = function(i) {
    return i < 0 || i > data.length - 1 ? null :  data[i];
  }

  self.pullOut = function(piece) {
    data = _.without(data, piece);
  }

  self.contains = function(piece) {
    return _.indexOf(data, piece) != -1;
  }

  self.toString = function() {
    return JSON.stringify(_.map(data, function(e) { return e.toString(); }));
  }

  return self;
}

var State = function() {
  var self = this;
  var pool = new Pool();
  var board = new Board(4, 4);

  self.pool = pool;
  self.board = board;

  self.update = function(move, pieceToMove) {
    var win = false;

    if (pieceToMove != null) {
      win = board.placeAndCheck(move.x, move.y, pieceToMove);
    }

    if (move.pieceForOpponent) {
      if (!pool.contains(move.pieceForOpponent)) {
        throw new Error("There's no such piece in the pool. You lose.");
      }

      pool.pullOut(move.pieceForOpponent);
    }

    return win;
  }

  self.isFinal = function() {
    return pool.length == 0;
  }

  return self;
}


var StateForPlayers = function(_state) {
  var self = this;

  self.boardWidth = function() { return _state.board.width; }
  self.boardHeight = function() { return _state.board.height; }
  self.boardAt = function(x, y) { return _state.board.get(x, y); }

  self.poolSize = function() { return _state.pool.size(); }
  self.poolAt = function(i) { return _state.pool.at(i); }

  return self;
};


function run(algo1, algo2, opts) {
  opts = opts || {};

  var winner = doRun(algo1, algo2, opts);
  if (opts.onFinish) opts.onFinish(winner);

  return winner;
}

function doRun(algo1, algo2, opts) {
  opts = opts || {};
  var onMove = opts.onMove || (function() {});

  var _state = new State();
  var state = new StateForPlayers(_state);

  var player = Math.random() > 0.5 ? algo1 : algo2;
  var opponent = player == algo1 ? algo2 : algo1;
  var piece = null;

  if (opts.onStart) opts.onStart(player, opponent);

  try {
    do {
      var move = player.makeMove(state, piece);
      var won = _state.update(move, piece);

      onMove(player, piece, move, _state.board);

      if (won) return player;

      var tmp = player;
      player = opponent;
      opponent = tmp;

      piece = move.pieceForOpponent;
    } while (!_state.isFinal() && piece);

    return null;
  } catch (ex) {
    console.log(ex);
    return opponent;
  }
}

var RandomAlgo = function(name) {
  var self = this;

  self.name = name;
  self.makeMove = function(state, piece) {
    var nextPiece = state.poolAt(0);
    var x = null;
    var y = null;

    if (nextPiece) {
      if (piece) {
        var spots = [];

        for (var y = 0; y < state.boardHeight(); y++) {
          for (var x = 0; x < state.boardWidth(); x++) {
            if (!state.boardAt(x, y)) spots.push([ x, y ]);
          }
        }

        var spot = _.shuffle(spots)[0];
        x = spot[0];
        y = spot[1];
      }

      return new Move(x, y, nextPiece);
    } else {
      return new Move(null, null, null);
    }
  }

  return self;
};

var algo1 = new RandomAlgo("algo1");
var algo2 = new RandomAlgo("algo2");

var w = run(algo1, algo2, {
  // on game start
  onStart: function(bot1, bot2) {
    console.log("Game between " + bot1.name + " and " + bot2.name);
  },

  // on game finish. Winner or null if a draw
  onFinish: function(winner) {
    console.log("\n======================================\n");
    console.log("Winner: " + (winner ? winner.name : "Draw"));
  },

  // on move
  onMove: function(bot, piece, move, board) {
    console.log("\n=== " + bot.name + " ===================================\n");

    if (move.x != null) console.log(piece + " --> " + move.x + ":" + move.y);
    if (move.pieceForOpponent != null) console.log(move.pieceForOpponent.toString());
    console.log("\n" + board.toString());
  }
});

