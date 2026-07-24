import { test, expect } from "@playwright/test";

const PROD_URL = "https://tryseora.com";
const TEST_PHOTO = "/tmp/seora-test-real.jpg";

test.use({ baseURL: PROD_URL });

test.describe("Photo Pro — test prod tryseora.com", () => {
  test("1. Tab Photo pro visible sur la landing", async ({ page }) => {
    await page.goto(PROD_URL);
    const tab = page.locator("button:has-text('Photo pro')").first();
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/seora-test1.png" });
  });

  test("2. Upload selfie → questionnaire apparaît (4 sections)", async ({ page }) => {
    await page.goto(PROD_URL);
    await page.locator("button:has-text('Photo pro')").first().click();

    const fileInput = page.locator("#photo-upload-hero");
    await fileInput.setInputFiles(TEST_PHOTO);

    // Photo preview
    await expect(page.locator("text=Photo chargée").first()).toBeVisible({ timeout: 8_000 });

    // 4 questionnaire sections — unique to photo section
    await expect(page.locator("text=Ton fond").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Tonalité").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Pose").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Expression").first()).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: "/tmp/seora-test2.png" });
  });

  test("3. Sélection questionnaire + clic Générer → fake loading avec textes exacts", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(PROD_URL);
    await page.locator("button:has-text('Photo pro')").first().click();

    const fileInput = page.locator("#photo-upload-hero");
    await fileInput.setInputFiles(TEST_PHOTO);
    await expect(page.locator("text=Photo chargée").first()).toBeVisible({ timeout: 8_000 });

    // Sélectionner options
    await page.locator("text=Sombre").first().click();
    await page.locator("text=Dynamique").first().click();
    await page.locator("text=Sérieux").first().click();

    // Click Générer
    await page.locator("button:has-text('Générer')").first().click();

    // Fake loading — texte exact du LOAD_STEPS[0]
    await expect(page.locator("text=Analyse de la photo...").first()).toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: "/tmp/seora-test3-loading.png" });
  });

  test("4. Après 17s → gate exact 'Ta photo pro est prête !'", async ({ page }) => {
    test.setTimeout(35_000);
    await page.goto(PROD_URL);
    await page.locator("button:has-text('Photo pro')").first().click();

    const fileInput = page.locator("#photo-upload-hero");
    await fileInput.setInputFiles(TEST_PHOTO);
    await expect(page.locator("text=Photo chargée").first()).toBeVisible({ timeout: 8_000 });

    await page.locator("button:has-text('Générer')").first().click();

    // Attendre loading
    await expect(page.locator("text=Analyse de la photo...").first()).toBeVisible({ timeout: 3_000 });

    // Attendre le gate exact (après 17s + 0.8s)
    await expect(page.locator("text=Ta photo pro est prête !").first()).toBeVisible({ timeout: 22_000 });

    // Bouton Débloquer doit être là
    await expect(page.locator("button:has-text('Débloquer')").first()).toBeVisible({ timeout: 2_000 });

    await page.screenshot({ path: "/tmp/seora-gate.png" });
  });
});
