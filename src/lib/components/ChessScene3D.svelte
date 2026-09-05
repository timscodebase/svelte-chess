<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import type { ChessGameStore, PieceType } from '../chess/game-state.svelte';

	interface Props {
		game: ChessGameStore;
	}

	const { game }: Props = $props();

	let container: HTMLDivElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let controls: OrbitControls;
	let raycaster: THREE.Raycaster;

	// Board mesh references
	const squareMeshes: THREE.Mesh[] = [];
	const pieceMeshMap = new Map<string, THREE.Group>();
	let selectionHighlightRing: THREE.Mesh;
	let checkHighlightRing: THREE.Mesh;
	let lastMoveFromRing: THREE.Mesh;
	let lastMoveToRing: THREE.Mesh;
	let hintFromRing: THREE.Mesh;
	let hintToRing: THREE.Mesh;
	const moveIndicatorMeshes: THREE.Mesh[] = [];

	// Move indicator geometries & materials
	const moveDotGeom = new THREE.CircleGeometry(0.14, 32);
	const captureRingGeom = new THREE.RingGeometry(0.32, 0.44, 32);
	const moveDotMat = new THREE.MeshBasicMaterial({
		color: 0x38bdf8,
		transparent: true,
		opacity: 0.75,
		side: THREE.DoubleSide
	});
	const captureRingMat = new THREE.MeshBasicMaterial({
		color: 0xf43f5e,
		transparent: true,
		opacity: 0.85,
		side: THREE.DoubleSide
	});

	// Board edge coordinates (numbers 1-8 and letters a-h)
	const boardLabels: THREE.Mesh[] = [];
	const labelTextureMap = new Map<string, THREE.CanvasTexture>();

	function getLabelTexture(text: string): THREE.CanvasTexture {
		let tex = labelTextureMap.get(text);
		if (!tex) {
			const canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.clearRect(0, 0, 128, 128);
				ctx.fillStyle = '#e2d6b5';
				ctx.font =
					'bold 74px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
				ctx.shadowBlur = 6;
				ctx.shadowOffsetX = 2;
				ctx.shadowOffsetY = 2;
				ctx.fillText(text, 64, 64);
			}
			tex = new THREE.CanvasTexture(canvas);
			tex.colorSpace = THREE.SRGBColorSpace;
			tex.minFilter = THREE.LinearFilter;
			labelTextureMap.set(text, tex);
		}
		return tex;
	}

	// Materials
	const lightSquareMat = new THREE.MeshStandardMaterial({
		color: 0xe2d6b5,
		roughness: 0.5
	});
	const darkSquareMat = new THREE.MeshStandardMaterial({
		color: 0x825838,
		roughness: 0.6
	});
	const whitePieceMat = new THREE.MeshStandardMaterial({
		color: 0xf8fafc,
		roughness: 0.25,
		metalness: 0.1
	});
	const blackPieceMat = new THREE.MeshStandardMaterial({
		color: 0x1e293b,
		roughness: 0.35,
		metalness: 0.2
	});

	// Drag-vs-click discriminator state
	let pointerDownCoord = { x: 0, y: 0 };
	const DRAG_THRESHOLD_PX = 6;

	function createPieceGeometry(type: PieceType): THREE.BufferGeometry[] {
		const parts: THREE.BufferGeometry[] = [];
		const base = new THREE.CylinderGeometry(0.32, 0.38, 0.12, 24);
		parts.push(base);

		switch (type) {
			case 'pawn': {
				const body = new THREE.CylinderGeometry(0.12, 0.26, 0.45, 16);
				body.translate(0, 0.28, 0);
				const head = new THREE.SphereGeometry(0.18, 16, 16);
				head.translate(0, 0.56, 0);
				parts.push(body, head);
				break;
			}
			case 'rook': {
				const body = new THREE.CylinderGeometry(0.22, 0.28, 0.6, 20);
				body.translate(0, 0.36, 0);
				const top = new THREE.CylinderGeometry(0.26, 0.22, 0.2, 16);
				top.translate(0, 0.72, 0);
				parts.push(body, top);
				break;
			}
			case 'knight': {
				const body = new THREE.CylinderGeometry(0.18, 0.28, 0.5, 16);
				body.translate(0, 0.31, 0);
				const head = new THREE.BoxGeometry(0.24, 0.36, 0.32);
				head.translate(0, 0.62, 0.05);
				parts.push(body, head);
				break;
			}
			case 'bishop': {
				const body = new THREE.CylinderGeometry(0.14, 0.26, 0.65, 16);
				body.translate(0, 0.38, 0);
				const top = new THREE.SphereGeometry(0.18, 16, 16);
				top.scale(0.8, 1.4, 0.8);
				top.translate(0, 0.75, 0);
				parts.push(body, top);
				break;
			}
			case 'queen': {
				const body = new THREE.CylinderGeometry(0.16, 0.28, 0.8, 20);
				body.translate(0, 0.46, 0);
				const crown = new THREE.CylinderGeometry(0.28, 0.14, 0.22, 16);
				crown.translate(0, 0.92, 0);
				const ball = new THREE.SphereGeometry(0.08, 12, 12);
				ball.translate(0, 1.05, 0);
				parts.push(body, crown, ball);
				break;
			}
			case 'king': {
				const body = new THREE.CylinderGeometry(0.18, 0.3, 0.9, 20);
				body.translate(0, 0.51, 0);
				const cap = new THREE.CylinderGeometry(0.26, 0.16, 0.2, 16);
				cap.translate(0, 1.01, 0);
				const crossV = new THREE.BoxGeometry(0.08, 0.22, 0.08);
				crossV.translate(0, 1.18, 0);
				const crossH = new THREE.BoxGeometry(0.2, 0.07, 0.08);
				crossH.translate(0, 1.18, 0);
				parts.push(body, cap, crossV, crossH);
				break;
			}
		}
		return parts;
	}

	function assemblePieceMesh(piece: { type: PieceType; color: string }): THREE.Group {
		const group = new THREE.Group();
		group.userData = { pieceType: piece.type };
		const geoms = createPieceGeometry(piece.type);
		const mat = piece.color === 'white' ? whitePieceMat : blackPieceMat;

		for (const g of geoms) {
			const mesh = new THREE.Mesh(g, mat);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			group.add(mesh);
		}
		return group;
	}

	function boardToWorld(row: number, col: number): THREE.Vector3 {
		return new THREE.Vector3(col - 3.5, 0.1, row - 3.5);
	}

	// Lifecycle
	$effect(() => {
		if (!container) return;

		// 1. Scene, Camera, Renderer
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0f1d);

		const width = container.clientWidth || 800;
		const height = container.clientHeight || 600;

		camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
		camera.position.set(0, 9, 8.5);

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;
		container.appendChild(renderer.domElement);

		// 2. 360-degree OrbitControls
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.06;
		controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera dipping below board table
		controls.minDistance = 4;
		controls.maxDistance = 16;
		controls.target.set(0, 0, 0);
		controls.update();

		raycaster = new THREE.Raycaster();

		// 3. Lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
		scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
		dirLight.position.set(6, 12, 8);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.width = 2048;
		dirLight.shadow.mapSize.height = 2048;
		dirLight.shadow.camera.near = 0.5;
		dirLight.shadow.camera.far = 30;
		dirLight.shadow.camera.left = -6;
		dirLight.shadow.camera.right = 6;
		dirLight.shadow.camera.top = 6;
		dirLight.shadow.camera.bottom = -6;
		scene.add(dirLight);

		// 4. Board Platform & Squares
		const rim = new THREE.Mesh(
			new THREE.BoxGeometry(9.3, 0.25, 9.3),
			new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.4 })
		);
		rim.position.y = -0.05;
		rim.receiveShadow = true;
		scene.add(rim);

		const tileGeom = new THREE.BoxGeometry(1, 0.15, 1);
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				const isDark = (r + c) % 2 === 1;
				const tile = new THREE.Mesh(tileGeom, isDark ? darkSquareMat : lightSquareMat);
				tile.position.copy(boardToWorld(r, c));
				tile.position.y = 0;
				tile.receiveShadow = true;
				tile.userData = { row: r, col: c };
				scene.add(tile);
				squareMeshes.push(tile);
			}
		}

		// 4b. Board Edge Coordinate Labels (Files a-h & Ranks 1-8)
		const labelGeom = new THREE.PlaneGeometry(0.48, 0.48);
		const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
		const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
		const labelY = 0.078;
		const borderOffset = 4.33;

		// Files (a-h) along Rank 1 (z = -borderOffset) and Rank 8 (z = +borderOffset)
		for (let c = 0; c < 8; c++) {
			const file = files[c];
			const x = c - 3.5;
			const tex = getLabelTexture(file);
			const mat = new THREE.MeshBasicMaterial({
				map: tex,
				transparent: true,
				opacity: 0.92,
				side: THREE.DoubleSide
			});

			// Rank 1 border (readable from White perspective)
			const meshR1 = new THREE.Mesh(labelGeom, mat);
			meshR1.rotation.x = -Math.PI / 2;
			meshR1.rotation.z = Math.PI;
			meshR1.position.set(x, labelY, -borderOffset);
			scene.add(meshR1);
			boardLabels.push(meshR1);

			// Rank 8 border (readable from Black perspective)
			const meshR8 = new THREE.Mesh(labelGeom, mat);
			meshR8.rotation.x = -Math.PI / 2;
			meshR8.rotation.z = 0;
			meshR8.position.set(x, labelY, borderOffset);
			scene.add(meshR8);
			boardLabels.push(meshR8);
		}

		// Ranks (1-8) along File a (x = -borderOffset) and File h (x = +borderOffset)
		for (let r = 0; r < 8; r++) {
			const rank = ranks[r];
			const z = r - 3.5;
			const tex = getLabelTexture(rank);
			const mat = new THREE.MeshBasicMaterial({
				map: tex,
				transparent: true,
				opacity: 0.92,
				side: THREE.DoubleSide
			});

			// File a border (readable from left side)
			const meshFa = new THREE.Mesh(labelGeom, mat);
			meshFa.rotation.x = -Math.PI / 2;
			meshFa.rotation.z = -Math.PI / 2;
			meshFa.position.set(-borderOffset, labelY, z);
			scene.add(meshFa);
			boardLabels.push(meshFa);

			// File h border (readable from right side)
			const meshFh = new THREE.Mesh(labelGeom, mat);
			meshFh.rotation.x = -Math.PI / 2;
			meshFh.rotation.z = Math.PI / 2;
			meshFh.position.set(borderOffset, labelY, z);
			scene.add(meshFh);
			boardLabels.push(meshFh);
		}

		// 5. Selection Ring, Check Ring, and Indicators
		selectionHighlightRing = new THREE.Mesh(
			new THREE.RingGeometry(0.38, 0.46, 32),
			new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
		);
		selectionHighlightRing.rotation.x = -Math.PI / 2;
		selectionHighlightRing.position.y = 0.085;
		selectionHighlightRing.visible = false;
		scene.add(selectionHighlightRing);

		checkHighlightRing = new THREE.Mesh(
			new THREE.RingGeometry(0.36, 0.48, 32),
			new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
		);
		checkHighlightRing.rotation.x = -Math.PI / 2;
		checkHighlightRing.position.y = 0.086;
		checkHighlightRing.visible = false;
		scene.add(checkHighlightRing);

		lastMoveFromRing = new THREE.Mesh(
			new THREE.RingGeometry(0.38, 0.44, 32),
			new THREE.MeshBasicMaterial({
				color: 0xfacc15,
				transparent: true,
				opacity: 0.4,
				side: THREE.DoubleSide
			})
		);
		lastMoveFromRing.rotation.x = -Math.PI / 2;
		lastMoveFromRing.position.y = 0.083;
		lastMoveFromRing.visible = false;
		scene.add(lastMoveFromRing);

		lastMoveToRing = new THREE.Mesh(
			new THREE.RingGeometry(0.38, 0.44, 32),
			new THREE.MeshBasicMaterial({
				color: 0xfacc15,
				transparent: true,
				opacity: 0.5,
				side: THREE.DoubleSide
			})
		);
		lastMoveToRing.rotation.x = -Math.PI / 2;
		lastMoveToRing.position.y = 0.083;
		lastMoveToRing.visible = false;
		scene.add(lastMoveToRing);

		hintFromRing = new THREE.Mesh(
			new THREE.RingGeometry(0.38, 0.46, 32),
			new THREE.MeshBasicMaterial({
				color: 0x10b981,
				transparent: true,
				opacity: 0.8,
				side: THREE.DoubleSide
			})
		);
		hintFromRing.rotation.x = -Math.PI / 2;
		hintFromRing.position.y = 0.087;
		hintFromRing.visible = false;
		scene.add(hintFromRing);

		hintToRing = new THREE.Mesh(
			new THREE.RingGeometry(0.38, 0.46, 32),
			new THREE.MeshBasicMaterial({
				color: 0x10b981,
				transparent: true,
				opacity: 0.8,
				side: THREE.DoubleSide
			})
		);
		hintToRing.rotation.x = -Math.PI / 2;
		hintToRing.position.y = 0.087;
		hintToRing.visible = false;
		scene.add(hintToRing);

		// 6. Resize Observer
		const ro = new ResizeObserver(() => {
			if (!container) return;
			const w = container.clientWidth;
			const h = container.clientHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		});
		ro.observe(container);

		// 7. Render Loop
		let animId: number;
		const animate = () => {
			animId = requestAnimationFrame(animate);
			controls.update();
			renderer.render(scene, camera);
		};
		animate();

		return () => {
			cancelAnimationFrame(animId);
			ro.disconnect();
			controls.dispose();
			renderer.dispose();
			container.innerHTML = '';
			squareMeshes.length = 0;
			pieceMeshMap.clear();
			for (const mesh of moveIndicatorMeshes) {
				scene.remove(mesh);
			}
			moveIndicatorMeshes.length = 0;
			for (const label of boardLabels) {
				scene.remove(label);
				label.geometry.dispose();
				(label.material as THREE.Material).dispose();
			}
			boardLabels.length = 0;
			for (const tex of labelTextureMap.values()) {
				tex.dispose();
			}
			labelTextureMap.clear();
		};
	});

	// Re-sync piece meshes (including rebuilding geometry on promotion)
	$effect(() => {
		if (!scene) return;

		const currentPieceIds = new Set(game.pieces.map((p) => p.id));

		// Remove captured meshes
		for (const [id, mesh] of pieceMeshMap.entries()) {
			if (!currentPieceIds.has(id)) {
				scene.remove(mesh);
				pieceMeshMap.delete(id);
			}
		}

		// Sync or reconstruct piece meshes
		for (const piece of game.pieces) {
			let mesh = pieceMeshMap.get(piece.id);

			// If mesh doesn't exist or piece promoted to a new type, rebuild geometry
			if (!mesh || mesh.userData.pieceType !== piece.type) {
				if (mesh) {
					scene.remove(mesh);
				}
				mesh = assemblePieceMesh(piece);
				scene.add(mesh);
				pieceMeshMap.set(piece.id, mesh);
			}

			mesh.userData = { pieceType: piece.type, id: piece.id, row: piece.row, col: piece.col };
			for (const child of mesh.children) {
				child.userData = { row: piece.row, col: piece.col };
			}

			const targetPos = boardToWorld(piece.row, piece.col);
			mesh.position.set(targetPos.x, targetPos.y, targetPos.z);
		}

		// Selection ring
		if (game.selectedSquare) {
			const pos = boardToWorld(game.selectedSquare.row, game.selectedSquare.col);
			selectionHighlightRing.position.set(pos.x, 0.085, pos.z);
			selectionHighlightRing.visible = true;
		} else if (selectionHighlightRing) {
			selectionHighlightRing.visible = false;
		}
	});

	// Dynamic legal moves indicators & game state highlights
	$effect(() => {
		if (!scene) return;

		// Remove existing valid move indicators
		for (const mesh of moveIndicatorMeshes) {
			scene.remove(mesh);
		}
		moveIndicatorMeshes.length = 0;

		// Draw new legal move indicators
		if (game.selectedSquare && game.validMoves.length > 0) {
			const selectedPiece = game.getPieceAt(game.selectedSquare.row, game.selectedSquare.col);

			for (const move of game.validMoves) {
				const targetPiece = game.getPieceAt(move.row, move.col);
				const isEnPassant =
					selectedPiece?.type === 'pawn' && move.col !== game.selectedSquare.col && !targetPiece;
				const isCapture = targetPiece !== undefined || isEnPassant;

				const indicator = new THREE.Mesh(
					isCapture ? captureRingGeom : moveDotGeom,
					isCapture ? captureRingMat : moveDotMat
				);
				indicator.rotation.x = -Math.PI / 2;
				const pos = boardToWorld(move.row, move.col);
				indicator.position.set(pos.x, 0.084, pos.z);
				scene.add(indicator);
				moveIndicatorMeshes.push(indicator);
			}
		}

		// Check indicator on king
		if (game.isCheck) {
			const currentKing = game.pieces.find((p) => p.type === 'king' && p.color === game.turn);
			if (currentKing) {
				const kPos = boardToWorld(currentKing.row, currentKing.col);
				checkHighlightRing.position.set(kPos.x, 0.086, kPos.z);
				checkHighlightRing.visible = true;
			} else {
				checkHighlightRing.visible = false;
			}
		} else if (checkHighlightRing) {
			checkHighlightRing.visible = false;
		}

		// Last move highlight
		if (game.lastMove) {
			const fromPos = boardToWorld(game.lastMove.from.row, game.lastMove.from.col);
			const toPos = boardToWorld(game.lastMove.to.row, game.lastMove.to.col);
			lastMoveFromRing.position.set(fromPos.x, 0.083, fromPos.z);
			lastMoveFromRing.visible = true;
			lastMoveToRing.position.set(toPos.x, 0.083, toPos.z);
			lastMoveToRing.visible = true;
		} else {
			if (lastMoveFromRing) lastMoveFromRing.visible = false;
			if (lastMoveToRing) lastMoveToRing.visible = false;
		}

		// Teacher Hint highlight (emerald glow)
		if (game.teacherHint) {
			const fromPos = boardToWorld(game.teacherHint.from.row, game.teacherHint.from.col);
			const toPos = boardToWorld(game.teacherHint.to.row, game.teacherHint.to.col);
			hintFromRing.position.set(fromPos.x, 0.087, fromPos.z);
			hintFromRing.visible = true;
			hintToRing.position.set(toPos.x, 0.087, toPos.z);
			hintToRing.visible = true;
		} else {
			if (hintFromRing) hintFromRing.visible = false;
			if (hintToRing) hintToRing.visible = false;
		}
	});

	// Track start of click/drag
	function handlePointerDown(e: MouseEvent) {
		pointerDownCoord = { x: e.clientX, y: e.clientY };
	}

	// Raycast: checks square tiles and piece meshes
	function handlePointerUp(e: MouseEvent) {
		if (!container || !camera) return;

		const dx = e.clientX - pointerDownCoord.x;
		const dy = e.clientY - pointerDownCoord.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		// If moved further than threshold, it was an OrbitControls camera rotation
		if (dist > DRAG_THRESHOLD_PX) return;

		const rect = container.getBoundingClientRect();
		const pointer = new THREE.Vector2(
			((e.clientX - rect.left) / rect.width) * 2 - 1,
			-((e.clientY - rect.top) / rect.height) * 2 + 1
		);

		raycaster.setFromCamera(pointer, camera);

		const clickTargets: THREE.Object3D[] = [...squareMeshes];
		for (const group of pieceMeshMap.values()) {
			clickTargets.push(...group.children);
		}

		const intersects = raycaster.intersectObjects(clickTargets);

		if (intersects.length > 0) {
			const hit = intersects[0].object;
			let row: number | undefined = hit.userData.row;
			let col: number | undefined = hit.userData.col;

			if (row === undefined && hit.parent?.userData?.row !== undefined) {
				row = hit.parent.userData.row;
				col = hit.parent.userData.col;
			}

			if (row !== undefined && col !== undefined) {
				game.selectOrMove(row, col);
			}
		}
	}
</script>

<div
	bind:this={container}
	class="scene-viewport"
	onpointerdown={handlePointerDown}
	onpointerup={handlePointerUp}
	role="region"
	aria-label="Interactive 3D Chessboard"
></div>

<style>
	.scene-viewport {
		width: 100%;
		height: 100%;
		min-height: 400px;
		position: relative;
		cursor: grab;
		outline: none;
	}

	.scene-viewport:active {
		cursor: grabbing;
	}
</style>
