import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatWidgetPreview } from "@/components/chat-widget-preview";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Users, 
  Bot, 
  Clock, 
  CheckCircle,
  Globe,
  Mail,
  Slack,
  FileText,
  Table
} from "lucide-react";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
  });

  const { data: representatives } = useQuery({
    queryKey: ["/api/representatives"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" data-testid="page-title">System Overview</h2>
            <p className="text-muted-foreground">
              Comprehensive customer service chatbot system with real-time messaging, AI integration, and multi-channel routing.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="stat-active-conversations">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Conversations</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-active-conversations">
                      {stats?.activeConversations || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="stat-online-representatives">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Online Representatives</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-online-representatives">
                      {stats?.onlineRepresentatives || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="stat-ai-response">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">AI Response Rate</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-ai-response-rate">87%</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="stat-response-time">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-response-time">1.2m</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Conversations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-5 w-5 text-primary mr-2" />
                    Recent Conversations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="recent-conversations">
                    {conversations?.slice(0, 5).map((conv: any) => (
                      <div key={conv.conversation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {conv.conversation.customerEmail?.[0]?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium" data-testid={`conversation-customer-${conv.conversation.id}`}>
                              {conv.conversation.customerEmail || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {conv.website?.domain || 'Unknown website'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={conv.conversation.status === 'active' ? 'default' : 'secondary'}>
                          {conv.conversation.status}
                        </Badge>
                      </div>
                    )) || (
                      <p className="text-muted-foreground text-center py-8">No conversations yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active Representatives */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 text-primary mr-2" />
                    Active Representatives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="active-representatives">
                    {representatives?.filter((rep: any) => rep.status === 'online').map((rep: any) => (
                      <div key={rep.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full text-primary-foreground flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {rep.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium" data-testid={`rep-name-${rep.id}`}>{rep.name}</p>
                            <p className="text-xs text-muted-foreground">{rep.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></span>
                          <span className="text-sm text-green-600">Online</span>
                        </div>
                      </div>
                    )) || (
                      <p className="text-muted-foreground text-center py-8">No representatives online</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Widget Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Widget Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChatWidgetPreview />
                </CardContent>
              </Card>

              {/* Integration Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Integration Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="integration-status">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Slack className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Slack</span>
                      </div>
                      <Badge variant={settings?.slackConfig?.enabled ? 'default' : 'secondary'}>
                        {settings?.slackConfig?.enabled ? 'Connected' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Email (SendGrid)</span>
                      </div>
                      <Badge variant={settings?.emailConfig?.enabled ? 'default' : 'secondary'}>
                        {settings?.emailConfig?.enabled ? 'Connected' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Trello</span>
                      </div>
                      <Badge variant={settings?.trelloConfig?.enabled ? 'default' : 'secondary'}>
                        {settings?.trelloConfig?.enabled ? 'Connected' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4 text-green-600" />
                        <span className="text-sm">ChatGPT API</span>
                      </div>
                      <Badge variant={settings?.aiConfig?.enabled ? 'default' : 'secondary'}>
                        {settings?.aiConfig?.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Database Schema */}
              <Card>
                <CardHeader>
                  <CardTitle>Database Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm" data-testid="database-schema">
                    <div className="flex items-center space-x-2">
                      <Table className="h-4 w-4 text-primary" />
                      <span>conversations</span>
                      <Badge variant="outline">{stats?.totalConversations || 0} records</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Table className="h-4 w-4 text-primary" />
                      <span>messages</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Table className="h-4 w-4 text-primary" />
                      <span>representatives</span>
                      <Badge variant="outline">{representatives?.length || 0} records</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Table className="h-4 w-4 text-primary" />
                      <span>websites</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Table className="h-4 w-4 text-primary" />
                      <span>settings</span>
                      <Badge variant="outline">1 record</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
