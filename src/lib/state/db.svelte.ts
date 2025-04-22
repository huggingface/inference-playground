/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Project } from "$lib/types.js";
import { keys } from "$lib/utils/object.js";
import Dexie, { type Transaction } from "dexie";
import {
	d,
	generateStoresString,
	type IndexedKeys,
	type InferSchema,
	type SchemaDefinition,
	type TypedDexieTable,
} from "./dexie-schema-builder.js";

Dexie.debug = true;
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
		// No upgrade needed for the very first version
	},
	// --- Example VERSION 2 ---
	// 2: {
	// 	schemas: {
	// 		// Define the FINAL schema for version 2
	// 		checkpoint: {
	// 			id: d.primaryKey().autoIncrement(),
	// 			timestamp: d.string().indexed(),
	// 			// 'favorite' is gone, 'isStarred' is added
	// 			isStarred: d.boolean().optional().indexed(), // New field name & indexed
	// 			projectState: d.object<Project>().indexed(false),
	// 			projectId: d.string().indexed(), // New indexed field
	// 		},
	// 		// You could add new tables here too
	// 		// userSettings: { /* ... */ }
	// 	},
	// 	// Define the UPGRADE function to get from v1 to v2
	// 	upgrade: async trans => {
	// 		console.log("Upgrading database to version 2...");
	//
	// 		// Get a reference to the checkpoint table within this transaction
	// 		const checkpointsTable = trans.table("checkpoint");
	//
	// 		// Use `modify` to iterate over each record and update it
	// 		await checkpointsTable.toCollection().modify(checkpoint => {
	// 			// 1. Add the new 'projectId' field
	// 			//    (Assuming projectState has an id)
	// 			if (checkpoint.projectState && checkpoint.projectState.id) {
	// 				checkpoint.projectId = checkpoint.projectState.id;
	// 			} else {
	// 				// Handle cases where projectState or its id might be missing
	// 				// Maybe set a default, or log an error, etc.
	// 				checkpoint.projectId = "unknown";
	// 			}
	//
	// 			// 2. Rename 'favorite' to 'isStarred'
	// 			if (typeof checkpoint.favorite !== "undefined") {
	// 				checkpoint.isStarred = checkpoint.favorite;
	// 			}
	// 			// Delete the old 'favorite' property
	// 			delete checkpoint.favorite;
	//
	// 			// No need to return the checkpoint, modify updates in place
	// 		});
	//
	// 		console.log("Upgrade to version 2 complete.");
	// 		// Dexie automatically applies the new schema defined in
	// 		// version(2).stores(...) AFTER this upgrade function succeeds.
	// 	},
	// },
} satisfies Record<number, Version>;

// Update this when adding versions to reflect the latest structure
const LATEST_VERSION_NUMBER = 1;

type LatestSchemaSet = (typeof versions)[typeof LATEST_VERSION_NUMBER]["schemas"];
type CheckpointSchema = LatestSchemaSet["checkpoints"];

type A = IndexedKeys<CheckpointSchema>;

// Infer types based on the LATEST version's schema
export type Checkpoint = InferSchema<LatestSchemaSet["checkpoints"]>;

export class Database extends Dexie {
	// Declare tables based on the LATEST schema
	checkpoints!: TypedDexieTable<LatestSchemaSet["checkpoints"]>;

	constructor() {
		super("db"); // Database name

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
console.log("wtf", db);
