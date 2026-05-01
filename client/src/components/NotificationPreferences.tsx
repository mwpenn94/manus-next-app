import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare, Smartphone, Clock, AlertTriangle, Save, TestTube2, Settings, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Data Structures
type NotificationChannel = 'in-app' | 'email' | 'push' | 'slack';
type NotificationEvent = 
  | 'new_comment' 
  | 'task_assigned' 
  | 'mention' 
  | 'project_update' 
  | 'file_shared' 
  | 'deadline_reminder' 
  | 'new_integration' 
  | 'security_alert' 
  | 'system_maintenance' 
  | 'invoice_paid' 
  | 'feedback_received' 
  | 'team_invite';

type NotificationPreferencesState = Record<NotificationEvent, Record<NotificationChannel, boolean>>;

type QuietHours = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

const eventTypes: { id: NotificationEvent; name: string; description: string }[] = [
  { id: 'new_comment', name: 'New Comment', description: 'When someone comments on your work' },
  { id: 'task_assigned', name: 'Task Assigned', description: 'When a new task is assigned to you' },
  { id: 'mention', name: 'Mention', description: 'When someone @mentions you' },
  { id: 'project_update', name: 'Project Update', description: 'Updates on projects you follow' },
  { id: 'file_shared', name: 'File Shared', description: 'When a file is shared with you' },
  { id: 'deadline_reminder', name: 'Deadline Reminder', description: 'Reminders for upcoming deadlines' },
  { id: 'new_integration', name: 'New Integration', description: 'When a new app is integrated' },
  { id: 'security_alert', name: 'Security Alert', description: 'Important security notifications' },
  { id: 'system_maintenance', name: 'System Maintenance', description: 'Scheduled maintenance windows' },
  { id: 'invoice_paid', name: 'Invoice Paid', description: 'Confirmation of a paid invoice' },
  { id: 'feedback_received', name: 'Feedback Received', description: 'When a user submits feedback' },
  { id: 'team_invite', name: 'Team Invite', description: 'When you are invited to a new team' },
];

const channels: { id: NotificationChannel; name: string; icon: React.ElementType }[] = [
  { id: 'in-app', name: 'In-App', icon: Bell },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'push', name: 'Push', icon: Smartphone },
  { id: 'slack', name: 'Slack', icon: MessageSquare },
];

const initialPreferences: NotificationPreferencesState = eventTypes.reduce((acc, event) => {
  acc[event.id] = {
    'in-app': true,
    'email': event.id === 'security_alert' || event.id === 'invoice_paid',
    'push': ['new_comment', 'mention', 'task_assigned'].includes(event.id),
    'slack': ['mention', 'security_alert'].includes(event.id),
  };
  return acc;
}, {} as NotificationPreferencesState);

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferencesState>(initialPreferences);
  const [quietHours, setQuietHours] = useState<QuietHours>({ enabled: false, startTime: '22:00', endTime: '08:00' });
  const [priority, setPriority] = useState<NotificationPriority>('high');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleBulkAction = useCallback((enable: boolean) => {
    const newPreferences = { ...preferences };
    for (const event of eventTypes) {
      for (const channel of channels) {
        if (!newPreferences[event.id]) {
          newPreferences[event.id] = { 'in-app': false, 'email': false, 'push': false, 'slack': false };
        }
        newPreferences[event.id][channel.id] = enable;
      }
    }
    setPreferences(newPreferences);
  }, [preferences]);

  const handleChannelToggle = useCallback((channelId: NotificationChannel, enable: boolean) => {
    const newPreferences = { ...preferences };
    for (const event of eventTypes) {
      if (!newPreferences[event.id]) {
        newPreferences[event.id] = { 'in-app': false, 'email': false, 'push': false, 'slack': false };
      }
      newPreferences[event.id][channelId] = enable;
    }
    setPreferences(newPreferences);
  }, [preferences]);

  const isChannelEnabled = useCallback((channelId: NotificationChannel): boolean => {
      return eventTypes.every(event => preferences[event.id]?.[channelId]);
  }, [preferences]);

    const handleTestNotification = useCallback(() => {
    // In a real app, this would trigger a backend event.
    console.log('Sending test notification...');
    alert('A test notification has been dispatched to your enabled channels based on your current (unsaved) settings.');
  }, []);

  const handleSave = () => {
    console.log("Preferences saved:", { preferences, quietHours, priority });
    setShowConfirmation(true);
    setLastSaved(new Date());
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <div className="bg-background text-foreground p-4 sm:p-6 lg:p-8 font-sans">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Notification Preferences</h1>
          <p className="text-muted-foreground mt-1">Manage how and when you receive notifications.</p>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={handleTestNotification}><TestTube2 className="mr-2 h-4 w-4" /> Test</Button>
            <Button onClick={handleSave} size="sm"><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
        </div>
      </header>

      <AnimatePresence>
        {showConfirmation && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-md mb-6"
                role="alert"
            >
                <p className="font-bold">Preferences Saved!</p>
                <p>Your notification settings have been updated.</p>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        
<Card>
  <CardHeader>
    <CardTitle className="flex items-center"><Settings className="mr-2 h-5 w-5" /> Granular Controls</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 gap-y-6 min-w-[600px]">
      <div className="font-semibold text-muted-foreground">Event Type</div>
      {channels.map(channel => (
        <div key={channel.id} className="flex items-center justify-center font-semibold text-muted-foreground">
          <channel.icon className="h-5 w-5 mr-2" />
          <span>{channel.name}</span>
        </div>
      ))}

      {eventTypes.map((event, eventIndex) => (
        <React.Fragment key={event.id}>
          {eventIndex > 0 && <Separator className="col-span-5 my-1" />}
          <div>
            <p className="font-medium">{event.name}</p>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>
          {channels.map(channel => (
            <div key={channel.id} className="flex items-center justify-center">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Switch
                  checked={preferences[event.id][channel.id]}
                  onCheckedChange={(checked: boolean) => {
                    const newPreferences = { ...preferences };
                    newPreferences[event.id] = { ...newPreferences[event.id], [channel.id]: checked };
                    setPreferences(newPreferences);
                  }}
                  aria-label={`${event.name} ${channel.name} notification`}
                />
              </motion.div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  </CardContent>
</Card>

        
<Card>
  <CardHeader>
    <CardTitle className="flex items-center"><Settings className="mr-2 h-5 w-5" /> Bulk & Channel Settings</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div>
        <h4 className="font-semibold">Bulk Actions</h4>
        <p className="text-sm text-muted-foreground">Quickly enable or disable all notifications.</p>
      </div>
      <div className="flex space-x-2 mt-3 sm:mt-0">
        <Button variant="outline" size="sm" onClick={() => handleBulkAction(true)}>Enable All</Button>
        <Button variant="destructive" size="sm" onClick={() => handleBulkAction(false)}>Disable All</Button>
      </div>
    </div>
    <div>
        <h4 className="font-semibold mb-2">Channel Quick Toggles</h4>
        <p className="text-sm text-muted-foreground mb-4">Enable or disable all notifications for a specific channel.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {channels.map(channel => (
            <div key={channel.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center">
                    <channel.icon className="h-5 w-5 mr-2" />
                    <span className="font-medium">{channel.name}</span>
                </div>
                <Switch
                    checked={isChannelEnabled(channel.id)}
                    onCheckedChange={(checked: boolean) => handleChannelToggle(channel.id, checked)}
                    aria-label={`Toggle all ${channel.name} notifications`}
                />
            </div>
        ))}
        </div>
    </div>
  </CardContent>
</Card>

        
<Card>
  <CardHeader>
    <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5" /> Additional Settings</CardTitle>
  </CardHeader>
  <CardContent className="grid md:grid-cols-2 gap-8">
    <div className="space-y-4">
      <h4 className="font-semibold">Quiet Hours</h4>
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label htmlFor="quiet-hours-toggle">Enable Quiet Hours</Label>
          <p className="text-sm text-muted-foreground">Silence notifications during specific times.</p>
        </div>
        <Switch
          id="quiet-hours-toggle"
          checked={quietHours.enabled}
          onCheckedChange={(checked: boolean) => setQuietHours({ ...quietHours, enabled: checked })}
        />
      </div>
      <AnimatePresence>
        {quietHours.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <input
                  id="start-time"
                  type="time"
                  value={quietHours.startTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuietHours({ ...quietHours, startTime: e.target.value })}
                  className="mt-1 w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <input
                  id="end-time"
                  type="time"
                  value={quietHours.endTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuietHours({ ...quietHours, endTime: e.target.value })}
                  className="mt-1 w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    <div className="space-y-4">
      <h4 className="font-semibold">Notification Priority</h4>
      <div className="p-4 bg-muted/50 rounded-lg">
        <Label htmlFor="priority-select">Minimum Priority Level</Label>
        <p className="text-sm text-muted-foreground mb-2">Receive notifications at or above this level.</p>
        <Select value={priority} onValueChange={(value: NotificationPriority) => setPriority(value)}>
          <SelectTrigger id="priority-select">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical"><div className="flex items-center"><AlertTriangle className="h-4 w-4 mr-2 text-red-500" />Critical</div></SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </CardContent>
</Card>

      </div>
      <footer className="mt-8 pt-4 border-t border-border text-center text-sm text-muted-foreground">
        <p>Manage your notification settings for the platform.</p>
        {lastSaved && <p className="mt-1">Last saved: {lastSaved.toLocaleString()}</p>}
      </footer>
    </div>
  );
}
