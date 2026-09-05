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
	const boardFrameMeshes: THREE.Mesh[] = [];
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
		color: 0xfcf9f2,
		roughness: 0.18,
		metalness: 0.08
	});
	const blackPieceMat = new THREE.MeshStandardMaterial({
		color: 0x1c2330,
		roughness: 0.28,
		metalness: 0.18
	});

	// Drag-vs-click discriminator state
	let pointerDownCoord = { x: 0, y: 0 };
	const DRAG_THRESHOLD_PX = 6;

	// Helper for tiered Staunton base lathe points
	function createBasePoints(baseRadius: number, topRadius: number, height: number): THREE.Vector2[] {
		return [
			new THREE.Vector2(0, 0),
			new THREE.Vector2(baseRadius, 0),
			new THREE.Vector2(baseRadius, 0.03),
			new THREE.Vector2(baseRadius * 0.94, 0.05),
			new THREE.Vector2(baseRadius * 0.86, 0.085),
			new THREE.Vector2(baseRadius * 0.9, 0.115),
			new THREE.Vector2(baseRadius * 0.78, 0.138),
			new THREE.Vector2(topRadius, height)
		];
	}

	function createPieceGeometry(type: PieceType): THREE.BufferGeometry[] {
		const parts: THREE.BufferGeometry[] = [];
		const segs = 28;

		switch (type) {
			case 'pawn': {
				// Tiered base & sculpted stem with neck collar
				const points = [
					...createBasePoints(0.34, 0.18, 0.14),
					new THREE.Vector2(0.17, 0.18),
					new THREE.Vector2(0.13, 0.28),
					new THREE.Vector2(0.1, 0.38),
					new THREE.Vector2(0.15, 0.44),
					new THREE.Vector2(0.155, 0.47),
					new THREE.Vector2(0.11, 0.5)
				];
				parts.push(new THREE.LatheGeometry(points, segs));

				// Spherical head
				const head = new THREE.SphereGeometry(0.165, 24, 20);
				head.translate(0, 0.64, 0);
				parts.push(head);
				break;
			}
			case 'rook': {
				// Castle tower base & flaring parapet corbel
				const points = [
					...createBasePoints(0.36, 0.24, 0.15),
					new THREE.Vector2(0.23, 0.2),
					new THREE.Vector2(0.21, 0.4),
					new THREE.Vector2(0.195, 0.58),
					new THREE.Vector2(0.235, 0.65),
					new THREE.Vector2(0.265, 0.7),
					new THREE.Vector2(0.25, 0.73),
					new THREE.Vector2(0.26, 0.76),
					new THREE.Vector2(0, 0.76)
				];
				parts.push(new THREE.LatheGeometry(points, segs));

				// Parapet battlements (crenels)
				const crenelGeom = new THREE.BoxGeometry(0.13, 0.13, 0.13);
				for (let i = 0; i < 4; i++) {
					const angle = (i * Math.PI) / 2 + Math.PI / 4;
					const g = crenelGeom.clone();
					g.translate(Math.cos(angle) * 0.19, 0.825, Math.sin(angle) * 0.19);
					parts.push(g);
				}

				// Recessed tower top floor
				const floor = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 16);
				floor.translate(0, 0.77, 0);
				parts.push(floor);
				break;
			}
			case 'knight': {
				// Sturdy turned base & pedestal
				parts.push(new THREE.LatheGeometry(createBasePoints(0.36, 0.24, 0.16), segs));

				const pedestal = new THREE.CylinderGeometry(0.21, 0.24, 0.08, 24);
				pedestal.translate(0, 0.2, 0);
				parts.push(pedestal);

				// Forward-leaning arched chest & neck
				const chest = new THREE.CylinderGeometry(0.14, 0.2, 0.32, 16);
				chest.scale(0.85, 1.0, 1.2);
				chest.rotateX(-0.15);
				chest.translate(0, 0.34, 0.04);
				parts.push(chest);

				// Arched head & jaw
				const jaw = new THREE.BoxGeometry(0.2, 0.28, 0.24);
				jaw.rotateX(0.22);
				jaw.translate(0, 0.54, 0.07);
				parts.push(jaw);

				// Tapered muzzle / snout
				const snout = new THREE.CylinderGeometry(0.09, 0.14, 0.26, 12);
				snout.scale(0.82, 1.0, 1.0);
				snout.rotateX(Math.PI / 2.7);
				snout.translate(0, 0.61, 0.18);
				parts.push(snout);

				// Flowing mane crest along the spine
				const mane = new THREE.BoxGeometry(0.08, 0.36, 0.12);
				mane.rotateX(-0.35);
				mane.translate(0, 0.54, -0.06);
				parts.push(mane);

				// Pointed ears
				const earL = new THREE.ConeGeometry(0.045, 0.14, 8);
				earL.rotateZ(-0.25);
				earL.rotateX(-0.15);
				earL.translate(-0.065, 0.77, 0.02);
				parts.push(earL);

				const earR = new THREE.ConeGeometry(0.045, 0.14, 8);
				earR.rotateZ(0.25);
				earR.rotateX(-0.15);
				earR.translate(0.065, 0.77, 0.02);
				parts.push(earR);

				// Sculpted eye mounds
				const eyeL = new THREE.SphereGeometry(0.035, 8, 8);
				eyeL.translate(-0.095, 0.65, 0.13);
				parts.push(eyeL);

				const eyeR = new THREE.SphereGeometry(0.035, 8, 8);
				eyeR.translate(0.095, 0.65, 0.13);
				parts.push(eyeR);

				// Nostril flares
				const nosL = new THREE.SphereGeometry(0.025, 8, 8);
				nosL.translate(-0.055, 0.57, 0.29);
				parts.push(nosL);

				const nosR = new THREE.SphereGeometry(0.025, 8, 8);
				nosR.translate(0.055, 0.57, 0.29);
				parts.push(nosR);
				break;
			}
			case 'bishop': {
				// Slender lathe body with double collar and mitre apex
				const points = [
					...createBasePoints(0.36, 0.23, 0.15),
					new THREE.Vector2(0.19, 0.2),
					new THREE.Vector2(0.14, 0.32),
					new THREE.Vector2(0.11, 0.44),
					new THREE.Vector2(0.16, 0.5),
					new THREE.Vector2(0.13, 0.53),
					new THREE.Vector2(0.19, 0.58),
					new THREE.Vector2(0.18, 0.61),
					new THREE.Vector2(0.12, 0.64),
					new THREE.Vector2(0.17, 0.72),
					new THREE.Vector2(0.205, 0.82),
					new THREE.Vector2(0.175, 0.92),
					new THREE.Vector2(0.115, 1.0),
					new THREE.Vector2(0.04, 1.05),
					new THREE.Vector2(0, 1.07)
				];
				parts.push(new THREE.LatheGeometry(points, segs));

				// Mitre apex finial ball
				const ball = new THREE.SphereGeometry(0.055, 16, 16);
				ball.translate(0, 1.11, 0);
				parts.push(ball);
				break;
			}
			case 'queen': {
				// Grand royal lathe body with tiered collar and fluting coronet
				const points = [
					...createBasePoints(0.38, 0.25, 0.16),
					new THREE.Vector2(0.22, 0.22),
					new THREE.Vector2(0.16, 0.38),
					new THREE.Vector2(0.13, 0.52),
					new THREE.Vector2(0.18, 0.58),
					new THREE.Vector2(0.15, 0.62),
					new THREE.Vector2(0.2, 0.66),
					new THREE.Vector2(0.14, 0.7),
					new THREE.Vector2(0.16, 0.78),
					new THREE.Vector2(0.22, 0.88),
					new THREE.Vector2(0.265, 0.98),
					new THREE.Vector2(0.22, 1.0),
					new THREE.Vector2(0, 1.0)
				];
				parts.push(new THREE.LatheGeometry(points, segs));

				// 8 Coronet pearls around the rim
				const pearlGeom = new THREE.SphereGeometry(0.038, 12, 12);
				for (let i = 0; i < 8; i++) {
					const angle = (i * Math.PI * 2) / 8;
					const g = pearlGeom.clone();
					g.translate(Math.cos(angle) * 0.245, 1.01, Math.sin(angle) * 0.245);
					parts.push(g);
				}

				// Central royal orb finial
				const orb = new THREE.SphereGeometry(0.08, 16, 16);
				orb.translate(0, 1.1, 0);
				parts.push(orb);
				break;
			}
			case 'king': {
				// Majestic wide lathe body with double collar and imperial crown
				const points = [
					...createBasePoints(0.4, 0.27, 0.17),
					new THREE.Vector2(0.24, 0.24),
					new THREE.Vector2(0.18, 0.44),
					new THREE.Vector2(0.15, 0.6),
					new THREE.Vector2(0.21, 0.66),
					new THREE.Vector2(0.18, 0.7),
					new THREE.Vector2(0.24, 0.75),
					new THREE.Vector2(0.17, 0.8),
					new THREE.Vector2(0.22, 0.88),
					new THREE.Vector2(0.26, 0.98),
					new THREE.Vector2(0.24, 1.06),
					new THREE.Vector2(0.18, 1.1),
					new THREE.Vector2(0.08, 1.14),
					new THREE.Vector2(0, 1.15)
				];
				parts.push(new THREE.LatheGeometry(points, segs));

				// Finial pedestal bead
				const bead = new THREE.SphereGeometry(0.05, 12, 12);
				bead.translate(0, 1.18, 0);
				parts.push(bead);

				// Royal Cross Formée (Patée)
				const crossV = new THREE.BoxGeometry(0.07, 0.2, 0.06);
				crossV.translate(0, 1.28, 0);
				parts.push(crossV);

				const crossH = new THREE.BoxGeometry(0.18, 0.07, 0.06);
				crossH.translate(0, 1.3, 0);
				parts.push(crossH);

				const crossTop = new THREE.BoxGeometry(0.11, 0.04, 0.06);
				crossTop.translate(0, 1.39, 0);
				parts.push(crossTop);

				const crossL = new THREE.BoxGeometry(0.04, 0.1, 0.06);
				crossL.translate(-0.1, 1.3, 0);
				parts.push(crossL);

				const crossR = new THREE.BoxGeometry(0.04, 0.1, 0.06);
				crossR.translate(0.1, 1.3, 0);
				parts.push(crossR);
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
		return new THREE.Vector3(col - 3.5, 0.08, 3.5 - row);
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

		// 4. Board Platform (Hollow Frame + Under-plank) & Squares
		const woodFrameMat = new THREE.MeshStandardMaterial({
			color: 0x3d2314, // Rich walnut wood frame
			roughness: 0.38,
			metalness: 0.05
		});
		const woodBaseMat = new THREE.MeshStandardMaterial({
			color: 0x22130a, // Dark table under-plank
			roughness: 0.6
		});

		// Base plank strictly underneath tiles and frame (no z-fighting)
		const basePlank = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.15, 9.6), woodBaseMat);
		basePlank.position.y = -0.15;
		basePlank.receiveShadow = true;
		scene.add(basePlank);
		boardFrameMeshes.push(basePlank);

		// 4 Border rails surrounding the 8x8 squares (inner area [-4, 4] x [-4, 4] is completely clear)
		const southRail = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.15, 0.8), woodFrameMat);
		southRail.position.set(0, 0, 4.4);
		southRail.receiveShadow = true;
		scene.add(southRail);
		boardFrameMeshes.push(southRail);

		const northRail = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.15, 0.8), woodFrameMat);
		northRail.position.set(0, 0, -4.4);
		northRail.receiveShadow = true;
		scene.add(northRail);
		boardFrameMeshes.push(northRail);

		const westRail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 8.0), woodFrameMat);
		westRail.position.set(-4.4, 0, 0);
		westRail.receiveShadow = true;
		scene.add(westRail);
		boardFrameMeshes.push(westRail);

		const eastRail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 8.0), woodFrameMat);
		eastRail.position.set(4.4, 0, 0);
		eastRail.receiveShadow = true;
		scene.add(eastRail);
		boardFrameMeshes.push(eastRail);

		// 64 Board square tiles
		const tileGeom = new THREE.BoxGeometry(1, 0.15, 1);
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				const isDark = (r + c) % 2 === 0;
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
		const labelGeom = new THREE.PlaneGeometry(0.44, 0.44);
		const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
		const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
		const labelY = 0.078;
		const borderOffset = 4.4;

		// Files (a-h) on South border (White player side, z = +borderOffset) and North border (Black side, z = -borderOffset)
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

			// South border (Rank 1 side, readable upright from White perspective)
			const meshSouth = new THREE.Mesh(labelGeom, mat);
			meshSouth.rotation.x = -Math.PI / 2;
			meshSouth.rotation.z = 0;
			meshSouth.position.set(x, labelY, borderOffset);
			scene.add(meshSouth);
			boardLabels.push(meshSouth);

			// North border (Rank 8 side, facing inward toward board)
			const meshNorth = new THREE.Mesh(labelGeom, mat);
			meshNorth.rotation.x = -Math.PI / 2;
			meshNorth.rotation.z = Math.PI;
			meshNorth.position.set(x, labelY, -borderOffset);
			scene.add(meshNorth);
			boardLabels.push(meshNorth);
		}

		// Ranks (1-8) along West border (File a, x = -borderOffset) and East border (File h, x = +borderOffset)
		for (let r = 0; r < 8; r++) {
			const rank = ranks[r];
			const z = 3.5 - r;
			const tex = getLabelTexture(rank);
			const mat = new THREE.MeshBasicMaterial({
				map: tex,
				transparent: true,
				opacity: 0.92,
				side: THREE.DoubleSide
			});

			// West border (File a side, readable upright from camera)
			const meshWest = new THREE.Mesh(labelGeom, mat);
			meshWest.rotation.x = -Math.PI / 2;
			meshWest.rotation.z = 0;
			meshWest.position.set(-borderOffset, labelY, z);
			scene.add(meshWest);
			boardLabels.push(meshWest);

			// East border (File h side, readable upright from camera)
			const meshEast = new THREE.Mesh(labelGeom, mat);
			meshEast.rotation.x = -Math.PI / 2;
			meshEast.rotation.z = 0;
			meshEast.position.set(borderOffset, labelY, z);
			scene.add(meshEast);
			boardLabels.push(meshEast);
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
			for (const frame of boardFrameMeshes) {
				scene.remove(frame);
				frame.geometry.dispose();
				(frame.material as THREE.Material).dispose();
			}
			boardFrameMeshes.length = 0;
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

			if (piece.color === 'white') {
				mesh.rotation.y = Math.PI;
			} else {
				mesh.rotation.y = 0;
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
