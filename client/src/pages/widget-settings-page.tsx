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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChatWidgetPreview } from "@/components/chat-widget-preview";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Code, 
  Globe, 
  Palette, 
  MessageCircle,
  Plus,
  Trash2,
  Eye
} from "lucide-react";

import { Settings, Website } from "@shared/schema";

export default function WidgetSettingsPage() {
  const { toast } = useToast();
  const [newPageUrl, setNewPageUrl] = useState("");

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: websites } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Widget settings have been saved successfully.",
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

  const websiteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/websites", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      setNewPageUrl("");
      toast({
        title: "Website added",
        description: "New website has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add website",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateWebsiteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/websites/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      toast({
        title: "Website updated",
        description: "Website settings have been updated.",
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

  const widgetConfig = settings?.widgetConfig || {};

  const handleSettingsUpdate = (updates: any) => {
    settingsMutation.mutate({
      widgetConfig: {
        ...widgetConfig,
        ...updates,
      },
    });
  };

  const handleAddWebsite = () => {
    if (!newPageUrl.trim()) return;
    
    try {
      const url = new URL(newPageUrl);
      websiteMutation.mutate({
        domain: url.hostname,
        name: url.hostname,
        isActive: true,
        allowedPages: [url.pathname],
        whitelistMode: true,
      });
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
    }
  };

  const toggleWebsiteStatus = (website: any) => {
    updateWebsiteMutation.mutate({
      id: website.id,
      data: { isActive: !website.isActive },
    });
  };

  const embedCode = `<script src="${window.location.origin}/chatbot.js"></script>`;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" data-testid="page-title">Widget Settings</h2>
            <p className="text-muted-foreground">
              Configure your embeddable chat widget appearance and behavior.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Widget Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Appearance Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="h-5 w-5 text-primary mr-2" />
                    Widget Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Widget Position</Label>
                      <Select 
                        value={widgetConfig.position || "bottom-right"}
                        onValueChange={(value) => handleSettingsUpdate({ position: value })}
                      >
                        <SelectTrigger data-testid="select-widget-position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-8 h-8 rounded-md border border-input cursor-pointer"
                          style={{ backgroundColor: widgetConfig.primaryColor || "#af1f31" }}
                          data-testid="color-preview"
                        />
                        <Input
                          id="primaryColor"
                          value={widgetConfig.primaryColor || "#af1f31"}
                          onChange={(e) => handleSettingsUpdate({ primaryColor: e.target.value })}
                          placeholder="#af1f31"
                          data-testid="input-primary-color"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={widgetConfig.welcomeMessage || "Hi! How can we help you today?"}
                      onChange={(e) => handleSettingsUpdate({ welcomeMessage: e.target.value })}
                      placeholder="Hi! How can we help you today?"
                      className="h-20"
                      data-testid="textarea-welcome-message"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show on Mobile</Label>
                        <p className="text-sm text-muted-foreground">Display widget on mobile devices</p>
                      </div>
                      <Switch
                        checked={widgetConfig.showOnMobile !== false}
                        onCheckedChange={(checked) => handleSettingsUpdate({ showOnMobile: checked })}
                        data-testid="switch-show-mobile"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show on Desktop</Label>
                        <p className="text-sm text-muted-foreground">Display widget on desktop</p>
                      </div>
                      <Switch
                        checked={widgetConfig.showOnDesktop !== false}
                        onCheckedChange={(checked) => handleSettingsUpdate({ showOnDesktop: checked })}
                        data-testid="switch-show-desktop"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Embed Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 text-primary mr-2" />
                    Embed Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Copy this code to your website</Label>
                      <div className="bg-muted p-3 rounded-md font-mono text-sm mt-2" data-testid="embed-code">
                        {embedCode}
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                        toast({
                          title: "Copied!",
                          description: "Embed code copied to clipboard.",
                        });
                      }}
                      variant="outline"
                      data-testid="button-copy-embed"
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Website Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 text-primary mr-2" />
                    Website Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      value={newPageUrl}
                      onChange={(e) => setNewPageUrl(e.target.value)}
                      placeholder="https://example.com/page"
                      className="flex-1"
                      data-testid="input-new-website"
                    />
                    <Button 
                      onClick={handleAddWebsite}
                      disabled={websiteMutation.isPending}
                      data-testid="button-add-website"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Website
                    </Button>
                  </div>

                  <div className="space-y-2" data-testid="websites-list">
                    {websites?.map((website: any) => (
                      <div key={website.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center space-x-3">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium" data-testid={`website-domain-${website.id}`}>
                              {website.domain}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {!website.whitelistMode || (website.allowedPages?.length || 0) === 0 
                                ? "All pages allowed" 
                                : `${website.allowedPages?.length || 0} allowed pages`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={website.isActive ? "default" : "secondary"}>
                            {website.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleWebsiteStatus(website)}
                            data-testid={`button-toggle-website-${website.id}`}
                          >
                            {website.isActive ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted-foreground py-8">
                        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No websites configured</p>
                        <p className="text-sm">Add a website URL to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Widget Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 text-primary mr-2" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChatWidgetPreview config={widgetConfig} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="widget-stats">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Websites</span>
                      <span className="font-medium">
                        {websites?.filter((w: any) => w.isActive).length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Websites</span>
                      <span className="font-medium">{websites?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Widget Status</span>
                      <Badge variant="default">Active</Badge>
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
