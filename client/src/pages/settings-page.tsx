import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Settings as SettingsIcon, 
  Clock, 
  Globe,
  Shield,
  Bell,
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [exportLoading, setExportLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

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
        title: "Settings updated",
        description: "Your changes have been saved successfully.",
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

  const businessHours = settings?.businessHours || {};

  const updateBusinessHours = (updates: any) => {
    updateSettingsMutation.mutate({
      businessHours: {
        ...businessHours,
        ...updates,
      },
    });
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      // This would call an export endpoint
      const res = await apiRequest("GET", "/api/export/conversations");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleSyncFromProduction = async () => {
    setSyncLoading(true);
    try {
      const res = await apiRequest("POST", "/api/sync/trigger");
      const result = await res.json();
      
      if (result.success) {
        toast({
          title: "Sync successful",
          description: `Synced ${result.stats.users} users, ${result.stats.websites} websites, ${result.stats.conversations} conversations, and ${result.stats.messages} messages from production.`,
        });
        
        // Invalidate all queries to refresh the UI with synced data
        queryClient.invalidateQueries();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync from production. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney"
  ];

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" data-testid="page-title">Settings</h2>
            <p className="text-muted-foreground">
              Configure system-wide settings and preferences.
            </p>
          </div>

          <Tabs defaultValue="business-hours" className="space-y-6">
            <TabsList data-testid="settings-tabs">
              <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="data">Data Management</TabsTrigger>
            </TabsList>

            {/* Business Hours */}
            <TabsContent value="business-hours">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    Business Hours Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable Business Hours</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically set representatives offline outside business hours
                      </p>
                    </div>
                    <Switch
                      checked={businessHours.enabled || false}
                      onCheckedChange={(checked) => updateBusinessHours({ enabled: checked })}
                      data-testid="switch-business-hours"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={businessHours.timezone || "UTC"}
                      onValueChange={(value) => updateBusinessHours({ timezone: value })}
                    >
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-medium">Weekly Schedule</Label>
                    {days.map(day => (
                      <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Switch
                            checked={businessHours.hours?.[day]?.enabled || false}
                            onCheckedChange={(checked) => updateBusinessHours({
                              hours: {
                                ...businessHours.hours,
                                [day]: {
                                  ...businessHours.hours?.[day],
                                  enabled: checked
                                }
                              }
                            })}
                            data-testid={`switch-${day}`}
                          />
                          <Label className="capitalize font-medium w-20">{day}</Label>
                        </div>
                        
                        {businessHours.hours?.[day]?.enabled && (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="time"
                              value={businessHours.hours?.[day]?.start || "09:00"}
                              onChange={(e) => updateBusinessHours({
                                hours: {
                                  ...businessHours.hours,
                                  [day]: {
                                    ...businessHours.hours?.[day],
                                    start: e.target.value
                                  }
                                }
                              })}
                              className="w-24"
                              data-testid={`time-start-${day}`}
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={businessHours.hours?.[day]?.end || "17:00"}
                              onChange={(e) => updateBusinessHours({
                                hours: {
                                  ...businessHours.hours,
                                  [day]: {
                                    ...businessHours.hours?.[day],
                                    end: e.target.value
                                  }
                                }
                              })}
                              className="w-24"
                              data-testid={`time-end-${day}`}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 text-primary mr-2" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">New Conversation Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when new conversations start
                        </p>
                      </div>
                      <Switch defaultChecked data-testid="switch-new-conversation-alerts" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Message Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify for new customer messages
                        </p>
                      </div>
                      <Switch defaultChecked data-testid="switch-message-notifications" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">System Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify for system events and errors
                        </p>
                      </div>
                      <Switch defaultChecked data-testid="switch-system-alerts" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive weekly activity summaries
                        </p>
                      </div>
                      <Switch data-testid="switch-weekly-reports" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security */}
            <TabsContent value="security">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 text-primary mr-2" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Two-Factor Authentication</Label>
                          <p className="text-sm text-muted-foreground">
                            Require 2FA for all representatives
                          </p>
                        </div>
                        <Badge variant="outline">Coming Soon</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Session Timeout</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically log out inactive users
                          </p>
                        </div>
                        <Select defaultValue="24h">
                          <SelectTrigger className="w-32" data-testid="select-session-timeout">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1h">1 hour</SelectItem>
                            <SelectItem value="8h">8 hours</SelectItem>
                            <SelectItem value="24h">24 hours</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Rate Limiting</Label>
                          <p className="text-sm text-muted-foreground">
                            Protect against API abuse
                          </p>
                        </div>
                        <Switch defaultChecked data-testid="switch-rate-limiting" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Access Control</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4" data-testid="access-control-info">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current User Role</span>
                        <Badge variant="default">{user?.role}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Login Method</span>
                        <Badge variant="outline">Email/Password</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Login</span>
                        <span className="text-sm">Today</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Data Management */}
            <TabsContent value="data">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 text-primary mr-2" />
                      Data Export & Import
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Sync from Production</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Pull all data from the production database (tigoniq.com) to development. This will update users, websites, conversations, messages, and settings.
                        </p>
                        <Button 
                          onClick={handleSyncFromProduction}
                          disabled={syncLoading}
                          variant="default"
                          data-testid="button-sync-production"
                        >
                          <Database className="h-4 w-4 mr-2" />
                          {syncLoading ? "Syncing..." : "Sync from Production"}
                        </Button>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Export Data</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Download your conversation data, messages, and settings as JSON files.
                        </p>
                        <Button 
                          onClick={handleExportData}
                          disabled={exportLoading}
                          data-testid="button-export-data"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {exportLoading ? "Exporting..." : "Export All Data"}
                        </Button>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Import Data</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Import conversation data from other platforms.
                        </p>
                        <Button variant="outline" disabled data-testid="button-import-data">
                          <Upload className="h-4 w-4 mr-2" />
                          Import Data (Coming Soon)
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Retention</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Auto-delete Closed Conversations</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically delete conversations after specified period
                        </p>
                      </div>
                      <Switch data-testid="switch-auto-delete" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retentionPeriod">Retention Period</Label>
                      <Select defaultValue="never">
                        <SelectTrigger data-testid="select-retention-period">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30d">30 days</SelectItem>
                          <SelectItem value="90d">90 days</SelectItem>
                          <SelectItem value="1y">1 year</SelectItem>
                          <SelectItem value="never">Never delete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center text-destructive">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Delete All Data</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Permanently delete all conversations, messages, and settings. This action cannot be undone.
                      </p>
                      <Button variant="destructive" disabled data-testid="button-delete-all-data">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
