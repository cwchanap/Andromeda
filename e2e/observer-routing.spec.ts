import { expect, test } from "@playwright/test";

const redirectCases = [
    {
        requestUrl: "/constellation?observer=sol&ref=earth",
        location: "/constellation?ref=earth",
    },
    {
        requestUrl: "/ja/constellation?observer=sol&ref=earth",
        location: "/ja/constellation?ref=earth",
    },
] as const;

test.describe("observer route canonicalization", () => {
    for (const { requestUrl, location } of redirectCases) {
        test(`redirects ${requestUrl} to canonical Sol`, async ({
            request,
        }) => {
            const response = await request.get(requestUrl, {
                maxRedirects: 0,
            });

            expect(response.status()).toBe(308);
            expect(response.headers().location).toBe(location);
        });
    }

    test("does not redirect duplicate observer parameters", async ({
        request,
    }) => {
        const response = await request.get(
            "/constellation?observer=sol&observer=alpha-centauri",
            { maxRedirects: 0 },
        );

        // Duplicate observer params are malformed (not canonicalizable), so
        // the route must render the Sol fallback with a successful status
        // rather than crash or canonicalize.
        expect(response.status()).toBe(200);
        expect(response.headers().location).toBeUndefined();
    });
});

test.describe("observer selection round trip", () => {
    test("runs an English Alpha Centauri observer journey back to canonical Sol", async ({
        page,
    }) => {
        await page.goto("/galaxy");
        await page.waitForSelector("#galaxy-renderer", { timeout: 15000 });
        await expect(page.locator(".animate-spin")).toHaveCount(0, {
            timeout: 15000,
        });

        const systems = page.locator(".galaxy-nearby .hud-list-row");
        await expect(systems).toHaveCount(30, { timeout: 5000 });
        const alphaCentauri = systems.filter({
            hasText: "Alpha Centauri System",
        });
        await expect(alphaCentauri).toBeVisible();
        await alphaCentauri.click();

        const viewSky = page.getByRole("button", {
            name: "View sky from here",
        });
        await expect(viewSky).toBeVisible();
        await viewSky.click();
        await expect(page).toHaveURL(
            /\/constellation\?observer=alpha-centauri$/,
            { timeout: 15000 },
        );

        await expect(page.getByText("Observer", { exact: true })).toBeVisible({
            timeout: 20000,
        });

        const returnToSol = page.getByRole("button", {
            name: "Return to Earth/Sol",
        });
        await expect(returnToSol).toBeVisible();

        await page.getByRole("button", { name: "Settings" }).click();
        const referenceToggle = page.getByRole("checkbox", {
            name: "Show Earth/Sol reference",
        });
        await expect(referenceToggle).toBeVisible();
        await expect(referenceToggle).not.toBeChecked();
        await referenceToggle.focus();
        await expect(referenceToggle).toBeFocused();
        await page.keyboard.press("Space");
        await expect(referenceToggle).toBeChecked();

        const findSol = page.getByRole("button", { name: "Find Sol" });
        await expect(findSol).toBeVisible();
        await findSol.focus();
        await expect(findSol).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(
            page.getByText(
                /Sol: right ascension \d+\.\d{2} h, declination [+-]\d+\.\d{2}°, distance \d+(?:\.\d+)? ly\./,
            ),
        ).toBeVisible();

        await page.getByRole("button", { name: "Close" }).click();
        await returnToSol.focus();
        await expect(returnToSol).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/constellation\/?$/, {
            timeout: 15000,
        });
        expect(new URL(page.url()).search).toBe("");
    });

    test("returns from localized Galaxy through observer sky without carrying observer state back", async ({
        page,
    }) => {
        await page.goto("/ja/galaxy");
        await page.waitForSelector("#galaxy-renderer", { timeout: 15000 });
        await expect(page.locator(".animate-spin")).toHaveCount(0, {
            timeout: 15000,
        });

        const systems = page.locator(".galaxy-nearby .hud-list-row");
        await expect(systems).toHaveCount(30, { timeout: 5000 });
        const alphaCentauri = systems.filter({
            hasText: "ケンタウルス座アルファ恒星系",
        });
        await expect(alphaCentauri).toBeVisible();
        await alphaCentauri.click();

        const viewSky = page.getByRole("button", {
            name: "ここから星空を見る",
        });
        await expect(viewSky).toBeVisible();
        await viewSky.click();
        await expect(page).toHaveURL(
            /\/ja\/constellation\?observer=alpha-centauri$/,
            { timeout: 15000 },
        );

        const chooseAnother = page.getByRole("button", {
            name: "別の観測地点を選ぶ",
        });
        await expect(chooseAnother).toBeVisible({ timeout: 20000 });
        await chooseAnother.focus();
        await expect(chooseAnother).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/ja\/galaxy\/?$/, {
            timeout: 15000,
        });
        expect(new URL(page.url()).searchParams.has("observer")).toBe(false);
    });

    test("keeps a Chinese direct-loaded alternate observer after reload", async ({
        page,
    }) => {
        await page.goto("/zh/constellation?observer=alpha-centauri");
        await expect(page).toHaveURL(
            /\/zh\/constellation\?observer=alpha-centauri$/,
        );

        const returnToSol = page.getByRole("button", {
            name: "返回地球／太阳",
        });
        await expect(returnToSol).toBeVisible({ timeout: 20000 });

        await page.reload();
        await expect(page).toHaveURL(
            /\/zh\/constellation\?observer=alpha-centauri$/,
        );
        await expect(returnToSol).toBeVisible({ timeout: 20000 });
    });

    test("falls back from an invalid observer to the normal Sol/Earth view", async ({
        page,
    }) => {
        await page.goto("/constellation?observer=not-a-real-observer");
        await expect(page).toHaveURL(
            /\/constellation\?observer=not-a-real-observer$/,
        );

        await expect(
            page.getByRole("status").filter({
                hasText:
                    "Observer unavailable; showing the sky from Earth/Sol.",
            }),
        ).toBeVisible({ timeout: 20000 });
        await expect(
            page.getByText("View from Earth", { exact: true }),
        ).toBeVisible();
        await expect(page.getByText("GEO-LOCK", { exact: true })).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Return to Earth/Sol" }),
        ).toHaveCount(0);
    });
});
