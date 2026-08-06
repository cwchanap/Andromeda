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
            //ja/constellation?observer=alpha-centauri$/,
            { timeout: 15000 },
        );

        const chooseAnother = page.getByRole("button", {
            name: "別の観測地点を選ぶ",
        });
        await expect(chooseAnother).toBeVisible({ timeout: 20000 });
        await chooseAnother.click();
        await expect(page).toHaveURL(//ja/galaxy/?$/, {
            timeout: 15000,
        });
        expect(new URL(page.url()).searchParams.has("observer")).toBe(false);
    });
});
