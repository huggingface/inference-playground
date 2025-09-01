<script lang="ts">
	// Configuration for the pixel grid
	const GRID_SIZE = 7;
	const PIXEL_SIZE = 8;
	const PIXEL_SPACING = 15;
	const GRID_START_X = 50;
	const GRID_START_Y = 50;
	const ANIMATION_DELAY_INCREMENT = 50; // ms between each pixel

	// Generate pixel grid data
	const pixels = Array.from({ length: GRID_SIZE }, (_, row) =>
		Array.from({ length: GRID_SIZE }, (_, col) => ({
			x: GRID_START_X + col * PIXEL_SPACING,
			y: GRID_START_Y + row * PIXEL_SPACING,
			delay: (row * GRID_SIZE + col) * ANIMATION_DELAY_INCREMENT,
		})),
	).flat();
</script>

<div class="flex items-center justify-center p-8">
	<svg width="200" height="200" viewBox="0 0 200 200">
		<!-- Canvas Frame -->

		<rect
			x="40"
			y="40"
			width="120"
			height="120"
			rx="6"
			ry="6"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-dasharray="8,4"
			class="animate-dash"
		/>

		<!-- Generating Pixels -->
		<g>
			{#each pixels as pixel}
				<rect
					x={pixel.x}
					y={pixel.y}
					rx="2"
					ry="2"
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
			opacity: 1;
			transform: scale(0);
		}
		25% {
			opacity: 1;
			transform: scale(1.2);
		}
		75% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 1;
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
		transform-box: fill-box;
		transform-origin: center;
		opacity: 0;
		animation: pixel 6s ease-in-out infinite forwards;
	}

	/* .animate-fade { */
	/* 	animation: fade 3s ease-in-out infinite; */
	/* } */
	/**/
	/* .animate-pulse-slow { */
	/* 	animation: pulse-slow 2s ease-in-out infinite; */
	/* } */
</style>
