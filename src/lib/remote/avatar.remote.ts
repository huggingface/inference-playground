import { query } from "$app/server";
import typia from "typia";

type AvatarJson = {
	avatarUrl: string;
};

export const getAvatarUrl = query(
	typia.createValidate<string | undefined>(),
	async (orgName): Promise<string | undefined> => {
		if (!orgName) return;
		const url = `https://huggingface.co/api/organizations/${orgName}/avatar`;
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Error getting avatar url for org: ${orgName}`);
		}

		const json = await res.json();
		typia.assert<AvatarJson>(json);
		const { avatarUrl } = json;
		return avatarUrl;
	},
);
