import { createAttachmentKey } from "svelte/attachments";
import type { HTMLAttributes } from "svelte/elements";
import { SvelteMap } from "svelte/reactivity";

export type CreateFieldValidationArgs = {
	validate: (v: string) => string | void | undefined;
};

export function createFieldValidation(args: CreateFieldValidationArgs) {
	let valid = $state(true);
	let msg = $state<string>();

	const onblur = (e: Event & { currentTarget: HTMLInputElement }) => {
		const v = e.currentTarget?.value;
		const m = args.validate(v);
		valid = !m;
		msg = m ?? undefined;
	};

	const oninput = (e: Event & { currentTarget: HTMLInputElement }) => {
		if (valid) return;
		const v = e.currentTarget.value;
		const m = args.validate(v);
		msg = m ? m : undefined;
	};

	return {
		get valid() {
			return valid;
		},
		get msg() {
			return msg;
		},
		reset() {
			valid = true;
			msg = undefined;
		},
		attrs: {
			onblur,
			oninput,
		},
	};
}

type FieldArgs = CreateFieldValidationArgs & {
	name: string;
};

export class Form {
	fields = new SvelteMap<string, { valid: boolean; msg: string | undefined }>();
	validators = new SvelteMap<string, () => void>();

	#key = createAttachmentKey();
	field(args: FieldArgs) {
		const parent = this;
		const getValid = () => Boolean(parent.fields.get(args.name)?.valid ?? true);

		const onblur = (e: Event & { currentTarget: HTMLInputElement }) => {
			const v = e.currentTarget?.value;
			const m = args.validate(v);
			parent.fields.set(args.name, {
				valid: !m,
				msg: m ?? undefined,
			});
		};

		const oninput = (e: Event & { currentTarget: HTMLInputElement }) => {
			if (getValid()) return;
			const v = e.currentTarget.value;
			const m = args.validate(v);
			parent.fields.set(args.name, {
				valid: getValid(),
				msg: m ?? undefined,
			});
		};

		return {
			get valid() {
				return getValid();
			},
			get msg() {
				return parent.fields.get(args.name)?.msg;
			},
			reset() {
				parent.fields.set(args.name, {
					valid: true,
					msg: undefined,
				});
			},
			attrs: {
				onblur,
				oninput,
				[this.#key]: node => {
					parent.validators.set(args.name, () => {
						const m = args.validate(node.value);
						parent.fields.set(args.name, {
							valid: !m,
							msg: m ?? undefined,
						});
					});
					return () => {
						if (node.isConnected) return;

						parent.fields.delete(args.name);
						parent.validators.delete(args.name);
					};
				},
			} as const satisfies HTMLAttributes<HTMLInputElement>,
		};
	}

	get valid() {
		this.validators.values().forEach(v => v());
		return this.fields.values().every(v => v.valid);
	}
}
