import { useState, useEffect, useCallback } from "react";

export interface LoadingState {
    isLoading: boolean;
    progress: number;
    stage: string;
    error?: string;
}

export interface LoadingStageConfig {
    name: string;
    weight: number; // Percentage of total loading time
    duration?: number; // Minimum duration in ms
}

export function useLoadingProgress(stages: LoadingStageConfig[]) {
    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoading: true,
        progress: 0,
        stage: stages[0]?.name || "Loading...",
    });

    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [stageStartTime, setStageStartTime] = useState(Date.now());

    // Calculate total weight for normalization
    const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);

    // Progress to the next stage
    const nextStage = useCallback(() => {
        if (currentStageIndex < stages.length - 1) {
            const nextIndex = currentStageIndex + 1;
            setCurrentStageIndex(nextIndex);
            setStageStartTime(Date.now());

            // Calculate cumulative progress up to this stage
            const cumulativeWeight = stages
                .slice(0, nextIndex)
                .reduce((sum, stage) => sum + stage.weight, 0);

            const baseProgress = (cumulativeWeight / totalWeight) * 100;

            setLoadingState((prev) => ({
                ...prev,
                stage: stages[nextIndex].name,
                progress: Math.min(baseProgress, 100),
            }));
        }
    }, [currentStageIndex, stages, totalWeight]);

    // Update progress within current stage
    const updateStageProgress = useCallback(
        (stageProgress: number) => {
            const currentStage = stages[currentStageIndex];
            if (!currentStage) return;

            // Calculate base progress from completed stages
            const completedWeight = stages
                .slice(0, currentStageIndex)
                .reduce((sum, stage) => sum + stage.weight, 0);

            const baseProgress = (completedWeight / totalWeight) * 100;
            const stageContribution = (currentStage.weight / totalWeight) * 100;
            const currentProgress =
                baseProgress + stageContribution * (stageProgress / 100);

            setLoadingState((prev) => ({
                ...prev,
                progress: Math.min(
                    Math.max(currentProgress, prev.progress),
                    100,
                ),
            }));
        },
        [currentStageIndex, stages, totalWeight],
    );

    // Complete loading
    const completeLoading = useCallback(() => {
        setLoadingState((prev) => ({
            ...prev,
            isLoading: false,
            progress: 100,
            stage: "Complete",
        }));
    }, []);

    // Set error state
    const setError = useCallback((error: string) => {
        setLoadingState((prev) => ({
            ...prev,
            error,
            isLoading: false,
        }));
    }, []);

    // Auto-progress stages with minimum duration
    useEffect(() => {
        const currentStage = stages[currentStageIndex];
        if (!currentStage || !loadingState.isLoading) return;

        if (currentStage.duration) {
            const elapsed = Date.now() - stageStartTime;
            if (elapsed >= currentStage.duration) {
                if (currentStageIndex === stages.length - 1) {
                    completeLoading();
                } else {
                    nextStage();
                }
            }
        }
    }, [
        currentStageIndex,
        stageStartTime,
        loadingState.isLoading,
        stages,
        nextStage,
        completeLoading,
    ]);

    return {
        loadingState,
        nextStage,
        updateStageProgress,
        completeLoading,
        setError,
        currentStage: stages[currentStageIndex],
        currentStageIndex,
    };
}

// Preset loading configurations for common scenarios
export const LOADING_STAGES = {
    SOLAR_SYSTEM: [
        { name: "Initializing 3D Engine...", weight: 15, duration: 500 },
        { name: "Loading Celestial Bodies...", weight: 30, duration: 800 },
        { name: "Creating Starfield...", weight: 20, duration: 600 },
        { name: "Setting up Physics...", weight: 15, duration: 400 },
        { name: "Optimizing Performance...", weight: 10, duration: 300 },
        { name: "Preparing Experience...", weight: 10, duration: 400 },
    ],

    PLANET_INFO: [
        { name: "Loading Planet Data...", weight: 40, duration: 300 },
        { name: "Fetching Images...", weight: 40, duration: 500 },
        { name: "Preparing Content...", weight: 20, duration: 200 },
    ],

    AI_CHATBOT: [
        { name: "Connecting to AI...", weight: 30, duration: 400 },
        { name: "Loading Context...", weight: 40, duration: 300 },
        { name: "Initializing Chat...", weight: 30, duration: 300 },
    ],
};

// Hook for simulating realistic loading with variable timing
export function useSimulatedLoading(
    stages: LoadingStageConfig[],
    autoComplete: boolean = true,
) {
    const loading = useLoadingProgress(stages);
    const [simulationActive, setSimulationActive] = useState(autoComplete);
    const [, setCurrentProgress] = useState(0);

    useEffect(() => {
        if (!simulationActive || !loading.loadingState.isLoading) return;

        const currentStage = loading.currentStage;
        if (!currentStage) return;

        // Simulate gradual progress within each stage
        const progressInterval = setInterval(
            () => {
                setCurrentProgress((prev) => {
                    const increment = Math.random() * 15 + 5; // 5-20% increments
                    const newProgress = Math.min(100, prev + increment);

                    loading.updateStageProgress(newProgress);

                    // Move to next stage when current stage reaches 100%
                    if (newProgress >= 100) {
                        if (loading.currentStageIndex === stages.length - 1) {
                            loading.completeLoading();
                            return 100;
                        } else {
                            loading.nextStage();
                            return 0; // Reset for next stage
                        }
                    }

                    return newProgress;
                });
            },
            100 + Math.random() * 200,
        ); // Vary timing for realism

        return () => clearInterval(progressInterval);
    }, [loading, simulationActive, stages.length]);

    const startSimulation = useCallback(() => {
        setSimulationActive(true);
        setCurrentProgress(0);
    }, []);

    const stopSimulation = useCallback(() => {
        setSimulationActive(false);
    }, []);

    return {
        ...loading,
        startSimulation,
        stopSimulation,
        isSimulating: simulationActive,
    };
}
