import { writable } from "svelte/store";

const key = "hf_token";

function createTokenStore() {
	const store = writable({ value: "", writeToLocalStorage: true, showModal: false });

	function setValue(token: string) {
		store.update(s => {
			if (s.writeToLocalStorage) localStorage.setItem(key, JSON.stringify(token));
			return { ...s, value: token, showModal: !token.length };
		});
	}

	const storedHfToken = localStorage.getItem(key);
	if (storedHfToken !== null) {
		setValue(JSON.parse(storedHfToken));
	}

	return {
		...store,
		setValue,
		reset() {
			setValue("");
			localStorage.removeItem(key);
			store.update(s => ({ ...s, showModal: true }));
		},
	};
}

export const token = createTokenStore();
