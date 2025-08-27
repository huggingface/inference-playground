import { PersistedState } from "runed";
import { validateOrganization, type OrganizationInfo } from "$lib/utils/organization.js";

const STORAGE_KEY = "hf_billing_org";

class Billing {
	#organization = new PersistedState(STORAGE_KEY, "");
	#organizationInfo = $state<OrganizationInfo | null>(null);
	#validating = $state(false);

	constructor() {
		$effect.root(() => {
			// Validate organization on initialization if one exists
			$effect(() => {
				if (this.#organization.current) {
					this.validateCurrentOrganization();
				}
			});
		});
	}

	get organization() {
		return this.#organization.current;
	}

	get organizationInfo() {
		return this.#organizationInfo;
	}

	get validating() {
		return this.#validating;
	}

	get displayName() {
		if (!this.#organization.current) return "Personal Account";
		return this.#organizationInfo?.displayName || this.#organization.current;
	}

	get isValid() {
		if (!this.#organization.current) return true; // Personal account is always valid
		return this.#organizationInfo?.isValid ?? false;
	}

	set organization(org: string) {
		this.#organization.current = org;
		this.validateCurrentOrganization();
	}

	private async validateCurrentOrganization() {
		if (!this.#organization.current) {
			this.#organizationInfo = null;
			return;
		}

		this.#validating = true;
		try {
			this.#organizationInfo = await validateOrganization(this.#organization.current);
		} finally {
			this.#validating = false;
		}
	}

	reset = () => {
		this.organization = "";
		this.#organizationInfo = null;
	};
}

export const billing = new Billing();
