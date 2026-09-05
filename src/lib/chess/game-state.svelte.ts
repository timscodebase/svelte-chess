import {
	createChessMatchClock,
	type ChessMatchClock,
	type DualClockSnapshot,
	type PlayerColor
} from './chess-match-clock';
import {
	Chess,
	PieceType as EnginePieceType,
	Color as EngineColor,
	MoveFlags,
	posToOx88,
	ox88ToPos,
	algebraic,
	BOARD_INDEXES,
	type Piece as EnginePiece
} from './chess';
import {
	findBestMove,
	generateTeacherExplanation,
	getTeacherHint,
	type AIDifficulty,
	type TeacherHint
} from './chess-ai';

export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PromotionChoice = 'queen' | 'rook' | 'bishop' | 'knight';
export type OpponentType = 'human' | 'ai';

export interface ChessPiece {
	id: string;
	type: PieceType;
	color: PlayerColor;
	row: number; // 0 to 7
	col: number; // 0 to 7
}

export interface Position {
	row: number;
	col: number;
}

export interface PendingPromotion {
	pawn: ChessPiece;
	targetRow: number;
	targetCol: number;
	capturedPiece?: ChessPiece;
}

function engineTypeToPieceType(t: EnginePieceType): PieceType {
	switch (t) {
		case EnginePieceType.PAWN:
			return 'pawn';
		case EnginePieceType.KNIGHT:
			return 'knight';
		case EnginePieceType.BISHOP:
			return 'bishop';
		case EnginePieceType.ROOK:
			return 'rook';
		case EnginePieceType.QUEEN:
			return 'queen';
		case EnginePieceType.KING:
			return 'king';
	}
}

function pieceTypeToEngineType(t: PromotionChoice): EnginePieceType {
	switch (t) {
		case 'queen':
			return EnginePieceType.QUEEN;
		case 'rook':
			return EnginePieceType.ROOK;
		case 'bishop':
			return EnginePieceType.BISHOP;
		case 'knight':
			return EnginePieceType.KNIGHT;
	}
}

export class ChessGameStore {
	pieces = $state<ChessPiece[]>([]);
	selectedSquare = $state<Position | null>(null);
	validMoves = $state<Position[]>([]);
	clockSnapshot = $state<DualClockSnapshot | null>(null);
	moveHistory = $state<string[]>([]);
	pendingPromotion = $state<PendingPromotion | null>(null);
	isCheck = $state<boolean>(false);
	isCheckmate = $state<boolean>(false);
	isStalemate = $state<boolean>(false);
	isDraw = $state<boolean>(false);
	gameResult = $state<string | null>(null);
	lastMove = $state<{ from: Position; to: Position } | null>(null);

	// AI & Opponent Configuration
	opponentType = $state<OpponentType>('human');
	aiDifficulty = $state<AIDifficulty>('medium');
	playerColor = $state<PlayerColor>('white');
	isAiThinking = $state<boolean>(false);

	// Teacher Mode Guidance
	teacherCommentary = $state<string | null>(null);
	teacherHint = $state<TeacherHint | null>(null);

	private chessState: Chess.State;
	private matchClock: ChessMatchClock;
	private animFrameId: number | null = null;
	private aiTimerId: ReturnType<typeof setTimeout> | null = null;

	constructor(timeLimitMinutes: number = 3, incrementSeconds: number = 2) {
		this.chessState = Chess.create();
		this.matchClock = createChessMatchClock({
			timeLimitMs: timeLimitMinutes * 60 * 1000,
			incrementMs: incrementSeconds * 1000,
			onFlag: () => {
				this.updateSnapshot();
			}
		});

		this.clockSnapshot = this.matchClock.getSnapshot();
		this.syncPiecesFromEngine();
	}

	get turn(): PlayerColor {
		return this.chessState.turn === EngineColor.WHITE ? 'white' : 'black';
	}

	get isRunning(): boolean {
		return this.clockSnapshot?.status === 'running';
	}

	get isFlagged(): boolean {
		return this.clockSnapshot?.status === 'flagged';
	}

	get isMyTurn(): boolean {
		if (this.opponentType === 'human') return true;
		return this.turn === this.playerColor;
	}

	get winner(): PlayerColor | null {
		if (this.clockSnapshot?.status === 'flagged') {
			return this.clockSnapshot.winner;
		}
		if (this.isCheckmate) {
			return this.turn === 'white' ? 'black' : 'white';
		}
		return null;
	}

	private startTickLoop(): void {
		if (typeof requestAnimationFrame === 'undefined') return;
		if (this.animFrameId !== null) return;

		const loop = () => {
			this.updateSnapshot();
			if (this.matchClock.status === 'running') {
				this.animFrameId = requestAnimationFrame(loop);
			} else {
				this.animFrameId = null;
			}
		};
		this.animFrameId = requestAnimationFrame(loop);
	}

	private updateSnapshot(): void {
		this.clockSnapshot = this.matchClock.getSnapshot();
	}

	startMatch(): void {
		this.matchClock.start();
		this.startTickLoop();
	}

	pauseMatch(): void {
		this.matchClock.pause();
		this.updateSnapshot();
	}

	resetGame(): void {
		if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
		if (this.aiTimerId !== null) {
			clearTimeout(this.aiTimerId);
			this.aiTimerId = null;
		}

		this.matchClock.reset();
		this.chessState = Chess.create();
		this.syncPiecesFromEngine();
		this.selectedSquare = null;
		this.validMoves = [];
		this.pendingPromotion = null;
		this.moveHistory = [];
		this.isCheck = false;
		this.isCheckmate = false;
		this.isStalemate = false;
		this.isDraw = false;
		this.gameResult = null;
		this.lastMove = null;
		this.isAiThinking = false;
		this.teacherHint = null;

		if (this.aiDifficulty === 'teacher') {
			this.teacherCommentary =
				"Welcome! I'm your chess coach. Play standard moves, control the center, and ask for hints whenever you'd like guidance.";
		} else {
			this.teacherCommentary = null;
		}

		this.updateSnapshot();

		// If playing against AI and AI is White, trigger AI's first move
		if (this.opponentType === 'ai' && this.playerColor === 'black') {
			this.triggerAiIfNeeded();
		}
	}

	toggleFaceType(): void {
		const current = this.clockSnapshot?.white.faceType ?? 'digital';
		const next = current === 'digital' ? 'analog' : 'digital';
		this.matchClock.setFaceType(next);
		this.updateSnapshot();
	}

	setOpponentType(type: OpponentType): void {
		this.opponentType = type;
		this.resetGame();
	}

	setAiDifficulty(diff: AIDifficulty): void {
		this.aiDifficulty = diff;
		this.resetGame();
	}

	setPlayerColor(color: PlayerColor): void {
		this.playerColor = color;
		this.resetGame();
	}

	requestTeacherHint(): void {
		if (this.isFlagged || this.isCheckmate || this.isStalemate || this.isDraw || this.isAiThinking)
			return;
		const hint = getTeacherHint(this.chessState);
		this.teacherHint = hint;
	}

	dismissTeacherHint(): void {
		this.teacherHint = null;
	}

	getPieceAt(row: number, col: number): ChessPiece | undefined {
		return this.pieces.find((p) => p.row === row && p.col === col);
	}

	selectOrMove(row: number, col: number): void {
		// Disallow interaction if waiting for promotion, flagged, AI is thinking, or game is over
		if (
			this.isFlagged ||
			this.isCheckmate ||
			this.isStalemate ||
			this.isDraw ||
			this.pendingPromotion ||
			this.isAiThinking
		) {
			return;
		}

		// In AI mode, disallow human from moving AI's pieces
		if (this.opponentType === 'ai' && this.turn !== this.playerColor) {
			return;
		}

		const clickedPiece = this.getPieceAt(row, col);
		const clickedOx88 = posToOx88(row, col);

		// 1. If nothing is currently selected
		if (this.selectedSquare === null) {
			if (clickedPiece && clickedPiece.color === this.turn) {
				const legalMoves = Chess.getMoves(this.chessState, { square: clickedOx88 });
				this.selectedSquare = { row, col };
				this.validMoves = legalMoves.map((m) => ox88ToPos(m.to));
			}
			return;
		}

		// 2. If clicked the currently selected piece: deselect
		if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
			this.selectedSquare = null;
			this.validMoves = [];
			return;
		}

		// 3. If clicked another piece of the current player: switch selection
		if (clickedPiece && clickedPiece.color === this.turn) {
			const legalMoves = Chess.getMoves(this.chessState, { square: clickedOx88 });
			this.selectedSquare = { row, col };
			this.validMoves = legalMoves.map((m) => ox88ToPos(m.to));
			return;
		}

		// 4. Moving to a target square
		const fromOx88 = posToOx88(this.selectedSquare.row, this.selectedSquare.col);
		const selectedPiece = this.getPieceAt(this.selectedSquare.row, this.selectedSquare.col);
		if (!selectedPiece) {
			this.selectedSquare = null;
			this.validMoves = [];
			return;
		}

		// Strictly verify if clicked destination is among legal moves for this piece
		const legalMoves = Chess.getMoves(this.chessState, { square: fromOx88 });
		const matchingMoves = legalMoves.filter((m) => m.to === clickedOx88);

		if (matchingMoves.length === 0) {
			// Illegal move under chess rules! Deselect and reject
			this.selectedSquare = null;
			this.validMoves = [];
			return;
		}

		// Check for Pawn Promotion
		const isPromotionMove = matchingMoves.some((m) => (m.flags & MoveFlags.PROMOTION) !== 0);
		if (isPromotionMove) {
			this.pendingPromotion = {
				pawn: selectedPiece,
				targetRow: row,
				targetCol: col,
				capturedPiece: clickedPiece
			};
			return;
		}

		// Execute standard legal move
		this.executeMove(fromOx88, clickedOx88);
	}

	resolvePromotion(choice: PromotionChoice): void {
		if (!this.pendingPromotion) return;

		const fromOx88 = posToOx88(this.pendingPromotion.pawn.row, this.pendingPromotion.pawn.col);
		const toOx88 = posToOx88(this.pendingPromotion.targetRow, this.pendingPromotion.targetCol);
		const enginePieceType = pieceTypeToEngineType(choice);

		this.pendingPromotion = null;
		this.executeMove(fromOx88, toOx88, enginePieceType);
	}

	private executeMove(from: number, to: number, promotion?: EnginePieceType): void {
		if (this.clockSnapshot?.status === 'idle') {
			this.startMatch();
		}

		const stateBefore = structuredClone(this.chessState);
		const movingPiece = stateBefore.board[from];
		if (!movingPiece) return;

		// Apply move to chess engine
		this.chessState = Chess.makeMove(this.chessState, { from, to, promotion });

		// Sync 3D pieces
		this.syncPiecesFromEngine();

		// Check post-move game conditions
		this.isCheck = Chess.isCheck(this.chessState);
		this.isCheckmate = Chess.isCheckmate(this.chessState);
		this.isStalemate = Chess.isStalemate(this.chessState);
		this.isDraw = Chess.isDraw(this.chessState);

		// Format standard notation
		const notation = this.formatMoveNotation(stateBefore, from, to, promotion);
		this.moveHistory.push(notation);

		// Record last move
		this.lastMove = {
			from: ox88ToPos(from),
			to: ox88ToPos(to)
		};

		// Reset selection and valid moves
		this.selectedSquare = null;
		this.validMoves = [];
		this.teacherHint = null;

		// Advance clocks or stop on game over
		if (this.isCheckmate) {
			const victor = this.turn === 'white' ? 'BLACK' : 'WHITE';
			this.gameResult = `Checkmate! ${victor} wins!`;
			this.pauseMatch();
		} else if (this.isStalemate) {
			this.gameResult = 'Draw by stalemate!';
			this.pauseMatch();
		} else if (this.isDraw) {
			this.gameResult = 'Draw!';
			this.pauseMatch();
		} else {
			this.matchClock.pressClock();
			this.updateSnapshot();

			// Trigger AI move if game continues
			this.triggerAiIfNeeded();
		}
	}

	private triggerAiIfNeeded(): void {
		if (this.opponentType !== 'ai') return;
		if (this.isFlagged || this.isCheckmate || this.isStalemate || this.isDraw) return;

		const isAiTurn = this.turn !== this.playerColor;
		if (!isAiTurn) return;

		this.isAiThinking = true;

		// Pacing delay (300ms) for human-like feeling
		this.aiTimerId = setTimeout(() => {
			if (this.opponentType !== 'ai' || this.turn === this.playerColor) {
				this.isAiThinking = false;
				return;
			}

			const stateBefore = structuredClone(this.chessState);
			const { move } = findBestMove(this.chessState, this.aiDifficulty);

			if (!move) {
				this.isAiThinking = false;
				return;
			}

			const promotionPiece =
				move.promotion ?? (move.flags & MoveFlags.PROMOTION ? EnginePieceType.QUEEN : undefined);

			this.isAiThinking = false;
			this.executeMove(move.from, move.to, promotionPiece);

			if (this.aiDifficulty === 'teacher') {
				const explanation = generateTeacherExplanation(stateBefore, this.chessState, move);
				this.teacherCommentary = explanation;
			}
		}, 300);
	}

	private formatMoveNotation(
		stateBefore: Chess.State,
		from: number,
		to: number,
		promotion?: EnginePieceType
	): string {
		const piece = stateBefore.board[from];
		if (!piece) return '';

		const fromSquare = algebraic(from);
		const toSquare = algebraic(to);
		const isCapture = stateBefore.board[to] !== null || to === stateBefore.epSquare;

		let notation: string;

		// Castling
		if (piece.type === EnginePieceType.KING && Math.abs(from - to) === 2) {
			notation = to > from ? 'O-O' : 'O-O-O';
		} else if (piece.type === EnginePieceType.PAWN) {
			if (isCapture) {
				notation = `${fromSquare[0]}x${toSquare}`;
			} else {
				notation = toSquare;
			}
			if (promotion) {
				notation += `=${promotion.toUpperCase()}`;
			}
		} else {
			const pChar = piece.type.toUpperCase();
			notation = `${pChar}${isCapture ? 'x' : ''}${toSquare}`;
		}

		if (this.isCheckmate) {
			notation += '#';
		} else if (this.isCheck) {
			notation += '+';
		}

		return notation;
	}

	private syncPiecesFromEngine(): void {
		const freshPieces: ChessPiece[] = [];
		for (const i of BOARD_INDEXES) {
			const piece: EnginePiece | null = this.chessState.board[i];
			if (piece) {
				const { row, col } = ox88ToPos(i);
				freshPieces.push({
					id: `piece_${piece.id}`,
					type: engineTypeToPieceType(piece.type),
					color: piece.color === EngineColor.WHITE ? 'white' : 'black',
					row,
					col
				});
			}
		}
		this.pieces = freshPieces;
	}
}
