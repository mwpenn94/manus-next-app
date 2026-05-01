import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, Heading2, List, Code, Save, Users, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Type definitions
type Collaborator = {
  id: string;
  name: string;
  avatarUrl: string;
  color: string;
  status: 'online' | 'idle';
};

type Edit = {
  id: number;
  user: string;
  timestamp: Date;
  action: string;
};

// Mock Data
const mockCollaborators: Collaborator[] = [
  { id: 'user-1', name: 'Alex', avatarUrl: 'https://i.pravatar.cc/150?u=alex', color: '#34D399', status: 'online' },
  { id: 'user-2', name: 'Sam', avatarUrl: 'https://i.pravatar.cc/150?u=sam', color: '#FBBF24', status: 'online' },
  { id: 'user-3', name: 'Jordan', avatarUrl: 'https://i.pravatar.cc/150?u=jordan', color: '#A78BFA', status: 'idle' },
];

const mockInitialContent = `
<h2>Welcome to the Collaborative Editor!</h2>
<p>This is a real-time collaborative text editor component. You can see other users\' cursors and presence.</p>
<ul>
  <li>Rich text editing</li>
  <li>Presence awareness</li>
  <li>Simulated real-time collaboration</li>
</ul>
<p>Start typing to see the magic happen.</p>
<code>console.log("Hello, world!");</code>
`;

const mockEditHistory: Edit[] = [
    { id: 1, user: 'Alex', timestamp: new Date(Date.now() - 5 * 60000), action: 'Created document' },
    { id: 2, user: 'Sam', timestamp: new Date(Date.now() - 3 * 60000), action: 'Added initial content' },
    { id: 3, user: 'Jordan', timestamp: new Date(Date.now() - 1 * 60000), action: 'Formatted list' },
];

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export default function CollaborativeEditor() {
  const [content, setContent] = useState<string>(mockInitialContent);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved changes'>('Saved');
  const [conflict, setConflict] = useState<boolean>(false);
  const [cursors, setCursors] = useState<Array<{ userId: string; position: { top: number; left: number } }>>([]);
  const [history, setHistory] = useState<Edit[]>(mockEditHistory);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (saveStatus === 'Unsaved changes') {
        setSaveStatus('Saving...');
        setTimeout(() => {
          setSaveStatus('Saved');
          // Simulate a conflict randomly
          if (Math.random() > 0.8) {
            setConflict(true);
            setTimeout(() => setConflict(false), 3000);
          }
        }, 1500);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, saveStatus]);

  useEffect(() => {
    const editorNode = editorRef.current;
    if (!editorNode) return;

    const cursorInterval = setInterval(() => {
      const newCursors = mockCollaborators.map(c => ({
        userId: c.id,
        position: {
          top: Math.random() * (editorNode.offsetHeight - 20),
          left: Math.random() * (editorNode.offsetWidth - 10),
        }
      }));
      setCursors(newCursors);
    }, 2000);

    return () => clearInterval(cursorInterval);
  }, []);

  const handleContentChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    setContent(e.currentTarget.innerHTML);
    setSaveStatus('Unsaved changes');
  }, []);

  const formatDoc = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setContent(editorRef.current?.innerHTML || '');
    setSaveStatus('Unsaved changes');
  };

  const toolbarButtons = [
    { command: 'bold', icon: Bold, tooltip: 'Bold' },
    { command: 'italic', icon: Italic, tooltip: 'Italic' },
    { command: 'formatBlock', value: 'h2', icon: Heading2, tooltip: 'Heading' },
    { command: 'insertUnorderedList', icon: List, tooltip: 'List' },
    { command: 'formatBlock', value: 'pre', icon: Code, tooltip: 'Code Block' },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-background text-foreground h-[700px] w-full">
        <div className="flex-grow flex flex-col">
          <Card className="flex-grow flex flex-col">
            <CardHeader className="p-2 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {toolbarButtons.map((btn) => (
                    <Tooltip key={btn.tooltip}>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); formatDoc(btn.command, btn.value); }}>
                          <btn.icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{btn.tooltip}</p></TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={saveStatus}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant={saveStatus === 'Saved' ? 'secondary' : 'default'} className="flex items-center gap-1">
                        <Save className="h-3 w-3" />
                        {saveStatus}
                      </Badge>
                    </motion.div>
                  </AnimatePresence>
                  {conflict && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Conflict
                      </Badge>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow relative overflow-y-auto">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="prose prose-invert max-w-none h-full focus:outline-none"
                onInput={handleContentChange}
                dangerouslySetInnerHTML={{ __html: content }}
              />
              <AnimatePresence>
                {cursors.map(cursor => {
                  const user = mockCollaborators.find(c => c.id === cursor.userId);
                  if (!user) return null;
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.3 }}
                      className="absolute pointer-events-none flex items-center"
                      style={{ top: cursor.position.top, left: cursor.position.left }}
                    >
                      <div style={{ backgroundColor: user.color }} className="w-0.5 h-5" />
                      <div style={{ backgroundColor: user.color }} className="text-white text-xs px-1.5 py-0.5 rounded-r-md whitespace-nowrap">
                        {user.name}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Collaborators
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {mockCollaborators.map((user, index) => (
                <motion.div 
                  key={user.id} 
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                      user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                    )} />
                  </div>
                  <span className="font-medium text-sm">{user.name}</span>
                </motion.div>
              ))}
            </CardContent>
          </Card>
          <Card className="flex-grow">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Edit History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-sm">
              <div className="relative h-full overflow-y-auto pr-2">
                {history.map((edit, index) => (
                  <motion.div 
                    key={edit.id} 
                    className="flex gap-3 mb-4 last:mb-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <div className="flex flex-col items-center">
                      <Avatar className="h-8 w-8 mb-1">
                        <AvatarImage src={mockCollaborators.find(c => c.name === edit.user)?.avatarUrl} />
                        <AvatarFallback>{edit.user.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {index < history.length - 1 && <div className="w-px flex-grow bg-border" />} 
                    </div>
                    <div>
                      <p><span className="font-semibold">{edit.user}</span> {edit.action.toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(edit.timestamp)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
