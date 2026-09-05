import { describe, it, expect } from 'vitest';
import { Chess, Color, Ox88 } from './chess';
import {
	findBestMove,
	generateTeacherExplanation,
	getTeacherHint,
	evaluateBoard
} from './chess-ai';

describe('ChessAI Opponent Engine', () => {
	it('finds legal moves across all 5 difficulty levels in starting position', () => {
		const game = Chess.create();
		const difficulties = ['easy', 'medium', 'hard', 'grandmaster', 'teacher'] as const;

		for (const diff of difficulties) {
			const { move } = findBestMove(game, diff);
			expect(move).not.toBeNull();
			// Move must be one of the legal moves
			const legalMoves = Chess.getMoves(game);
			const isLegal = legalMoves.some((m) => m.from === move!.from && m.to === move!.to);
			expect(isLegal).toBe(true);
		}
	}, 15000);

	it('captures an undefended high-value piece (hanging queen)', () => {
		// Setup position where Black has a hanging queen on e4 that White pawn or knight can capture
		// FEN: 4k3/8/8/8/4q3/3P4/8/4K3 w - - 0 1 (White pawn at d3 can take Queen on e4)
		const game = Chess.create('4k3/8/8/8/4q3/3P4/8/4K3 w - - 0 1');
		const result = findBestMove(game, 'hard');

		expect(result.move).not.toBeNull();
		// Pawn on d3 captures queen on e4
		expect(result.move?.from).toBe(Ox88.d3);
		expect(result.move?.to).toBe(Ox88.e4);
	});

	it("finds mate-in-1 (Scholar's Mate finish)", () => {
		// 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
		// FEN: r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4
		const game = Chess.create(
			'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'
		);
		const { move } = findBestMove(game, 'grandmaster');

		expect(move).not.toBeNull();
		expect(move?.from).toBe(Ox88.h5);
		expect(move?.to).toBe(Ox88.f7);

		// Verifying move leads to checkmate
		const mateState = Chess.makeMove(game, move!);
		expect(Chess.isCheckmate(mateState)).toBe(true);
	});

	it('generates rich pedagogical commentary in Teacher mode', () => {
		const game = Chess.create();
		// Move e2 -> e4
		const pawnMove = { from: Ox88.e2, to: Ox88.e4, flags: 0 };
		const nextGame = Chess.makeMove(game, pawnMove);
		const explanation = generateTeacherExplanation(game, nextGame, pawnMove);

		expect(explanation).toContain('center');

		// Check delivery explanation
		const checkGame = Chess.create('4k3/8/8/8/8/8/8/4K2R w - - 0 1');
		const checkMove = { from: Ox88.h1, to: Ox88.h8, flags: 0 };
		const checkNext = Chess.makeMove(checkGame, checkMove);
		const checkExpl = generateTeacherExplanation(checkGame, checkNext, checkMove);
		expect(checkExpl).toContain('check');
	});

	it('provides helpful Teacher hints on request', () => {
		const game = Chess.create();
		const hint = getTeacherHint(game);

		expect(hint).not.toBeNull();
		expect(hint?.explanation.length).toBeGreaterThan(10);
		expect(hint?.from.row).toBeDefined();
		expect(hint?.to.col).toBeDefined();
	});

	it('correctly evaluates material advantages', () => {
		const equalGame = Chess.create();
		expect(evaluateBoard(equalGame, Color.WHITE)).toBe(0);

		// White has queen, Black only has king
		const whiteAdvantageGame = Chess.create('4k3/8/8/8/8/8/8/4KQ2 w - - 0 1');
		expect(evaluateBoard(whiteAdvantageGame, Color.WHITE)).toBeGreaterThan(800);
		expect(evaluateBoard(whiteAdvantageGame, Color.BLACK)).toBeLessThan(-800);
	});
});
