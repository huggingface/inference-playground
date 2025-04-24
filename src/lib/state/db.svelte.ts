/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Conversation, Project } from "$lib/types.js";
import { keys } from "$lib/utils/object.svelte.js";
import Dexie, { type Transaction } from "dexie";
import {
	d,
	generateStoresString,
	type InferSchema,
	type SchemaDefinition,
	type TypedDexieTable,
} from "./dexie-schema-builder.js";

type Version = {
	schemas: {
		[tableName: string]: SchemaDefinition;
	};
	upgrade?: (trans: Transaction) => void | Promise<void>;
};

const versions = {
	1: {
		schemas: {
			checkpoints: {
				id: d.primaryKey().autoIncrement(),
				timestamp: d.string(),
				favorite: d.boolean().optional(),
				projectState: d.object<Project>().indexed(false),
				projectId: d.string(),
			},
		},
	},
	2: {
		schemas: {
			checkpoints: {
				id: d.primaryKey().autoIncrement(),
				timestamp: d.string(),
				favorite: d.boolean().optional(),
				conversations: d.array<Conversation>().indexed(false),
				projectId: d.string(),
			},
		},
		upgrade: async trans => {
			// Get a reference to the checkpoint table within this transaction
			const checkpointsTable = trans.table("checkpoints");

			// Use `modify` to iterate over each record and update it
			await checkpointsTable.toCollection().modify(checkpoint => {
				// Add the new conversations field
				checkpoint.conversations = checkpoint?.projectState?.conversations ?? [];

				// Delete the old 'projectState' property
				delete checkpoint.projectState;

				// No need to return the checkpoint, modify updates in place
			});

			console.log("Upgrade to version 2 complete.");
		},
	},
} satisfies Record<number, Version>;

// Update this when adding versions to reflect the latest structure
const LATEST_VERSION_NUMBER = 2;
type LatestSchema = (typeof versions)[typeof LATEST_VERSION_NUMBER]["schemas"];

// Infer types based on the LATEST version's schema
export type Checkpoint = InferSchema<LatestSchema["checkpoints"]>;

export class Database extends Dexie {
	// Declare tables based on the LATEST schema
	checkpoints!: TypedDexieTable<LatestSchema["checkpoints"]>;

	constructor() {
		super("hf-playground"); // Database name

		keys(versions).forEach(vStr => {
			const v = Number(vStr);
			if (isNaN(v)) return;

			const versionDefinition = versions[vStr] as Version;

			// Generate the stores object for this version
			const storesDefinition = Object.fromEntries(
				keys(versionDefinition.schemas).map(tableName => {
					const schemaDefinition = versionDefinition.schemas[tableName] as SchemaDefinition;
					return [tableName, generateStoresString(schemaDefinition)];
				})
			);

			// --- Apply Version with Optional Upgrade ---
			const versionBuilder = this.version(v);

			if (versionDefinition.upgrade) {
				// If an upgrade function exists, provide it
				versionBuilder.upgrade(versionDefinition.upgrade);
			}

			// Define the stores for this version
			versionBuilder.stores(storesDefinition);
		});
		this.open();
	}
}

export const db = new Database();
