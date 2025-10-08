import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import tigonChatbotWidget from "@assets/tigon-chatbot-widget.png";

interface ChatWidgetPreviewProps {
  config?: {
    primaryColor?: string;
    position?: string;
    welcomeMessage?: string;
    showOnMobile?: boolean;
    showOnDesktop?: boolean;
  };
}

export function ChatWidgetPreview({ config = {} }: ChatWidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: config.welcomeMessage || "Hi! How can we help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);

  const primaryColor = config.primaryColor || "#af1f31";
  const position = config.position || "bottom-right";

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      content: messageInput,
      sender: "customer",
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        content: "Thank you for your message! A representative will be with you shortly.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-widget-preview h-80 rounded-lg relative overflow-hidden" data-testid="chat-widget-preview">
      {/* Mock website background */}
      <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 p-4">
        <div className="bg-white rounded-md p-4 mb-4 shadow-sm">
          <div className="h-4 bg-gray-300 rounded mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
        
        {/* Chat Widget */}
        <div className={cn(
          "absolute",
          position === "bottom-right" && "bottom-4 right-4",
          position === "bottom-left" && "bottom-4 left-4",
          position === "top-right" && "top-4 right-4"
        )}>
          {/* Widget Button */}
          {!isOpen && (
            <Button
              onClick={() => setIsOpen(true)}
              className="w-[70px] h-[70px] bg-transparent border-none shadow-none p-0 transition-transform hover:scale-105"
              data-testid="widget-button"
            >
              <img src={tigonChatbotWidget} alt="TIGON Chatbot" className="w-[70px] h-[70px] object-contain" />
            </Button>
          )}
          
          {/* Chat Window */}
          {isOpen && (
            <Card className="w-80 h-96 shadow-xl border fade-in" data-testid="chat-window">
              {/* Header */}
              <div 
                className="px-4 py-3 rounded-t-lg text-white flex items-center justify-between"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">Customer Support</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-6 w-6 p-0"
                  data-testid="close-chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Messages */}
              <ScrollArea className="h-72 p-4" data-testid="chat-messages">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender === "customer" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-xs rounded-lg px-3 py-2 text-sm",
                          message.sender === "customer"
                            ? "text-white"
                            : message.sender === "bot"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                        style={{
                          backgroundColor: message.sender === "customer" ? primaryColor : undefined
                        }}
                      >
                        <div className="flex items-center space-x-1 mb-1">
                          {message.sender === "customer" ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          <span className="text-xs opacity-75">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p data-testid={`message-${message.id}`}>{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Input */}
              <div className="p-3 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    data-testid="message-input"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    size="sm"
                    style={{ backgroundColor: primaryColor }}
                    data-testid="send-message"
                  >
                    <Send className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
