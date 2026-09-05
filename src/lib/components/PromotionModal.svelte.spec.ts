import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PromotionModal from './PromotionModal.svelte';
import type { ChessGameStore } from '../chess/game-state.svelte';

describe('PromotionModal.svelte', () => {
	it('does not render modal when there is no pending promotion', async () => {
		const mockGame = {
			pendingPromotion: null,
			resolvePromotion: vi.fn()
		} as unknown as ChessGameStore;

		render(PromotionModal, { game: mockGame });

		await expect.element(page.getByText('Pawn Promotion')).not.toBeInTheDocument();
	});

	it('renders promotion dialog with 4 piece choices when promotion is pending', async () => {
		const resolvePromotion = vi.fn();
		const mockGame = {
			pendingPromotion: {
				pawn: { id: 'wp0', type: 'pawn', color: 'white', row: 1, col: 0 },
				toRow: 0,
				toCol: 0
			},
			resolvePromotion
		} as unknown as ChessGameStore;

		render(PromotionModal, { game: mockGame });

		await expect
			.element(page.getByRole('heading', { level: 3 }))
			.toHaveTextContent('Pawn Promotion');
		await expect.element(page.getByText('Choose promotion for WHITE:')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Queen/i })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Rook/i })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Bishop/i })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Knight/i })).toBeInTheDocument();

		// Click Queen
		const queenBtn = page.getByRole('button', { name: /Queen/i });
		await queenBtn.click();
		expect(resolvePromotion).toHaveBeenCalledWith('queen');
	});

	it('resolves Knight promotion when knight button is clicked', async () => {
		const resolvePromotion = vi.fn();
		const mockGame = {
			pendingPromotion: {
				pawn: { id: 'bp4', type: 'pawn', color: 'black', row: 6, col: 4 },
				toRow: 7,
				toCol: 4
			},
			resolvePromotion
		} as unknown as ChessGameStore;

		render(PromotionModal, { game: mockGame });

		await expect.element(page.getByText('Choose promotion for BLACK:')).toBeInTheDocument();
		const knightBtn = page.getByRole('button', { name: /Knight/i });
		await knightBtn.click();
		expect(resolvePromotion).toHaveBeenCalledWith('knight');
	});
});
