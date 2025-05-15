import { JsonDataProvider, Remult, remult, type JsonEntityStorage } from "remult";
import { createSubscriber } from "svelte/reactivity";

// To be done once in the application.
export function initRemultSvelteReactivity() {
	// Auth reactivity (remult.user, remult.authenticated(), ...)
	{
		let update = () => {};
		const s = createSubscriber(u => {
			update = u;
		});
		remult.subscribeAuth({
			reportObserved: () => s(),
			reportChanged: () => update(),
		});
	}

	// Entities reactivity
	{
		Remult.entityRefInit = x => {
			let update = () => {};
			const s = createSubscriber(u => {
				update = u;
			});
			x.subscribe({
				reportObserved: () => s(),
				reportChanged: () => update(),
			});
		};
	}
}

export class JsonEntityIndexedDbStorage implements JsonEntityStorage {
	constructor(
		private dbName: string = "db",
		private storeName: string = "jsonStore"
	) {}
	supportsRawJson = true;
	//@internal
	db?: IDBDatabase;
	async getItem(entityDbName: string) {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise<string>(async (resolve, reject) => {
			const transaction = (await this.init()).transaction([this.storeName], "readonly");
			const store = transaction.objectStore(this.storeName);
			const request = store.get(entityDbName);

			request.onerror = _event => reject(request.error);
			request.onsuccess = _event => {
				if (request.result) {
					resolve(request.result);
				} else {
					resolve(null!);
				}
			};
		});
	}
	//@internal
	async init() {
		if (!this.db) {
			this.db = await new Promise<IDBDatabase>((resolve, reject) => {
				let db: IDBDatabase;
				const request = indexedDB.open(this.dbName, 1);

				request.onerror = _event => reject(request.error);

				request.onsuccess = _event => {
					db = request.result;
					resolve(db);
				};

				request.onupgradeneeded = _event => {
					db = request.result;
					db.createObjectStore(this.storeName);
				};
			});
		}
		return this.db;
	}

	async setItem(entityDbName: string, json: string) {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise<void>(async (resolve, reject) => {
			const transaction = (await this.init()).transaction([this.storeName], "readwrite");
			const store = transaction.objectStore(this.storeName);
			const request = store.put(json, entityDbName);

			request.onerror = _event => reject(request.error);
			request.onsuccess = _event => resolve();
		});
	}

	async deleteItem(entityDbName: string) {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise<void>(async (resolve, reject) => {
			const transaction = (await this.init()).transaction([this.storeName], "readwrite");
			const store = transaction.objectStore(this.storeName);
			const request = store.delete(entityDbName);

			request.onerror = _event => reject(request.error);
			request.onsuccess = _event => resolve();
		});
	}
}

export const idb = new JsonDataProvider(new JsonEntityIndexedDbStorage());
