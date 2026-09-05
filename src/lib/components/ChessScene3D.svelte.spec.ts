import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChessScene3D from './ChessScene3D.svelte';
import { ChessGameStore } from '../chess/game-state.svelte';

describe('ChessScene3D.svelte', () => {
	it('mounts 3D viewport and initializes Three.js canvas in Chromium', async () => {
		const game = new ChessGameStore();
		const { unmount } = render(ChessScene3D, { game });

		const viewport = page.getByRole('region', { name: /3D Chessboard/i });
		await expect.element(viewport).toBeInTheDocument();

		// Check that Three.js WebGLRenderer created a canvas element inside the viewport
		const canvas = viewport.element().querySelector('canvas');
		expect(canvas).not.toBeNull();
		expect(canvas?.tagName.toLowerCase()).toBe('canvas');

		// Clean unmount test
		unmount();
		await expect.element(viewport).not.toBeInTheDocument();
	});

	it('handles pointer down and up interactions gracefully', async () => {
		const game = new ChessGameStore();
		const { unmount } = render(ChessScene3D, { game });

		const viewport = page.getByRole('region', { name: /3D Chessboard/i });
		await expect.element(viewport).toBeInTheDocument();

		// Trigger click / pointer interaction
		await viewport.click();

		// Canvas remains mounted and interactive
		const canvas = viewport.element().querySelector('canvas');
		expect(canvas).not.toBeNull();

		unmount();
	});
});
