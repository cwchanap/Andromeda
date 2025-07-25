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
import type { CelestialBodyData, GameState } from "../types/game";
import type { GameSettings } from "./SettingsModal";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  context?: string; // The celestial body context when the message was sent
}

interface AIChatbotProps {
  context: {
    gameState: GameState;
    settings: {
      enableAnimations: boolean;
      audioEnabled: boolean;
      controlSensitivity: number;
    };
    updateGameState: (updates: Partial<GameState>) => void;
    updateSettings: (settings: GameSettings) => void;
    selectCelestialBody: (body: CelestialBodyData | null) => void;
    navigateToView: (view: "menu" | "solar-system") => void;
    showInfoModal: (show: boolean) => void;
    showChatbot: (show: boolean) => void;
    showControls: (show: boolean) => void;
    resetGameState: () => void;
  };
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
  isMobile?: boolean;
}

// Conversation storage key
const CONVERSATION_STORAGE_KEY = "ai-chatbot-conversations";

function AIChatbot({
  context,
  isOpen,
  onClose,
  initialQuestion,
  isMobile = false,
}: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate conversation key based on current context
  const conversationKey = context?.gameState?.selectedBody?.id
    ? `chat-${context.gameState.selectedBody.id}`
    : "chat-general";

  // Load conversation history
  const loadConversationHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (stored) {
        const allConversations = JSON.parse(stored);
        const currentConversation = allConversations[conversationKey];
        if (currentConversation && currentConversation.messages) {
          const messagesWithDates = currentConversation.messages.map(
            (msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }),
          );
          setMessages(messagesWithDates);
        }
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
    }
  }, [conversationKey]);

  // Save conversation history
  const saveConversationHistory = useCallback(
    (newMessages: Message[]) => {
      try {
        const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
        const allConversations = stored ? JSON.parse(stored) : {};

        allConversations[conversationKey] = {
          messages: newMessages,
          lastUpdated: new Date(),
        };

        localStorage.setItem(
          CONVERSATION_STORAGE_KEY,
          JSON.stringify(allConversations),
        );
      } catch (error) {
        console.error("Error saving conversation history:", error);
      }
    },
    [conversationKey],
  );

  // Load conversation when component mounts or context changes
  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveConversationHistory(messages);
    }
  }, [messages, saveConversationHistory]);

  // Handle initial question
  useEffect(() => {
    if (initialQuestion && isOpen) {
      handleSendMessage(initialQuestion);
    }
  }, [initialQuestion, isOpen]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const addMessage = useCallback((message: Omit<Message, "id">) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  const getContextualInfo = useCallback(() => {
    const selectedBody = context?.gameState?.selectedBody;
    if (selectedBody) {
      return {
        name: selectedBody.name,
        type: selectedBody.type,
        description: selectedBody.description,
      };
    }
    return null;
  }, [context]);

  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const text = messageText || inputValue.trim();
      if (!text || isLoading) return;

      // Clear input immediately
      setInputValue("");

      // Add user message
      addMessage({
        type: "user",
        content: text,
        timestamp: new Date(),
        context: context?.gameState?.selectedBody?.name || "General",
      });

      setIsLoading(true);
      setIsTyping(true);

      try {
        // Get AI response
        const response = await aiService.generateResponse(
          text,
          context?.gameState?.selectedBody || undefined,
        );

        // Add AI response
        addMessage({
          type: "ai",
          content: response,
          timestamp: new Date(),
          context: context?.gameState?.selectedBody?.name || "General",
        });
      } catch (error) {
        console.error("Error getting AI response:", error);
        addMessage({
          type: "ai",
          content:
            "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment.",
          timestamp: new Date(),
          context: context?.gameState?.selectedBody?.name || "General",
        });
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
    },
    [inputValue, isLoading, addMessage, context, getContextualInfo, messages],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    try {
      const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (stored) {
        const allConversations = JSON.parse(stored);
        delete allConversations[conversationKey];
        localStorage.setItem(
          CONVERSATION_STORAGE_KEY,
          JSON.stringify(allConversations),
        );
      }
    } catch (error) {
      console.error("Error clearing conversation:", error);
    }
  }, [conversationKey]);

  const currentContext =
    context?.gameState?.selectedBody?.name || "Solar System";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${isMobile ? "h-[90vh] max-w-[95vw]" : "max-h-[80vh] max-w-2xl"} flex flex-col`}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle
            className={`flex items-center justify-between ${isMobile ? "text-lg" : "text-xl"}`}
          >
            <span>AI Learning Assistant</span>
            <Badge
              variant="outline"
              className={isMobile ? "text-xs" : "text-sm"}
            >
              {currentContext}
            </Badge>
          </DialogTitle>
          <DialogDescription className={isMobile ? "text-sm" : ""}>
            Ask me anything about space exploration and celestial bodies!
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* Messages */}
          <div
            className={`flex-1 space-y-4 overflow-y-auto pr-2 ${isMobile ? "text-sm" : ""}`}
          >
            {messages.length === 0 && (
              <div className="text-muted-foreground py-8 text-center">
                <p className="mb-2">
                  👋 Welcome to your AI Learning Assistant!
                </p>
                <p className={isMobile ? "text-xs" : "text-sm"}>
                  Ask me questions about {currentContext.toLowerCase()} or any
                  space-related topics.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[80%] ${message.type === "user" ? "bg-primary text-primary-foreground" : ""}`}
                >
                  <CardContent className={`p-3 ${isMobile ? "text-sm" : ""}`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={`mt-2 text-xs opacity-70 ${isMobile ? "text-[10px]" : ""}`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                      {message.context &&
                        message.context !== currentContext && (
                          <span className="ml-2">• {message.context}</span>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse">🤔 Thinking...</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="mt-4 flex-shrink-0 border-t pt-4">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about space..."
                disabled={isLoading}
                className={isMobile ? "text-sm" : ""}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className={isMobile ? "px-3" : ""}
              >
                {isLoading ? "..." : "Send"}
              </Button>
            </div>

            {messages.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className={`text-muted-foreground hover:text-foreground ${isMobile ? "text-xs" : "text-sm"}`}
                >
                  Clear conversation
                </Button>
                <span
                  className={`text-muted-foreground ${isMobile ? "text-xs" : "text-sm"}`}
                >
                  {messages.length} message{messages.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(AIChatbot);
