/* eslint-disable @typescript-eslint/unbound-method */
import { page } from 'vite-plus/test/browser';
import { describe, expect, it, vi } from 'vite-plus/test';
import { render } from 'vitest-browser-svelte';
import ChessClockOverlay from './ChessClockOverlay.svelte';
import type { ChessGameStore } from '../chess/game-state.svelte';

function createMockStore(overrides: Partial<ChessGameStore> = {}): ChessGameStore {
	const defaultSnapshot = {
		status: 'idle' as const,
		activePlayer: null,
		moveCount: 0,
		white: {
			timeLimitMs: 180000,
			elapsedMs: 0,
			remainingMs: 180000,
			isRunning: false,
			isFlagged: false,
			faceType: 'digital' as const,
			digitalDisplay: '03:00.0',
			analogDisplay: { hourHandDegrees: 18, minuteHandDegrees: 18, secondHandDegrees: 0 }
		},
		black: {
			timeLimitMs: 180000,
			elapsedMs: 0,
			remainingMs: 180000,
			isRunning: false,
			isFlagged: false,
			faceType: 'digital' as const,
			digitalDisplay: '03:00.0',
			analogDisplay: { hourHandDegrees: 18, minuteHandDegrees: 18, secondHandDegrees: 0 }
		},
		winner: null
	};

	return {
		clockSnapshot: defaultSnapshot,
		opponentType: 'human',
		aiDifficulty: 'medium',
		playerColor: 'white',
		isAiThinking: false,
		gameResult: null,
		isFlagged: false,
		isCheckmate: false,
		isDraw: false,
		isStalemate: false,
		winner: null,
		toggleFaceType: vi.fn(),
		setOpponentType: vi.fn(),
		setAiDifficulty: vi.fn(),
		setPlayerColor: vi.fn(),
		startMatch: vi.fn(),
		pauseMatch: vi.fn(),
		resetGame: vi.fn(),
		...overrides
	} as unknown as ChessGameStore;
}

describe('ChessClockOverlay.svelte', () => {
	it('renders clock times, move counter, and match status in default 2-player mode', async () => {
		const store = createMockStore();
		render(ChessClockOverlay, { game: store });

		await expect.element(page.getByText('idle')).toBeInTheDocument();
		await expect.element(page.getByText('Moves: 0')).toBeInTheDocument();
		await expect.element(page.getByText('White')).toBeInTheDocument();
		await expect.element(page.getByText('Black')).toBeInTheDocument();
		await expect.element(page.getByText('Start')).toBeInTheDocument();
	});

	it('toggles clock face type between digital and analog', async () => {
		const store = createMockStore();
		render(ChessClockOverlay, { game: store });

		const toggleBtn = page.getByRole('button', { name: 'Analog' });
		await toggleBtn.click();
		expect(store.toggleFaceType).toHaveBeenCalledTimes(1);
	});

	it('switches match mode between 2 Players and vs AI', async () => {
		const store = createMockStore();
		render(ChessClockOverlay, { game: store });

		const aiTab = page.getByRole('button', { name: /vs AI/i });
		await aiTab.click();
		expect(store.setOpponentType).toHaveBeenCalledWith('ai');
	});

	it('displays AI difficulty pills and side picker when vs AI is active', async () => {
		const store = createMockStore({
			opponentType: 'ai',
			aiDifficulty: 'teacher',
			playerColor: 'black'
		});
		render(ChessClockOverlay, { game: store });

		await expect.element(page.getByText('Difficulty:')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /GM/i })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Teacher/i })).toBeInTheDocument();

		// Click GM difficulty pill
		const gmBtn = page.getByRole('button', { name: /GM/i });
		await gmBtn.click();
		expect(store.setAiDifficulty).toHaveBeenCalledWith('grandmaster');

		// Click White side picker
		const whiteSideBtn = page.getByRole('button', { name: /White/i });
		await whiteSideBtn.click();
		expect(store.setPlayerColor).toHaveBeenCalledWith('white');
	});

	it('triggers start, pause, and reset controls properly', async () => {
		const storeRunning = createMockStore({
			clockSnapshot: {
				...createMockStore().clockSnapshot!,
				status: 'running',
				activePlayer: 'white'
			}
		});
		render(ChessClockOverlay, { game: storeRunning });

		const pauseBtn = page.getByRole('button', { name: 'Pause' });
		await pauseBtn.click();
		expect(storeRunning.pauseMatch).toHaveBeenCalledTimes(1);

		const resetBtn = page.getByRole('button', { name: 'Reset Match' });
		await resetBtn.click();
		expect(storeRunning.resetGame).toHaveBeenCalledTimes(1);
	});

	it('renders checkmate victory banner when game ends', async () => {
		const storeGameOver = createMockStore({
			gameResult: 'Checkmate! White wins.',
			isCheckmate: true,
			winner: 'white'
		});
		render(ChessClockOverlay, { game: storeGameOver });

		await expect.element(page.getByText(/Checkmate! White wins/i)).toBeInTheDocument();
	});

	it('renders time out victory banner when a player flags', async () => {
		const storeFlagged = createMockStore({
			isFlagged: true,
			winner: 'black'
		});
		render(ChessClockOverlay, { game: storeFlagged });

		await expect.element(page.getByText(/Time Out: BLACK Wins!/i)).toBeInTheDocument();
	});
});
