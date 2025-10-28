import { env } from "$env/dynamic/public";

class Token {
	#value = $state("");

	constructor() {
		if (env.PUBLIC_HF_TOKEN) {
			this.#value = env.PUBLIC_HF_TOKEN;
			return;
		}

		this.requestTokenFromParent();
	}

	get value() {
		return this.#value;
	}

	set value(token: string) {
		this.#value = token;
	}

	requestTokenFromParent = (): Promise<boolean> => {
		if (typeof window === "undefined") return Promise.resolve(false);

		return new Promise(resolve => {
			const timeout = window.setTimeout(() => {
				window.removeEventListener("message", handleMessage);
				resolve(false);
			}, 5000);

			const handleMessage = (event: MessageEvent) => {
				if (event.data.type === "INFERENCE_JWT_RESPONSE") {
					const token = event.data.token;
					if (!token || typeof token !== "string") return resolve(false);
					this.value = token;
					window.removeEventListener("message", handleMessage);
					resolve(true);
					window.clearTimeout(timeout);
				}
			};

			window.addEventListener("message", handleMessage);
			window.parent?.postMessage({ type: "INFERENCE_JWT_REQUEST" }, "*");
		});
	};
}

export const token = new Token();
