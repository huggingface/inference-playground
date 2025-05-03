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
