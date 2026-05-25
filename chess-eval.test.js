'use strict';

const { applyMove, isCheckmate, isInCheck, parseFEN, coordToIndex } = require('./chess-engine');
const scenarios = require('./eval-scenarios');

describe('Sneaky Chess - Defensive Scenarios', () => {
  // Sanity check: we have scenarios to test
  test('scenarios array is non-empty', () => {
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios.length).toBeGreaterThan(0);
  });

  scenarios.forEach(scenario => {
    describe(scenario.name, () => {
      test('correct defense avoids checkmate', () => {
        const { board, activeColor } = parseFEN(scenario.startFEN);
        const defenderColor = activeColor; // the player who defends

        scenario.correctMoves.forEach(move => {
          const newBoard = applyMove(board, move.from, move.to);
          // After the defender's correct move, the defender should NOT be in checkmate
          expect(isCheckmate(newBoard, defenderColor)).toBe(false);
        });
      });

      test('board state is valid (has both kings)', () => {
        const { board } = parseFEN(scenario.startFEN);
        const whiteKing = board[coordToIndex('a1')]; // dummy — search the board
        let hasWhiteKing = false;
        let hasBlackKing = false;
        for (let i = 0; i < 64; i++) {
          if (board[i] === 'wK') hasWhiteKing = true;
          if (board[i] === 'bK') hasBlackKing = true;
        }
        expect(hasWhiteKing).toBe(true);
        expect(hasBlackKing).toBe(true);
      });

      test('blunder move results in a valid board (move is applicable)', () => {
        // Verify the test data is meaningful: the trapMove produces a valid board state
        const { board } = parseFEN(scenario.startFEN);
        if (scenario.trapMove) {
          const blunderedBoard = applyMove(board, scenario.trapMove.from, scenario.trapMove.to);
          // After the blunder, the board is truthy and the piece moved
          expect(blunderedBoard).toBeTruthy();
          expect(Array.isArray(blunderedBoard)).toBe(true);
          expect(blunderedBoard.length).toBe(64);
        }
      });
    });
  });
});

describe('Chess Engine - Unit Tests', () => {
  test('coordToIndex: a8=0, h1=63, e4=36', () => {
    expect(coordToIndex('a8')).toBe(0);
    expect(coordToIndex('h8')).toBe(7);
    expect(coordToIndex('a1')).toBe(56);
    expect(coordToIndex('h1')).toBe(63);
    expect(coordToIndex('e4')).toBe(36);
  });

  test('parseFEN: standard starting position has correct pieces', () => {
    const { board, activeColor } = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(activeColor).toBe('w');
    expect(board[coordToIndex('e1')]).toBe('wK');
    expect(board[coordToIndex('e8')]).toBe('bK');
    expect(board[coordToIndex('a1')]).toBe('wR');
    expect(board[coordToIndex('h8')]).toBe('bR');
    expect(board[coordToIndex('e2')]).toBe('wP');
    expect(board[coordToIndex('e7')]).toBe('bP');
  });

  test('applyMove: moves piece correctly', () => {
    const { board } = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const newBoard = applyMove(board, 'e2', 'e4');
    expect(newBoard[coordToIndex('e2')]).toBe('');
    expect(newBoard[coordToIndex('e4')]).toBe('wP');
    // Original board unchanged
    expect(board[coordToIndex('e2')]).toBe('wP');
  });

  test('applyMove: captures enemy piece', () => {
    const { board } = parseFEN('rnbqkbnr/pppppppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    const newBoard = applyMove(board, 'd7', 'e5'); // pawn captures e5
    // Wait, pawns capture diagonally but engine doesn't validate legal moves
    // Just verify the piece moves and capture happens
    const { board: b2 } = parseFEN('8/8/8/4p3/3P4/8/8/4K2k w - - 0 1');
    const captured = applyMove(b2, 'd4', 'e5'); // white pawn captures black pawn
    expect(captured[coordToIndex('d4')]).toBe('');
    expect(captured[coordToIndex('e5')]).toBe('wP');
  });

  test('applyMove: pawn promotes to queen at rank 8', () => {
    const { board } = parseFEN('8/P7/8/8/8/8/8/4K2k w - - 0 1');
    const promoted = applyMove(board, 'a7', 'a8');
    expect(promoted[coordToIndex('a8')]).toBe('wQ');
  });

  test('isInCheck: correctly detects check', () => {
    // White queen on e1, black king on e8, open e-file — black is in check
    const { board } = parseFEN('4k3/8/8/8/8/8/8/4QK2 b - - 0 1');
    expect(isInCheck(board, 'b')).toBe(true);
    expect(isInCheck(board, 'w')).toBe(false);
  });

  test('isCheckmate: Scholars Mate is checkmate', () => {
    // Verified Scholar's Mate final position (after 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#)
    const { board: mateBoard } = parseFEN('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 5');
    expect(isInCheck(mateBoard, 'b')).toBe(true);
    expect(isCheckmate(mateBoard, 'b')).toBe(true);
  });

  test('isCheckmate: not checkmate when king can escape', () => {
    // Black king in check but can escape
    const { board } = parseFEN('4k3/8/8/8/8/8/8/4RK2 b - - 0 1');
    // Rook on e1, king on e8 — king is in check but can move to d8, f8, d7, etc.
    expect(isInCheck(board, 'b')).toBe(true);
    expect(isCheckmate(board, 'b')).toBe(false);
  });

  test('Scholar Mate defense: g6 avoids Scholar Mate', () => {
    const { board } = parseFEN('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3');
    const afterG6 = applyMove(board, 'g7', 'g6');
    expect(isCheckmate(afterG6, 'b')).toBe(false);
  });

  test('Scholar Mate blunder: Nf6 allows Qxf7#', () => {
    const { board } = parseFEN('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3');
    const afterNf6 = applyMove(board, 'g8', 'f6');
    const afterQxf7 = applyMove(afterNf6, 'h5', 'f7');
    expect(isInCheck(afterQxf7, 'b')).toBe(true);
    expect(isCheckmate(afterQxf7, 'b')).toBe(true);
  });

  test('Back rank mate: no luft = checkmate', () => {
    const { board } = parseFEN('6k1/5ppp/8/8/8/8/6K1/3R4 b - - 0 1');
    // White plays Rd8# immediately (before black moves)
    const afterRd8 = applyMove(board, 'd1', 'd8');
    expect(isInCheck(afterRd8, 'b')).toBe(true);
    expect(isCheckmate(afterRd8, 'b')).toBe(true);
  });

  test('Back rank mate: h6 luft avoids checkmate', () => {
    const { board } = parseFEN('6k1/5ppp/8/8/8/8/6K1/3R4 b - - 0 1');
    const afterH6 = applyMove(board, 'h7', 'h6');
    // White still plays Rd8+
    const afterRd8 = applyMove(afterH6, 'd1', 'd8');
    // King can escape to h7 now
    expect(isInCheck(afterRd8, 'b')).toBe(true);
    expect(isCheckmate(afterRd8, 'b')).toBe(false);
  });
});
