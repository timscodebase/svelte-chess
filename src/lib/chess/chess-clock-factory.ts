export type DisplayFaceType = 'digital' | 'analog';

export interface AnalogCoordinates {
	hourHandDegrees: number;
	minuteHandDegrees: number;
	secondHandDegrees: number;
}

export interface ClockSnapshot {
	readonly timeLimitMs: number;
	readonly elapsedMs: number;
	readonly remainingMs: number;
	readonly isRunning: boolean;
	readonly isFlagged: boolean;
	readonly faceType: DisplayFaceType;
	readonly digitalDisplay: string;
	readonly analogDisplay: AnalogCoordinates;
}

export interface ChessClockOptions {
	timeLimitMs: number;
	incrementMs?: number;
	faceType?: DisplayFaceType;
	onFlag?: () => void;
}

export interface ChessClock {
	readonly faceType: DisplayFaceType;
	start(): void;
	stop(): void;
	reset(): void;
	setFaceType(faceType: DisplayFaceType): void;
	getSnapshot(): ClockSnapshot;
}

export function createChessClock(options: ChessClockOptions): ChessClock {
	const {
		timeLimitMs: initialLimitMs,
		incrementMs = 0,
		faceType: initialFaceType = 'digital',
		onFlag
	} = options;

	let currentFaceType: DisplayFaceType = initialFaceType;
	let activeTimeLimitMs: number = initialLimitMs;
	let accumulatedElapsedMs: number = 0;
	let startTimestamp: number | null = null;
	let isRunning: boolean = false;
	let hasTriggeredFlag: boolean = false;

	const calculateElapsedMs = (): number => {
		if (!isRunning || startTimestamp === null) {
			return accumulatedElapsedMs;
		}
		return accumulatedElapsedMs + (performance.now() - startTimestamp);
	};

	const formatDigital = (ms: number): string => {
		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		const tenths = Math.floor((Math.max(0, ms) % 1000) / 100);
		const pad = (n: number) => n.toString().padStart(2, '0');

		if (hours > 0) {
			return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
		}
		return `${pad(minutes)}:${pad(seconds)}.${tenths}`;
	};

	const calculateAnalogCoordinates = (ms: number): AnalogCoordinates => {
		const safeMs = Math.max(0, ms);
		const totalSeconds = safeMs / 1000;
		const totalMinutes = totalSeconds / 60;
		const totalHours = totalMinutes / 60;

		return {
			hourHandDegrees: (totalHours % 12) * 30,
			minuteHandDegrees: (totalMinutes % 60) * 6,
			secondHandDegrees: (totalSeconds % 60) * 6
		};
	};

	return {
		get faceType(): DisplayFaceType {
			return currentFaceType;
		},

		setFaceType(faceType: DisplayFaceType): void {
			currentFaceType = faceType;
		},

		start(): void {
			if (isRunning) return;
			const currentElapsed = calculateElapsedMs();
			if (currentElapsed >= activeTimeLimitMs) {
				if (!hasTriggeredFlag) {
					hasTriggeredFlag = true;
					onFlag?.();
				}
				return;
			}

			startTimestamp = performance.now();
			isRunning = true;
		},

		stop(): void {
			if (!isRunning) return;
			accumulatedElapsedMs = calculateElapsedMs();
			startTimestamp = null;
			isRunning = false;

			if (accumulatedElapsedMs < activeTimeLimitMs && incrementMs > 0) {
				activeTimeLimitMs += incrementMs;
			}
		},

		reset(): void {
			isRunning = false;
			startTimestamp = null;
			accumulatedElapsedMs = 0;
			activeTimeLimitMs = initialLimitMs;
			hasTriggeredFlag = false;
		},

		getSnapshot(): ClockSnapshot {
			const elapsedMs = calculateElapsedMs();
			const remainingMs = Math.max(0, activeTimeLimitMs - elapsedMs);
			const isFlagged = remainingMs <= 0;

			if (isFlagged && !hasTriggeredFlag) {
				hasTriggeredFlag = true;
				isRunning = false;
				startTimestamp = null;
				accumulatedElapsedMs = activeTimeLimitMs;
				onFlag?.();
			}

			return {
				timeLimitMs: activeTimeLimitMs,
				elapsedMs,
				remainingMs,
				isRunning,
				isFlagged,
				faceType: currentFaceType,
				digitalDisplay: formatDigital(remainingMs),
				analogDisplay: calculateAnalogCoordinates(remainingMs)
			};
		}
	};
}
