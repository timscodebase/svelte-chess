<script lang="ts">
	import type { ChessGameStore, PromotionChoice } from '../chess/game-state.svelte';
	import type { Component } from 'svelte';
	import ChessQueen from '@lucide/svelte/icons/chess-queen';
	import ChessRook from '@lucide/svelte/icons/chess-rook';
	import ChessBishop from '@lucide/svelte/icons/chess-bishop';
	import ChessKnight from '@lucide/svelte/icons/chess-knight';

	interface Props {
		game: ChessGameStore;
	}

	const { game }: Props = $props();

	const promotionOptions: {
		type: PromotionChoice;
		label: string;
		icon: Component<{ size?: number; class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
	}[] = [
		{ type: 'queen', label: 'Queen', icon: ChessQueen },
		{ type: 'rook', label: 'Rook', icon: ChessRook },
		{ type: 'bishop', label: 'Bishop', icon: ChessBishop },
		{ type: 'knight', label: 'Knight', icon: ChessKnight }
	];

	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (dialogEl) {
			if (game.pendingPromotion && !dialogEl.open) {
				dialogEl.showModal();
			} else if (!game.pendingPromotion && dialogEl.open) {
				dialogEl.close();
			}
		}
	});
</script>

{#if game.pendingPromotion}
	<dialog
		bind:this={dialogEl}
		class="promo-dialog"
		aria-labelledby="promo-heading"
		aria-describedby="promo-desc"
		oncancel={(e) => e.preventDefault()}
	>
		<div class="modal-card">
			<h3 id="promo-heading">Pawn Promotion</h3>
			<p id="promo-desc">
				Choose promotion for <strong class="player-accent"
					>{game.pendingPromotion.pawn.color.toUpperCase()}</strong
				>:
			</p>

			<div class="choices-grid" role="group" aria-label="Available promotion pieces">
				{#each promotionOptions as opt (opt.type)}
					{@const PieceIcon = opt.icon}
					<button
						type="button"
						class="choice-btn"
						aria-label={`Promote to ${opt.label}`}
						onclick={() => game.resolvePromotion(opt.type)}
					>
						<span class="piece-icon" aria-hidden="true">
							<PieceIcon size={38} aria-hidden="true" />
						</span>
						<span class="piece-label">{opt.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</dialog>
{/if}

<style>
	.promo-dialog {
		background: transparent;
		border: none;
		padding: 0;
		margin: auto;
		max-width: 400px;
		width: 90%;
		outline: none;
	}

	.promo-dialog::backdrop {
		background: rgba(5, 10, 20, 0.85);
		backdrop-filter: blur(8px);
	}

	.modal-card {
		background: #0f172a;
		border: 2px solid #64748b;
		border-radius: 16px;
		padding: 1.75rem;
		text-align: center;
		color: #ffffff;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 1.35rem;
		font-weight: 700;
		color: #ffffff;
	}

	p {
		margin: 0 0 1.5rem;
		color: #e2e8f0;
		font-size: 0.95rem;
	}

	.player-accent {
		color: #38bdf8;
		font-weight: 700;
	}

	.choices-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.choice-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		min-height: 72px;
		padding: 0.85rem;
		background: #1e293b;
		border: 2px solid #475569;
		border-radius: 10px;
		color: #ffffff;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.choice-btn:hover {
		background: #0369a1;
		border-color: #38bdf8;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
	}

	.choice-btn:focus-visible {
		outline: 3px solid #38bdf8 !important;
		outline-offset: 3px !important;
	}

	.piece-icon {
		font-size: 2.4rem;
		line-height: 1;
	}

	.piece-label {
		font-size: 0.88rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
</style>
