import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { aiService } from "../services/aiService";
import type { CelestialBodyData } from "../types/game";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  context?: string; // The celestial body context when the message was sent
}

interface AIChatbotProps {
  context?: CelestialBodyData | null;
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
}

interface ConversationHistory {
  messages: Message[];
  lastUpdated: Date;
}

function AIChatbot({
  context,
  isOpen,
  onClose,
  initialQuestion,
}: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Generate a unique conversation key based on context
  const conversationKey = context ? `chat-${context.id}` : "chat-general";

  // Load conversation history from localStorage
  const loadConversationHistory = useCallback((): Message[] => {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(conversationKey);
      if (stored) {
        const history: ConversationHistory = JSON.parse(stored);
        return history.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (e) {
      console.warn("Failed to load conversation history:", e);
    }
    return [];
  }, [conversationKey]);

  // Save conversation history to localStorage
  const saveConversationHistory = useCallback(
    (messages: Message[]) => {
      if (typeof window === "undefined") return;

      try {
        const history: ConversationHistory = {
          messages,
          lastUpdated: new Date(),
        };
        localStorage.setItem(conversationKey, JSON.stringify(history));
      } catch (e) {
        console.warn("Failed to save conversation history:", e);
      }
    },
    [conversationKey],
  );

  // Load conversation history when component mounts or context changes
  useEffect(() => {
    const history = loadConversationHistory();
    setMessages(history);
  }, [loadConversationHistory]);

  // Save conversation history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveConversationHistory(messages);
    }
  }, [messages, saveConversationHistory]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle initial question
  useEffect(() => {
    if (isOpen && initialQuestion && currentMessage === "") {
      setCurrentMessage(initialQuestion);
    }
  }, [isOpen, initialQuestion, currentMessage]);

  // Mock AI service - replace with actual AI integration
  const callAIService = async (
    message: string,
    context?: CelestialBodyData,
  ): Promise<string> => {
    try {
      // Use the AI service for response generation
      return await aiService.generateResponse(message, context);
    } catch (error) {
      console.warn("AI service error, falling back to mock response:", error);

      // Fallback to mock responses if AI service fails
      if (context) {
        const responses = [
          `Great question about ${context.name}! ${context.name} is fascinating because ${context.description}. The key facts about ${context.name} include its diameter of ${context.keyFacts.diameter} and distance from the Sun of ${context.keyFacts.distanceFromSun}.`,
          `Let me tell you more about ${context.name}. This ${context.type} has a unique composition of ${context.keyFacts.composition.join(", ")}. The temperature on ${context.name} is approximately ${context.keyFacts.temperature}.`,
          `Interesting! ${context.name} is particularly notable for its ${context.keyFacts.orbitalPeriod} orbital period. ${context.keyFacts.moons ? `It has ${context.keyFacts.moons} moons, which makes it quite special in our solar system.` : "Unlike some other planets, it doesn't have any moons."}`,
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else {
        const generalResponses = [
          "That's a great question about space exploration! Our solar system is filled with incredible celestial bodies, each with unique characteristics and fascinating features.",
          "Space is truly amazing! Would you like to select a specific planet or celestial body to learn more about its detailed properties and characteristics?",
          "The universe holds so many mysteries and wonders. Each planet and star in our solar system has its own story and unique features that make space exploration so exciting!",
        ];
        return generalResponses[
          Math.floor(Math.random() * generalResponses.length)
        ];
      }
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: currentMessage.trim(),
      timestamp: new Date(),
      context: context?.name,
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const aiResponse = await callAIService(
        userMessage.content,
        context || undefined,
      );

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: aiResponse,
        timestamp: new Date(),
        context: context?.name,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setError(
        "Sorry, I encountered an error while processing your question. Please try again.",
      );
      console.error("AI service error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, context]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "Enter":
          if (event.ctrlKey || event.metaKey) {
            handleSendMessage();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSendMessage]);

  const handleClearHistory = useCallback(() => {
    setMessages([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(conversationKey);
    }
  }, [conversationKey]);

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[80vh] max-w-4xl flex-col"
        ref={modalRef}
        aria-labelledby="chatbot-title"
        aria-describedby="chatbot-description"
      >
        <DialogHeader>
          <DialogTitle id="chatbot-title" className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
              <span className="text-xs font-bold text-white">AI</span>
            </div>
            AI Learning Assistant
            {context && (
              <Badge variant="secondary" className="ml-2">
                {context.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription id="chatbot-description">
            Ask me anything about{" "}
            {context ? context.name : "space exploration and celestial bodies"}.
            I'll provide educational information to help you learn more.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {/* Context Information */}
          {context && (
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: context.material.color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium">
                    Currently exploring: {context.name}
                  </span>
                  <Badge
                    variant={
                      context.type === "star" ? "destructive" : "secondary"
                    }
                  >
                    {context.type}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages Area */}
          <div className="min-h-[300px] flex-1 overflow-y-auto rounded-lg border bg-gray-50/50 p-4">
            {messages.length === 0 ? (
              <div className="mt-8 text-center text-gray-500">
                <p className="mb-2 text-lg">
                  👋 Hello! I'm your AI learning assistant.
                </p>
                <p>
                  Ask me anything about{" "}
                  {context ? context.name : "space and celestial bodies"}!
                </p>
                {context && (
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="font-medium">Try asking:</p>
                    <ul className="space-y-1">
                      <li>• "What makes {context.name} unique?"</li>
                      <li>• "Tell me about {context.name}'s composition"</li>
                      <li>• "How far is {context.name} from the Sun?"</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === "user"
                          ? "bg-blue-500 text-white"
                          : "border bg-white shadow-sm"
                      }`}
                    >
                      <div className="mb-1 text-sm">{message.content}</div>
                      <div
                        className={`flex items-center gap-2 text-xs ${
                          message.type === "user"
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.context && (
                          <>
                            <span>•</span>
                            <span>{message.context}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg border bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="text-sm text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Input Area */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask about ${context ? context.name : "space exploration"}...`}
                disabled={isLoading}
                aria-label="Type your question here"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isLoading}
              aria-label="Send message"
            >
              Send
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={messages.length === 0}
              aria-label="Clear conversation history"
            >
              Clear History
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(AIChatbot);
