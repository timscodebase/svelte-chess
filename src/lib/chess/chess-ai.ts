import {
	Chess,
	PieceType,
	Color,
	MoveFlags,
	ox88ToPos,
	algebraic,
	rank,
	file,
	BOARD_INDEXES,
	type Move
} from './chess';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'grandmaster' | 'teacher';

export interface TeacherHint {
	from: { row: number; col: number };
	to: { row: number; col: number };
	explanation: string;
	san: string;
}

// Standard piece material values (in centipawns)
const PIECE_VALUES: Record<PieceType, number> = {
	[PieceType.PAWN]: 100,
	[PieceType.KNIGHT]: 320,
	[PieceType.BISHOP]: 330,
	[PieceType.ROOK]: 500,
	[PieceType.QUEEN]: 900,
	[PieceType.KING]: 20000
};

// Piece-Square Tables (from White's perspective; inverted for Black)
// Indexed by 0x88 board index
const PAWN_PST = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0,
	0, 0, 10, 10, 20, 30, 30, 20, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 20, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 0,
	0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0
];

const KNIGHT_PST = [
	-50, -40, -30, -30, -30, -30, -40, -50, 0, 0, 0, 0, 0, 0, 0, 0, -40, -20, 0, 0, 0, 0, -20, -40, 0,
	0, 0, 0, 0, 0, 0, 0, -30, 0, 10, 15, 15, 10, 0, -30, 0, 0, 0, 0, 0, 0, 0, 0, -30, 5, 15, 20, 20,
	15, 5, -30, 0, 0, 0, 0, 0, 0, 0, 0, -30, 0, 15, 20, 20, 15, 0, -30, 0, 0, 0, 0, 0, 0, 0, 0, -30,
	5, 10, 15, 15, 10, 5, -30, 0, 0, 0, 0, 0, 0, 0, 0, -40, -20, 0, 5, 5, 0, -20, -40, 0, 0, 0, 0, 0,
	0, 0, 0, -50, -40, -30, -30, -30, -30, -40, -50, 0, 0, 0, 0, 0, 0, 0, 0
];

const BISHOP_PST = [
	-20, -10, -10, -10, -10, -10, -10, -20, 0, 0, 0, 0, 0, 0, 0, 0, -10, 0, 0, 0, 0, 0, 0, -10, 0, 0,
	0, 0, 0, 0, 0, 0, -10, 0, 5, 10, 10, 5, 0, -10, 0, 0, 0, 0, 0, 0, 0, 0, -10, 5, 5, 10, 10, 5, 5,
	-10, 0, 0, 0, 0, 0, 0, 0, 0, -10, 0, 10, 10, 10, 10, 0, -10, 0, 0, 0, 0, 0, 0, 0, 0, -10, 10, 10,
	10, 10, 10, 10, -10, 0, 0, 0, 0, 0, 0, 0, 0, -10, 5, 0, 0, 0, 0, 5, -10, 0, 0, 0, 0, 0, 0, 0, 0,
	-20, -10, -10, -10, -10, -10, -10, -20, 0, 0, 0, 0, 0, 0, 0, 0
];

const ROOK_PST = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0,
	0, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0,
	0, 0, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0,
	0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0
];

const QUEEN_PST = [
	-20, -10, -10, -5, -5, -10, -10, -20, 0, 0, 0, 0, 0, 0, 0, 0, -10, 0, 0, 0, 0, 0, 0, -10, 0, 0, 0,
	0, 0, 0, 0, 0, -10, 0, 5, 5, 5, 5, 0, -10, 0, 0, 0, 0, 0, 0, 0, 0, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, -10, 5, 5, 5, 5, 5, 0, -10, 0,
	0, 0, 0, 0, 0, 0, 0, -10, 0, 5, 0, 0, 0, 0, -10, 0, 0, 0, 0, 0, 0, 0, 0, -20, -10, -10, -5, -5,
	-10, -10, -20, 0, 0, 0, 0, 0, 0, 0, 0
];

const KING_PST = [
	-30, -40, -40, -50, -50, -40, -40, -30, 0, 0, 0, 0, 0, 0, 0, 0, -30, -40, -40, -50, -50, -40, -40,
	-30, 0, 0, 0, 0, 0, 0, 0, 0, -30, -40, -40, -50, -50, -40, -40, -30, 0, 0, 0, 0, 0, 0, 0, 0, -30,
	-40, -40, -50, -50, -40, -40, -30, 0, 0, 0, 0, 0, 0, 0, 0, -20, -30, -30, -40, -40, -30, -30, -20,
	0, 0, 0, 0, 0, 0, 0, 0, -10, -20, -20, -20, -20, -20, -20, -10, 0, 0, 0, 0, 0, 0, 0, 0, 20, 20, 0,
	0, 0, 0, 20, 20, 0, 0, 0, 0, 0, 0, 0, 0, 20, 30, 10, 0, 0, 10, 30, 20, 0, 0, 0, 0, 0, 0, 0, 0
];

function getPstScore(pieceType: PieceType, color: Color, sq: number): number {
	const mirrorSq = color === Color.WHITE ? sq : ((7 - rank(sq)) << 4) + file(sq);
	switch (pieceType) {
		case PieceType.PAWN:
			return PAWN_PST[mirrorSq] ?? 0;
		case PieceType.KNIGHT:
			return KNIGHT_PST[mirrorSq] ?? 0;
		case PieceType.BISHOP:
			return BISHOP_PST[mirrorSq] ?? 0;
		case PieceType.ROOK:
			return ROOK_PST[mirrorSq] ?? 0;
		case PieceType.QUEEN:
			return QUEEN_PST[mirrorSq] ?? 0;
		case PieceType.KING:
			return KING_PST[mirrorSq] ?? 0;
	}
}

/**
 * Static evaluation function from the perspective of game.turn.
 * Returns positive if side to move is leading, negative if trailing.
 */
export function evaluateBoard(game: Chess.State, perspectiveColor?: Color): number {
	if (Chess.isCheckmate(game)) {
		const isTurnLost = perspectiveColor ? game.turn === perspectiveColor : true;
		return isTurnLost ? -999999 : 999999;
	}
	if (Chess.isDraw(game)) {
		return 0;
	}

	let whiteScore = 0;
	let blackScore = 0;

	for (const sq of BOARD_INDEXES) {
		const piece = game.board[sq];
		if (!piece) continue;

		const material = PIECE_VALUES[piece.type];
		const pst = getPstScore(piece.type, piece.color, sq);
		const score = material + pst;

		if (piece.color === Color.WHITE) {
			whiteScore += score;
		} else {
			blackScore += score;
		}
	}

	const diff = whiteScore - blackScore;
	const targetColor = perspectiveColor ?? game.turn;
	return targetColor === Color.WHITE ? diff : -diff;
}

/**
 * Score a move for move ordering (MVV-LVA)
 */
function scoreMoveForOrdering(game: Chess.State, move: Move): number {
	let score = 0;
	const victim = game.board[move.to];
	const attacker = game.board[move.from];

	if (victim && attacker) {
		score += PIECE_VALUES[victim.type] * 10 - PIECE_VALUES[attacker.type];
	} else if (move.flags & MoveFlags.EP_CAPTURE) {
		score += PIECE_VALUES[PieceType.PAWN] * 10 - PIECE_VALUES[PieceType.PAWN];
	}

	if (move.promotion) {
		score += PIECE_VALUES[move.promotion] * 3;
	}

	if (move.flags & (MoveFlags.KSIDE_CASTLE | MoveFlags.QSIDE_CASTLE)) {
		score += 150;
	}

	return score;
}

function orderMoves(game: Chess.State, moves: Move[]): Move[] {
	return moves
		.map((m) => ({ move: m, score: scoreMoveForOrdering(game, m) }))
		.sort((a, b) => b.score - a.score)
		.map((x) => x.move);
}

/**
 * Quiescence search: search capture chains until quiet
 */
function quiescence(game: Chess.State, alpha: number, beta: number, maxQDepth: number = 3): number {
	if (Chess.isCheckmate(game)) return -999999;
	if (Chess.isDraw(game)) return 0;

	const standPat = evaluateBoard(game);
	if (standPat >= beta) return standPat;
	if (standPat > alpha) alpha = standPat;
	if (maxQDepth <= 0) return standPat;

	const legalMoves = Chess.getMoves(game);
	const captureMoves = legalMoves.filter(
		(m) => (m.flags & (MoveFlags.CAPTURE | MoveFlags.EP_CAPTURE | MoveFlags.PROMOTION)) !== 0
	);
	if (captureMoves.length === 0) return standPat;

	const sortedCaptures = orderMoves(game, captureMoves);

	for (const move of sortedCaptures) {
		const nextGame = Chess.makeMove(game, move);
		const score = -quiescence(nextGame, -beta, -alpha, maxQDepth - 1);

		if (score >= beta) return score;
		if (score > alpha) alpha = score;
	}

	return alpha;
}

/**
 * Negamax alpha-beta search
 */
function minimax(
	game: Chess.State,
	depth: number,
	alpha: number,
	beta: number,
	useQuiescence: boolean
): number {
	if (Chess.isCheckmate(game)) return -999999;
	if (Chess.isDraw(game)) return 0;

	if (depth <= 0) {
		if (useQuiescence) {
			return quiescence(game, alpha, beta);
		}
		return evaluateBoard(game);
	}

	const moves = Chess.getMoves(game);
	if (moves.length === 0) {
		return Chess.isCheck(game) ? -999999 : 0;
	}

	const sortedMoves = orderMoves(game, moves);
	let bestScore = -Infinity;

	for (const move of sortedMoves) {
		const nextGame = Chess.makeMove(game, move);
		const score = -minimax(nextGame, depth - 1, -beta, -alpha, useQuiescence);

		if (score > bestScore) {
			bestScore = score;
		}
		if (score > alpha) {
			alpha = score;
		}
		if (alpha >= beta) {
			break; // Alpha-beta cutoff
		}
	}

	return bestScore;
}

/**
 * Finds the best legal move for the current position according to difficulty setting.
 */
export function findBestMove(
	game: Chess.State,
	difficulty: AIDifficulty
): { move: Move | null; score: number } {
	const legalMoves = Chess.getMoves(game);
	if (legalMoves.length === 0) {
		return { move: null, score: 0 };
	}

	// Easy mode: Depth 1 with 35% random sub-optimal move
	if (difficulty === 'easy') {
		if (Math.random() < 0.35) {
			const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
			return { move: randomMove, score: 0 };
		}
		let bestScore = -Infinity;
		let bestMove = legalMoves[0];
		for (const move of legalMoves) {
			const nextGame = Chess.makeMove(game, move);
			const score = -evaluateBoard(nextGame);
			if (score > bestScore) {
				bestScore = score;
				bestMove = move;
			}
		}
		return { move: bestMove, score: bestScore };
	}

	// Search parameters for remaining levels
	let searchDepth = 2;
	let useQuiescence = false;

	switch (difficulty) {
		case 'medium':
			searchDepth = 2;
			useQuiescence = false;
			break;
		case 'teacher':
			searchDepth = 2;
			useQuiescence = true;
			break;
		case 'hard':
			searchDepth = 3;
			useQuiescence = true;
			break;
		case 'grandmaster':
			searchDepth = 3;
			useQuiescence = true;
			break;
	}

	const sortedMoves = orderMoves(game, legalMoves);
	let bestMove: Move = sortedMoves[0];
	let bestScore = -Infinity;
	let alpha = -Infinity;
	const beta = Infinity;

	const candidateMoves: { move: Move; score: number }[] = [];

	for (const move of sortedMoves) {
		const nextGame = Chess.makeMove(game, move);
		const score = -minimax(nextGame, searchDepth - 1, -beta, -alpha, useQuiescence);

		if (score > bestScore) {
			bestScore = score;
			bestMove = move;
			candidateMoves.length = 0;
			candidateMoves.push({ move, score });
		} else if (score === bestScore) {
			candidateMoves.push({ move, score });
		}

		if (score > alpha) {
			alpha = score;
		}

		// If winning checkmate found, take it immediately
		if (score >= 900000) {
			bestMove = move;
			break;
		}
	}

	if (candidateMoves.length > 1 && difficulty !== 'grandmaster') {
		bestMove = candidateMoves[Math.floor(Math.random() * candidateMoves.length)].move;
	}

	return { move: bestMove, score: bestScore };
}

/**
 * Generate human-readable pedagogical coaching commentary explaining a move.
 */
export function generateTeacherExplanation(
	stateBefore: Chess.State,
	stateAfter: Chess.State,
	move: Move
): string {
	const movingPiece = stateBefore.board[move.from];
	if (!movingPiece) return 'Solid positional continuation.';

	const toSq = algebraic(move.to);
	const targetPiece = stateBefore.board[move.to];
	const isEnPassant = (move.flags & MoveFlags.EP_CAPTURE) !== 0;
	const isCastling = (move.flags & (MoveFlags.KSIDE_CASTLE | MoveFlags.QSIDE_CASTLE)) !== 0;
	const isCheckmate = Chess.isCheckmate(stateAfter);
	const isCheck = Chess.isCheck(stateAfter);

	if (isCheckmate) {
		return `Checkmate! The king has no escape squares and cannot be shielded. Excellent final blow.`;
	}

	if (isCheck) {
		return `Delivering check! Applying direct pressure to force the enemy king to defend or move.`;
	}

	if (isCastling) {
		return `Castling early: secures the king behind a protective wall of pawns and activates the rook for central file operations.`;
	}

	if (targetPiece || isEnPassant) {
		const capturedType = isEnPassant ? PieceType.PAWN : (targetPiece?.type ?? PieceType.PAWN);
		const pieceNames: Record<PieceType, string> = {
			p: 'pawn',
			n: 'knight',
			b: 'bishop',
			r: 'rook',
			q: 'queen',
			k: 'king'
		};
		if (PIECE_VALUES[capturedType] > PIECE_VALUES[movingPiece.type]) {
			return `Winning favorable material! Trading our ${pieceNames[movingPiece.type]} for the opponent's higher-value ${pieceNames[capturedType]}.`;
		}
		return `Capturing the ${pieceNames[capturedType]} on ${toSq} to remove a defender and gain material balance.`;
	}

	if (move.promotion) {
		return `Pawn promotion! Successfully marching the pawn to the back rank to crown a powerful new piece.`;
	}

	switch (movingPiece.type) {
		case PieceType.PAWN: {
			const destRank = rank(move.to);
			if (destRank === 3 || destRank === 4) {
				return `Controlling the center! Staking an influential pawn in central squares to restrict opposing pieces.`;
			}
			return `Advancing pawn to ${toSq} to challenge space and open avenues for piece development.`;
		}
		case PieceType.KNIGHT:
			return `Developing the knight to ${toSq}, optimizing central outpost influence and attacking options.`;
		case PieceType.BISHOP:
			return `Placing the bishop along an active diagonal to control key territory and coordinate with friendly pieces.`;
		case PieceType.ROOK:
			return `Positioning the rook onto an open or semi-open file to exert long-range pressure across the board.`;
		case PieceType.QUEEN:
			return `Repositioning the queen to ${toSq} to coordinate an aggressive multi-directional attack.`;
		case PieceType.KING:
			return `Tucking the king into safety and preparing endgame piece coordination.`;
	}
}

/**
 * Generate on-demand Teacher hint for the player's current turn.
 */
export function getTeacherHint(game: Chess.State): TeacherHint | null {
	const { move } = findBestMove(game, 'teacher');
	if (!move) return null;

	const fromPos = ox88ToPos(move.from);
	const toPos = ox88ToPos(move.to);
	const movingPiece = game.board[move.from];

	const pieceName = movingPiece?.type.toUpperCase() ?? 'piece';
	const fromSquare = algebraic(move.from);
	const toSquare = algebraic(move.to);

	const nextState = Chess.makeMove(game, move);
	const explanation = generateTeacherExplanation(game, nextState, move);

	let san = `${pieceName} ${fromSquare}→${toSquare}`;
	if (move.flags & MoveFlags.KSIDE_CASTLE) san = 'O-O (Castle Kingside)';
	else if (move.flags & MoveFlags.QSIDE_CASTLE) san = 'O-O-O (Castle Queenside)';

	return {
		from: fromPos,
		to: toPos,
		explanation,
		san
	};
}
