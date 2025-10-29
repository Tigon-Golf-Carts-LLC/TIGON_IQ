import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import defaultAvatar from "@assets/TIGON Chat Bot ICON_1757612559255.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, 
  Search,
  UserCheck,
  UserX,
  Clock,
  MessageCircle,
  MoreVertical
} from "lucide-react";

import { User, ConversationListItem } from "@shared/schema";

export default function RepresentativesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: representatives, isLoading } = useQuery<User[]>({
    queryKey: ["/api/representatives"],
  });

  const { data: conversations } = useQuery<ConversationListItem[]>({
    queryKey: ["/api/conversations"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/representatives/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      toast({
        title: "Status updated",
        description: "Representative status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredRepresentatives = representatives?.filter((rep: any) =>
    rep.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'online': return 'default';
      case 'busy': return 'secondary';
      case 'offline': return 'outline';
      default: return 'outline';
    }
  };

  const getRepresentativeConversations = (repId: string) => {
    return conversations?.filter((conv: any) => 
      conv.conversation?.assignedRepresentativeId === repId &&
      (conv.conversation?.status === 'active' || conv.conversation?.status === 'waiting')
    ) || [];
  };

  const handleStatusChange = (repId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: repId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" data-testid="page-title">Representatives</h2>
            <p className="text-muted-foreground">
              Manage your customer service team and monitor their availability.
            </p>
          </div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Online</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="stat-online-reps">
                        {representatives?.filter((r: any) => r.status === 'online').length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Busy</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="stat-busy-reps">
                        {representatives?.filter((r: any) => r.status === 'busy').length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <UserX className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Offline</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="stat-offline-reps">
                        {representatives?.filter((r: any) => r.status === 'offline').length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="stat-total-reps">
                        {representatives?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search representatives..."
                  className="pl-10"
                  data-testid="input-search-representatives"
                />
              </div>
            </CardContent>
          </Card>

          {/* Representatives List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 text-primary mr-2" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="representatives-list">
                {filteredRepresentatives.map((representative: any) => {
                  const repConversations = getRepresentativeConversations(representative.id);
                  const isCurrentUser = user?.id === representative.id;
                  
                  return (
                    <div key={representative.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12 bg-white">
                            <AvatarImage src={representative.profileImageUrl || defaultAvatar} alt="Representative" />
                            <AvatarFallback className="bg-white text-foreground">
                              {representative.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-foreground" data-testid={`rep-name-${representative.id}`}>
                                {representative.name}
                                {isCurrentUser && <span className="text-xs text-muted-foreground">(You)</span>}
                              </h3>
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(representative.status)}`}></div>
                            </div>
                            <p className="text-sm text-muted-foreground" data-testid={`rep-email-${representative.id}`}>
                              {representative.email}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {representative.role}
                              </Badge>
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <MessageCircle className="h-3 w-3" />
                                <span>{repConversations.length} active conversations</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Badge variant={getStatusVariant(representative.status)}>
                            {representative.status}
                          </Badge>
                          
                          {(user?.role === 'admin' || isCurrentUser) && (
                            <Select
                              value={representative.status}
                              onValueChange={(status) => handleStatusChange(representative.id, status)}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-status-${representative.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="offline">Offline</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* Active Conversations */}
                      {repConversations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Active Conversations</h4>
                          <div className="space-y-2">
                            {repConversations.slice(0, 3).map((conv: any) => (
                              <div key={conv.conversation.id} className="flex items-center justify-between text-sm">
                                <span className="text-foreground">
                                  {conv.conversation.customerEmail || 'Anonymous'}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {conv.conversation.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {conv.website?.domain}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {repConversations.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{repConversations.length - 3} more conversations
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredRepresentatives.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      {searchTerm ? 'No representatives found' : 'No representatives yet'}
                    </h3>
                    <p className="text-sm">
                      {searchTerm 
                        ? 'Try adjusting your search terms'
                        : 'Representatives will appear here once they register'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
