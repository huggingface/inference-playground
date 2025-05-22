import { expect, Page, test } from "@playwright/test";

const HF_TOKEN = "hf_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HF_TOKEN_STORAGE_KEY = "hf_token";

test("home page has expected token model", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("Add a Hugging Face Token")).toBeVisible();
});

test("filling up token input closes the modal", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("Add a Hugging Face Token")).toBeVisible();

	const input = page.getByPlaceholder("Enter HF Token");
	await expect(input).toBeVisible();
	await input.fill(HF_TOKEN);
	await input.blur();

	await page.getByText("Submit").click();
	await expect(page.getByText("Add a Hugging Face Token")).not.toBeVisible();
});

test("can create a conversation", async ({ page }) => {
	await page.goto("/");
	// Set local storage here

	await expect(page.getByText("Add a Hugging Face Token")).toBeVisible();
	const a = await page.evaluate(() => window.localStorage.getItem("hf_token"));
	console.log(a);
});
