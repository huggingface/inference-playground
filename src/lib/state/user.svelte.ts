import { token } from "./token.svelte.js";

interface Org {
	type: "org";
	id: string;
	name: string;
	fullname: string;
	avatarUrl: string;
	roleInOrg: string;
	isEnterprise: boolean;
	plan?: string;
}

interface WhoamiResponse {
	type: "user";
	id: string;
	name: string;
	fullname: string;
	email: string;
	avatarUrl: string;
	orgs: Org[];
}

class User {
	#info = $state<WhoamiResponse | null>(null);
	#loading = $state(false);
	#error = $state<string | null>(null);

	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (token.value) {
					this.fetchUserInfo();
				} else {
					this.#info = null;
				}
			});
		});
	}

	get info() {
		return this.#info;
	}

	get loading() {
		return this.#loading;
	}

	get error() {
		return this.#error;
	}

	get orgs() {
		return this.#info?.orgs ?? [];
	}

	get paidOrgs() {
		return this.orgs.filter(org => org.plan === "team" || org.plan === "enterprise");
	}

	get name() {
		return this.#info?.name ?? "";
	}

	get fullname() {
		return this.#info?.fullname ?? "";
	}

	get avatarUrl() {
		return this.#info?.avatarUrl ?? "";
	}

	async fetchUserInfo() {
		if (!token.value) {
			this.#info = null;
			return;
		}

		this.#loading = true;
		this.#error = null;

		try {
			const response = await fetch("https://huggingface.co/api/whoami-v2", {
				headers: {
					Authorization: `Bearer ${token.value}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch user info: ${response.statusText}`);
			}

			this.#info = await response.json();
		} catch (error) {
			this.#error = error instanceof Error ? error.message : "Unknown error";
			console.error("Failed to fetch user info:", error);
		} finally {
			this.#loading = false;
		}
	}

	reset() {
		this.#info = null;
		this.#error = null;
	}
}

export const user = new User();
