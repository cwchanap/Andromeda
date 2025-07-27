<script lang="ts">
    import { onMount } from "svelte";
    import type { StarSystemData } from "../types/universe";
    import { UniverseManager } from "../lib/universe/UniverseManager";
    import { gameActions } from "../stores/gameStore";
    import Card from "./ui/Card.svelte";
    import CardContent from "./ui/CardContent.svelte";
    import CardHeader from "./ui/CardHeader.svelte";
    import CardTitle from "./ui/CardTitle.svelte";
    import Button from "./ui/Button.svelte";

    export let universeManager: UniverseManager;
    export let onSystemSelect: (systemId: string) => Promise<void> = async () => {};
    export let onClose: () => void = () => {};

    let availableSystems: StarSystemData[] = [];
    let selectedSystemId: string = "";
    let isTransitioning: boolean = false;

    onMount(() => {
        loadAvailableSystems();
        selectedSystemId = universeManager.getCurrentSystem()?.id || "";
    });

    function loadAvailableSystems() {
        availableSystems = universeManager.getAllSystems();
    }

    async function handleSystemSelect(systemId: string) {
        if (isTransitioning || systemId === selectedSystemId) return;

        isTransitioning = true;
        
        try {
            // Update game state to show transition
            gameActions.updateGameState({
                universe: {
                    currentSystemId: selectedSystemId,
                    availableSystems: availableSystems.map(s => s.id),
                    systemTransition: {
                        isTransitioning: true,
                        fromSystemId: selectedSystemId,
                        toSystemId: systemId,
                        progress: 0
                    }
                }
            });

            // Switch to the new system
            const success = await universeManager.switchToSystem(systemId);
            
            if (success) {
                selectedSystemId = systemId;
                await onSystemSelect(systemId);
                
                // Complete transition
                gameActions.updateGameState({
                    universe: {
                        currentSystemId: systemId,
                        availableSystems: availableSystems.map(s => s.id),
                        systemTransition: undefined
                    }
                });
                
                onClose();
            } else {
                console.error("Failed to switch to system:", systemId);
            }
        } catch (error) {
            console.error("Error during system transition:", error);
        } finally {
            isTransitioning = false;
        }
    }

    function getSystemPreview(system: StarSystemData): string {
        const bodyCount = system.celestialBodies.length;
        const bodyTypes = new Set(system.celestialBodies.map(b => b.type));
        const typeList = Array.from(bodyTypes).join(", ");
        
        return `${bodyCount} celestial bodies (${typeList})`;
    }

    function getSystemDistance(system: StarSystemData): string {
        return system.metadata?.distance || "Unknown distance";
    }

    function isSystemLocked(system: StarSystemData): boolean {
        // For now, no systems are locked. This can be extended with unlock conditions
        return false;
    }
</script>

<div class="system-selector-overlay" role="dialog" aria-labelledby="system-selector-title">
    <div class="system-selector-container">
        <div class="header">
            <h2 id="system-selector-title">Select Star System</h2>
            <Button variant="ghost" on:click={onClose} aria-label="Close system selector">
                ✕
            </Button>
        </div>

        <div class="systems-grid">
            {#each availableSystems as system (system.id)}
                <Card class="system-card {system.id === selectedSystemId ? 'selected' : ''} {isSystemLocked(system) ? 'locked' : ''}">
                    <CardHeader>
                        <CardTitle>{system.name}</CardTitle>
                        <div class="system-type">{system.systemType} system</div>
                    </CardHeader>
                    <CardContent>
                        <div class="system-info">
                            <p class="description">{system.description}</p>
                            <div class="stats">
                                <div class="stat">
                                    <strong>Bodies:</strong> {getSystemPreview(system)}
                                </div>
                                <div class="stat">
                                    <strong>Distance:</strong> {getSystemDistance(system)}
                                </div>
                                {#if system.metadata?.constellation}
                                    <div class="stat">
                                        <strong>Constellation:</strong> {system.metadata.constellation}
                                    </div>
                                {/if}
                            </div>
                        </div>
                        
                        <div class="actions">
                            {#if system.id === selectedSystemId}
                                <Button variant="outline" disabled>
                                    Current System
                                </Button>
                            {:else if isSystemLocked(system)}
                                <Button variant="ghost" disabled>
                                    🔒 Locked
                                </Button>
                            {:else}
                                <Button 
                                    variant="default" 
                                    on:click={() => handleSystemSelect(system.id)}
                                    disabled={isTransitioning}
                                >
                                    {isTransitioning ? "Transitioning..." : "Explore"}
                                </Button>
                            {/if}
                        </div>
                    </CardContent>
                </Card>
            {/each}
        </div>

        {#if isTransitioning}
            <div class="transition-overlay">
                <div class="transition-content">
                    <div class="loading-spinner"></div>
                    <p>Transitioning to new star system...</p>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .system-selector-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 2rem;
    }

    .system-selector-container {
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 12px;
        max-width: 1200px;
        max-height: 90vh;
        width: 100%;
        overflow-y: auto;
        position: relative;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        border-bottom: 1px solid var(--border);
        background: var(--muted);
        border-radius: 12px 12px 0 0;
    }

    .header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--foreground);
    }

    .systems-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
        padding: 2rem;
    }

    :global(.system-card) {
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
        border: 2px solid transparent;
    }

    :global(.system-card:hover) {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    :global(.system-card.selected) {
        border-color: var(--primary);
        background: var(--primary-foreground);
    }

    :global(.system-card.locked) {
        opacity: 0.6;
        cursor: not-allowed;
    }

    :global(.system-card.locked:hover) {
        transform: none;
        box-shadow: none;
    }

    .system-type {
        font-size: 0.875rem;
        color: var(--muted-foreground);
        text-transform: capitalize;
    }

    .system-info {
        margin-bottom: 1rem;
    }

    .description {
        font-size: 0.925rem;
        color: var(--foreground);
        margin-bottom: 1rem;
        line-height: 1.5;
    }

    .stats {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat {
        font-size: 0.875rem;
        color: var(--muted-foreground);
    }

    .stat strong {
        color: var(--foreground);
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
    }

    .transition-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
    }

    .transition-content {
        text-align: center;
        color: white;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
        .system-selector-overlay {
            padding: 1rem;
        }

        .systems-grid {
            grid-template-columns: 1fr;
            padding: 1rem;
        }

        .header {
            padding: 1rem;
        }
    }
</style>
