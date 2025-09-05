import { createAttachmentKey } from "svelte/attachments";
import type { HTMLInputAttributes } from "svelte/elements";

export type CreateFieldValidationArgs = {
	validate: (v: string) => string | void | undefined;
};

export function createFieldValidation(args: CreateFieldValidationArgs) {
	let valid = $state(true);
	let msg = $state<string>();

	const key = createAttachmentKey();
	let node: HTMLInputElement;

	const onblur = (_e: Event & { currentTarget: HTMLInputElement }) => {
		validate();
	};

	const oninput = (e: Event & { currentTarget: HTMLInputElement }) => {
		if (valid) return;
		const v = e.currentTarget.value;
		const m = args.validate(v);
		msg = m ? m : undefined;
	};

	const validate = () => {
		const v = node.value;
		const m = args.validate(v);
		valid = !m;
		msg = m ? m : undefined;
	};

	return {
		validate,
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
			[key]: el => {
				node = el;
			},
		} as const satisfies HTMLInputAttributes,
	};
}
