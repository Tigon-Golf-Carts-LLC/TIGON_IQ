import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plug, 
  Mail, 
  MessageCircle,
  FileText,
  Bot,
  CheckCircle,
  XCircle,
  ExternalLink,
  Key,
  Settings
} from "lucide-react";

export default function IntegrationsPage() {
  const { toast } = useToast();

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Integration updated",
        description: "Settings have been saved successfully.",
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

  const testIntegrationMutation = useMutation({
    mutationFn: async (type: string) => {
      // This would call a test endpoint on the backend
      const res = await apiRequest("POST", `/api/integrations/test/${type}`);
      return res.json();
    },
    onSuccess: (data, type) => {
      toast({
        title: "Test successful",
        description: `${type} integration is working properly.`,
      });
    },
    onError: (error, type) => {
      toast({
        title: "Test failed",
        description: `${type} integration test failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateEmailConfig = (updates: any) => {
    updateSettingsMutation.mutate({
      emailConfig: {
        ...settings?.emailConfig,
        ...updates,
      },
    });
  };

  const updateSlackConfig = (updates: any) => {
    updateSettingsMutation.mutate({
      slackConfig: {
        ...settings?.slackConfig,
        ...updates,
      },
    });
  };

  const updateTigonConfig = (updates: any) => {
    updateSettingsMutation.mutate({
      tigonConfig: {
        ...settings?.tigonConfig,
        ...updates,
      },
    });
  };

  const updateTrelloConfig = (updates: any) => {
    updateSettingsMutation.mutate({
      trelloConfig: {
        ...settings?.trelloConfig,
        ...updates,
      },
    });
  };

  const updateAiConfig = (updates: any) => {
    updateSettingsMutation.mutate({
      aiConfig: {
        ...settings?.aiConfig,
        ...updates,
      },
    });
  };

  const emailConfig = settings?.emailConfig || {};
  const slackConfig = settings?.slackConfig || {};
  const tigonConfig = settings?.tigonConfig || {};
  const trelloConfig = settings?.trelloConfig || {};
  const aiConfig = settings?.aiConfig || {};

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" data-testid="page-title">Integrations</h2>
            <p className="text-muted-foreground">
              Configure external service integrations for enhanced functionality.
            </p>
          </div>

          {/* Integration Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card data-testid="integration-email-status">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">Email Service</p>
                    </div>
                  </div>
                  {emailConfig.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="integration-slack-status">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Slack</p>
                      <p className="text-sm text-muted-foreground">Team Chat</p>
                    </div>
                  </div>
                  {slackConfig.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="integration-tigon-status">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">TIGON Boards</p>
                      <p className="text-sm text-muted-foreground">Project Management</p>
                    </div>
                  </div>
                  {tigonConfig.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="integration-trello-status">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Trello</p>
                      <p className="text-sm text-muted-foreground">Project Management</p>
                    </div>
                  </div>
                  {trelloConfig.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="integration-ai-status">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Bot className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">AI Assistant</p>
                      <p className="text-sm text-muted-foreground">ChatGPT</p>
                    </div>
                  </div>
                  {aiConfig.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Configuration */}
          <Tabs defaultValue="email" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5" data-testid="integration-tabs">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="slack">Slack</TabsTrigger>
              <TabsTrigger value="tigon">TIGON Boards</TabsTrigger>
              <TabsTrigger value="trello">Trello</TabsTrigger>
              <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            </TabsList>

            {/* Email Integration */}
            <TabsContent value="email">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 text-primary mr-2" />
                    Internal Email System
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure internal SMTP email system with conversation threading
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send conversation notifications via internal email system
                      </p>
                    </div>
                    <Switch
                      checked={emailConfig.enabled || false}
                      onCheckedChange={(checked) => updateEmailConfig({ enabled: checked })}
                      data-testid="switch-email-enabled"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Use Internal Email System</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable SMTP-based internal email instead of external services
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(emailConfig.useInternalEmail)}
                      onCheckedChange={(checked) => updateEmailConfig({ useInternalEmail: checked })}
                      data-testid="switch-internal-email"
                    />
                  </div>

                  {emailConfig.useInternalEmail && (
                    <>
                      {/* SMTP Configuration */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-medium mb-4 text-primary">SMTP Server Configuration</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                              id="smtpHost"
                              value={emailConfig.smtpHost || ""}
                              onChange={(e) => updateEmailConfig({ smtpHost: e.target.value })}
                              placeholder="smtp.gmail.com"
                              data-testid="input-smtp-host"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                              id="smtpPort"
                              type="number"
                              value={emailConfig.smtpPort || 587}
                              onChange={(e) => updateEmailConfig({ smtpPort: parseInt(e.target.value) })}
                              placeholder="587"
                              data-testid="input-smtp-port"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="smtpUser">SMTP Username</Label>
                            <Input
                              id="smtpUser"
                              value={emailConfig.smtpUser || ""}
                              onChange={(e) => updateEmailConfig({ smtpUser: e.target.value })}
                              placeholder="your-email@domain.com"
                              data-testid="input-smtp-user"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="smtpPassword">SMTP Password</Label>
                            <Input
                              id="smtpPassword"
                              type="password"
                              value={emailConfig.smtpPassword || ""}
                              onChange={(e) => updateEmailConfig({ smtpPassword: e.target.value })}
                              placeholder="••••••••••••••••"
                              data-testid="input-smtp-password"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div>
                            <Label className="text-base font-medium">Use SSL/TLS</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable secure connection (recommended for port 465)
                            </p>
                          </div>
                          <Switch
                            checked={emailConfig.smtpSecure || false}
                            onCheckedChange={(checked) => updateEmailConfig({ smtpSecure: checked })}
                            data-testid="switch-smtp-secure"
                          />
                        </div>
                      </div>

                      {/* Email Identity */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-medium mb-4 text-primary">Email Identity & Recipients</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fromEmail">From Email Address</Label>
                            <Input
                              id="fromEmail"
                              value={emailConfig.fromEmail || ""}
                              onChange={(e) => updateEmailConfig({ fromEmail: e.target.value })}
                              placeholder="noreply@yourcompany.com"
                              data-testid="input-from-email"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fromName">From Name</Label>
                            <Input
                              id="fromName"
                              value={emailConfig.fromName || "TIGON IQ Support"}
                              onChange={(e) => updateEmailConfig({ fromName: e.target.value })}
                              placeholder="TIGON IQ Support"
                              data-testid="input-from-name"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <Label htmlFor="notificationEmails">Notification Recipients</Label>
                          <Textarea
                            id="notificationEmails"
                            value={emailConfig.notificationEmails?.join('\n') || ""}
                            onChange={(e) => updateEmailConfig({ 
                              notificationEmails: e.target.value.split('\n').filter(email => email.trim()) 
                            })}
                            placeholder="support@yourcompany.com&#10;manager@yourcompany.com"
                            className="h-24"
                            data-testid="textarea-notification-emails"
                          />
                          <p className="text-xs text-muted-foreground">
                            One email address per line
                          </p>
                        </div>
                      </div>

                      {/* Threading Configuration */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-medium mb-4 text-primary">Email Threading & Modifiers</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="subjectPrefix">Subject Prefix</Label>
                            <Input
                              id="subjectPrefix"
                              value={emailConfig.subjectPrefix || "[TIGON-IQ]"}
                              onChange={(e) => updateEmailConfig({ subjectPrefix: e.target.value })}
                              placeholder="[TIGON-IQ]"
                              data-testid="input-subject-prefix"
                            />
                            <p className="text-xs text-muted-foreground">
                              Prefix added to all email subjects
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="threadModifier">Thread Modifier</Label>
                            <Input
                              id="threadModifier"
                              value={emailConfig.threadModifier || "#TIQ"}
                              onChange={(e) => updateEmailConfig({ threadModifier: e.target.value })}
                              placeholder="#TIQ"
                              data-testid="input-thread-modifier"
                            />
                            <p className="text-xs text-muted-foreground">
                              Unique identifier for email threads
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div>
                            <Label className="text-base font-medium">Enable Email Threading</Label>
                            <p className="text-sm text-muted-foreground">
                              Group conversation messages in the same email thread
                            </p>
                          </div>
                          <Switch
                            checked={emailConfig.enableThreading !== false}
                            onCheckedChange={(checked) => updateEmailConfig({ enableThreading: checked })}
                            data-testid="switch-enable-threading"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex space-x-2 pt-6 border-t">
                    <Button
                      onClick={() => testIntegrationMutation.mutate('email')}
                      disabled={!emailConfig.enabled || testIntegrationMutation.isPending}
                      variant="outline"
                      data-testid="button-test-email"
                    >
                      Test Email Configuration
                    </Button>
                    <Button
                      onClick={() => window.open('https://nodemailer.com/about/', '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      SMTP Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Slack Integration */}
            <TabsContent value="slack">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-5 w-5 text-primary mr-2" />
                    Slack Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable Slack Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send conversation alerts to Slack channels
                      </p>
                    </div>
                    <Switch
                      checked={slackConfig.enabled || false}
                      onCheckedChange={(checked) => updateSlackConfig({ enabled: checked })}
                      data-testid="switch-slack-enabled"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="slackWebhook">Webhook URL</Label>
                      <Input
                        id="slackWebhook"
                        value={slackConfig.webhookUrl || ""}
                        onChange={(e) => updateSlackConfig({ webhookUrl: e.target.value })}
                        placeholder="https://hooks.slack.com/services/..."
                        data-testid="input-slack-webhook"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slackChannel">Default Channel</Label>
                      <Input
                        id="slackChannel"
                        value={slackConfig.channel || ""}
                        onChange={(e) => updateSlackConfig({ channel: e.target.value })}
                        placeholder="#customer-support"
                        data-testid="input-slack-channel"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => testIntegrationMutation.mutate('slack')}
                      disabled={!slackConfig.enabled || testIntegrationMutation.isPending}
                      variant="outline"
                      data-testid="button-test-slack"
                    >
                      Test Integration
                    </Button>
                    <Button
                      onClick={() => window.open('https://api.slack.com/messaging/webhooks', '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Setup Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TIGON Boards Integration */}
            <TabsContent value="tigon">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 text-primary mr-2" />
                    TIGON Boards Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable TIGON Boards Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send conversation alerts to TIGON Boards channels
                      </p>
                    </div>
                    <Switch
                      checked={tigonConfig.enabled || false}
                      onCheckedChange={(checked) => updateTigonConfig({ enabled: checked })}
                      data-testid="switch-tigon-enabled"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tigonWebhook">Webhook URL</Label>
                      <Input
                        id="tigonWebhook"
                        value={tigonConfig.webhookUrl || ""}
                        onChange={(e) => updateTigonConfig({ webhookUrl: e.target.value })}
                        placeholder="https://hooks.slack.com/services/..."
                        data-testid="input-tigon-webhook"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tigonChannel">Default Channel</Label>
                      <Input
                        id="tigonChannel"
                        value={tigonConfig.channel || ""}
                        onChange={(e) => updateTigonConfig({ channel: e.target.value })}
                        placeholder="#customer-support"
                        data-testid="input-tigon-channel"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => testIntegrationMutation.mutate('tigon')}
                      disabled={!tigonConfig.enabled || testIntegrationMutation.isPending}
                      variant="outline"
                      data-testid="button-test-tigon"
                    >
                      Test Integration
                    </Button>
                    <Button
                      onClick={() => window.open('https://api.slack.com/messaging/webhooks', '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Setup Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trello Integration */}
            <TabsContent value="trello">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 text-primary mr-2" />
                    Trello Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable Trello Cards</Label>
                      <p className="text-sm text-muted-foreground">
                        Create Trello cards for conversations
                      </p>
                    </div>
                    <Switch
                      checked={trelloConfig.enabled || false}
                      onCheckedChange={(checked) => updateTrelloConfig({ enabled: checked })}
                      data-testid="switch-trello-enabled"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trelloApiKey">API Key</Label>
                      <Input
                        id="trelloApiKey"
                        value={trelloConfig.apiKey || ""}
                        onChange={(e) => updateTrelloConfig({ apiKey: e.target.value })}
                        placeholder="Your Trello API key"
                        data-testid="input-trello-api-key"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trelloToken">Token</Label>
                      <Input
                        id="trelloToken"
                        value={trelloConfig.token || ""}
                        onChange={(e) => updateTrelloConfig({ token: e.target.value })}
                        placeholder="Your Trello token"
                        data-testid="input-trello-token"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trelloBoardId">Board ID</Label>
                    <Input
                      id="trelloBoardId"
                      value={trelloConfig.boardId || ""}
                      onChange={(e) => updateTrelloConfig({ boardId: e.target.value })}
                      placeholder="Trello board ID"
                      data-testid="input-trello-board-id"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => testIntegrationMutation.mutate('trello')}
                      disabled={!trelloConfig.enabled || testIntegrationMutation.isPending}
                      variant="outline"
                      data-testid="button-test-trello"
                    >
                      Test Integration
                    </Button>
                    <Button
                      onClick={() => window.open('https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/', '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      API Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Assistant */}
            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bot className="h-5 w-5 text-primary mr-2" />
                    AI Assistant (ChatGPT)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable AI Responses</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically respond to customer messages using AI
                      </p>
                    </div>
                    <Switch
                      checked={aiConfig.enabled || false}
                      onCheckedChange={(checked) => updateAiConfig({ enabled: checked })}
                      data-testid="switch-ai-enabled"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aiModel">AI Model</Label>
                      <Input
                        id="aiModel"
                        value={aiConfig.model || "gpt-5"}
                        disabled
                        data-testid="input-ai-model"
                      />
                      <p className="text-xs text-muted-foreground">
                        Using latest GPT-5 model
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxTokens">Max Tokens</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        value={aiConfig.maxTokens || 500}
                        onChange={(e) => updateAiConfig({ maxTokens: parseInt(e.target.value) })}
                        placeholder="500"
                        data-testid="input-max-tokens"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Textarea
                      id="systemPrompt"
                      value={aiConfig.systemPrompt || "You are a helpful customer service assistant."}
                      onChange={(e) => updateAiConfig({ systemPrompt: e.target.value })}
                      placeholder="You are a helpful customer service assistant. Provide clear, concise, and helpful responses to customer inquiries."
                      className="h-32"
                      data-testid="textarea-system-prompt"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Auto Handoff</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically handoff complex queries to human representatives
                      </p>
                    </div>
                    <Switch
                      checked={aiConfig.autoHandoff !== false}
                      onCheckedChange={(checked) => updateAiConfig({ autoHandoff: checked })}
                      data-testid="switch-auto-handoff"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => testIntegrationMutation.mutate('ai')}
                      disabled={!aiConfig.enabled || testIntegrationMutation.isPending}
                      variant="outline"
                      data-testid="button-test-ai"
                    >
                      Test AI Response
                    </Button>
                    <Button
                      onClick={() => window.open('https://platform.openai.com/docs/api-reference', '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      OpenAI Docs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
