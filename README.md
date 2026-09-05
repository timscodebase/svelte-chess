# ♟️ 3D Chess Clock & AI Grandmaster

A feature-complete, modern 3D Chess application featuring an interactive WebGL chessboard, dual digital/analog chess clocks with Fischer increments, strict FIDE rules enforcement, and a multi-level AI opponent powered by negamax search with alpha-beta pruning, quiescence search, piece-square tables, and an interactive **Teacher & Coaching engine**.

Built with **Svelte 5 (Runes)**, **Three.js**, **Vite**, and **TypeScript**, with full end-to-end unit and browser component testing via **Vitest** and **Playwright Chromium**.

---

## ✨ Features

### 1. 🎮 Interactive 3D Chess Scene

- **WebGL 3D Board**: Fully modeled 3D pieces and board rendered via **Three.js** with realistic lighting, shadows, and smooth geometry.
- **360° OrbitControls**: Rotate, pan, and zoom freely around the chessboard with damping and pitch clamping.
- **Visual Move Indicators**:
  - **Cyan Dots**: Highlight empty destination squares for legal moves.
  - **Ruby Rings**: Highlight enemy pieces and en passant capture squares.
  - **Crimson Glow**: Highlights the king when under check.
  - **Gold Rings**: Demarcates the origin and destination of the last move.
  - **Emerald Rings**: Visualizes coach recommended moves when asking for hints in Teacher mode.
- **Click & Raycasting Interaction**: Click pieces to inspect legal moves and click target squares to execute moves; automatically discriminates between camera drag and square clicks.

### 2. ⏱️ Dual Chess Clock (Digital & Analog)

- **Fischer Increments**: Configurable initial time limits and per-move increment bonuses (e.g. 3 min + 2 sec).
- **Dual Display Modes**:
  - **Digital Clock**: High-precision split-second digital readout with tenths of a second when low on time.
  - **Analog Clock**: Real-time SVG clock with trigonometrically calculated hour, minute, and second sweep hands.
- **Time Out Detection**: Automatic flag detection declaring the opponent the winner upon clock expiration.
- **Match Controls**: Start, pause, resume, and reset controls with move counters and active status tags.

### 3. 📜 Strict FIDE Chess Rules Enforcement

- **0x88 Board Engine**: Fast bitwise coordinate mapping and move generation:
  - Pawn double-step on initial move and single-step advance.
  - Diagonal pawn captures.
  - **En Passant**: Accurate half-move tracking and captured pawn removal.
  - **Pawn Promotion**: Interactive modal allowing player selection between Queen, Rook, Bishop, or Knight.
  - **Castling**: Kingside and Queenside castling with automatic rook displacement; strictly disallows castling while in check, through attacked squares, or after king/rook movement.
  - **Absolute Pins**: Pieces pinned to the King are restricted from moving off the line of pin.
  - **Game-Over States**: Full detection for **Checkmate**, **Stalemate**, **50-Move Rule** (100 half-moves), **Threefold Repetition**, and **Insufficient Material** (K vs K, K+B vs K, K+N vs K).

### 4. 🤖 Multi-Level AI Opponent

Choose between playing with a friend locally (`👥 2 Players`) or against the engine (`🤖 vs AI`), with your choice of side (`⚪ White` or `⚫ Black`):

| Level                 | Search Strategy                                    | Playstyle & Characteristics                                                                                                                                                                                |
| :-------------------- | :------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Easy** (🌱)         | Depth 1 + 35% sub-optimal randomness               | Casual beginner; occasionally blunders while snatching obvious hanging pieces.                                                                                                                             |
| **Medium** (⚔️)       | Depth 2 alpha-beta + PSTs                          | Solid club amateur (~1300 ELO); avoids blunders, controls the center, and plays sound classical chess.                                                                                                     |
| **Hard** (🔥)         | Depth 3 alpha-beta + Quiescence + MVV-LVA          | Advanced tactical player (~1800 ELO); punishes mistakes, calculates combinations, and secures material advantage.                                                                                          |
| **Grand Master** (👑) | Depth 3+ alpha-beta + Quiescence + fast mate break | Master-level calculation (~2200+ ELO); ruthlessly executes checkmates and maintains crushing positional pressure.                                                                                          |
| **Teacher** (🎓)      | Depth 2-3 + Pedagogical Commentary Engine          | **Interactive Coach**: Plays instructive moves while providing real-time strategic commentary explaining _why_ each move was chosen. Offers on-demand hints with visual board highlights and explanations. |

### 5. 🎓 Teacher Coaching & Hint System

- **Live Move Commentary**: Analyzes pawn pushes, piece development, tactical captures, forks, pins, king shelter, and checks, explaining them in plain English.
- **"💡 Ask Coach for Hint"**: Available at any point on your turn. Generates the optimal move, highlights it in emerald on the 3D board, and explains the tactical or positional reason behind it.

### 6. ♿ WCAG 2.2 Level AAA Accessibility & Modern CSS Standards

- **Level AAA Text Contrast**: All body text, headings, badges, and controls satisfy enhanced contrast requirements (>= 7:1 for normal text, >= 4.5:1 for large text).
- **Non-Text Boundary Contrast**: All interactive button perimeters, pill selectors, and form elements maintain >= 3:1 contrast against adjacent backgrounds.
- **Enhanced Focus Appearance (WCAG 2.2 Criterion 2.4.13 - Level AAA)**: Global `:focus-visible` 3px high-contrast cyan perimeter (`#38bdf8`) with 3px offset and contrasting dark shadow.
- **Target Size Enhanced (WCAG 2.2 Criterion 2.5.5 - Level AAA)**: All clickable controls provide at least 44×44px or 48×48px touch targets.
- **Native Modal Dialog**: Pawn promotion utilizes the native HTML5 `<dialog>` element with `showModal()`, automated background inertness, focus trapping, and backdrop blur.
- **Live Screen Reader Announcer (`aria-live="polite"`)**: Dynamically announces moves, check conditions, time-out flags, and game outcomes to assistive technologies.
- **Keyboard Navigation & Skip Link (WCAG 2.2 Criterion 2.4.1)**: Prominent skip link (`Skip to 3D Chessboard`) allows keyboard and screen reader users to bypass overlays.
- **User Preference Media Queries**:
  - `@media (prefers-reduced-motion: reduce)`: Disables pulsing animations, badge scaling, and camera transitions.
  - `@media (prefers-contrast: more)`: Reinforces component borders and text contrast.

---

## 🛠️ Technology Stack

- **Framework**: [Svelte 5](https://svelte.dev/) utilizing new **Runes** (`$state`, `$derived`, `$effect`) for fine-grained reactivity.
- **App Engine**: [SvelteKit](https://kit.svelte.dev/) with Vite bundler.
- **3D Graphics & Math**: [Three.js](https://threejs.org/) for WebGL rendering, geometries, PBR materials, shadows, and `OrbitControls`.
- **Styling**: Vanilla CSS custom properties, Glassmorphism, and [Tailwind CSS](https://tailwindcss.com/).
- **Testing**:
  - [Vitest](https://vitest.dev/) with dual-project configuration (`server` for Node.js engine/AI unit tests, `client` for browser component tests).
  - [Playwright Chromium](https://playwright.dev/) via `@vitest/browser-playwright` and `vitest-browser-svelte` for real DOM and WebGL component tests.
- **Deployment Adapter**: `@sveltejs/adapter-vercel`.

---

## 📂 Project Structure

```
chess-clock/
├── src/
│   ├── lib/
│   │   ├── chess/
│   │   │   ├── chess.ts                 # 0x88 FIDE chess engine & move generator
│   │   │   ├── chess.spec.ts            # Engine unit tests (15 tests)
│   │   │   ├── chess-ai.ts              # Negamax, alpha-beta, quiescence, PSTs, coach
│   │   │   ├── chess-ai.spec.ts         # AI algorithms and commentary tests (6 tests)
│   │   │   ├── chess-clock-factory.ts   # Single clock factory with analog hand math
│   │   │   ├── chess-match-clock.ts     # Dual clock match orchestrator
│   │   │   ├── chess-clock.spec.ts      # Clock timing & math tests (11 tests)
│   │   │   ├── game-state.svelte.ts     # Svelte 5 reactive game store
│   │   │   └── game-state.spec.ts       # Store state & turn tests (8 tests)
│   │   ├── components/
│   │   │   ├── ChessScene3D.svelte      # Three.js 3D WebGL viewport & raycaster
│   │   │   ├── ChessScene3D.svelte.spec.ts # WebGL mount and canvas tests (2 tests)
│   │   │   ├── ChessClockOverlay.svelte # HUD panel, clocks, AI selectors, controls
│   │   │   ├── ChessClockOverlay.svelte.spec.ts # Overlay component tests (7 tests)
│   │   │   ├── PromotionModal.svelte    # Pawn promotion piece selection dialog
│   │   │   └── PromotionModal.svelte.spec.ts # Promotion component tests (3 tests)
│   └── routes/
│       └── +page.svelte                 # Main application view & coaching HUD
├── vite.config.ts                       # Vitest server + client browser test config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.x or later
- **npm** or **pnpm**

### Installation

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/timscodebase/svelte-chess.git
   cd svelte-chess
   npm install
   ```

2. (Optional, for browser component tests) Install Playwright Chromium:
   ```bash
   npx playwright install chromium
   ```

### Running Locally

Start the Vite development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

The repository features a full suite of **54 tests across 9 test files**:

Run the complete test suite (unit + browser tests):

```bash
npm test
```

Run server-side engine and AI unit tests only:

```bash
npx vitest run --project server
```

Run Playwright Chromium browser component tests only:

```bash
npx vitest run --project client
```

Run TypeScript and Svelte diagnostics:

```bash
npm run check
```

---

## 🏗️ Production Build

To build the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 📚 Attributions & Acknowledgments

This project builds upon and integrates work from open-source contributors and foundational computer chess algorithms:

1. **`chess.js` (FIDE Engine Architecture & 0x88 Board Model)**:
   - Core 0x88 board representation, FEN parsing, and move generation adapted from [`chess.js`](https://github.com/jhlywa/chess.js).
   - Copyright (c) 2023, Jeff Hlywa (`jhlywa@gmail.com`)
   - Copyright (c) 2024, Alexander Obukhov (`dev@sprql.space`)
   - License: **BSD 2-Clause License** ([Source Notice](file:///Users/tithos/Dev/Local%20Web/chess-clock/src/lib/chess/chess.ts#L1-L27)).

2. **Three.js**:
   - 3D scene graph, WebGL rendering pipeline, camera projection, and OrbitControls.
   - Copyright (c) 2010-2025 Three.js Authors (Ricardo Cabello / `mrdoob`).
   - License: **MIT License**.

3. **Piece-Square Tables (PST) & Simplified Evaluation Function**:
   - Positional piece weights, center-control tables, pawn structures, and endgame king mobility patterns derived from Tomasz Michniewski's _Simplified Evaluation Function_ and documentation published by the [Chess Programming Wiki](https://www.chessprogramming.org/Simplified_Evaluation_Function).

4. **Svelte & SvelteKit**:
   - High-performance reactive framework with Svelte 5 Runes.
   - Copyright (c) Rich Harris and Svelte Contributors.
   - License: **MIT License**.

5. **Vitest & Playwright**:
   - Fast unit testing runner and headless Chromium browser runner.
   - Copyright (c) Vitest Dev and Microsoft Corporation.
   - Licenses: **MIT License** and **Apache 2.0 License**.

---

## 📄 License

This project is licensed under the **MIT License** with attribution to upstream BSD 2-Clause components (see [Attributions & Acknowledgments](#-attributions--acknowledgments) above).
