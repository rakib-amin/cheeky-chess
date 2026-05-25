(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ChessEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  // Board: flat array of 64 strings
  // Index 0 = a8, index 7 = h8, index 8 = a7, ..., index 63 = h1
  // Pieces: "wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK"
  // Empty squares: ""

  function coordToIndex(coord) {
    // "a8" -> 0, "h8" -> 7, "a1" -> 56, "h1" -> 63
    var file = coord.charCodeAt(0) - 97; // 'a'=0 .. 'h'=7
    var rank = parseInt(coord[1]);       // 1..8
    return (8 - rank) * 8 + file;
  }

  function indexToCoord(index) {
    var file = index % 8;
    var rank = 8 - Math.floor(index / 8);
    return String.fromCharCode(97 + file) + rank;
  }

  function emptyBoardFlat() {
    var b = [];
    for (var i = 0; i < 64; i++) b.push("");
    return b;
  }

  // Apply move: returns new board (immutable)
  // from, to: coordinate strings like "e2", "e4"
  function applyMove(board, from, to) {
    var b = board.slice();
    var fi = coordToIndex(from);
    var ti = coordToIndex(to);
    var piece = b[fi];
    if (!piece) return b; // no piece at source

    b[fi] = "";
    // Pawn promotion: white pawn reaching rank 8 (index 0-7), black pawn reaching rank 1 (index 56-63)
    var color = piece[0];
    var type  = piece[1];
    if (type === 'P') {
      var toRank = parseInt(to[1]);
      if (color === 'w' && toRank === 8) {
        b[ti] = 'wQ';
        return b;
      }
      if (color === 'b' && toRank === 1) {
        b[ti] = 'bQ';
        return b;
      }
    }
    b[ti] = piece;
    return b;
  }

  // FEN piece placement to our format
  // FEN uppercase = white, lowercase = black
  // FEN chars: P/p=pawn, N/n=knight, B/b=bishop, R/r=rook, Q/q=queen, K/k=king
  var FEN_MAP = {
    'P': 'wP', 'N': 'wN', 'B': 'wB', 'R': 'wR', 'Q': 'wQ', 'K': 'wK',
    'p': 'bP', 'n': 'bN', 'b': 'bB', 'r': 'bR', 'q': 'bQ', 'k': 'bK'
  };

  var PIECE_TO_FEN = {
    'wP': 'P', 'wN': 'N', 'wB': 'B', 'wR': 'R', 'wQ': 'Q', 'wK': 'K',
    'bP': 'p', 'bN': 'n', 'bB': 'b', 'bR': 'r', 'bQ': 'q', 'bK': 'k'
  };

  function parseFEN(fen) {
    var parts = fen.split(' ');
    var placement = parts[0];
    var activeColor = parts[1] || 'w'; // 'w' or 'b'

    var board = emptyBoardFlat();
    var idx = 0;
    for (var i = 0; i < placement.length; i++) {
      var ch = placement[i];
      if (ch === '/') continue;
      var num = parseInt(ch);
      if (!isNaN(num)) {
        idx += num;
      } else {
        board[idx] = FEN_MAP[ch] || "";
        idx++;
      }
    }
    return { board: board, activeColor: activeColor };
  }

  function getFEN(board, activeColor) {
    var rows = [];
    for (var rank = 0; rank < 8; rank++) {
      var row = '';
      var empty = 0;
      for (var file = 0; file < 8; file++) {
        var piece = board[rank * 8 + file];
        if (!piece) {
          empty++;
        } else {
          if (empty > 0) { row += empty; empty = 0; }
          row += PIECE_TO_FEN[piece] || '?';
        }
      }
      if (empty > 0) row += empty;
      rows.push(row);
    }
    return rows.join('/') + ' ' + (activeColor || 'w');
  }

  function findKing(board, color) {
    var king = color === 'w' ? 'wK' : 'bK';
    for (var i = 0; i < 64; i++) {
      if (board[i] === king) return i;
    }
    return -1;
  }

  // Check if a square (index) is attacked by any piece of byColor
  function isSquareAttacked(board, squareIdx, byColor) {
    var sqFile = squareIdx % 8;
    var sqRank = Math.floor(squareIdx / 8);

    for (var i = 0; i < 64; i++) {
      var piece = board[i];
      if (!piece || piece[0] !== byColor) continue;

      var pFile = i % 8;
      var pRank = Math.floor(i / 8);
      var type  = piece[1];

      var df = sqFile - pFile;
      var dr = sqRank - pRank;

      if (type === 'P') {
        // White pawns attack diagonally upward (decreasing rank index)
        // Black pawns attack diagonally downward (increasing rank index)
        if (byColor === 'w') {
          // white pawn at (pFile,pRank) attacks (pFile±1, pRank-1)
          if (dr === -1 && Math.abs(df) === 1) return true;
        } else {
          // black pawn at (pFile,pRank) attacks (pFile±1, pRank+1)
          if (dr === 1 && Math.abs(df) === 1) return true;
        }
      } else if (type === 'N') {
        var adf = Math.abs(df);
        var adr = Math.abs(dr);
        if ((adf === 1 && adr === 2) || (adf === 2 && adr === 1)) return true;
      } else if (type === 'K') {
        if (Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0)) return true;
      } else if (type === 'B' || type === 'Q') {
        // Diagonal rays
        if (Math.abs(df) === Math.abs(dr) && df !== 0) {
          var stepF = df > 0 ? 1 : -1;
          var stepR = dr > 0 ? 1 : -1;
          var blocked = false;
          var cf = pFile + stepF;
          var cr = pRank + stepR;
          while (cf !== sqFile || cr !== sqRank) {
            if (cf < 0 || cf > 7 || cr < 0 || cr > 7) { blocked = true; break; }
            if (board[cr * 8 + cf]) { blocked = true; break; }
            cf += stepF;
            cr += stepR;
          }
          if (!blocked) return true;
        }
        if (type === 'B') continue; // bishops only diagonal
        // fall through to rook rays for queen
      }

      if (type === 'R' || type === 'Q') {
        // Straight rays (rank or file)
        if (df === 0 || dr === 0) {
          var sf2 = df === 0 ? 0 : (df > 0 ? 1 : -1);
          var sr2 = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
          if (sf2 === 0 && sr2 === 0) continue; // same square
          var blocked2 = false;
          var cf2 = pFile + sf2;
          var cr2 = pRank + sr2;
          while (cf2 !== sqFile || cr2 !== sqRank) {
            if (cf2 < 0 || cf2 > 7 || cr2 < 0 || cr2 > 7) { blocked2 = true; break; }
            if (board[cr2 * 8 + cf2]) { blocked2 = true; break; }
            cf2 += sf2;
            cr2 += sr2;
          }
          if (!blocked2) return true;
        }
      }
    }

    return false;
  }

  function isInCheck(board, color) {
    var kingIdx = findKing(board, color);
    if (kingIdx === -1) return false;
    var opponentColor = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(board, kingIdx, opponentColor);
  }

  // Simplified checkmate: king is in check AND all 8 king moves result in still being in check
  function isCheckmate(board, color) {
    if (!isInCheck(board, color)) return false;

    var kingIdx = findKing(board, color);
    if (kingIdx === -1) return false;

    var kingFile = kingIdx % 8;
    var kingRank = Math.floor(kingIdx / 8);
    var opponentColor = color === 'w' ? 'b' : 'w';

    // Try all 8 king moves
    var dirs = [
      [-1,-1],[-1,0],[-1,1],
      [0,-1],         [0,1],
      [1,-1], [1,0],  [1,1]
    ];

    for (var d = 0; d < dirs.length; d++) {
      var nf = kingFile + dirs[d][1];
      var nr = kingRank + dirs[d][0];
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;

      var nIdx = nr * 8 + nf;
      var targetPiece = board[nIdx];
      // Can't move to a square occupied by own piece
      if (targetPiece && targetPiece[0] === color) continue;

      // Simulate move
      var newBoard = board.slice();
      newBoard[kingIdx] = "";
      newBoard[nIdx] = color === 'w' ? 'wK' : 'bK';

      // If this square is not attacked, king can escape -> not checkmate
      if (!isSquareAttacked(newBoard, nIdx, opponentColor)) {
        return false;
      }
    }

    // All king moves lead to check -> checkmate
    return true;
  }

  return {
    applyMove: applyMove,
    getFEN: getFEN,
    parseFEN: parseFEN,
    isSquareAttacked: isSquareAttacked,
    findKing: findKing,
    isInCheck: isInCheck,
    isCheckmate: isCheckmate,
    coordToIndex: coordToIndex,
    indexToCoord: indexToCoord
  };
}));
