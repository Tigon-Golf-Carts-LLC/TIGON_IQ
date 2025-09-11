import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Search,
  Clock,
  User,
  Bot,
  Send
} from "lucide-react";

import { ConversationListItem, ConversationDetails } from "@shared/schema";

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const { data: conversations } = useQuery<ConversationListItem[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: conversationDetails } = useQuery<ConversationDetails>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'waiting': return 'bg-yellow-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 flex">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold mb-4" data-testid="page-title">Conversations</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search conversations..." 
                  className="pl-10" 
                  data-testid="input-search-conversations"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3" data-testid="conversations-list">
                {conversations?.map((conv) => (
                  <Card 
                    key={conv.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedConversation === conv.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv.id)}
                    data-testid={`conversation-item-${conv.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {conv.customerEmail?.[0]?.toUpperCase() || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm" data-testid={`conversation-customer-${conv.id}`}>
                              {conv.customerEmail || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {conv.website?.domain || 'Unknown website'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(conv.status)}`}></div>
                          <Badge variant="outline" className="text-xs">
                            {conv.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Updated {formatTime(conv.createdAt)}</span>
                        {conv.representative === null && (
                          <Badge variant="secondary" className="text-xs">
                            AI Assisted
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col">
            {selectedConversation && conversationDetails ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {conversationDetails.customerEmail?.[0]?.toUpperCase() || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold" data-testid="chat-customer-name">
                          {conversationDetails.customerEmail || 'Anonymous Customer'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {conversationDetails.website?.domain}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={conversationDetails.status === 'active' ? 'default' : 'secondary'}>
                        {conversationDetails.status}
                      </Badge>
                      {conversationDetails.representative && (
                        <Badge variant="outline">
                          Assigned to {conversationDetails.representative.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4" data-testid="chat-messages">
                    {conversationDetails.messages?.map((message: any) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[70%] ${
                          message.senderType === 'customer' 
                            ? 'bg-muted' 
                            : message.senderType === 'ai'
                            ? 'bg-blue-100 border border-blue-200'
                            : 'bg-primary text-primary-foreground'
                        } rounded-lg px-4 py-2`}>
                          <div className="flex items-center space-x-2 mb-1">
                            {message.senderType === 'customer' && (
                              <User className="h-3 w-3" />
                            )}
                            {message.senderType === 'ai' && (
                              <Bot className="h-3 w-3 text-blue-600" />
                            )}
                            {message.senderType === 'representative' && (
                              <User className="h-3 w-3" />
                            )}
                            <span className="text-xs font-medium">
                              {message.senderType === 'customer' ? 'Customer' : 
                               message.senderType === 'ai' ? 'AI Assistant' : 'Representative'}
                            </span>
                            <span className="text-xs opacity-75">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm" data-testid={`message-content-${message.id}`}>
                            {message.content}
                          </p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                      data-testid="input-message"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          // TODO: Send message
                          setMessageInput("");
                        }
                      }}
                    />
                    <Button 
                      size="icon"
                      disabled={!messageInput.trim()}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
