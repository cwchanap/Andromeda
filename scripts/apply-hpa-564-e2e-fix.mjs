import { readFileSync, writeFileSync } from "node:fs";

const path = "e2e/main-user-journeys.spec.ts";
const source = readFileSync(path, "utf8");
const before = `        // 360px sits within the 320-375px range where three action buttons\n        // (Close, View sky from here, Explore) plus localized labels can\n        // overflow a non-wrapping flex row.\n        await page.setViewportSize({ width: 360, height: 640 });`;
const after = `        // 360px sits within the 320-375px range where the fixed navigation\n        // actions and localized labels must remain fully visible. The Close\n        // control is kept separately in the dialog header.\n        await page.setViewportSize({ width: 360, height: 640 });`;

if (!source.includes(before)) throw new Error("Missing viewport comment anchor");
let updated = source.replace(before, after);

const beforeActions = `        const actions = dialog.locator(".dialog-actions");\n        const actionButtons = actions.locator(".action-button");\n        await expect(actionButtons).toHaveCount(3);`;
const afterActions = `        await expect(dialog.locator(".dialog-close-button")).toBeVisible();\n\n        const actions = dialog.locator(".dialog-primary-actions");\n        const actionButtons = actions.locator(".action-button");\n        await expect(actionButtons).toHaveCount(2);`;

if (!updated.includes(beforeActions)) throw new Error("Missing action-row anchor");
updated = updated.replace(beforeActions, afterActions);
writeFileSync(path, updated);
console.log("Updated HPA-564 narrow viewport E2E");
