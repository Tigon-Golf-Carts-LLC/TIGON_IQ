import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@assets/TIGON Chat Bot ICON_1757612559255.png";
import { 
  MessageCircle, 
  Search,
  Clock,
  User,
  Bot,
  Send,
  UserCheck,
  Lightbulb,
  Trash2,
  UserPlus
} from "lucide-react";

import { ConversationListItem, ConversationDetails } from "@shared/schema";

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [location] = useLocation();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsJoined, setWsJoined] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for selected conversation from query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedId = params.get('selected');
    if (selectedId) {
      setSelectedConversation(selectedId);
    }
  }, [location]);

  const { data: conversations } = useQuery<ConversationListItem[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: conversationDetails } = useQuery<ConversationDetails>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation,
  });

  const { data: representatives } = useQuery<any[]>({
    queryKey: ["/api/representatives"],
  });

  // Filter to get only online representatives
  const onlineRepresentatives = useMemo(() => 
    representatives?.filter(rep => rep.status === 'online') || [],
    [representatives]
  );

  // Manual mode is now derived from server state instead of local state
  const isManualMode = useMemo(() => 
    !conversationDetails?.isAiAssisted && conversationDetails?.assignedRepresentativeId === user?.id, 
    [conversationDetails, user]
  );

  // WebSocket connection effect
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setWsJoined(false); // Reset joined state
      ws.send(JSON.stringify({
        type: 'join_conversation',
        conversationId: selectedConversation,
        userId: user.id,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'joined') {
        // Server confirmed we've successfully joined the conversation
        setWsJoined(true);
        console.log('WebSocket joined conversation:', data.conversationId);
      } else if (data.type === 'new_message') {
        // Invalidate queries to refresh conversation details and messages
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", selectedConversation],
        });
      } else if (data.type === 'typing') {
        // Handle typing indicators if needed
        console.log('User typing:', data);
      } else if (data.type === 'error') {
        // Handle server-side errors
        console.error('WebSocket server error:', data.message);
        setWsJoined(false); // Reset joined state on error
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setWsJoined(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setWsJoined(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
      setSocket(null);
    };
  }, [selectedConversation, user]);

  // Auto-scroll to bottom when new messages arrive or conversation changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationDetails?.messages, selectedConversation]);

  // Auto-load suggestions when manual mode becomes true
  useEffect(() => {
    if (isManualMode && selectedConversation) {
      setLoadingSuggestions(true);
      getAISuggestionsMutation.mutate();
    }
  }, [isManualMode, selectedConversation]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation || !user) throw new Error("No conversation or user");
      
      const messageData = {
        type: 'send_message',
        conversationId: selectedConversation,
        content,
        senderType: 'representative',
        senderId: user.id,
      };

      // Try WebSocket first if connected, joined, and authenticated
      if (socket && isConnected && wsJoined && user) {
        try {
          // Send via WebSocket with timeout protection
          const sendPromise = new Promise<{success: boolean, method: string}>((resolve, reject) => {
            const messageId = Date.now().toString(); // Simple message ID for tracking
            
            // Set up timeout for WebSocket send
            const timeoutId = setTimeout(() => {
              reject(new Error('WebSocket send timeout'));
            }, 5000); // 5 second timeout
            
            // Listen for server response or error
            const responseHandler = (event: MessageEvent) => {
              const data = JSON.parse(event.data);
              if (data.type === 'error') {
                clearTimeout(timeoutId);
                socket.removeEventListener('message', responseHandler);
                reject(new Error(data.message || 'WebSocket server error'));
              } else if (data.type === 'new_message') {
                // Message was successfully processed
                clearTimeout(timeoutId);
                socket.removeEventListener('message', responseHandler);
                resolve({ success: true, method: 'websocket' });
              }
            };
            
            socket.addEventListener('message', responseHandler);
            
            // Send the message
            socket.send(JSON.stringify(messageData));
            
            // For now, assume success after a short delay since we don't have message IDs
            // This prevents indefinite waiting while still providing some error detection
            setTimeout(() => {
              clearTimeout(timeoutId);
              socket.removeEventListener('message', responseHandler);
              resolve({ success: true, method: 'websocket' });
            }, 1000); // Assume success after 1 second if no error
          });
          
          return await sendPromise;
        } catch (wsError) {
          console.warn('WebSocket send failed, falling back to HTTP:', wsError);
          // Fall through to HTTP fallback
        }
      }

      // Fallback to HTTP if WebSocket is not available, not joined, or failed
      console.log('Using HTTP fallback for message send. Socket state:', {
        hasSocket: !!socket,
        isConnected,
        wsJoined,
        hasUser: !!user
      });
      
      const res = await apiRequest("POST", "/api/messages", {
        conversationId: selectedConversation,
        content,
        senderType: 'representative',
        senderId: user.id,
        messageType: 'text',
      });

      return res.json();
    },
    onSuccess: () => {
      setMessageInput("");
      // Invalidate queries to refresh conversation details
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation],
      });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });

  // Take over conversation mutation
  const takeOverMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) throw new Error("No conversation selected");
      
      const res = await apiRequest("POST", `/api/conversations/${selectedConversation}/takeover`, {
        representativeId: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      // Refresh conversation details
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation],
      });
      // Invalidate conversations list to update UI badges
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations"],
      });
      // Call mutation directly to bypass isManualMode guard that sees stale state
      getAISuggestionsMutation.mutate();
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await apiRequest("DELETE", `/api/conversations/${conversationId}`);
      return res.json();
    },
    onSuccess: (_data, deletedConversationId) => {
      toast({
        title: "Conversation deleted",
        description: "The conversation has been successfully deleted.",
      });
      // If we deleted the selected conversation, clear the selection
      if (deletedConversationId === selectedConversation) {
        setSelectedConversation(null);
      }
      // Invalidate conversations list query
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations"],
      });
      // Invalidate the specific conversation detail query
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", deletedConversationId],
      });
      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
      // Close dialog even on error
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    },
  });

  // Assign conversation to representative mutation
  const assignConversationMutation = useMutation({
    mutationFn: async (representativeId: string) => {
      if (!selectedConversation) throw new Error("No conversation selected");
      
      const res = await apiRequest("PATCH", `/api/conversations/${selectedConversation}`, {
        assignedRepresentativeId: representativeId,
      });
      return res.json();
    },
    onSuccess: (data, representativeId) => {
      const assignedRep = representatives?.find(r => r.id === representativeId);
      toast({
        title: "Conversation assigned",
        description: `Conversation has been assigned to ${assignedRep?.name || 'representative'}.`,
      });
      // Refresh conversation details and list
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations"],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get AI suggestions mutation
  const getAISuggestionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) throw new Error("No conversation selected");
      
      const res = await apiRequest("POST", `/api/conversations/${selectedConversation}/ai-suggestions`);
      return res.json();
    },
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions || []);
      setLoadingSuggestions(false);
    },
    onError: () => {
      setLoadingSuggestions(false);
    },
  });

  // Get AI suggestions
  const getAISuggestions = () => {
    if (!isManualMode || !selectedConversation) return;
    
    setLoadingSuggestions(true);
    getAISuggestionsMutation.mutate();
  };

  // Handle sending message (either manual or suggested)
  const handleSendMessage = (content?: string) => {
    const messageContent = content || messageInput.trim();
    if (!messageContent) return;
    
    sendMessageMutation.mutate(messageContent);
    
    // If we sent a suggested response or manual message, get new suggestions
    if (isManualMode) {
      setTimeout(getAISuggestions, 1000); // Slight delay to let the message be processed
    }
  };

  // Handle take over
  const handleTakeOver = () => {
    takeOverMutation.mutate();
  };

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
                {conversations && conversations.length > 0 ? (
                  conversations.map((conv) => (
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
                            <Avatar className="h-8 w-8 bg-white">
                              <AvatarImage src={defaultAvatar} alt="Customer" />
                              <AvatarFallback className="text-xs bg-white">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConversationToDelete(conv.id);
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`button-delete-${conv.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Updated {formatTime(conv.createdAt.toString())}</span>
                          {conv.representative === null && (
                            <Badge variant="secondary" className="text-xs">
                              AI Assisted
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
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
                      <Avatar className="bg-white">
                        <AvatarImage src={defaultAvatar} alt="Customer" />
                        <AvatarFallback className="bg-white">
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
                      {conversationDetails.isAiAssisted && !isManualMode && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          <Bot className="h-3 w-3 mr-1" />
                          AI Assisted
                        </Badge>
                      )}
                      {isManualMode && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Manual Mode
                        </Badge>
                      )}
                      
                      {/* Assign to Representative Dropdown */}
                      {onlineRepresentatives.length > 0 && (
                        <Select
                          onValueChange={(representativeId) => assignConversationMutation.mutate(representativeId)}
                          disabled={assignConversationMutation.isPending}
                        >
                          <SelectTrigger className="w-[180px] h-9" data-testid="select-assign-representative">
                            <UserPlus className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {onlineRepresentatives.map((rep) => (
                              <SelectItem key={rep.id} value={rep.id} data-testid={`option-rep-${rep.id}`}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  {rep.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {conversationDetails.isAiAssisted && !isManualMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleTakeOver}
                          disabled={takeOverMutation.isPending}
                          data-testid="button-takeover"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Take Over
                        </Button>
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
                              {formatTime(message.createdAt.toString())}
                            </span>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap break-words" data-testid={`message-content-${message.id}`}>
                              {message.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                      </div>
                    )}
                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* AI Suggestions (when in manual mode) */}
                {isManualMode && (
                  <div className="p-4 border-t border-border bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        AI Suggested Responses
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={getAISuggestions}
                        disabled={loadingSuggestions}
                        className="ml-auto text-xs"
                      >
                        Refresh
                      </Button>
                    </div>
                    
                    {loadingSuggestions ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                        Generating suggestions...
                      </div>
                    ) : aiSuggestions.length > 0 ? (
                      <div className="space-y-2">
                        {aiSuggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-left h-auto p-3 whitespace-normal"
                            onClick={() => handleSendMessage(suggestion)}
                            disabled={sendMessageMutation.isPending}
                            data-testid={`suggestion-${index}`}
                          >
                            <span className="text-xs font-medium text-yellow-600 mr-2">{index + 1}.</span>
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No suggestions available. Click refresh to get AI suggestions.
                      </div>
                    )}
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={isManualMode ? "Type your manual response or use AI suggestions above..." : "Type your message..."}
                      className="flex-1"
                      data-testid="input-message"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button 
                      size="icon"
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      onClick={() => handleSendMessage()}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {isManualMode && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Manual mode active - You can type custom responses or use AI suggestions above
                    </div>
                  )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-conversation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and will permanently remove all messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conversationToDelete && deleteConversationMutation.mutate(conversationToDelete)}
              disabled={deleteConversationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteConversationMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
