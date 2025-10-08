import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  senderType: 'customer' | 'representative' | 'ai';
  createdAt: string;
}

interface WidgetEmbedProps {
  domain: string;
  onClose?: () => void;
}

export function WidgetEmbed({ domain, onClose }: WidgetEmbedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Get widget configuration
  const { data: config } = useQuery({
    queryKey: ["/api/widget/config", domain],
    queryFn: async () => {
      const res = await fetch(`/api/widget/config?domain=${domain}`);
      if (!res.ok) throw new Error('Failed to fetch widget config');
      return res.json();
    },
  });

  const widgetConfig = config?.widgetConfig || {};
  const primaryColor = widgetConfig.primaryColor || "#af1f31";
  const position = widgetConfig.position || "bottom-right";
  const welcomeMessage = widgetConfig.welcomeMessage || "Hi! How can we help you today?";

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: 'join_conversation',
        conversationId,
        userId: null, // Customer doesn't have userId
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'typing') {
        // Handle typing indicators
        console.log('User typing:', data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [isOpen, conversationId]);

  // Create conversation when widget opens
  const createConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: config?.website?.id,
          customerEmail: null, // Will be collected later if needed
          customerName: null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create conversation');
      
      const conversation = await res.json();
      setConversationId(conversation.id);
      
      // Add welcome message
      setMessages([{
        id: 'welcome',
        content: welcomeMessage,
        senderType: 'ai',
        createdAt: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!conversationId) {
      createConversation();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (socket) {
      socket.close();
    }
    onClose?.();
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !conversationId || !socket) return;

    const messageData = {
      type: 'send_message',
      conversationId,
      content: messageInput.trim(),
      senderType: 'customer',
      senderId: null,
    };

    // Send via WebSocket
    socket.send(JSON.stringify(messageData));

    // Also send via HTTP as backup
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: messageInput.trim(),
          senderType: 'customer',
          senderId: null,
          messageType: 'text',
        }),
      });
    } catch (error) {
      console.error('Error sending message via HTTP:', error);
    }

    setMessageInput("");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!config) {
    return null; // Don't show widget if configuration fails
  }

  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-300",
        position === "bottom-right" && "bottom-4 right-4",
        position === "bottom-left" && "bottom-4 left-4", 
        position === "top-right" && "top-4 right-4"
      )}
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Widget Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
          style={{ backgroundColor: primaryColor }}
          aria-label="Open chat"
        >
          <MessageCircle size={24} color="white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 h-96 bg-white rounded-lg shadow-xl border flex flex-col">
          {/* Header */}
          <div 
            className="px-4 py-3 rounded-t-lg text-white flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <MessageCircle size={16} color="white" />
              </div>
              <span className="font-medium text-sm">Customer Support</span>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Connection Status */}
          {!isConnected && conversationId && (
            <div className="px-4 py-2 bg-yellow-50 border-b text-xs text-yellow-800">
              Connecting...
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.senderType === "customer" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-xs rounded-lg px-3 py-2 text-sm break-words",
                    message.senderType === "customer"
                      ? "text-white"
                      : "bg-gray-100 text-gray-800"
                  )}
                  style={{
                    backgroundColor: message.senderType === "customer" ? primaryColor : undefined
                  }}
                >
                  <div className="flex items-center space-x-1 mb-1">
                    {message.senderType === "customer" ? (
                      <User size={12} />
                    ) : (
                      <Bot size={12} />
                    )}
                    <span className="text-xs opacity-75">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ focusRingColor: primaryColor }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={!isConnected && conversationId}
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || (!isConnected && conversationId)}
                className="px-4 py-2 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
