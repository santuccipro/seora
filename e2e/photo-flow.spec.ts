import { test, expect } from "@playwright/test";
import fs from "fs";

const TEST_JPEG = "/tmp/seora-test-real.jpg";

function ensureTestPhoto() {
  if (!fs.existsSync(TEST_JPEG)) {
    throw new Error("Test photo missing at /tmp/seora-test-real.jpg");
  }
  return TEST_JPEG;
}

test.describe("Photo flow — inline on landing", () => {
  test("Photo tab visible on landing", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("button:has-text('Photo pro')").first()).toBeVisible();
  });

  test("Clicking Photo tab shows upload zone", async ({ page }) => {
    await page.goto("/");
    await page.locator("button:has-text('Photo pro')").first().click();
    await expect(page.locator("text=Glisse ton selfie ici")).toBeVisible();
  });

  test("Uploading photo shows inline preview + style picker (no navigation)", async ({ page }) => {
    ensureTestPhoto();
    await page.goto("/");
    await page.locator("button:has-text('Photo pro')").first().click();

    const fileInput = page.locator("#photo-upload-hero");
    await fileInput.setInputFiles(TEST_JPEG);

    // Should NOT navigate — stays on landing
    await expect(page).toHaveURL("/", { timeout: 5_000 });

    // Photo preview with "Photo chargée" should appear
    await expect(page.locator("text=Photo chargée")).toBeVisible({ timeout: 5_000 });

    // Style picker should be visible with 9 options
    await expect(page.locator("text=Choisis ton fond")).toBeVisible();
    await expect(page.locator("text=LinkedIn").first()).toBeVisible();
    await expect(page.locator("text=Executive").first()).toBeVisible();
    await expect(page.locator("text=Outdoor").first()).toBeVisible();
  });

  test("Generating photo: fake loading appears then auth gate", async ({ page }) => {
    ensureTestPhoto();
    await page.goto("/");
    await page.locator("button:has-text('Photo pro')").first().click();

    const fileInput = page.locator("#photo-upload-hero");
    await fileInput.setInputFiles(TEST_JPEG);

    // Wait for preview
    await expect(page.locator("text=Photo chargée")).toBeVisible({ timeout: 5_000 });

    // Click generate
    await page.click("button:has-text('Générer')");

    // Loading spinner should appear (first step message)
    await expect(page.locator("text=Analyse de la photo").first()).toBeVisible({ timeout: 2_000 });

    // Gate appears after full 17s fake loading + 0.8s delay
    await expect(
      page.locator("text=Ta photo pro est prête").or(page.locator("text=Débloque ton résultat")).or(page.locator("text=Accédez à Seora CV"))
    ).toBeVisible({ timeout: 22_000 });
  });

  test("Back button on photo-pro goes to previous page", async ({ page }) => {
    await page.goto("/");
    await page.goto("/photo-pro");
    const backBtn = page.locator("button:has-text('Retour')");
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(page).not.toHaveURL(/photo-pro/, { timeout: 5_000 });
  });

  test("Photo-pro page shows variant picker before transform", async ({ page }) => {
    ensureTestPhoto();
    // For authenticated flows: go directly to /photo-pro and upload there
    await page.goto("/photo-pro");
    const fileInput = page.locator("input[type=file]");
    await fileInput.setInputFiles(TEST_JPEG);

    await expect(page.locator("text=Choisis ton fond")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=LinkedIn").first()).toBeVisible();
    await expect(page.locator("text=Executive").first()).toBeVisible();
    await expect(page.locator("text=Startup").first()).toBeVisible();
  });
});
