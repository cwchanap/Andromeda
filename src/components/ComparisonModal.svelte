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

    // Generate star field once (not per render)
    const BACKGROUND_STARS = Array.from({ length: 75 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 4,
        opacity: 0.2 + Math.random() * 0.8,
    }));

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

    // Keyboard handlers
    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            if (showBodySelector) {
                showBodySelector = false;
            } else {
                onClose();
            }
        }
    };

    const handleOverlayClick = (event: MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

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

    // Update renderer when bodies change
    $: if (sphereRenderer && bodies.length > 0) {
        sphereRenderer.updateBodies(bodies);
    }

    // Initialize/destroy renderer based on open state
    $: if (isOpen && sphereContainer && !sphereRenderer && !initTimer) {
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
        if (sphereRenderer) {
            sphereRenderer.dispose();
            sphereRenderer = null;
        }
    });

    // Cleanup renderer when modal closes
    $: if (!isOpen && sphereRenderer) {
        sphereRenderer.dispose();
        sphereRenderer = null;
    }
</script>

{#if isOpen}
    <div
        class="modal-overlay"
        on:click={handleOverlayClick}
        on:keydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-title"
        tabindex="-1"
    >
        <div class="modal-container">
            <div class="modal-content">
                <!-- Star field background -->
                <div class="star-field">
                    {#each BACKGROUND_STARS as star, i}
                        <div
                            class="star"
                            style="
                                left: {star.left}%;
                                top: {star.top}%;
                                animation-delay: {star.delay}s;
                                opacity: {star.opacity};
                            "
                        ></div>
                    {/each}
                </div>

                <!-- Close button -->
                <button
                    class="modal-close"
                    on:click={onClose}
                    aria-label={t("action.close")}
                    type="button"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <!-- Header -->
                <div class="modal-header">
                    <div class="header-content">
                        <svg
                            class="header-icon"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <h2 id="comparison-title">{t("comparison.title")}</h2>
                    </div>
                    <button
                        class="export-btn"
                        on:click={handleExport}
                        disabled={isExporting || bodies.length < 2}
                        type="button"
                    >
                        {#if isExporting}
                            <svg
                                class="spinner"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="3"
                                    fill="none"
                                    stroke-dasharray="31.4 31.4"
                                />
                            </svg>
                        {:else}
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                                ></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        {/if}
                        {t("comparison.export")}
                    </button>
                </div>

                <!-- Export error message -->
                {#if exportError}
                    <div class="export-error" role="alert">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{exportError}</span>
                    </div>
                {/if}

                <!-- Body selection badges -->
                <div class="body-badges">
                    {#each bodies as body}
                        <div
                            class="body-badge"
                            style="border-color: {body.material.color};"
                        >
                            <div
                                class="badge-color"
                                style="background-color: {body.material.color};"
                            ></div>
                            <span>{getTranslatedName(body)}</span>
                            <button
                                class="remove-btn"
                                on:click={() => onRemoveBody(body.id)}
                                aria-label={`Remove ${getTranslatedName(body)} from comparison`}
                                type="button"
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    {/each}

                    {#if bodies.length < 4}
                        <button
                            class="add-body-btn"
                            on:click={() => (showBodySelector = !showBodySelector)}
                            type="button"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            {t("comparison.addBody")}
                        </button>
                    {/if}
                </div>

                <!-- Body selector dropdown -->
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
                                    on:click={() =>
                                        handleSelectBody({ body, systemName, systemId })}
                                    type="button"
                                >
                                    <div
                                        class="body-color"
                                        style="background-color: {body.material.color};"
                                    ></div>
                                    <div class="body-info">
                                        <span class="body-name"
                                            >{getTranslatedName(body)}</span
                                        >
                                        <span class="body-system"
                                            >{systemName}</span
                                        >
                                    </div>
                                    <span class="body-type">{body.type}</span>
                                </button>
                            {/each}
                            {#if filteredBodies.length === 0}
                                <div class="no-results">
                                    {t("comparison.noResults")}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- Main content -->
                {#if bodies.length >= 2}
                    <!-- 3D Size Comparison -->
                    <div class="comparison-section">
                        <h3>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                            {t("comparison.sizeComparison")}
                        </h3>
                        <div class="sphere-container" bind:this={sphereContainer}
                        ></div>
                    </div>

                    <!-- Comparison Table -->
                    <div class="comparison-section">
                        <h3>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    d="M3 3h18v18H3zM3 9h18M9 21V9"
                                ></path>
                            </svg>
                            {t("comparison.attributes")}
                        </h3>
                        <div class="table-container">
                            <table class="comparison-table">
                                <thead>
                                    <tr>
                                        <th class="attribute-header"
                                            >{t("comparison.attribute")}</th
                                        >
                                        {#each bodies as body}
                                            <th
                                                style="background: linear-gradient(135deg, {body
                                                    .material.color}22, {body
                                                    .material.color}11);"
                                            >
                                                {getTranslatedName(body)}
                                            </th>
                                        {/each}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each COMPARISON_ATTRIBUTES as attr}
                                        <tr>
                                            <td class="attribute-label"
                                                >{t(attr.labelKey)}</td
                                            >
                                            {#each bodies as body, i}
                                                <td>
                                                    {#if attr.key === "sizeRatio"}
                                                        {formatSizeRatio(
                                                            sizeRatios[i]
                                                        )}
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
                    </div>
                {:else}
                    <!-- Empty state -->
                    <div class="empty-state">
                        <svg
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 12h8M12 8v8"></path>
                        </svg>
                        <p>{t("comparison.selectAtLeast2")}</p>
                        <p class="hint">{t("comparison.hint")}</p>
                    </div>
                {/if}

                <!-- Footer -->
                <div class="modal-footer">
                    <div class="cosmic-divider"></div>
                    <p>{t("comparison.footerText")}</p>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 17, 0.95);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }

    .modal-container {
        position: relative;
        max-width: 1000px;
        width: 95%;
        max-height: 90vh;
        overflow: hidden;
    }

    .modal-content {
        position: relative;
        background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.98) 0%,
            rgba(30, 41, 59, 0.95) 50%,
            rgba(15, 23, 42, 0.98) 100%
        );
        color: white;
        border: 2px solid;
        border-image: linear-gradient(45deg, #60a5fa, #ddd6fe, #3b82f6) 1;
        border-radius: 20px;
        padding: 30px;
        box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.8),
            0 0 100px rgba(96, 165, 250, 0.2);
        overflow-y: auto;
        max-height: calc(90vh - 40px);
    }

    .modal-content::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(
            90deg,
            transparent 0%,
            #60a5fa 25%,
            #ddd6fe 50%,
            #3b82f6 75%,
            transparent 100%
        );
        z-index: 1;
    }

    .star-field {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
    }

    .star {
        position: absolute;
        width: 2px;
        height: 2px;
        background: white;
        border-radius: 50%;
        animation: twinkle 4s ease-in-out infinite;
    }

    .modal-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        z-index: 10;
        transition: all 0.2s ease;
    }

    .modal-close:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.5);
        transform: scale(1.1);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        position: relative;
        z-index: 1;
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .header-icon {
        color: #60a5fa;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.75rem;
        background: linear-gradient(45deg, #60a5fa, #ddd6fe);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .export-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
    }

    .export-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        transform: translateY(-2px);
    }

    .export-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .spinner {
        animation: spin 1s linear infinite;
    }

    .export-error {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        margin-bottom: 16px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.5);
        border-radius: 8px;
        color: #fca5a5;
        font-size: 0.9rem;
        position: relative;
        z-index: 1;
        animation: slideIn 0.3s ease-out;
    }

    .export-error svg {
        flex-shrink: 0;
        color: #ef4444;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .body-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
    }

    .body-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid;
        border-radius: 12px;
        font-size: 0.9rem;
    }

    .badge-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .remove-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
    }

    .remove-btn:hover {
        color: #ef4444;
    }

    .add-body-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: rgba(16, 185, 129, 0.1);
        border: 2px dashed rgba(16, 185, 129, 0.5);
        border-radius: 12px;
        color: #10b981;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s;
    }

    .add-body-btn:hover {
        background: rgba(16, 185, 129, 0.2);
        border-color: #10b981;
    }

    .body-selector {
        position: relative;
        z-index: 5;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 20px;
    }

    .search-input {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: white;
        font-size: 0.95rem;
        margin-bottom: 10px;
    }

    .search-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }

    .search-input:focus {
        outline: none;
        border-color: #60a5fa;
    }

    .body-list {
        max-height: 200px;
        overflow-y: auto;
    }

    .body-option {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        text-align: left;
        transition: background 0.2s;
    }

    .body-option:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .body-color {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .body-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .body-name {
        font-weight: 500;
    }

    .body-system {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.5);
    }

    .body-type {
        font-size: 0.75rem;
        padding: 2px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        text-transform: uppercase;
    }

    .no-results {
        text-align: center;
        padding: 20px;
        color: rgba(255, 255, 255, 0.5);
    }

    .comparison-section {
        position: relative;
        z-index: 1;
        margin-bottom: 24px;
    }

    .comparison-section h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ddd6fe;
        font-size: 1.1rem;
        margin: 0 0 16px 0;
    }

    .sphere-container {
        width: 100%;
        height: 280px;
        background: rgba(0, 0, 17, 0.5);
        border-radius: 12px;
        overflow: hidden;
    }

    .table-container {
        overflow-x: auto;
    }

    .comparison-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }

    .comparison-table th,
    .comparison-table td {
        padding: 12px 16px;
        text-align: left;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .comparison-table th {
        background: rgba(255, 255, 255, 0.05);
        font-weight: 600;
        color: white;
    }

    .attribute-header {
        background: rgba(96, 165, 250, 0.1) !important;
    }

    .attribute-label {
        font-weight: 500;
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.02);
    }

    .comparison-table td {
        color: rgba(255, 255, 255, 0.9);
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
        position: relative;
        z-index: 1;
    }

    .empty-state svg {
        color: rgba(255, 255, 255, 0.2);
        margin-bottom: 16px;
    }

    .empty-state p {
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
        font-size: 1.1rem;
    }

    .empty-state .hint {
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.9rem;
        margin-top: 8px;
    }

    .modal-footer {
        position: relative;
        z-index: 1;
        padding-top: 16px;
    }

    .cosmic-divider {
        height: 2px;
        background: linear-gradient(
            90deg,
            transparent 0%,
            #60a5fa 25%,
            #ddd6fe 50%,
            #3b82f6 75%,
            transparent 100%
        );
        margin-bottom: 12px;
        border-radius: 1px;
    }

    .modal-footer p {
        margin: 0;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.85rem;
        font-style: italic;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes twinkle {
        0%,
        100% {
            opacity: 0.3;
        }
        50% {
            opacity: 1;
        }
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    /* Responsive */
    @media (max-width: 768px) {
        .modal-content {
            padding: 20px;
        }

        .modal-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
        }

        .modal-header h2 {
            font-size: 1.5rem;
        }

        .sphere-container {
            height: 200px;
        }

        .comparison-table {
            font-size: 0.8rem;
        }

        .comparison-table th,
        .comparison-table td {
            padding: 8px 10px;
        }
    }
</style>
