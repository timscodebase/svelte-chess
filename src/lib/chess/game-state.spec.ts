import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { ChessGameStore } from './game-state.svelte';

describe('ChessGameStore Move Limitation and Rules', () => {
	let store: ChessGameStore;

	beforeEach(() => {
		store = new ChessGameStore(3, 2);
	});

	it("starts with White's turn and disallows selecting Black pieces", () => {
		expect(store.turn).toBe('white');
		expect(store.selectedSquare).toBeNull();
		expect(store.validMoves).toHaveLength(0);

		// Attempt to select Black pawn at row 6, col 4 (e7)
		store.selectOrMove(6, 4);
		expect(store.selectedSquare).toBeNull();
		expect(store.validMoves).toHaveLength(0);
	});

	it('allows selecting a White piece and populates only its legal moves', () => {
		// Select White pawn at row 1, col 4 (e2)
		store.selectOrMove(1, 4);
		expect(store.selectedSquare).toEqual({ row: 1, col: 4 });
		// e2 pawn can legally move to e3 (row 2, col 4) and e4 (row 3, col 4)
		expect(store.validMoves).toHaveLength(2);
		expect(store.validMoves).toContainEqual({ row: 2, col: 4 });
		expect(store.validMoves).toContainEqual({ row: 3, col: 4 });
	});

	it('strictly rejects illegal moves', () => {
		// Select White pawn at row 1, col 4 (e2)
		store.selectOrMove(1, 4);

		// Attempt illegal move: move forward 3 squares to row 4, col 4 (e5)
		store.selectOrMove(4, 4);
		expect(store.getPieceAt(1, 4)?.type).toBe('pawn');
		expect(store.getPieceAt(4, 4)).toBeUndefined();
		expect(store.turn).toBe('white');
		expect(store.selectedSquare).toBeNull(); // selection is cleared on illegal move

		// Select White rook at row 0, col 0 (a1)
		store.selectOrMove(0, 0);
		// Rook has 0 legal moves because it is blocked by pawn at a2 and knight at b1
		expect(store.validMoves).toHaveLength(0);

		// Attempt illegal move: jump forward to a3 (row 2, col 0)
		store.selectOrMove(2, 0);
		expect(store.getPieceAt(0, 0)?.type).toBe('rook');
		expect(store.getPieceAt(2, 0)).toBeUndefined();
		expect(store.turn).toBe('white');
	});

	it('executes legal moves and enforces alternating turns', () => {
		// White plays e2 -> e4
		store.selectOrMove(1, 4); // Select e2
		store.selectOrMove(3, 4); // Move to e4

		expect(store.getPieceAt(3, 4)?.type).toBe('pawn');
		expect(store.getPieceAt(1, 4)).toBeUndefined();
		expect(store.turn).toBe('black');
		expect(store.moveHistory).toContain('e4');

		// White cannot move now
		store.selectOrMove(1, 3); // White pawn d2
		expect(store.selectedSquare).toBeNull();

		// Black plays e7 -> e5
		store.selectOrMove(6, 4); // Select e7
		expect(store.validMoves).toHaveLength(2);
		store.selectOrMove(4, 4); // Move to e5

		expect(store.getPieceAt(4, 4)?.type).toBe('pawn');
		expect(store.turn).toBe('white');
		expect(store.moveHistory).toContain('e5');
	});

	it('allows switching selection between friendly pieces', () => {
		store.selectOrMove(1, 4); // Select e2
		expect(store.selectedSquare).toEqual({ row: 1, col: 4 });

		// Click d2 pawn
		store.selectOrMove(1, 3);
		expect(store.selectedSquare).toEqual({ row: 1, col: 3 });
		expect(store.validMoves).toContainEqual({ row: 2, col: 3 });
		expect(store.validMoves).toContainEqual({ row: 3, col: 3 });
	});

	it('deselects when clicking the currently selected piece', () => {
		store.selectOrMove(1, 4); // Select e2
		expect(store.selectedSquare).not.toBeNull();

		store.selectOrMove(1, 4); // Click again
		expect(store.selectedSquare).toBeNull();
		expect(store.validMoves).toHaveLength(0);
	});

	it('configures AI opponent difficulty and player color', () => {
		store.setOpponentType('ai');
		expect(store.opponentType).toBe('ai');

		store.setAiDifficulty('teacher');
		expect(store.aiDifficulty).toBe('teacher');
		expect(store.teacherCommentary).not.toBeNull();

		store.setAiDifficulty('grandmaster');
		expect(store.aiDifficulty).toBe('grandmaster');

		store.setPlayerColor('black');
		expect(store.playerColor).toBe('black');
	});

	it('generates teacher hints on demand', () => {
		store.setAiDifficulty('teacher');
		expect(store.teacherHint).toBeNull();

		store.requestTeacherHint();
		expect(store.teacherHint).not.toBeNull();
		expect(store.teacherHint?.explanation).toBeDefined();
		expect(store.teacherHint?.from).toBeDefined();
		expect(store.teacherHint?.to).toBeDefined();

		store.dismissTeacherHint();
		expect(store.teacherHint).toBeNull();
	});
});
