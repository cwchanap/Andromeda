import type { CelestialBodyData } from "../types/game";

export interface AIMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface AIServiceConfig {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

/**
 * AI Service for handling educational conversations about celestial bodies
 * This is a mock implementation that can be replaced with actual AI service integration
 */
export class AIService {
    private config: AIServiceConfig;

    constructor(config: AIServiceConfig = {}) {
        this.config = {
            maxTokens: 500,
            temperature: 0.7,
            model: "gpt-3.5-turbo",
            ...config,
        };
    }

    /**
     * Generate a context-aware system prompt based on the current celestial body
     */
    private generateSystemPrompt(context?: CelestialBodyData): string {
        if (!context) {
            return `You are an educational AI assistant specializing in space exploration and astronomy. 
      Provide accurate, engaging, and age-appropriate information about celestial bodies, space science, 
      and astronomy. Keep responses informative but concise, and encourage curiosity about space exploration.`;
        }

        return `You are an educational AI assistant currently helping a user learn about ${context.name}. 
    
    Context about ${context.name}:
    - Type: ${context.type}
    - Description: ${context.description}
    - Diameter: ${context.keyFacts.diameter}
    - Distance from Sun: ${context.keyFacts.distanceFromSun}
    - Orbital Period: ${context.keyFacts.orbitalPeriod}
    - Composition: ${context.keyFacts.composition.join(", ")}
    - Temperature: ${context.keyFacts.temperature}
    ${context.keyFacts.moons ? `- Number of moons: ${context.keyFacts.moons}` : ""}
    
    Provide accurate, engaging, and educational information about ${context.name} and related space topics. 
    Feel free to reference the specific facts about ${context.name} in your responses. Keep answers 
    informative but concise, and encourage further exploration and learning.`;
    }

    /**
     * Generate a response from the AI service
     * In a real implementation, this would call an actual AI API
     */
    async generateResponse(
        message: string,
        context?: CelestialBodyData,
    ): Promise<string> {
        // Mock implementation - replace with actual AI service call
        await this.simulateDelay();

        return this.generateMockResponse(message, context);
    }

    /**
     * Simulate API delay for realistic UX
     */
    private async simulateDelay(): Promise<void> {
        const delay = 800 + Math.random() * 1500; // 0.8-2.3 seconds
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    /**
     * Generate mock responses based on message content and context
     * This will be replaced with actual AI integration
     */
    private generateMockResponse(
        message: string,
        context?: CelestialBodyData,
    ): string {
        const lowerMessage = message.toLowerCase();

        if (!context) {
            // General space questions without specific context
            if (
                lowerMessage.includes("solar system") ||
                lowerMessage.includes("planets")
            ) {
                return "Our solar system consists of the Sun and eight planets, each with unique characteristics! The inner planets (Mercury, Venus, Earth, Mars) are rocky, while the outer planets (Jupiter, Saturn, Uranus, Neptune) are gas giants. Would you like to explore a specific planet to learn more about its fascinating features?";
            }

            if (
                lowerMessage.includes("space exploration") ||
                lowerMessage.includes("astronaut")
            ) {
                return "Space exploration has led to incredible discoveries about our universe! From the first human spaceflight to landing on the Moon, and now exploring Mars with rovers, we continue to push the boundaries of human knowledge. Each mission teaches us more about the cosmos and our place in it.";
            }

            return "That's a great question about space! Our universe is full of fascinating celestial bodies and phenomena. Try selecting a specific planet or the Sun to learn about its unique characteristics, or ask me about any aspect of space exploration you're curious about!";
        }

        // Context-specific responses
        const responses = this.getContextualResponses(context, lowerMessage);
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Get contextual responses based on the celestial body and message content
     */
    private getContextualResponses(
        context: CelestialBodyData,
        message: string,
    ): string[] {
        const name = context.name;
        const type = context.type;

        // Question-type specific responses
        if (message.includes("why") || message.includes("how")) {
            return [
                `${name} is fascinating because of its unique ${type === "star" ? "stellar" : "planetary"} characteristics. ${this.getRandomFact(context)} The formation and evolution of ${name} involves complex astrophysical processes that continue to amaze scientists today.`,
                `Great question about ${name}! This ${type} formed through ${type === "star" ? "stellar nucleosynthesis and gravitational collapse" : "planetary accretion in the early solar system"}. ${this.getRandomFact(context)}`,
            ];
        }

        if (message.includes("composition") || message.includes("made of")) {
            return [
                `${name} is primarily composed of ${context.keyFacts.composition.join(", ")}. This unique composition gives ${name} its distinctive properties and ${type === "planet" ? "surface conditions" : "stellar characteristics"}.`,
                `The composition of ${name} includes ${context.keyFacts.composition.join(", ")}, which ${type === "star" ? "enables nuclear fusion reactions in its core" : "affects its density, atmosphere, and overall characteristics"}. This makes ${name} particularly interesting for ${type === "star" ? "stellar physics" : "planetary science"} studies.`,
            ];
        }

        if (
            message.includes("temperature") ||
            message.includes("hot") ||
            message.includes("cold")
        ) {
            return [
                `${name} has a temperature of ${context.keyFacts.temperature}. This ${type === "star" ? "surface temperature is a result of nuclear fusion in its core" : `temperature is influenced by its distance from the Sun (${context.keyFacts.distanceFromSun}) and atmospheric composition`}.`,
                `The temperature on ${name} is ${context.keyFacts.temperature}. ${type === "planet" ? `Being ${context.keyFacts.distanceFromSun} from the Sun significantly affects its climate and surface conditions.` : "This stellar temperature enables the nuclear processes that power our solar system."}`,
            ];
        }

        if (
            message.includes("size") ||
            message.includes("big") ||
            message.includes("diameter")
        ) {
            return [
                `${name} has a diameter of ${context.keyFacts.diameter}. ${this.getSizeComparison(context)} This size significantly influences its ${type === "star" ? "gravitational pull and energy output" : "gravity, atmosphere, and overall characteristics"}.`,
                `With a diameter of ${context.keyFacts.diameter}, ${name} is ${this.getSizeDescription(context)}. This size affects everything from its ${type === "star" ? "stellar classification" : "orbital dynamics"} to its ${type === "star" ? "energy production" : "potential for having moons"}.`,
            ];
        }

        if (message.includes("moon") || message.includes("satellite")) {
            if (context.keyFacts.moons) {
                return [
                    `${name} has ${context.keyFacts.moons} moon${context.keyFacts.moons > 1 ? "s" : ""}! These natural satellites formed through various processes and play important roles in ${name}'s system dynamics. Each moon has its own unique characteristics and scientific significance.`,
                    `The ${context.keyFacts.moons} moon${context.keyFacts.moons > 1 ? "s" : ""} of ${name} ${context.keyFacts.moons === 1 ? "makes" : "make"} this planet particularly interesting. These moons can affect tidal forces, orbital stability, and provide fascinating targets for space exploration missions.`,
                ];
            } else {
                return [
                    `${name} doesn't have any moons, which makes it unique among the planets in our solar system. This absence of natural satellites affects its tidal forces and orbital dynamics in interesting ways.`,
                    `Unlike some other planets, ${name} has no moons. This characteristic influences its rotational stability and the way it interacts gravitationally with other bodies in the solar system.`,
                ];
            }
        }

        // General responses about the celestial body
        return [
            `${name} is a remarkable ${type} with fascinating characteristics! ${this.getRandomFact(context)} Its ${context.keyFacts.orbitalPeriod} orbital period means ${type === "planet" ? `a year on ${name} is quite different from Earth years` : "it governs the rhythm of our entire solar system"}.`,
            `Let me tell you about ${name}! This ${type} has a diameter of ${context.keyFacts.diameter} and is composed mainly of ${context.keyFacts.composition.join(", ")}. ${this.getRandomFact(context)}`,
            `${name} is absolutely fascinating! Located ${context.keyFacts.distanceFromSun} from the Sun, it experiences ${type === "star" ? "internal nuclear processes" : "unique environmental conditions"}. ${this.getTemperatureInsight(context)}`,
        ];
    }

    /**
     * Get a random interesting fact about the celestial body
     */
    private getRandomFact(context: CelestialBodyData): string {
        const facts = [
            `Its surface temperature of ${context.keyFacts.temperature} creates ${context.type === "star" ? "the perfect conditions for nuclear fusion" : "unique environmental conditions"}.`,
            `With its ${context.keyFacts.orbitalPeriod} orbital period, time passes quite differently there compared to Earth.`,
            `The composition of ${context.keyFacts.composition.join(" and ")} gives ${context.name} its distinctive properties.`,
            `Being ${context.keyFacts.distanceFromSun} from the Sun significantly influences its characteristics.`,
        ];

        return facts[Math.floor(Math.random() * facts.length)];
    }

    /**
     * Get size comparison context
     */
    private getSizeComparison(context: CelestialBodyData): string {
        if (context.type === "star") {
            return `This massive size allows it to sustain nuclear fusion and provides the energy that powers our entire solar system.`;
        }

        // Simple size categorization for planets
        const diameter = parseFloat(
            context.keyFacts.diameter.replace(/[^\d.]/g, ""),
        );
        if (diameter > 50000) {
            return `This makes it one of the larger planets in our solar system.`;
        } else if (diameter > 12000) {
            return `This gives it a substantial presence in our solar system.`;
        } else {
            return `This makes it one of the smaller celestial bodies in our solar system.`;
        }
    }

    /**
     * Get size description
     */
    private getSizeDescription(context: CelestialBodyData): string {
        if (context.type === "star") {
            return `truly massive, containing over 99% of our solar system's mass`;
        }

        return `an impressive celestial body in our solar system`;
    }

    /**
     * Get temperature-related insight
     */
    private getTemperatureInsight(context: CelestialBodyData): string {
        if (context.type === "star") {
            return `The extreme temperatures enable the nuclear processes that create light and heat for all planets.`;
        }

        return `These temperature conditions make ${context.name} a ${context.keyFacts.temperature.includes("-") || context.keyFacts.temperature.includes("cold") ? "frigid" : "warm"} world with unique characteristics.`;
    }
}

// Export a default instance
export const aiService = new AIService();

// Export configuration helper
export function configureAIService(config: AIServiceConfig): void {
    // This would update the global AI service configuration
    console.log("AI Service configured with:", config);
}
