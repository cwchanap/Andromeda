import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, before, after) {
  const source = readFileSync(path, "utf8");
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`Missing anchor in ${path}: ${before.slice(0, 100)}`);
  if (source.indexOf(before, first + 1) !== -1) throw new Error(`Ambiguous anchor in ${path}`);
  writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length));
}

const galaxy = "src/components/GalaxyWrapper.svelte";
replaceOnce(
  galaxy,
  `                    </div>\n                    <div class="dialog-content">`,
  `                    </div>\n                    <div class="dialog-actions dialog-primary-actions">\n                        <button\n                            type="button"\n                            class="action-button primary"\n                            aria-disabled={observerEligibility?.eligible === false ? 'true' : undefined}\n                            aria-describedby={observerEligibility?.eligible === false ? 'galaxy-sky-unavailable' : undefined}\n                            on:click={navigateToObserverSky}\n                        >\n                            {t('action.viewSkyFromHere')}\n                        </button>\n                        <button\n                            class="action-button secondary"\n                            on:click={() => navigateToSystem(selectedSystemId!)}\n                        >\n                            {canExplore ? t('action.explore') : t('common.comingSoon')}\n                        </button>\n                    </div>\n                    {#if observerEligibility?.eligible === false}\n                        <div id="galaxy-sky-unavailable" class="sky-unavailable-notice" role="status">\n                            {t('galaxy.skyUnavailable')}\n                        </div>\n                    {/if}\n                    {#if comingSoonNotice}\n                        <div class="coming-soon-notice" role="status">\n                            {t('galaxy.comingSoonNotice')}\n                        </div>\n                    {/if}\n                    <div class="dialog-content">`,
);
replaceOnce(
  galaxy,
  `                    </div>\n                    <div class="dialog-actions">\n                        <button class="action-button secondary" on:click={closeSystemDialog}>\n                            {t('action.close')}\n                        </button>\n                        <button\n                            type="button"\n                            class="action-button secondary"\n                            aria-disabled={observerEligibility?.eligible === false ? 'true' : undefined}\n                            aria-describedby={observerEligibility?.eligible === false ? 'galaxy-sky-unavailable' : undefined}\n                            on:click={navigateToObserverSky}\n                        >\n                            {t('action.viewSkyFromHere')}\n                        </button>\n                        <button\n                            class="action-button primary"\n                            on:click={() => navigateToSystem(selectedSystemId!)}\n                        >\n                            {canExplore ? t('action.explore') : t('common.comingSoon')}\n                        </button>\n                    </div>\n                    {#if observerEligibility?.eligible === false}\n                        <div id="galaxy-sky-unavailable" class="sky-unavailable-notice" role="status">\n                            {t('galaxy.skyUnavailable')}\n                        </div>\n                    {/if}\n                    {#if comingSoonNotice}\n                        <div class="coming-soon-notice" role="status">\n                            {t('galaxy.comingSoonNotice')}\n                        </div>\n                    {/if}`,
  `                    </div>`,
);
replaceOnce(
  galaxy,
  `    .system-dialog { background: rgba(0,0,17,0.95); border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 12px; width: min(700px, 90vw); max-height: 85vh; overflow-y: auto; padding: 20px; color: #e0f7ff; }`,
  `    .system-dialog { background: rgba(0,0,17,0.95); border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 12px; width: min(700px, 90vw); max-height: 85vh; overflow: hidden; padding: 20px; color: #e0f7ff; display: flex; flex-direction: column; box-sizing: border-box; }`,
);
replaceOnce(
  galaxy,
  `    .dialog-content { display: flex; flex-direction: column; gap: 12px; }`,
  `    .dialog-content { display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow-y: auto; padding-right: 4px; }`,
);
replaceOnce(
  galaxy,
  `    .dialog-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 16px; }`,
  `    .dialog-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin: 0 0 16px; flex: 0 0 auto; }`,
);
replaceOnce(
  galaxy,
  `    .sky-unavailable-notice {\n        margin-top: 12px;`,
  `    .sky-unavailable-notice {\n        margin: 0 0 12px;`,
);
replaceOnce(
  galaxy,
  `    .coming-soon-notice { margin-top: 12px; padding: 10px 14px; border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 6px; background: rgba(0,240,255,0.08); color: var(--hud-cyan, #00f0ff); font-size: 13px; text-align: center; }`,
  `    .coming-soon-notice { margin: 0 0 12px; padding: 10px 14px; border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 6px; background: rgba(0,240,255,0.08); color: var(--hud-cyan, #00f0ff); font-size: 13px; text-align: center; }`,
);

const constellation = "src/components/ConstellationWrapper.svelte";
replaceOnce(
  constellation,
  `  const returnToSol = () => {\n    window.location.href = routes.constellation(currentLang);\n  };`,
  `  const returnToSol = () => {\n    window.location.href = routes.constellation(currentLang);\n  };\n\n  // Return to the existing localized Galaxy selection flow so the user can\n  // pick another eligible system. Observer state remains URL-only and is not\n  // carried back to Galaxy.\n  const chooseAnotherObserver = () => {\n    window.location.href = routes.galaxy(currentLang);\n  };`,
);
replaceOnce(
  constellation,
  `              {#if !observerWebglFailed}\n                <!-- Return to Earth/Sol lives here for the working observer\n                     HUD. The WebGL-required overlay carries its own Return\n                     button, so it is suppressed here to keep one copy. -->\n                <div class="observer-actions">\n                  <button\n                    type="button"\n                    class="observer-action-btn"\n                    on:click={returnToSol}\n                  >\n                    {t('constellation.observer.returnToSol')}\n                  </button>\n                </div>\n              {/if}`,
  `              {#if !observerWebglFailed}\n                <!-- Working alternate mode offers both observer reselection\n                     through Galaxy and the direct query-free Sol reset. -->\n                <div class="observer-actions">\n                  <button\n                    type="button"\n                    class="observer-action-btn"\n                    on:click={chooseAnotherObserver}\n                  >\n                    {t('constellation.observer.chooseAnother')}\n                  </button>\n                  <button\n                    type="button"\n                    class="observer-action-btn"\n                    on:click={returnToSol}\n                  >\n                    {t('constellation.observer.returnToSol')}\n                  </button>\n                </div>\n              {/if}`,
);
replaceOnce(
  constellation,
  `            <h2 class="text-xl font-semibold mb-2 text-amber-400">{t('constellation.observer.webglUnavailable')}</h2>\n            <Button\n              variant="outline"\n              size="sm"\n              on:click={returnToSol}\n              className="text-white border-white/30 hover:bg-white/10"\n            >\n              {t('constellation.observer.returnToSol')}\n            </Button>`,
  `            <h2 class="text-xl font-semibold mb-2 text-amber-400">{t('constellation.observer.webglUnavailable')}</h2>\n            <div class="flex flex-wrap justify-center gap-2">\n              <Button\n                variant="outline"\n                size="sm"\n                on:click={chooseAnotherObserver}\n                className="text-white border-white/30 hover:bg-white/10"\n              >\n                {t('constellation.observer.chooseAnother')}\n              </Button>\n              <Button\n                variant="outline"\n                size="sm"\n                on:click={returnToSol}\n                className="text-white border-white/30 hover:bg-white/10"\n              >\n                {t('constellation.observer.returnToSol')}\n              </Button>\n            </div>`,
);

for (const [path, before, after] of [
  [
    "src/i18n/en.ts",
    `    "constellation.observer.returnToSol": "Return to Earth/Sol",`,
    `    "constellation.observer.returnToSol": "Return to Earth/Sol",\n    "constellation.observer.chooseAnother": "Choose another observer",`,
  ],
  [
    "src/i18n/zh.ts",
    `    "constellation.observer.returnToSol": "返回地球／太阳",`,
    `    "constellation.observer.returnToSol": "返回地球／太阳",\n    "constellation.observer.chooseAnother": "选择其他观测点",`,
  ],
  [
    "src/i18n/ja.ts",
    `    "constellation.observer.returnToSol": "地球／太陽へ戻る",`,
    `    "constellation.observer.returnToSol": "地球／太陽へ戻る",\n    "constellation.observer.chooseAnother": "別の観測地点を選ぶ",`,
  ],
]) {
  replaceOnce(path, before, after);
}

console.log("Applied HPA-564 implementation");
