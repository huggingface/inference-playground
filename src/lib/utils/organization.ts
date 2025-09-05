export interface OrganizationInfo {
	name: string;
	displayName: string;
	avatar?: string;
	isValid: boolean;
}

const orgCache = new Map<string, OrganizationInfo>();

export async function validateOrganization(orgName: string): Promise<OrganizationInfo> {
	if (!orgName.trim()) {
		return {
			name: "",
			displayName: "Personal Account",
			isValid: false,
		};
	}

	// Check cache first
	if (orgCache.has(orgName)) {
		return orgCache.get(orgName)!;
	}

	try {
		const response = await fetch(`https://huggingface.co/api/organizations/${orgName}/overview`);

		if (response.ok) {
			const data = await response.json();
			const orgInfo: OrganizationInfo = {
				name: orgName,
				displayName: data.displayName || orgName,
				avatar: data.avatar || `https://huggingface.co/api/organizations/${orgName}/avatar`,
				isValid: true,
			};

			// Cache the result
			orgCache.set(orgName, orgInfo);
			return orgInfo;
		} else {
			const orgInfo: OrganizationInfo = {
				name: orgName,
				displayName: orgName,
				isValid: false,
			};

			// Cache invalid result for a short time
			orgCache.set(orgName, orgInfo);
			return orgInfo;
		}
	} catch (error) {
		console.warn(`Failed to validate organization ${orgName}:`, error);
		const orgInfo: OrganizationInfo = {
			name: orgName,
			displayName: orgName,
			isValid: false,
		};

		// Cache error result
		orgCache.set(orgName, orgInfo);
		return orgInfo;
	}
}

export function clearOrganizationCache() {
	orgCache.clear();
}
