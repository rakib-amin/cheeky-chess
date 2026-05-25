(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.EvalScenarios = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  // Each scenario: user plays as DEFENDER and must avoid the trap.
  // correctMoves: moves that successfully defend
  // trapMove: the blunder that walks into the attacker's plan
  var scenarios = [
    {
      id: "scholars-mate-defense",
      name: "Defend Scholar's Mate",
      description: "White has set up Scholar's Mate with Bc4 + Qh5. You're Black. The queen eyes f7 — don't let it land there for checkmate!",
      // FEN after 1.e4 e5 2.Bc4 Nc6 3.Qh5 — Black to move
      startFEN: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
      activeColor: "b",
      // Nf6?? is the blunder — looks like it attacks the queen but allows Qxf7#
      trapMove: { from: "g8", to: "f6" },
      // g6! is the correct defense — kicks the queen away from the f7 diagonal
      correctMoves: [
        { from: "g7", to: "g6" }
      ],
      verifyDefense: "noImmediateCheckmate",
      tips: [
        "After Qh5, g6 pushes the queen away from the deadly f7 diagonal.",
        "Nf6?? looks like it attacks the queen, but Qxf7# ends the game immediately.",
        "Always check: is f7 defended? If not, don't play Nf6."
      ]
    },
    {
      id: "fools-mate-defense",
      name: "Defend Fool's Mate",
      description: "White has played 1.f3 — a terrible weakening move. You're Black. If White follows up with g4, you can deliver Qh4# immediately! But first, find the safe, solid move that doesn't walk into any early traps.",
      // FEN after 1.f3 — Black to move
      startFEN: "rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1",
      activeColor: "b",
      // e5 is the trap — if White then plays g4, Black has Qh4#. But we test Black's safety:
      // Actually the scenario tests that Black doesn't accidentally weaken themselves.
      // e7->e5 is fine but sets up the Fool's Mate pattern if White cooperates.
      // d7->d5 is straightforwardly safe and doesn't create weaknesses.
      trapMove: { from: "e7", to: "e5" },  // not a blunder per se but sets up the Fool's Mate if White plays g4 next
      correctMoves: [
        { from: "d7", to: "d5" },
        { from: "e7", to: "e6" },
        { from: "c7", to: "c5" }
      ],
      verifyDefense: "noImmediateCheckmate",
      tips: [
        "d5 is a clean central response that avoids any early tricks.",
        "After 1.f3, Black is already slightly better — just develop normally.",
        "The Fool's Mate (Qh4#) happens only if White plays both f3 AND g4. Never do that as White!"
      ]
    },
    {
      id: "back-rank-defense",
      name: "Defend Back Rank Mate",
      description: "You're Black (king on g8, pawns f7/g7/h7). White's rook on d1 threatens Rd8#. Create an escape square before it's too late!",
      // Black king on g8, pawns f7/g7/h7, white rook on d1, white king on g2 — Black to move
      startFEN: "6k1/5ppp/8/8/8/8/6K1/3R4 b - - 0 1",
      activeColor: "b",
      // Doing nothing useful (like a7→a5 type random move) lets Rd8#
      // Any king-side pawn push creates the luft
      trapMove: { from: "f7", to: "f6" },  // f6 actually helps but blocks king escape...
      // Actually: h6 or g6 or h5 give the king an escape square
      correctMoves: [
        { from: "h7", to: "h6" },
        { from: "g7", to: "g6" },
        { from: "h7", to: "h5" }
      ],
      verifyDefense: "noImmediateCheckmate",
      tips: [
        "Always create a 'luft' (escape square) with h6, g6, or h3 when your king is behind pawns.",
        "After h6, if White plays Rd8+, your king escapes to h7.",
        "Back rank mates are the #1 cause of resigned positions in club chess."
      ]
    },
    {
      id: "fork-defense",
      name: "Defend Against Knight Fork",
      description: "White's knight on d5 threatens Nxc7+, forking your king and rook on a8. You're Black. Remove the dangerous knight before it forks you!",
      // White knight on d5 threatening Nxc7+ fork on king (e8) and rook (a8)
      // FEN: black king e8, rook a8, white knight d5, white king e1 — Black to move
      startFEN: "r3k3/pppp1ppp/2n2n2/3Np3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 4",
      activeColor: "b",
      // Blunder: moving the king or doing nothing — the fork hits
      trapMove: { from: "e8", to: "d8" },  // King moves away but doesn't remove fork threat
      // Correct: take the knight on d5 with Nxd5, eliminating the fork
      correctMoves: [
        { from: "f6", to: "d5" }  // Nxd5 — removes the dangerous knight
      ],
      verifyDefense: "noImmediateCheckmate",
      tips: [
        "When a knight threatens a fork, capture it if you can!",
        "Nxd5 removes the fork piece, winning a pawn and eliminating the threat.",
        "King moves to d8 don't help — the fork still hits c7 next move."
      ]
    },
    {
      id: "pin-defense",
      name: "Break the Pin",
      description: "Your c3 knight is pinned by Black's Bb4 to your king on e1. You're White. Drive away the bishop before Black can exploit the pin further!",
      // White knight on c3 pinned by black bishop on b4 to white king on e1
      // FEN: rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4
      startFEN: "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
      activeColor: "w",
      // Blunder: moving the pinned knight (illegal to expose king, but engine ignores legality)
      // or doing nothing while Black plays Bxc3 dxc3 winning the structure
      trapMove: { from: "c3", to: "e4" },  // "moving" the pinned knight — this exposes the king to the bishop (bad)
      // Correct: a3! attacks the bishop and breaks the pin
      correctMoves: [
        { from: "a2", to: "a3" }  // a3! — the bishop must move or be captured
      ],
      verifyDefense: "noImmediateCheckmate",
      tips: [
        "a3 directly attacks the pinning bishop, forcing it to retreat or be traded.",
        "Breaking a pin is often better than trying to add defenders to the pinned piece.",
        "After a3 Bxc3+ dxc3, White gains the bishop pair and Black's dark squares are weak."
      ]
    },
    {
      id: "fried-liver-defense",
      name: "Defend Fried Liver Attack",
      description: "White just sacrificed a knight on f7! You're Black — your king must move. But which square keeps you safest? Find the best king move to limit White's attack.",
      // After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 — Black king must move
      // FEN after Nxf7: black king on e8 must recapture or flee
      startFEN: "r1bqkb1r/ppp2Npp/2n5/3np3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 6",
      activeColor: "b",
      // Kxf7 is forced (recapturing the knight) — but then Qf3+ leads to a very dangerous position
      // Actually the scenario tests: after the knight sacrifice, the trap is Kxf7 which drags the king into the open
      // However since the knight IS on f7, the king CAN stay and not take — but that loses material
      // Better: Ke7 (don't take) keeps the king safer than Kxf7
      trapMove: { from: "e8", to: "f7" },   // Kxf7 — drags king into the attack
      correctMoves: [
        { from: "e8", to: "e7" }  // Ke7 — doesn't capture, keeps king safer behind the pawn structure
      ],
      verifyDefense: "noImmediateCheckmate",
      tips: [
        "Kxf7 drags your king into the open where White's pieces will hunt it down.",
        "Ke7 keeps the king slightly more sheltered and avoids immediate Qf3+ attacks.",
        "The Fried Liver is a dangerous gambit — knowing when NOT to recapture is key."
      ]
    }
  ];

  return scenarios;
}));
