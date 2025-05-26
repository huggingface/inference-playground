<script lang="ts">
	// Configuration for the pixel grid
	const GRID_SIZE = 7;
	const PIXEL_SIZE = 8;
	const PIXEL_SPACING = 15;
	const GRID_START_X = 50;
	const GRID_START_Y = 50;
	const ANIMATION_DELAY_INCREMENT = 100; // ms between each pixel

	// Generate pixel grid data
	const pixels = Array.from({ length: GRID_SIZE }, (_, row) =>
		Array.from({ length: GRID_SIZE }, (_, col) => ({
			x: GRID_START_X + col * PIXEL_SPACING,
			y: GRID_START_Y + row * PIXEL_SPACING,
			delay: (row * GRID_SIZE + col) * ANIMATION_DELAY_INCREMENT,
		}))
	).flat();

	// Neural network nodes configuration
	const neuralNodes = [
		{ cx: 20, cy: 60, r: 3, delay: 0 },
		{ cx: 30, cy: 80, r: 2, delay: 100 },
		{ cx: 25, cy: 100, r: 2.5, delay: 200 },
		{ cx: 180, cy: 70, r: 3, delay: 300 },
		{ cx: 170, cy: 90, r: 2, delay: 400 },
		{ cx: 175, cy: 110, r: 2.5, delay: 500 },
	];

	// Neural connections configuration
	const neuralConnections = [
		{ x1: 20, y1: 60, x2: 40, y2: 50, delay: 0 },
		{ x1: 30, y1: 80, x2: 40, y2: 70, delay: 100 },
		{ x1: 25, y1: 100, x2: 40, y2: 90, delay: 200 },
		{ x1: 180, y1: 70, x2: 160, y2: 60, delay: 300 },
		{ x1: 170, y1: 90, x2: 160, y2: 80, delay: 400 },
		{ x1: 175, y1: 110, x2: 160, y2: 100, delay: 500 },
	];
</script>

<div class="flex items-center justify-center p-8">
	<svg width="200" height="200" viewBox="0 0 200 200" class="animate-pulse">
		<!-- Canvas Frame -->
		<rect
			x="40"
			y="40"
			width="120"
			height="120"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-dasharray="8,4"
			class="animate-dash"
		/>

		<!-- AI Brain/Neural Network -->
		<g class="opacity-60">
			<!-- Neural nodes -->
			{#each neuralNodes as node}
				<circle
					cx={node.cx}
					cy={node.cy}
					r={node.r}
					fill="currentColor"
					class="animate-pulse-slow"
					style="animation-delay: {node.delay}ms"
				/>
			{/each}

			<!-- Neural connections -->
			{#each neuralConnections as connection}
				<line
					x1={connection.x1}
					y1={connection.y1}
					x2={connection.x2}
					y2={connection.y2}
					stroke="currentColor"
					stroke-width="1"
					opacity="0.3"
					class="animate-fade"
					style="animation-delay: {connection.delay}ms"
				/>
			{/each}
		</g>

		<!-- Generating Pixels -->
		<g>
			{#each pixels as pixel}
				<rect
					x={pixel.x}
					y={pixel.y}
					width={PIXEL_SIZE}
					height={PIXEL_SIZE}
					fill="currentColor"
					class="animate-pixel"
					style="animation-delay: {pixel.delay}ms"
				/>
			{/each}
		</g>

		<!-- AI Text -->
		<text x="100" y="185" text-anchor="middle" class="fill-current text-sm font-medium opacity-70">
			Generating...
		</text>
	</svg>
</div>

<style>
	@keyframes dash {
		0% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: 24;
		}
	}

	@keyframes pixel {
		0%,
		50% {
			opacity: 0;
			transform: scale(0);
		}
		25% {
			opacity: 1;
			transform: scale(1.2);
		}
		75% {
			opacity: 0.8;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0);
		}
	}

	@keyframes fade {
		0%,
		100% {
			opacity: 0.1;
		}
		50% {
			opacity: 0.6;
		}
	}

	@keyframes pulse-slow {
		0%,
		100% {
			opacity: 0.4;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.animate-dash {
		animation: dash 2s linear infinite;
	}

	.animate-pixel {
		animation: pixel 6s ease-in-out infinite;
	}

	.animate-fade {
		animation: fade 3s ease-in-out infinite;
	}

	.animate-pulse-slow {
		animation: pulse-slow 2s ease-in-out infinite;
	}
</style>
