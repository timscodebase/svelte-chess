<script lang="ts">
	import { ChessGameStore } from '../lib/chess/game-state.svelte';
	import ChessScene3D from '../lib/components/ChessScene3D.svelte';
	import ChessClockOverlay from '../lib/components/ChessClockOverlay.svelte';
	import PromotionModal from '../lib/components/PromotionModal.svelte';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';

	const game = new ChessGameStore(3, 2);

	let liveAnnouncement = $derived.by(() => {
		if (game.isCheckmate) {
			return `Checkmate! ${game.winner?.toUpperCase()} has won the match.`;
		}
		if (game.isStalemate) {
			return 'Game drawn by stalemate.';
		}
		if (game.isDraw) {
			return 'Game drawn.';
		}
		if (game.isFlagged) {
			return `Time out! ${game.winner?.toUpperCase()} has won on time.`;
		}
		if (game.isCheck) {
			return `Check! ${game.turn.toUpperCase()} King is in check.`;
		}
		const lastNotation = game.moveHistory[game.moveHistory.length - 1];
		if (lastNotation) {
			return `${game.turn === 'white' ? 'Black' : 'White'} moved ${lastNotation}. Now ${game.turn}'s turn.`;
		}
		return "Game started. White's turn.";
	});
</script>

<svelte:head>
	<title>3D Chess with Multi-Level AI & Clock</title>
</svelte:head>

<main class="app-layout">
	<!-- Skip Link for Keyboard Navigation (WCAG 2.2 Criterion 2.4.1) -->
	<a href="#chess-viewport" class="skip-link">Skip to 3D Chessboard</a>

	<!-- Live Announcer for Screen Readers (WCAG 2.2 Live Region) -->
	<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
		{liveAnnouncement}
	</div>

	<!-- 3D Three.js Viewport with OrbitControls -->
	<div
		id="chess-viewport"
		class="viewport-area"
		tabindex="-1"
		role="region"
		aria-label="Interactive 3D Chessboard"
	>
		<ChessScene3D {game} />
	</div>

	<!-- HUD Dual Chess Clock Overlay -->
	<ChessClockOverlay {game} />

	<!-- Pawn Promotion Modal -->
	<PromotionModal {game} />

	<!-- Teacher / Coach Guidance Card (Visible when in Teacher AI mode) -->
	{#if game.opponentType === 'ai' && game.aiDifficulty === 'teacher'}
		<aside class="teacher-hud" aria-label="Grand Coach Guidance">
			<div class="teacher-header">
				<div class="teacher-avatar" aria-hidden="true">
					<GraduationCap size={24} aria-hidden="true" />
				</div>
				<div class="teacher-title-wrap">
					<span class="teacher-title">Grand Coach</span>
					<span class="teacher-subtitle">Instructive Guidance</span>
				</div>
			</div>

			{#if game.teacherCommentary}
				<div class="teacher-speech-bubble" role="note" aria-label="Coach Commentary">
					<p>{game.teacherCommentary}</p>
				</div>
			{/if}

			<!-- Teacher Hint Display -->
			{#if game.teacherHint}
				<div class="hint-card" role="region" aria-label="Coach Hint">
					<div class="hint-badge-row">
						<span class="hint-tag">Suggested Move</span>
						<span class="hint-move">{game.teacherHint.san}</span>
					</div>
					<p class="hint-text">{game.teacherHint.explanation}</p>
					<button
						type="button"
						class="hint-dismiss-btn"
						aria-label="Dismiss coach hint"
						onclick={() => game.dismissTeacherHint()}
					>
						Dismiss
					</button>
				</div>
			{:else}
				<button
					type="button"
					class="ask-hint-btn"
					disabled={!game.isMyTurn || game.isCheckmate || game.isStalemate || game.isDraw}
					onclick={() => game.requestTeacherHint()}
				>
					<Lightbulb size={18} aria-hidden="true" />
					<span>Ask Coach for Hint</span>
				</button>
			{/if}
		</aside>
	{/if}

	<!-- Move Log & Status Footer -->
	<footer class="footer-hud" aria-label="Match Status and Move History">
		<div class="hud-pill" role="status">
			<span>Turn: <strong class="turn-highlight">{game.turn.toUpperCase()}</strong></span>
			{#if game.isCheckmate}
				<span class="badge badge-mate" role="alert">CHECKMATE</span>
			{:else if game.isCheck}
				<span class="badge badge-check" role="alert">CHECK!</span>
			{:else if game.isStalemate}
				<span class="badge badge-draw" role="alert">STALEMATE</span>
			{:else if game.isDraw}
				<span class="badge badge-draw" role="alert">DRAW</span>
			{/if}
		</div>
		{#if game.validMoves.length > 0}
			<div class="legal-moves-count" aria-live="polite">
				<span class="count-num">{game.validMoves.length}</span> legal move{game.validMoves
					.length === 1
					? ''
					: 's'}
			</div>
		{/if}
		<div class="history-track" aria-label="Recent moves history">
			{#each game.moveHistory.slice(-6) as move, idx (idx)}
				<span class="move-bubble">{move}</span>
			{/each}
		</div>
	</footer>
</main>

<style>
	:global(body, html) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #0a0f1d;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	.app-layout {
		position: relative;
		width: 100vw;
		height: 100vh;
	}

	.viewport-area {
		width: 100%;
		height: 100%;
		outline: none;
	}

	/* Teacher / Coach HUD */
	.teacher-hud {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		width: 340px;
		background: rgba(15, 23, 42, 0.94);
		backdrop-filter: blur(14px);
		border: 2px solid #34d399;
		border-radius: 14px;
		padding: 1.25rem;
		color: #ffffff;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.6),
			0 0 15px rgba(52, 211, 153, 0.2);
		z-index: 10;
		animation: fade-in 0.3s ease;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.teacher-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
		padding-bottom: 0.6rem;
		border-bottom: 1.5px solid rgba(255, 255, 255, 0.12);
	}

	.teacher-avatar {
		font-size: 1.6rem;
		background: rgba(5, 150, 105, 0.25);
		width: 44px;
		height: 44px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		border: 2px solid #34d399;
	}

	.teacher-title-wrap {
		display: flex;
		flex-direction: column;
	}

	.teacher-title {
		font-weight: 800;
		font-size: 1.05rem;
		color: #34d399;
		letter-spacing: 0.02em;
	}

	.teacher-subtitle {
		font-size: 0.8rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.teacher-speech-bubble {
		background: #0f2338;
		border-left: 4px solid #10b981;
		border-radius: 8px;
		padding: 0.75rem 0.9rem;
		margin-bottom: 0.85rem;
		font-size: 0.88rem;
		line-height: 1.5;
		color: #ffffff;
	}

	.teacher-speech-bubble p {
		margin: 0;
	}

	.ask-hint-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		min-height: 48px;
		background: #065f46;
		border: 2px solid #34d399;
		color: #ffffff;
		font-weight: 800;
		font-size: 0.92rem;
		padding: 0.65rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.ask-hint-btn:hover:not(:disabled) {
		background: #047857;
		border-color: #6ee7b7;
		transform: translateY(-1px);
		box-shadow: 0 4px 14px rgba(52, 211, 153, 0.35);
	}

	.ask-hint-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.hint-card {
		background: #042f2e;
		border: 2px solid #34d399;
		border-radius: 10px;
		padding: 0.85rem;
		margin-top: 0.6rem;
	}

	.hint-badge-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.hint-tag {
		font-size: 0.75rem;
		text-transform: uppercase;
		font-weight: 800;
		color: #a7f3d0;
		letter-spacing: 0.05em;
	}

	.hint-move {
		background: #064e3b;
		color: #ffffff;
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-weight: 800;
		font-size: 0.92rem;
		padding: 3px 8px;
		border-radius: 6px;
		border: 1.5px solid #34d399;
	}

	.hint-text {
		font-size: 0.86rem;
		line-height: 1.5;
		color: #ffffff;
		margin: 0 0 0.65rem 0;
	}

	.hint-dismiss-btn {
		background: #065f46;
		border: 2px solid #34d399;
		color: #ffffff;
		font-size: 0.8rem;
		font-weight: 700;
		min-height: 44px;
		min-width: 76px;
		padding: 4px 12px;
		border-radius: 6px;
		cursor: pointer;
		float: right;
		transition: all 0.15s ease;
	}

	.hint-dismiss-btn:hover {
		background: #047857;
		border-color: #6ee7b7;
	}

	/* Footer */
	.footer-hud {
		position: absolute;
		bottom: 1.5rem;
		left: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		z-index: 10;
	}

	.hud-pill {
		background: rgba(15, 23, 42, 0.95);
		backdrop-filter: blur(10px);
		border: 2px solid #475569;
		min-height: 44px;
		padding: 0.6rem 1.1rem;
		border-radius: 9999px;
		color: #ffffff;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.turn-highlight {
		color: #38bdf8;
		font-weight: 800;
	}

	.badge {
		padding: 0.2rem 0.6rem;
		border-radius: 6px;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.05em;
	}

	.badge-check {
		background: #991b1b;
		border: 2px solid #f87171;
		color: #ffffff;
		animation: pulse-badge 1s infinite alternate;
	}

	.badge-mate {
		background: #881337;
		border: 2px solid #fb7185;
		color: #ffffff;
		box-shadow: 0 0 12px rgba(251, 113, 133, 0.6);
	}

	.badge-draw {
		background: #1e293b;
		border: 2px solid #94a3b8;
		color: #ffffff;
	}

	.legal-moves-count {
		color: #ffffff;
		font-size: 0.85rem;
		font-weight: 600;
		background: rgba(15, 23, 42, 0.95);
		backdrop-filter: blur(10px);
		min-height: 44px;
		padding: 0.55rem 1rem;
		border-radius: 9999px;
		border: 2px solid #38bdf8;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.count-num {
		color: #38bdf8;
		font-weight: 800;
	}

	.history-track {
		display: flex;
		gap: 0.5rem;
	}

	.move-bubble {
		background: #0f172a;
		color: #7dd3fc;
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.82rem;
		font-weight: 700;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		border: 1.5px solid #64748b;
	}

	@keyframes pulse-badge {
		from {
			transform: scale(1);
			opacity: 0.9;
		}
		to {
			transform: scale(1.05);
			opacity: 1;
		}
	}
</style>
