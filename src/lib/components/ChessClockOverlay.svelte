<script lang="ts">
	import type { ChessGameStore } from '../chess/game-state.svelte';
	import type { AIDifficulty } from '../chess/chess-ai';
	import type { Component } from 'svelte';
	import Sprout from '@lucide/svelte/icons/sprout';
	import Swords from '@lucide/svelte/icons/swords';
	import Flame from '@lucide/svelte/icons/flame';
	import Crown from '@lucide/svelte/icons/crown';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Users from '@lucide/svelte/icons/users';
	import Bot from '@lucide/svelte/icons/bot';
	import Circle from '@lucide/svelte/icons/circle';
	import User from '@lucide/svelte/icons/user';
	import Timer from '@lucide/svelte/icons/timer';
	import Handshake from '@lucide/svelte/icons/handshake';

	interface Props {
		game: ChessGameStore;
	}

	const { game }: Props = $props();
	const snap = $derived(game.clockSnapshot);
	const isAnalog = $derived(snap?.white.faceType === 'analog');

	const difficulties: {
		id: AIDifficulty;
		label: string;
		icon: Component<{ size?: number; class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
	}[] = [
		{ id: 'easy', label: 'Easy', icon: Sprout },
		{ id: 'medium', label: 'Medium', icon: Swords },
		{ id: 'hard', label: 'Hard', icon: Flame },
		{ id: 'grandmaster', label: 'GM', icon: Crown },
		{ id: 'teacher', label: 'Teacher', icon: GraduationCap }
	];
</script>

{#if snap}
	<aside class="hud-panel" aria-label="Chess Match Clock and Game Controls">
		<div class="hud-header">
			<div class="status-wrap">
				<span class="status-tag status-{snap.status}">{snap.status}</span>
				<span class="move-tag">Moves: {snap.moveCount}</span>
			</div>
			<button type="button" class="icon-btn" onclick={() => game.toggleFaceType()}>
				{isAnalog ? 'Digital' : 'Analog'}
			</button>
		</div>

		<!-- Match Mode Switcher: 2 Players vs vs AI -->
		<div class="mode-selector" role="group" aria-label="Match mode selection">
			<button
				type="button"
				aria-pressed={game.opponentType === 'human'}
				class="mode-tab"
				class:active={game.opponentType === 'human'}
				onclick={() => game.setOpponentType('human')}
			>
				<Users size={16} aria-hidden="true" />
				<span>2 Players</span>
			</button>
			<button
				type="button"
				aria-pressed={game.opponentType === 'ai'}
				class="mode-tab"
				class:active={game.opponentType === 'ai'}
				onclick={() => game.setOpponentType('ai')}
			>
				<Bot size={16} aria-hidden="true" />
				<span>vs AI</span>
			</button>
		</div>

		<!-- AI Difficulty & Side Settings (When vs AI is active) -->
		{#if game.opponentType === 'ai'}
			<div class="ai-controls-box">
				<div class="control-label-row">
					<span class="sub-label" id="diff-label">Difficulty:</span>
					<div class="side-picker" role="group" aria-label="Player side selection">
						<button
							type="button"
							aria-pressed={game.playerColor === 'white'}
							class="side-btn"
							class:active={game.playerColor === 'white'}
							onclick={() => game.setPlayerColor('white')}
						>
							<Circle size={12} fill="#ffffff" stroke="#cbd5e1" aria-hidden="true" />
							<span>White</span>
						</button>
						<button
							type="button"
							aria-pressed={game.playerColor === 'black'}
							class="side-btn"
							class:active={game.playerColor === 'black'}
							onclick={() => game.setPlayerColor('black')}
						>
							<Circle size={12} fill="#000000" stroke="#94a3b8" aria-hidden="true" />
							<span>Black</span>
						</button>
					</div>
				</div>
				<div class="difficulty-grid" role="group" aria-labelledby="diff-label">
					{#each difficulties as diff (diff.id)}
						{@const DiffIcon = diff.icon}
						<button
							type="button"
							aria-pressed={game.aiDifficulty === diff.id}
							class="diff-btn"
							class:active={game.aiDifficulty === diff.id}
							class:teacher-btn={diff.id === 'teacher'}
							onclick={() => game.setAiDifficulty(diff.id)}
						>
							<span class="diff-icon" aria-hidden="true">
								<DiffIcon size={18} aria-hidden="true" />
							</span>
							<span class="diff-label">{diff.label}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Black Player Clock -->
		<div
			class="player-bar"
			class:active={snap.activePlayer === 'black'}
			class:flagged={snap.black.isFlagged}
		>
			<div class="player-info">
				<span class="disc black-disc" aria-hidden="true"></span>
				<div class="player-details">
					<span class="player-name">
						{#if game.opponentType === 'ai'}
							{#if game.playerColor === 'black'}
								<span class="name-with-icon">
									<User size={15} aria-hidden="true" />
									You (Black)
								</span>
							{:else}
								<span class="name-with-icon">
									{#if game.aiDifficulty === 'teacher'}
										<GraduationCap size={15} aria-hidden="true" /> Coach (Black)
									{:else}
										<Bot size={15} aria-hidden="true" /> AI (Black)
									{/if}
								</span>
							{/if}
						{:else}
							Black
						{/if}
					</span>
					{#if game.opponentType === 'ai' && game.playerColor === 'white' && game.isAiThinking}
						<span class="thinking-badge" aria-live="polite">Thinking...</span>
					{/if}
				</div>
			</div>
			{#if !isAnalog}
				<span class="digital-time">{snap.black.digitalDisplay}</span>
			{:else}
				<svg
					class="analog-svg"
					viewBox="0 0 100 100"
					role="img"
					aria-label={`Black clock: ${snap.black.digitalDisplay}`}
				>
					<circle cx="50" cy="50" r="45" class="dial" />
					<line
						x1="50"
						y1="50"
						x2="50"
						y2="25"
						transform="rotate({snap.black.analogDisplay.hourHandDegrees} 50 50)"
						class="hand hour"
					/>
					<line
						x1="50"
						y1="50"
						x2="50"
						y2="16"
						transform="rotate({snap.black.analogDisplay.minuteHandDegrees} 50 50)"
						class="hand minute"
					/>
					<line
						x1="50"
						y1="50"
						x2="50"
						y2="12"
						transform="rotate({snap.black.analogDisplay.secondHandDegrees} 50 50)"
						class="hand second"
					/>
					<circle cx="50" cy="50" r="2.5" class="center-pin" />
				</svg>
			{/if}
		</div>

		<!-- White Player Clock -->
		<div
			class="player-bar"
			class:active={snap.activePlayer === 'white'}
			class:flagged={snap.white.isFlagged}
		>
			<div class="player-info">
				<span class="disc white-disc" aria-hidden="true"></span>
				<div class="player-details">
					<span class="player-name">
						{#if game.opponentType === 'ai'}
							{#if game.playerColor === 'white'}
								<span class="name-with-icon">
									<User size={15} aria-hidden="true" />
									You (White)
								</span>
							{:else}
								<span class="name-with-icon">
									{#if game.aiDifficulty === 'teacher'}
										<GraduationCap size={15} aria-hidden="true" /> Coach (White)
									{:else}
										<Bot size={15} aria-hidden="true" /> AI (White)
									{/if}
								</span>
							{/if}
						{:else}
							White
						{/if}
					</span>
					{#if game.opponentType === 'ai' && game.playerColor === 'black' && game.isAiThinking}
						<span class="thinking-badge" aria-live="polite">Thinking...</span>
					{/if}
				</div>
			</div>
			{#if !isAnalog}
				<span class="digital-time">{snap.white.digitalDisplay}</span>
			{:else}
				<svg
					class="analog-svg"
					viewBox="0 0 100 100"
					role="img"
					aria-label={`White clock: ${snap.white.digitalDisplay}`}
				>
					<circle cx="50" cy="50" r="45" class="dial" />
					<line
						x1="50"
						y1="50"
						x2="50"
						y2="25"
						transform="rotate({snap.white.analogDisplay.hourHandDegrees} 50 50)"
						class="hand hour"
					/>
					<line
						x1="50"
						y1="50"
						x2="50"
						y2="16"
						transform="rotate({snap.white.analogDisplay.minuteHandDegrees} 50 50)"
						class="hand minute"
					/>
					<line
						x1="50"
						y1="50"
						x2="50"
						y2="12"
						transform="rotate({snap.white.analogDisplay.secondHandDegrees} 50 50)"
						class="hand second"
					/>
					<circle cx="50" cy="50" r="2.5" class="center-pin" />
				</svg>
			{/if}
		</div>

		<!-- Action Toolbar -->
		<div class="control-row" role="toolbar" aria-label="Clock and match controls">
			{#if snap.status !== 'running'}
				<button
					type="button"
					class="btn btn-green"
					disabled={game.isFlagged}
					onclick={() => game.startMatch()}
				>
					{snap.status === 'paused' ? 'Resume' : 'Start'}
				</button>
			{:else}
				<button type="button" class="btn btn-orange" onclick={() => game.pauseMatch()}>
					Pause
				</button>
			{/if}
			<button type="button" class="btn btn-slate" onclick={() => game.resetGame()}>
				Reset Match
			</button>
		</div>

		{#if game.gameResult}
			<div
				class="victory-banner"
				class:draw={game.isDraw || game.isStalemate}
				role="status"
				aria-live="assertive"
			>
				{#if game.isCheckmate}
					<Crown size={20} aria-hidden="true" />
				{:else}
					<Handshake size={20} aria-hidden="true" />
				{/if}
				<span>{game.gameResult}</span>
			</div>
		{:else if game.isFlagged}
			<div class="victory-banner" role="status" aria-live="assertive">
				<Timer size={20} aria-hidden="true" />
				<span>Time Out: {game.winner?.toUpperCase()} Wins!</span>
			</div>
		{/if}
	</aside>
{/if}

<style>
	.hud-panel {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		width: 340px;
		background: rgba(15, 23, 42, 0.94);
		backdrop-filter: blur(14px);
		border: 2px solid #475569;
		border-radius: 14px;
		padding: 1.25rem;
		color: #ffffff;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
		z-index: 10;
	}

	.hud-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.85rem;
		padding-bottom: 0.6rem;
		border-bottom: 1.5px solid #334155;
	}

	.status-wrap {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.status-tag {
		font-size: 0.78rem;
		font-weight: 800;
		padding: 3px 8px;
		border-radius: 6px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.status-running {
		background: #052e16;
		border: 1.5px solid #22c55e;
		color: #86efac;
	}
	.status-paused {
		background: #451a03;
		border: 1.5px solid #f59e0b;
		color: #fde68a;
	}
	.status-idle {
		background: #1e293b;
		border: 1.5px solid #64748b;
		color: #f8fafc;
	}
	.status-flagged {
		background: #450a0a;
		border: 1.5px solid #ef4444;
		color: #fecaca;
	}

	.move-tag {
		font-size: 0.82rem;
		font-weight: 600;
		color: #e2e8f0;
		line-height: 1.5;
	}

	.icon-btn {
		background: #1e293b;
		border: 1.5px solid #64748b;
		color: #ffffff;
		font-size: 0.8rem;
		font-weight: 700;
		min-height: 44px;
		min-width: 80px;
		padding: 6px 12px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.icon-btn:hover {
		background: #334155;
		border-color: #94a3b8;
	}

	.mode-selector {
		display: flex;
		background: #0f172a;
		border-radius: 10px;
		padding: 4px;
		gap: 4px;
		margin-bottom: 0.85rem;
		border: 1.5px solid #334155;
	}

	.mode-tab {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		background: transparent;
		border: 1.5px solid transparent;
		min-height: 44px;
		padding: 0.5rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: #cbd5e1;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mode-tab.active {
		background: #1d4ed8;
		border-color: #60a5fa;
		color: #ffffff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
	}

	.ai-controls-box {
		background: #1e293b;
		border: 1.5px solid #475569;
		border-radius: 10px;
		padding: 0.75rem;
		margin-bottom: 0.85rem;
	}

	.control-label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}

	.sub-label {
		font-size: 0.8rem;
		color: #e2e8f0;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.side-picker {
		display: flex;
		gap: 0.4rem;
	}

	.side-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		background: #0f172a;
		border: 1.5px solid #64748b;
		color: #f1f5f9;
		font-size: 0.8rem;
		font-weight: 600;
		min-height: 44px;
		min-width: 76px;
		padding: 4px 10px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.side-btn.active {
		background: #0c4a6e;
		color: #ffffff;
		font-weight: 800;
		border-color: #38bdf8;
		box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
	}

	.difficulty-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
	}

	.diff-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 48px;
		background: #0f172a;
		border: 1.5px solid #475569;
		border-radius: 8px;
		padding: 0.4rem 0.2rem;
		color: #e2e8f0;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.diff-btn:hover {
		background: #1e293b;
		border-color: #94a3b8;
	}

	.diff-btn.active {
		background: #075985;
		border-color: #38bdf8;
		color: #ffffff;
		font-weight: 800;
		box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
	}

	.diff-btn.teacher-btn.active {
		background: #064e3b;
		border-color: #34d399;
		box-shadow: 0 0 8px rgba(52, 211, 153, 0.3);
	}

	.diff-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.05rem;
	}

	.diff-label {
		font-size: 0.72rem;
		font-weight: 700;
	}

	.player-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.85rem;
		border-radius: 10px;
		background: #1e293b;
		margin-bottom: 0.6rem;
		border: 2px solid #475569;
		transition: all 0.15s ease;
	}

	.player-bar.active {
		border-color: #38bdf8;
		background: #0c4a6e;
		box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
	}

	.player-bar.flagged {
		border-color: #ef4444;
		background: #450a0a;
	}

	.player-info {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.player-details {
		display: flex;
		flex-direction: column;
	}

	.disc {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 1.5px solid #94a3b8;
	}

	.black-disc {
		background: #000000;
	}
	.white-disc {
		background: #ffffff;
	}

	.player-name {
		font-weight: 700;
		font-size: 0.92rem;
		color: #ffffff;
	}

	.name-with-icon {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.thinking-badge {
		font-size: 0.75rem;
		color: #7dd3fc;
		font-weight: 600;
		font-style: italic;
		animation: pulse-thinking 1s infinite alternate;
	}

	@keyframes pulse-thinking {
		from {
			opacity: 0.5;
		}
		to {
			opacity: 1;
		}
	}

	.digital-time {
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 1.6rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: 0.02em;
	}

	.analog-svg {
		width: 48px;
		height: 48px;
	}

	.dial {
		fill: #0f172a;
		stroke: #94a3b8;
		stroke-width: 3.5;
	}
	.hand.hour {
		stroke: #e2e8f0;
		stroke-width: 4.5;
		stroke-linecap: round;
	}
	.hand.minute {
		stroke: #ffffff;
		stroke-width: 3;
		stroke-linecap: round;
	}
	.hand.second {
		stroke: #ef4444;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.center-pin {
		fill: #ef4444;
	}

	.control-row {
		display: flex;
		gap: 0.6rem;
		margin-top: 1rem;
	}

	.btn {
		flex: 1;
		min-height: 48px;
		padding: 0.65rem;
		font-size: 0.9rem;
		font-weight: 800;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-green {
		background: #14532d;
		border: 2px solid #4ade80;
		color: #ffffff;
	}

	.btn-green:hover:not(:disabled) {
		background: #166534;
		border-color: #86efac;
		box-shadow: 0 4px 12px rgba(74, 222, 128, 0.25);
	}

	.btn-orange {
		background: #451a03;
		border: 2px solid #fbbf24;
		color: #ffffff;
	}

	.btn-orange:hover {
		background: #78350f;
		border-color: #fde68a;
		box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25);
	}

	.btn-slate {
		background: #1e293b;
		border: 2px solid #94a3b8;
		color: #ffffff;
	}

	.btn-slate:hover {
		background: #334155;
		border-color: #cbd5e1;
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.victory-banner {
		margin-top: 0.85rem;
		padding: 0.65rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		text-align: center;
		background: #713f12;
		border: 2px solid #facc15;
		color: #fef08a;
		font-weight: 800;
		font-size: 0.92rem;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}

	.victory-banner.draw {
		background: #1e293b;
		border: 2px solid #94a3b8;
		color: #ffffff;
	}
</style>
