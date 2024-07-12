<script>
</script>

<div class="relative z-10">
	<label
		for="countries"
		class="mb-2 flex items-baseline text-sm font-medium text-gray-900 dark:text-white"
		>Models<span class="ml-4 font-normal text-gray-400">12</span>
	</label>
	<button
		class="peer flex items-center gap-5 whitespace-nowrap rounded-lg border bg-white px-3 py-1.5 leading-tight shadow dark:bg-gray-700"
	>
		<div class="flex flex-col items-start text-sm">
			<div class="text-gray-500 dark:text-gray-300">meta-llama</div>
			<div>Meta-Llama-3-70B-Instruct</div>
		</div>
		<div class="size-5 bg-red-50"></div>
	</button>
	<div
		class="absolute right-0 z-10 hidden w-96 overflow-hidden rounded-lg border bg-white shadow-lg hover:block peer-focus-within:block dark:bg-gray-700"
	>
		<div>
			<label for="input-group-search" class="sr-only">Search Models</label>
			<div class="relative">
				<div
					class="rtl:inset-r-0 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3"
				>
					<svg
						class="size-3 text-gray-500 dark:text-gray-400"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 20 20"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
						/>
					</svg>
				</div>
				<input
					type="text"
					id="input-group-search"
					class="block w-full border-b border-gray-300 bg-gray-50 p-2 ps-10 text-sm text-gray-900 focus:outline-none dark:border-gray-500 dark:bg-gray-600 dark:text-white"
					placeholder="Search model"
				/>
			</div>
		</div>
		<ul class="h-48 overflow-y-auto pb-3 text-sm text-gray-700 dark:text-gray-200">
			<li>
				<div class="flex items-center rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-600">
					<label
						for="checkbox-item-11"
						class="w-full rounded text-sm font-medium text-gray-900 dark:text-gray-300"
						>Bonnie Green</label
					>
				</div>
			</li>
		</ul>
		<a
			href="#"
			class="flex items-center rounded-b-lg border-t border-gray-200 bg-gray-50 p-3 text-sm font-medium text-red-600 hover:bg-gray-100 hover:underline dark:border-gray-600 dark:bg-gray-700 dark:text-red-500 dark:hover:bg-gray-600"
		>
			Reset
		</a>
	</div>
</div>
