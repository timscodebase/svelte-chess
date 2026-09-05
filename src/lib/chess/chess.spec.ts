import { describe, it, expect } from 'vitest';
import { Chess, PieceType, Color, Ox88, MoveFlags, posToOx88, ox88ToPos } from './chess';

describe('Chess Engine Rules Enforcement', () => {
	it('generates exact 20 legal moves for white in starting position', () => {
		const game = Chess.create();
		const moves = Chess.getMoves(game);
		// 16 pawn moves (8 single + 8 double) + 4 knight moves (b1-a3, b1-c3, g1-f3, g1-h3)
		expect(moves).toHaveLength(20);
	});

	it('prevents illegal moves such as rooks jumping over pawns or moving backwards', () => {
		const game = Chess.create();
		// Square a1 (White Rook)
		const rookMoves = Chess.getMoves(game, { square: 'a1' });
		expect(rookMoves).toHaveLength(0); // blocked by pawn and knight

		// Square e1 (White King)
		const kingMoves = Chess.getMoves(game, { square: 'e1' });
		expect(kingMoves).toHaveLength(0); // blocked by pawns, queen, bishop
	});

	it('coordinates conversion posToOx88 and ox88ToPos map 1:1 correctly', () => {
		// White a1: row 0, col 0 -> 112
		expect(posToOx88(0, 0)).toBe(Ox88.a1);
		expect(ox88ToPos(Ox88.a1)).toEqual({ row: 0, col: 0 });

		// White e1: row 0, col 4 -> 116
		expect(posToOx88(0, 4)).toBe(Ox88.e1);
		expect(ox88ToPos(Ox88.e1)).toEqual({ row: 0, col: 4 });

		// Black e8: row 7, col 4 -> 4
		expect(posToOx88(7, 4)).toBe(Ox88.e8);
		expect(ox88ToPos(Ox88.e8)).toEqual({ row: 7, col: 4 });

		// Black h8: row 7, col 7 -> 7
		expect(posToOx88(7, 7)).toBe(Ox88.h8);
		expect(ox88ToPos(Ox88.h8)).toEqual({ row: 7, col: 7 });
	});

	it('handles valid moves and enforces turn order', () => {
		let game = Chess.create();
		expect(game.turn).toBe(Color.WHITE);

		// 1. e4 (from e2 to e4)
		game = Chess.makeMove(game, { from: Ox88.e2, to: Ox88.e4 });
		expect(game.turn).toBe(Color.BLACK);
		expect(game.board[Ox88.e4]?.type).toBe(PieceType.PAWN);
		expect(game.board[Ox88.e2]).toBeNull();

		// White cannot move on Black's turn
		const whiteMovesOnBlackTurn = Chess.getMoves(game).filter(
			(m) => game.board[m.from]?.color === Color.WHITE
		);
		expect(whiteMovesOnBlackTurn).toHaveLength(0);

		// 1... e5
		game = Chess.makeMove(game, { from: Ox88.e7, to: Ox88.e5 });
		expect(game.turn).toBe(Color.WHITE);

		// 2. Nf3
		game = Chess.makeMove(game, { from: Ox88.g1, to: Ox88.f3 });
		expect(game.turn).toBe(Color.BLACK);

		// 2... Nc6
		game = Chess.makeMove(game, { from: Ox88.b8, to: Ox88.c6 });
		expect(game.turn).toBe(Color.WHITE);
	});

	it('enforces castling rules and moves both king and rook', () => {
		// Setup position where White can castle kingside:
		// 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5
		let game = Chess.create();
		game = Chess.makeMove(game, { from: Ox88.e2, to: Ox88.e4 });
		game = Chess.makeMove(game, { from: Ox88.e7, to: Ox88.e5 });
		game = Chess.makeMove(game, { from: Ox88.g1, to: Ox88.f3 });
		game = Chess.makeMove(game, { from: Ox88.b8, to: Ox88.c6 });
		game = Chess.makeMove(game, { from: Ox88.f1, to: Ox88.c4 });
		game = Chess.makeMove(game, { from: Ox88.f8, to: Ox88.c5 });

		// White can now castle kingside (e1 to g1)
		const kingMoves = Chess.getMoves(game, { square: 'e1' });
		const castleMove = kingMoves.find((m) => (m.flags & MoveFlags.KSIDE_CASTLE) !== 0);
		expect(castleMove).toBeDefined();
		expect(castleMove?.to).toBe(Ox88.g1);

		// Execute castling
		game = Chess.makeMove(game, castleMove!);
		expect(game.board[Ox88.g1]?.type).toBe(PieceType.KING);
		expect(game.board[Ox88.f1]?.type).toBe(PieceType.ROOK); // Rook moved from h1 to f1!
		expect(game.board[Ox88.h1]).toBeNull();
		expect(game.board[Ox88.e1]).toBeNull();
	});

	it('handles En Passant correctly', () => {
		// 1. e4 a6 2. e5 d5 -> White can capture d5 en passant (e5 -> d6)
		let game = Chess.create();
		game = Chess.makeMove(game, { from: Ox88.e2, to: Ox88.e4 });
		game = Chess.makeMove(game, { from: Ox88.a7, to: Ox88.a6 });
		game = Chess.makeMove(game, { from: Ox88.e4, to: Ox88.e5 });
		game = Chess.makeMove(game, { from: Ox88.d7, to: Ox88.d5 });

		expect(game.epSquare).toBe(Ox88.d6);
		const pawnMoves = Chess.getMoves(game, { square: 'e5' });
		const epMove = pawnMoves.find((m) => (m.flags & MoveFlags.EP_CAPTURE) !== 0);
		expect(epMove).toBeDefined();
		expect(epMove?.to).toBe(Ox88.d6);

		game = Chess.makeMove(game, epMove!);
		expect(game.board[Ox88.d6]?.type).toBe(PieceType.PAWN);
		expect(game.board[Ox88.d5]).toBeNull(); // Captured black pawn on d5 removed!
		expect(game.captured).toHaveLength(1);
		expect(game.captured[0].type).toBe(PieceType.PAWN);
	});

	it('handles Pawn Promotion', () => {
		// Setup FEN with a white pawn about to promote: 8/4P3/8/8/8/8/8/k1K5 w - - 0 1
		let game = Chess.create('8/4P3/8/8/8/8/8/k1K5 w - - 0 1');
		const promoMoves = Chess.getMoves(game, { square: 'e7' });
		expect(promoMoves).toHaveLength(4); // Q, R, B, N

		game = Chess.makeMove(game, { from: Ox88.e7, to: Ox88.e8, promotion: PieceType.QUEEN });
		expect(game.board[Ox88.e8]?.type).toBe(PieceType.QUEEN);
		expect(game.board[Ox88.e7]).toBeNull();
	});

	it("detects check and checkmate (Fool's Mate)", () => {
		// 1. f3 e5 2. g4 Qh4# (Fool's Mate)
		let game = Chess.create();
		game = Chess.makeMove(game, { from: Ox88.f2, to: Ox88.f3 });
		game = Chess.makeMove(game, { from: Ox88.e7, to: Ox88.e5 });
		game = Chess.makeMove(game, { from: Ox88.g2, to: Ox88.g4 });
		game = Chess.makeMove(game, { from: Ox88.d8, to: Ox88.h4 });

		expect(Chess.isCheck(game)).toBe(true);
		expect(Chess.isCheckmate(game)).toBe(true);
		expect(Chess.isGameOver(game)).toBe(true);
		expect(Chess.getMoves(game)).toHaveLength(0);
	});

	it('detects stalemate', () => {
		// 8/8/8/8/8/5k2/5p2/7K b - - 0 1, Black moves ... f1=R or White stalemate position:
		// FEN: 7k/5Q2/6K1/8/8/8/8/8 b - - 0 1 (Black King at h8 has no legal moves and is not in check)
		const game = Chess.create('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
		expect(Chess.isCheck(game)).toBe(false);
		expect(Chess.isStalemate(game)).toBe(true);
		expect(Chess.isGameOver(game)).toBe(true);
		expect(Chess.getMoves(game)).toHaveLength(0);
	});

	it('prevents pinned pieces from moving if it exposes the king to check', () => {
		// White king at e1, White bishop at e2, Black rook at e8: Bishop is pinned along e-file!
		const game = Chess.create('4r3/8/8/8/8/8/4B3/4K3 w - - 0 1');
		const bishopMoves = Chess.getMoves(game, { square: 'e2' });
		// The bishop cannot move off the e-file at all!
		expect(bishopMoves).toHaveLength(0);
	});

	it('prevents king from castling through check or while in check', () => {
		// White king e1, rooks a1, h1. Black rook at e8 checking king directly:
		const inCheckGame = Chess.create('4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
		expect(Chess.isCheck(inCheckGame)).toBe(true);
		const castleMovesInCheck = Chess.getMoves(inCheckGame, { square: 'e1' }).filter(
			(m) => (m.flags & (MoveFlags.KSIDE_CASTLE | MoveFlags.QSIDE_CASTLE)) !== 0
		);
		expect(castleMovesInCheck).toHaveLength(0);

		// Black rook at f8 attacking f1 (transit square for kingside castle):
		const throughCheckGame = Chess.create('5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
		expect(Chess.isCheck(throughCheckGame)).toBe(false);
		const castleMovesThroughCheck = Chess.getMoves(throughCheckGame, { square: 'e1' }).filter(
			(m) => (m.flags & MoveFlags.KSIDE_CASTLE) !== 0
		);
		expect(castleMovesThroughCheck).toHaveLength(0);
	});

	it('detects draw by 50-move rule', () => {
		// 100 half-moves without pawn move or capture triggers 50-move rule
		const game = Chess.create('8/8/8/8/8/4k3/8/4K3 w - - 100 51');
		expect(Chess.isDraw(game)).toBe(true);
		expect(Chess.isGameOver(game)).toBe(true);
	});

	it('detects draw by insufficient material', () => {
		// King vs King
		const kvk = Chess.create('8/8/8/8/8/4k3/8/4K3 w - - 0 1');
		expect(Chess.isInsufficientMaterial(kvk.board)).toBe(true);
		expect(Chess.isDraw(kvk)).toBe(true);

		// King + Knight vs King
		const knvk = Chess.create('8/8/8/8/8/4k3/5N2/4K3 w - - 0 1');
		expect(Chess.isInsufficientMaterial(knvk.board)).toBe(true);
		expect(Chess.isDraw(knvk)).toBe(true);

		// King + Bishop vs King
		const kbvk = Chess.create('8/8/8/8/8/4k3/5B2/4K3 w - - 0 1');
		expect(Chess.isInsufficientMaterial(kbvk.board)).toBe(true);
		expect(Chess.isDraw(kbvk)).toBe(true);
	});

	it('detects draw by threefold repetition', () => {
		let game = Chess.create();
		// 1. Nf3 Nf6 2. Ng1 Ng8 (position repeated 1st time back at start)
		game = Chess.makeMove(game, { from: Ox88.g1, to: Ox88.f3 });
		game = Chess.makeMove(game, { from: Ox88.g8, to: Ox88.f6 });
		game = Chess.makeMove(game, { from: Ox88.f3, to: Ox88.g1 });
		game = Chess.makeMove(game, { from: Ox88.f6, to: Ox88.g8 });

		// 3. Nf3 Nf6 4. Ng1 Ng8 (position repeated 2nd time back at start -> total 3 occurrences)
		game = Chess.makeMove(game, { from: Ox88.g1, to: Ox88.f3 });
		game = Chess.makeMove(game, { from: Ox88.g8, to: Ox88.f6 });
		game = Chess.makeMove(game, { from: Ox88.f3, to: Ox88.g1 });
		game = Chess.makeMove(game, { from: Ox88.f6, to: Ox88.g8 });

		expect(Chess.isThreefoldRepetition(game)).toBe(true);
		expect(Chess.isDraw(game)).toBe(true);
	});

	it('exports valid FEN strings and loads them consistently', () => {
		const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
		const game = Chess.create(initialFen);
		expect(Chess.fen(game)).toBe(initialFen);

		// After 1. e4 (no black pawns adjacent to e4, so FEN ep target is '-')
		const moved = Chess.makeMove(game, { from: Ox88.e2, to: Ox88.e4 });
		expect(Chess.fen(moved)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');

		// After 1. e4 e6 2. e5 d5 (White pawn at e5 can capture d6 en passant, so FEN ep target is 'd6')
		let epMatch = Chess.create();
		epMatch = Chess.makeMove(epMatch, { from: Ox88.e2, to: Ox88.e4 });
		epMatch = Chess.makeMove(epMatch, { from: Ox88.e7, to: Ox88.e6 });
		epMatch = Chess.makeMove(epMatch, { from: Ox88.e4, to: Ox88.e5 });
		epMatch = Chess.makeMove(epMatch, { from: Ox88.d7, to: Ox88.d5 });
		expect(Chess.fen(epMatch)).toBe(
			'rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3'
		);
	});
});
