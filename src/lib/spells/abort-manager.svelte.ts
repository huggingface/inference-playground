import { onDestroy } from "svelte";

/**
 * Manages abort controllers, and aborts them when the component unmounts.
 */
export class AbortManager {
	private controllers: AbortController[] = [];

	constructor() {
		onDestroy(() => this.abortAll());
	}

	/**
	 * Creates a new abort controller and adds it to the manager.
	 */
	public createController(): AbortController {
		const controller = new AbortController();
		this.controllers.push(controller);
		return controller;
	}

	/**
	 * Aborts all controllers and clears the manager.
	 */
	public abortAll(): void {
		this.controllers.forEach(controller => controller.abort());
		this.controllers = [];
	}

	/** Clears the manager without aborting the controllers. */
	public clear(): void {
		this.controllers = [];
	}
}
