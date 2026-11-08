<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { CelestialBodyData } from "../types/game";
    import { ComparisonSphereRenderer } from "../lib/comparison/ComparisonSphereRenderer";
    import {
        getAllBodiesFromAllSystems,
        searchBodies,
        calculateSizeRatios,
        formatSizeRatio,
        COMPARISON_ATTRIBUTES,
        type SelectableBody,
    } from "../utils/comparisonUtils";
    import Modal from "@/components/ui/Modal.svelte";

    export let isOpen: boolean = false;
    export let bodies: CelestialBodyData[] = [];
    export let onClose: () => void;
    export let onRemoveBody: (bodyId: string) => void;
    export let onAddBody: (body: CelestialBodyData) => void;
    export let lang: string = "en";
    export let translations: Record<string, string> = {};

    // Translation function
    const t = (key: string) => translations[key] || key;

    // Get translated name for a body
    const getTranslatedName = (body: CelestialBodyData) => {
        const translationKey = `planet.${body.id}.name`;
        return t(translationKey) !== translationKey ? t(translationKey) : body.name;
    };

    // State
    let sphereContainer: HTMLDivElement;
    let sphereRenderer: ComparisonSphereRenderer | null = null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let searchQuery = "";
    let showBodySelector = false;
    let isExporting = false;
    let exportError: string | null = null;

    // All available bodies
    let allBodies: SelectableBody[] = [];
    $: filteredBodies = searchBodies(allBodies, searchQuery).filter(
        ({ body }) => !bodies.find((b) => b.id === body.id)
    );

    // Size ratios for table
    $: sizeRatios = calculateSizeRatios(bodies);

    function handleShellEscape(): boolean {
        if (!showBodySelector) return false;
        showBodySelector = false;
        searchQuery = "";
        return true;
    }

    // Body selection
    const handleSelectBody = (selectableBody: SelectableBody) => {
        onAddBody(selectableBody.body);
        showBodySelector = false;
        searchQuery = "";
    };

    // Export as PNG
    const handleExport = async () => {
        if (!sphereRenderer || bodies.length === 0) return;

        isExporting = true;
        exportError = null;

        try {
            // Get canvas data URL
            const dataUrl = sphereRenderer.exportAsPNG();

            // Create download link
            const link = document.createElement("a");
            const bodyNames = bodies.map((b) => b.name.toLowerCase()).join("-");
            link.download = `comparison-${bodyNames}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error("Failed to export comparison:", error);
            exportError = error instanceof Error ? error.message : "Failed to export image. Please try again.";
            // Clear error after 5 seconds
            setTimeout(() => {
                exportError = null;
            }, 5000);
        } finally {
            isExporting = false;
        }
    };

    // Initialize on mount
    onMount(() => {
        allBodies = getAllBodiesFromAllSystems();
    });

    const disposeSphereRenderer = () => {
        if (sphereRenderer) {
            sphereRenderer.dispose();
            sphereRenderer = null;
        }
    };

    // Update renderer when bodies change
    $: if (sphereRenderer && bodies.length > 0) {
        sphereRenderer.updateBodies(bodies);
    }

    $: if ((!sphereContainer || bodies.length < 2) && sphereRenderer) {
        disposeSphereRenderer();
    }

    // Initialize/destroy renderer based on open state
    $: if (isOpen && sphereContainer && !sphereRenderer && !initTimer && bodies.length >= 2) {
        // Small delay to ensure container is rendered
        initTimer = setTimeout(() => {
            if (!isOpen || !sphereContainer || sphereRenderer) return;
            sphereRenderer = new ComparisonSphereRenderer(sphereContainer);
            if (bodies.length > 0) {
                sphereRenderer.updateBodies(bodies);
            }
            sphereRenderer.startAnimation();
            initTimer = null;
        }, 100);
    }

    $: if (!isOpen && initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
    }

    onDestroy(() => {
        if (initTimer) {
            clearTimeout(initTimer);
            initTimer = null;
        }
        disposeSphereRenderer();
    });

    // Cleanup renderer when modal closes
    $: if (!isOpen && sphereRenderer) {
        disposeSphereRenderer();
    }
</script>

{#if isOpen}
    <Modal
        {isOpen}
        {onClose}
        onEscape={handleShellEscape}
        closeLabel={t("action.close")}
        ariaLabelledby="comparison-title"
        maxWidth="1000px"
    >
        <svelte:fragment slot="header">
            <div class="modal-header">
                <h2 id="comparison-title" class="comparison-title">{t("comparison.title")}</h2>
                <button
                    class="ui-btn ui-btn--sm export-btn"
                    on:click={handleExport}
                    disabled={isExporting || bodies.length < 2}
                    type="button"
                >
                    {#if isExporting}
                        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" />
                        </svg>
                    {:else}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    {/if}
                    {t("comparison.export")}
                </button>
            </div>
        </svelte:fragment>

        {#if exportError}
            <div class="export-error" role="alert">{exportError}</div>
        {/if}

        <div class="body-badges">
            {#each bodies as body}
                <div class="ui-chip body-badge">
                    <span class="badge-color" style="background-color: {body.material.color};"></span>
                    <span>{getTranslatedName(body)}</span>
                    <button
                        class="ui-chip-x remove-btn"
                        on:click={() => onRemoveBody(body.id)}
                        aria-label={`Remove ${getTranslatedName(body)} from comparison`}
                        type="button"
                    >✕</button>
                </div>
            {/each}

            {#if bodies.length < 4}
                <button
                    class="ui-btn ui-btn--sm add-body-btn"
                    on:click={() => (showBodySelector = !showBodySelector)}
                    type="button"
                >
                    + {t("comparison.addBody")}
                </button>
            {/if}
        </div>

        {#if showBodySelector}
            <div class="body-selector">
                <input
                    type="text"
                    class="search-input"
                    placeholder={t("comparison.searchPlaceholder")}
                    bind:value={searchQuery}
                />
                <div class="body-list">
                    {#each filteredBodies.slice(0, 20) as { body, systemName, systemId }}
                        <button
                            class="body-option"
                            on:click={() => handleSelectBody({ body, systemName, systemId })}
                            type="button"
                        >
                            <span class="body-color" style="background-color: {body.material.color};"></span>
                            <span class="body-info">
                                <span class="body-name">{getTranslatedName(body)}</span>
                                <span class="body-system">{systemName}</span>
                            </span>
                            <span class="body-type">{body.type}</span>
                        </button>
                    {/each}
                    {#if filteredBodies.length === 0}
                        <div class="no-results">{t("comparison.noResults")}</div>
                    {/if}
                </div>
            </div>
        {/if}

        {#if bodies.length >= 2}
            <section class="comparison-section">
                <h3 class="ui-caption section-title">{t("comparison.sizeComparison")}</h3>
                <div class="sphere-container" bind:this={sphereContainer}></div>
            </section>

            <section class="comparison-section">
                <h3 class="ui-caption section-title">{t("comparison.attributes")}</h3>
                <div class="table-container">
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th class="attribute-header">{t("comparison.attribute")}</th>
                                {#each bodies as body}
                                    <th>
                                        <span class="th-swatch" style="background-color: {body.material.color};"></span>
                                        {getTranslatedName(body)}
                                    </th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each COMPARISON_ATTRIBUTES as attr}
                                <tr>
                                    <td class="attribute-label">{t(attr.labelKey)}</td>
                                    {#each bodies as body, i}
                                        <td>
                                            {#if attr.key === "sizeRatio"}
                                                {formatSizeRatio(sizeRatios[i])}
                                            {:else}
                                                {attr.getValue(body)}
                                            {/if}
                                        </td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </section>
        {:else}
            <div class="empty-state">
                <p>{t("comparison.selectAtLeast2")}</p>
                <p class="hint">{t("comparison.hint")}</p>
            </div>
        {/if}

        <div class="modal-footer">
            <p>{t("comparison.footerText")}</p>
        </div>
    </Modal>
{/if}

<style>
    .modal-header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
    }

    .comparison-title {
        margin: 0;
        font-family: var(--font-display);
        font-size: 30px;
        font-weight: 600;
        line-height: 1;
        color: var(--color-text);
    }

    .spinner {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .export-error {
        margin-bottom: 14px;
        padding: 10px 12px;
        border: 1px solid var(--color-danger);
        border-radius: var(--radius-control);
        color: var(--color-danger);
        font-size: 13px;
    }

    .body-badges {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
    }
    .body-badge {
        color: var(--color-text);
        border-color: var(--color-line-strong);
    }
    .badge-color,
    .body-color,
    .th-swatch {
        display: inline-block;
        flex: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }
    .remove-btn {
        color: var(--color-text-muted);
    }
    .remove-btn:hover {
        color: var(--color-danger);
    }

    .body-selector {
        margin-bottom: 18px;
        padding: 12px;
        border: 1px solid var(--color-line-strong);
        border-radius: var(--radius-panel);
        background: var(--color-bg);
    }
    .search-input {
        width: 100%;
        height: 36px;
        margin-bottom: 10px;
        padding: 0 10px;
        border: 1px solid var(--color-line-strong);
        border-radius: var(--radius-control);
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-ui);
        font-size: 13px;
    }
    .search-input:focus {
        outline: none;
        border-color: var(--color-accent);
    }
    .body-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 240px;
        overflow-y: auto;
    }
    .body-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: none;
        border-radius: var(--radius-control);
        background: transparent;
        color: var(--color-text);
        cursor: pointer;
        text-align: left;
    }
    .body-option:hover {
        background: var(--color-surface-2);
    }
    .body-info {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-width: 0;
    }
    .body-name {
        font-family: var(--font-display);
        font-size: 17px;
        font-weight: 600;
    }
    .body-system,
    .body-type {
        font-size: 11px;
        color: var(--color-text-muted);
    }
    .body-type {
        text-transform: capitalize;
    }
    .no-results {
        padding: 16px;
        text-align: center;
        font-size: 13px;
        color: var(--color-text-muted);
    }

    .comparison-section {
        margin-bottom: 22px;
    }
    .section-title {
        margin: 0 0 10px;
    }
    .sphere-container {
        width: 100%;
        height: 300px;
        border: 1px solid var(--color-line);
        border-radius: var(--radius-panel);
        background: var(--color-bg-deep);
        overflow: hidden;
    }

    .table-container {
        overflow-x: auto;
        border-top: 1px solid var(--color-line-strong);
    }
    .comparison-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }
    .comparison-table th,
    .comparison-table td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid var(--color-line);
        white-space: nowrap;
    }
    .comparison-table th {
        font-family: var(--font-display);
        font-size: 17px;
        font-weight: 600;
        color: var(--color-text);
    }
    .comparison-table th .th-swatch {
        margin-right: 6px;
    }
    .comparison-table th.attribute-header,
    .attribute-label {
        font-family: var(--font-ui);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--color-text-muted);
    }
    .comparison-table tbody tr:hover {
        background: var(--color-surface-2);
    }

    .empty-state {
        padding: 48px 16px;
        text-align: center;
        border: 1px dashed var(--color-line-strong);
        border-radius: var(--radius-panel);
    }
    .empty-state p {
        margin: 0;
        font-family: var(--font-display);
        font-size: 20px;
        color: var(--color-text);
    }
    .empty-state .hint {
        margin-top: 6px;
        font-family: var(--font-ui);
        font-size: 13px;
        color: var(--color-text-muted);
    }

    .modal-footer {
        margin-top: 8px;
        text-align: center;
    }
    .modal-footer p {
        margin: 0;
        font-size: 12px;
        color: var(--color-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
        .spinner {
            animation: none;
        }
    }
</style>
