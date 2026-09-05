import {
	createChessClock,
	type ChessClock,
	type ClockSnapshot,
	type DisplayFaceType
} from './chess-clock-factory';

export type PlayerColor = 'white' | 'black';
export type MatchStatus = 'idle' | 'running' | 'paused' | 'flagged';

export interface DualClockConfig {
	timeLimitMs: number;
	incrementMs?: number;
	faceType?: DisplayFaceType;
	initialActivePlayer?: PlayerColor;
	onFlag?: (loser: PlayerColor, winner: PlayerColor) => void;
}

export interface DualClockSnapshot {
	readonly status: MatchStatus;
	readonly activePlayer: PlayerColor | null;
	readonly moveCount: number;
	readonly white: ClockSnapshot;
	readonly black: ClockSnapshot;
	readonly winner: PlayerColor | null;
}

export interface ChessMatchClock {
	readonly status: MatchStatus;
	readonly activePlayer: PlayerColor | null;
	start(): void;
	pause(): void;
	pressClock(): void;
	reset(): void;
	setFaceType(faceType: DisplayFaceType): void;
	getSnapshot(): DualClockSnapshot;
}

export function createChessMatchClock(config: DualClockConfig): ChessMatchClock {
	const {
		timeLimitMs,
		incrementMs = 0,
		faceType = 'digital',
		initialActivePlayer = 'white',
		onFlag
	} = config;

	let status: MatchStatus = 'idle';
	let activePlayer: PlayerColor = initialActivePlayer;
	let moveCount = 0;
	let winner: PlayerColor | null = null;

	const handleFlag = (loser: PlayerColor) => {
		if (status === 'flagged') return;
		status = 'flagged';
		winner = loser === 'white' ? 'black' : 'white';
		whiteClock.stop();
		blackClock.stop();
		onFlag?.(loser, winner);
	};

	const whiteClock: ChessClock = createChessClock({
		timeLimitMs,
		incrementMs,
		faceType,
		onFlag: () => handleFlag('white')
	});

	const blackClock: ChessClock = createChessClock({
		timeLimitMs,
		incrementMs,
		faceType,
		onFlag: () => handleFlag('black')
	});

	return {
		get status(): MatchStatus {
			return status;
		},

		get activePlayer(): PlayerColor | null {
			return status === 'idle' || status === 'flagged' ? null : activePlayer;
		},

		start(): void {
			if (status === 'running' || status === 'flagged') return;

			status = 'running';
			if (activePlayer === 'white') {
				whiteClock.start();
			} else {
				blackClock.start();
			}
		},

		pause(): void {
			if (status !== 'running') return;

			status = 'paused';
			whiteClock.stop();
			blackClock.stop();
		},

		pressClock(): void {
			if (status !== 'running') return;

			if (activePlayer === 'white') {
				whiteClock.stop();
				activePlayer = 'black';
				blackClock.start();
			} else {
				blackClock.stop();
				activePlayer = 'white';
				whiteClock.start();
				moveCount += 1;
			}
		},

		reset(): void {
			whiteClock.reset();
			blackClock.reset();
			status = 'idle';
			activePlayer = initialActivePlayer;
			moveCount = 0;
			winner = null;
		},

		setFaceType(newFaceType: DisplayFaceType): void {
			whiteClock.setFaceType(newFaceType);
			blackClock.setFaceType(newFaceType);
		},

		getSnapshot(): DualClockSnapshot {
			const white = whiteClock.getSnapshot();
			const black = blackClock.getSnapshot();
			return {
				status,
				activePlayer: status === 'running' || status === 'paused' ? activePlayer : null,
				moveCount,
				white,
				black,
				winner
			};
		}
	};
}
