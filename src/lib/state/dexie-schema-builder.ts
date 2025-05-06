// --- Type Definitions for our Builder ---

import type { Table, WhereClause } from "dexie";

// Base interface for non-primary-key field definitions
interface FieldDefinition<T, Optional extends boolean, Indexed extends boolean> {
	readonly _type: T; // Placeholder for the actual TS type
	readonly _optional: Optional;
	readonly _indexed: Indexed;
	readonly _isPrimaryKey: false; // Explicitly false for this type
	readonly _autoIncrement: false; // Explicitly false for this type

	// Modifier methods return new instances with updated types
	optional(): FieldDefinition<T, true, Indexed>;
	indexed(value?: boolean): FieldDefinition<T, Optional, boolean>;
}

// Specific interface for Primary Key definitions
interface PrimaryKeyDefinition<T, AutoIncrement extends boolean> {
	readonly _type: T;
	readonly _optional: false; // Primary keys cannot be optional in schema
	readonly _indexed: true; // Primary keys are always indexed
	readonly _isPrimaryKey: true;
	readonly _autoIncrement: AutoIncrement;

	// Modifier method for autoIncrement
	autoIncrement(): PrimaryKeyDefinition<T, true>;
}

// Union type for any valid field definition in a schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFieldDefinition = FieldDefinition<any, boolean, boolean> | PrimaryKeyDefinition<any, boolean>;

// --- Builder Implementation ---

// Helper function to create standard field definitions
function createBaseField<T, Optional extends boolean, Indexed extends boolean>(
	type: T,
	optional: Optional,
	indexed: Indexed
): FieldDefinition<T, Optional, Indexed> {
	// Use 'as const' for boolean literals to help type inference
	return {
		_type: type,
		_optional: optional,
		_indexed: indexed,
		_isPrimaryKey: false as const,
		_autoIncrement: false as const,

		optional(): FieldDefinition<T, true, Indexed> {
			// Return a new object with the updated optional flag
			return createBaseField(this._type, true as const, this._indexed);
		},
		indexed(value = true): FieldDefinition<T, Optional, boolean> {
			// Return a new object with the updated indexed flag (type becomes boolean)
			return createBaseField(this._type, this._optional, value);
		},
	};
}

// The main 'd' object mimicking Zod syntax
export const d = {
	string: () => createBaseField<string, false, true>("", false, true),
	number: () => createBaseField<number, false, true>(0, false, true),
	boolean: () => createBaseField<boolean, false, true>(false, false, true),
	date: () => createBaseField<Date, false, true>(new Date(), false, true),
	// Objects/Arrays not indexed by default
	object: <T extends object>() => createBaseField<T, false, false>({} as T, false, false),
	array: <T>() => createBaseField<T[], false, false>([], false, false),

	// Primary Key - always indexed, defaults to number, cannot be optional
	primaryKey: (): PrimaryKeyDefinition<number, false> => {
		// Construct the PK definition directly
		const definition: PrimaryKeyDefinition<number, false> = {
			_type: 0, // Default type for PK is number
			_optional: false as const,
			_indexed: true as const,
			_isPrimaryKey: true as const,
			_autoIncrement: false as const,

			autoIncrement(): PrimaryKeyDefinition<number, true> {
				// Return a new object with autoIncrement set to true
				return {
					...this, // Spread the current properties
					_autoIncrement: true as const,
				};
			},
		};
		return definition;
	},

	strPrimaryKey: (): PrimaryKeyDefinition<string, false> => {
		// Construct the PK definition directly
		const definition: PrimaryKeyDefinition<string, false> = {
			_type: "", // Default type for PK is number
			_optional: false as const,
			_indexed: true as const,
			_isPrimaryKey: true as const,
			_autoIncrement: false as const,
			autoIncrement(): PrimaryKeyDefinition<string, true> {
				// Return a new object with autoIncrement set to true
				return {
					...this, // Spread the current properties
					_autoIncrement: true as const,
				};
			},
		};

		return definition;
	},
};

// --- Type Inference ---

// Helper type to extract the TS type from any field definition
type InferFieldType<F extends AnyFieldDefinition> = F["_type"];

// Helper to determine if a field definition represents an optional field
type IsFieldOptional<F extends AnyFieldDefinition> = F extends { _optional: true }
	? true // Marked explicitly with .optional()
	: F extends { _isPrimaryKey: true; _autoIncrement: true }
		? true // Auto-incrementing primary keys are optional on input
		: false; // Otherwise, it's required

// Extracts keys that correspond to REQUIRED fields in the schema
type RequiredSchemaKeys<S extends SchemaDefinition> = keyof {
	// Use key remapping: keep key K only if IsFieldOptional<S[K]> is false
	[K in keyof S as IsFieldOptional<S[K]> extends false ? K : never]: S[K];
};

// Extracts keys that correspond to OPTIONAL fields in the schema
type OptionalSchemaKeys<S extends SchemaDefinition> = keyof {
	// Use key remapping: keep key K only if IsFieldOptional<S[K]> is true
	[K in keyof S as IsFieldOptional<S[K]> extends true ? K : never]: S[K];
};

/**
 * Infers the TypeScript data type from a schema definition, correctly
 * handling optional properties (key?: type).
 *
 * @template S The schema definition object.
 */
export type InferSchema<S extends SchemaDefinition> =
	// Part 1: Define all REQUIRED properties
	{
		// Map over only the required keys
		[K in RequiredSchemaKeys<S>]: NonNullable<InferFieldType<S[K]>>;
		// Use NonNullable in case the base inferred type had undefined,
		// as the required status is handled by the key not being optional.
	} & {
		// Part 2: Intersect with OPTIONAL properties (using '?')
		// Map over only the optional keys and add the '?' modifier
		[K in OptionalSchemaKeys<S>]?: NonNullable<InferFieldType<S[K]>>;
		// Use NonNullable here too; the optionality comes from 'K?'.
	};
// --- Stores String Generator ---

export function generateStoresString<S extends SchemaDefinition>(schema: S): string {
	let pk = "";
	const indexes: string[] = [];

	for (const fieldName in schema) {
		const definition = schema[fieldName];

		// Use the _isPrimaryKey flag to distinguish definition types
		if (definition?._isPrimaryKey) {
			// TypeScript can now correctly infer 'definition' is PrimaryKeyDefinition here
			pk = definition._autoIncrement ? `++${fieldName}` : fieldName;
		} else if (definition?._indexed) {
			// Here, 'definition' is inferred as FieldDefinition
			indexes.push(fieldName);
		}
	}

	if (!pk) {
		throw new Error("Schema definition must include exactly one primary key using d.primaryKey().");
	}

	return [pk, ...indexes].join(", ");
}

// --- Schema Definition Type Helper ---
// Ensures the input object conforms to the expected structure using the union type
export type SchemaDefinition = Record<string, AnyFieldDefinition>;

// Helper type guard to check if a definition is a PrimaryKeyDefinition
// (Could be used internally if needed, but direct flag check is often sufficient)
// function isPrimaryKeyDefinition(def: AnyFieldDefinition): def is PrimaryKeyDefinition<any, any> {
//   return def._isPrimaryKey;
// }

// --- Advanced Type Inference Helpers ---

// Extracts the names of keys marked as indexed or primary key
export type IndexedKeys<S extends SchemaDefinition> = keyof {
	[K in keyof S as S[K] extends { _indexed: true } | { _isPrimaryKey: true } ? K : never]: S[K];
};

// Finds the primary key field name in a schema
type PrimaryKeyName<S extends SchemaDefinition> = keyof {
	[K in keyof S as S[K] extends { _isPrimaryKey: true } ? K : never]: S[K];
};

// Extracts the TypeScript type of the primary key
export type PrimaryKeyType<S extends SchemaDefinition> =
	S extends Record<PrimaryKeyName<S>, AnyFieldDefinition> ? InferFieldType<S[PrimaryKeyName<S>]> : unknown; // Should not happen with valid schema

// Helper to ensure keys used in 'where' are strings (as Dexie expects)
export type StringIndexedKeys<S extends SchemaDefinition> = Extract<IndexedKeys<S>, string>;

export type TypedDexieTable<TSchema extends SchemaDefinition> =
	// Start with the base Dexie Table type, inferring data and key types
	Omit<Table<InferSchema<TSchema>, PrimaryKeyType<TSchema>>, "where"> & {
		// Intersect with an object type that overrides 'where'
		/**
		 * Initiate a query based on an indexed property defined in the schema.
		 * @param index The name of an indexed string property in the schema.
		 */
		where(
			index: StringIndexedKeys<TSchema> // Use only the indexed string keys
		): WhereClause<InferSchema<TSchema>, PrimaryKeyType<TSchema>>;

		// Note: Other methods like 'get', 'add', 'put', 'toArray', etc.,
		// are inherited from Dexie.Table<...> and remain unchanged.
	};
