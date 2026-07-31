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
        test(`redirects ${requestUrl} to canonical Sol`, async ({ request }) => {
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

        expect(response.status()).not.toBe(308);
        expect(response.headers().location).toBeUndefined();
    });
});
