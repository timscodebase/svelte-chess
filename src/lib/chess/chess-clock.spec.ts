import { describe, it, expect, vi } from 'vitest';
import { createChessClock } from './chess-clock-factory';
import { createChessMatchClock } from './chess-match-clock';

describe('Single Chess Clock Factory', () => {
	it('initializes with correct digital display and default time', () => {
		const clock = createChessClock({
			timeLimitMs: 3 * 60 * 1000, // 3 minutes
			incrementMs: 2 * 1000 // 2 seconds
		});

		const snap = clock.getSnapshot();
		expect(snap.remainingMs).toBe(180000);
		expect(snap.digitalDisplay).toBe('03:00.0');
		expect(snap.isFlagged).toBe(false);
		expect(snap.faceType).toBe('digital');
	});

	it('calculates analog clock hand angles accurately', () => {
		// 3 minutes remaining
		const clock = createChessClock({
			timeLimitMs: 3 * 60 * 1000,
			faceType: 'analog'
		});

		const snap = clock.getSnapshot();
		expect(snap.faceType).toBe('analog');
		expect(snap.analogDisplay.minuteHandDegrees).toBe(18); // (3 / 60) * 360 = 18 deg
		expect(snap.analogDisplay.secondHandDegrees).toBe(0);
	});

	it('adds increment when stopped (after a move)', () => {
		const clock = createChessClock({
			timeLimitMs: 60 * 1000, // 60s
			incrementMs: 5 * 1000 // 5s increment
		});

		clock.start();
		clock.stop(); // Stop adds increment
		const snap = clock.getSnapshot();
		expect(Math.round(snap.remainingMs)).toBe(65000);
	});

	it('can toggle between digital and analog face types', () => {
		const clock = createChessClock({ timeLimitMs: 60000 });
		expect(clock.getSnapshot().faceType).toBe('digital');

		clock.setFaceType('analog');
		expect(clock.getSnapshot().faceType).toBe('analog');

		clock.setFaceType('digital');
		expect(clock.getSnapshot().faceType).toBe('digital');
	});

	it('triggers onFlag callback when time runs out', () => {
		const onFlag = vi.fn();
		const clock = createChessClock({
			timeLimitMs: 0,
			onFlag
		});

		clock.start();
		const snap = clock.getSnapshot();
		expect(snap.isFlagged).toBe(true);
		expect(onFlag).toHaveBeenCalledTimes(1);
	});
});

describe('Dual Chess Match Clock', () => {
	it('starts idle with White as default initial active player', () => {
		const match = createChessMatchClock({
			timeLimitMs: 180000,
			incrementMs: 2000
		});

		const snap = match.getSnapshot();
		expect(snap.status).toBe('idle');
		expect(snap.activePlayer).toBeNull();
		expect(snap.moveCount).toBe(0);
		expect(snap.winner).toBeNull();
	});

	it('starts running with White on start()', () => {
		const match = createChessMatchClock({ timeLimitMs: 180000 });
		match.start();

		const snap = match.getSnapshot();
		expect(snap.status).toBe('running');
		expect(snap.activePlayer).toBe('white');
	});

	it('alternates active player on pressClock()', () => {
		const match = createChessMatchClock({ timeLimitMs: 180000 });
		match.start();
		expect(match.getSnapshot().activePlayer).toBe('white');

		// White moves -> presses clock
		match.pressClock();
		expect(match.getSnapshot().activePlayer).toBe('black');
		expect(match.getSnapshot().moveCount).toBe(0);

		// Black moves -> presses clock
		match.pressClock();
		expect(match.getSnapshot().activePlayer).toBe('white');
		expect(match.getSnapshot().moveCount).toBe(1);
	});

	it('pauses and resumes without losing elapsed time state', () => {
		const match = createChessMatchClock({ timeLimitMs: 180000 });
		match.start();
		match.pause();

		expect(match.getSnapshot().status).toBe('paused');
		expect(match.getSnapshot().activePlayer).toBe('white');

		match.start();
		expect(match.getSnapshot().status).toBe('running');
	});

	it('resets back to initial state on reset()', () => {
		const match = createChessMatchClock({ timeLimitMs: 180000 });
		match.start();
		match.pressClock();
		match.reset();

		const snap = match.getSnapshot();
		expect(snap.status).toBe('idle');
		expect(snap.moveCount).toBe(0);
		expect(snap.winner).toBeNull();
		expect(snap.white.remainingMs).toBe(180000);
		expect(snap.black.remainingMs).toBe(180000);
	});

	it('handles flag and declares the opponent as winner', () => {
		const onFlag = vi.fn();
		const match = createChessMatchClock({
			timeLimitMs: 0,
			onFlag
		});

		match.start(); // White immediately flags
		const snap = match.getSnapshot();
		expect(snap.status).toBe('flagged');
		expect(snap.winner).toBe('black');
		expect(onFlag).toHaveBeenCalledWith('white', 'black');
	});
});
