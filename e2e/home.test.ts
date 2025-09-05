import { expect, test } from "@playwright/test";
import { TEST_IDS } from "../src/lib/constants.js";

const HF_TOKEN = "hf_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HF_TOKEN_STORAGE_KEY = "hf_token";
const STORAGE_STATE_FILE = "e2e/home_test_storage_state.json";

test("home page has expected token model", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("Add a Hugging Face Token")).toBeVisible();
});

// Group tests that depend on sequential execution and shared state
test.describe.serial("Token Handling and Subsequent Tests", () => {
	// Test that sets the token and saves state
	test("filling up token input, closes modal, and saves state", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("Add a Hugging Face Token")).toBeVisible();

		const input = page.getByPlaceholder("Enter HF Token");
		await expect(input).toBeVisible();
		await input.fill(HF_TOKEN);
		await input.blur();

		await page.getByText("Submit").click();
		await expect(page.getByText("Add a Hugging Face Token")).not.toBeVisible();

		// Save storage state
		await page.context().storageState({ path: STORAGE_STATE_FILE });
	});

	// Nested describe for tests that use the saved state
	test.describe.skip("Tests requiring persisted token", () => {
		test.use({ storageState: STORAGE_STATE_FILE });

		test("can create a conversation with persisted token", async ({ page }) => {
			await page.goto("/");

			// Expect modal NOT to be visible due to persisted token
			await expect(page.getByText("Add a Hugging Face Token")).not.toBeVisible();

			// Verify token is in localStorage
			const storedToken = await page.evaluate(
				key => JSON.parse(window.localStorage.getItem(key) ?? ""),
				HF_TOKEN_STORAGE_KEY,
			);
			expect(storedToken).toBe(HF_TOKEN);

			const userInput = page.getByRole("textbox", { name: "Enter user message" });
			await expect(userInput).toBeVisible();
			await userInput.fill("Hello Hugging Face!");
			await userInput.blur();
			expect(await userInput.inputValue()).toBe("Hello Hugging Face!");

			// Reload the page
			await page.reload();

			// Re-select the input field and check its value
			const userInputAfterReload = page.getByRole("textbox", { name: "Enter user message" });
			await expect(userInputAfterReload).toBeVisible();
			expect(await userInputAfterReload.inputValue()).toBe("Hello Hugging Face!");
		});

		test("checkpoints, resetting, and restoring", async ({ page }) => {
			await page.goto("/");
			const userMsg = "user message: hi";
			const assistantMsg = "assistant message: hey";

			// Fill user message
			await page.getByRole("textbox", { name: "Enter message" }).click();
			await page.getByRole("textbox", { name: "Enter user message" }).fill(userMsg);
			// Blur
			await page.locator(".relative > div:nth-child(2) > div").first().click();

			// Fill assistant message
			await page.getByRole("button", { name: "Add message" }).click();
			await page.getByRole("textbox", { name: "Enter assistant message" }).fill(assistantMsg);
			// Blur
			await page.locator(".relative > div:nth-child(2) > div").first().click();

			// Create Checkpoint
			await page.locator(`[data-test-id="${TEST_IDS.checkpoints_trigger}"]`).click();
			await page.getByRole("button", { name: "Create new" }).click();

			// Check that there are checkpoints
			await expect(page.locator(`[data-test-id="${TEST_IDS.checkpoint}"] `)).toBeVisible();

			// Get out of menu
			await page.locator(`[data-test-id="${TEST_IDS.checkpoints_menu}"] `).press("Escape");
			await page.locator(`[data-test-id="${TEST_IDS.checkpoints_menu}"] `).press("Escape");

			// Reset
			await page.locator(`[data-test-id="${TEST_IDS.reset}"]`).click();

			// Check that messages are gone now
			await expect(page.getByRole("textbox", { name: "Enter user message" })).toHaveValue("");

			// Call in a checkpoint
			await page.locator(`[data-test-id="${TEST_IDS.checkpoints_trigger}"]`).click();
			await page.locator(`[data-test-id="${TEST_IDS.checkpoint}"] `).click();

			// Get out of menu
			await page.locator(`[data-test-id="${TEST_IDS.checkpoints_menu}"] `).press("Escape");
			await page.locator(`[data-test-id="${TEST_IDS.checkpoints_menu}"] `).press("Escape");

			// Check that the messages are back
			await expect(page.getByRole("textbox", { name: "Enter user message" })).toHaveValue(userMsg);
			await expect(page.getByRole("textbox", { name: "Enter assistant message" })).toHaveValue(assistantMsg);
		});
	});
});
