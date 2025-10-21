import { env } from "$env/dynamic/public";
import { safeParse } from "$lib/utils/json.js";
import typia from "typia";

const key = "hf_token";

class Token {
	#value = $state("");
	writeToLocalStorage = $state(true);

	constructor() {
		if (env.PUBLIC_HF_TOKEN) {
			this.#value = env.PUBLIC_HF_TOKEN;
			return;
		}

		const storedHfToken = localStorage.getItem(key);
		const parsed = safeParse(storedHfToken ?? "");
		const storedToken = typia.is<string>(parsed) ? parsed : "";

		if (storedToken && storedToken.startsWith("hf_jwt")) {
			this.#value = storedToken;
		} else {
			this.requestTokenFromParent();
		}
	}

	get value() {
		return this.#value;
	}

	set value(token: string) {
		if (this.writeToLocalStorage) {
			localStorage.setItem(key, JSON.stringify(token));
		}
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

	reset = () => {
		this.value = "";
		localStorage.removeItem(key);
		if (!env.PUBLIC_HF_TOKEN) {
			this.requestTokenFromParent();
		}
	};
}

export const token = new Token();
