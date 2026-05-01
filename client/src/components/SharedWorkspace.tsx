import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, GitCommit, CheckCircle, AlertCircle, Edit, Eye, Crown, Pin } from 'lucide-react';

// Type Definitions
type User = {
  id: string;
  name: string;
  avatar: string;
  permission: 'owner' | 'editor' | 'viewer';
};

type UserViewport = {
  userId: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

type Annotation = {
  id: string;
  userId: string;
  position: { x: number; y: number };
  content: string;
};

type CursorPosition = {
  userId: string;
  x: number;
  y: number;
};

type DocumentVersion = {
  id: string;
  timestamp: string;
  author: string;
};

// Mock Data
const mockUsers: User[] = [
  { id: 'user-1', name: 'Alex', avatar: 'A', permission: 'owner' },
  { id: 'user-2', name: 'Maria', avatar: 'M', permission: 'editor' },
  { id: 'user-3', name: 'David', avatar: 'D', permission: 'viewer' },
];

const mockDocumentContent = `
# Collaborative Document Title

This is a shared document that multiple users can edit in real-time. 

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. 

Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras id magna. 

## Section 2

Phasellus purus. Pellentesque tristique imperdiet metus. 

- List item one
- List item two
- List item three

Donec vel est. Aliquam pulvinar, magna et dictum ultricies, ipsum elit consequat enim, sit amet viverra leo neque vitae ligula. 

Integer id enim. In pretium, massa ut laoreet scelerisque, turpis ipsum pulvinar nulla, ut pulvinar nisl nisl id nisl. 

`.repeat(10);

const mockVersions: DocumentVersion[] = [
  { id: 'v3', timestamp: '2026-05-01T14:30:00Z', author: 'Maria' },
  { id: 'v2', timestamp: '2026-05-01T12:15:00Z', author: 'Alex' },
  { id: 'v1', timestamp: '2026-04-30T10:00:00Z', author: 'Alex' },
];

const permissionIcons = {
  owner: <Crown className="w-3 h-3" />,
  editor: <Edit className="w-3 h-3" />,
  viewer: <Eye className="w-3 h-3" />,
};

const permissionLabels = {
    owner: 'Owner',
    editor: 'Editor',
    viewer: 'Viewer',
};

const UserCursor = ({ position, user }: { position: CursorPosition; user: User }) => (
  <motion.div
    className="absolute z-50 flex items-center gap-1"
    style={{ left: position.x, top: position.y }}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.2 }}
  >
    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(var(--${Number(user.id.split('-')[1]) * 137}))` }} />
    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `hsl(var(--${Number(user.id.split('-')[1]) * 137}))`, color: '#fff' }}>{user.name}</span>
  </motion.div>
);

const AnnotationComponent = ({ annotation, user }: { annotation: Annotation; user?: User }) => (
    <motion.div
        className="absolute z-40 p-2 rounded-lg shadow-lg bg-yellow-300 text-black w-40"
        style={{ left: annotation.position.x, top: annotation.position.y }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        drag
        dragMomentum={false}
    >
        <div className="flex items-center mb-1">
            <div className='w-4 h-4 mr-2 rounded-full text-white text-[10px] flex items-center justify-center font-bold' style={{ backgroundColor: user ? `hsl(var(--${Number(user.id.split('-')[1]) * 137}))` : '#000' }}>{user?.avatar}</div>
            <p className="text-xs font-bold">{user?.name}</p>
        </div>
        <p className="text-sm">{annotation.content}</p>
    </motion.div>
);

const Minimap = ({ content, viewports, users }: { content: string; viewports: UserViewport[]; users: User[] }) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const contentHeight = 1000; // Simplified height

  return (
    <div ref={minimapRef} className="relative h-full bg-muted/50 rounded-lg overflow-hidden">
      <div className="absolute inset-0 text-[2px] text-muted-foreground/30 overflow-hidden whitespace-pre-wrap p-1">
        {content}
      </div>
      {viewports.map(vp => {
        const user = users.find(u => u.id === vp.userId);
        const top = (vp.scrollTop / vp.scrollHeight) * 100;
        const height = (vp.clientHeight / vp.scrollHeight) * 100;
        return (
          <TooltipProvider key={vp.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="absolute w-full border-l-2"
                  style={{ top: `${top}%`, height: `${height}%`, borderColor: user ? `hsl(var(--${Number(vp.userId.split('-')[1]) * 137}))` : '#fff' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className='absolute -right-1.5 -top-1.5 w-3 h-3 rounded-full text-white text-[8px] flex items-center justify-center' style={{ backgroundColor: user ? `hsl(var(--${Number(vp.userId.split('-')[1]) * 137}))` : '#fff' }}>{user?.avatar}</div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{user?.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

export default function SharedWorkspace() {
  const [versions] = useState<DocumentVersion[]>(mockVersions);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
    const [annotations, setAnnotations] = useState<Annotation[]>([
    { id: 'anno-1', userId: 'user-2', position: { x: 100, y: 200 }, content: 'We should expand on this point.' },
  ]);
    const [cursors, setCursors] = useState<CursorPosition[]>([])
  const mainContentRef = useRef<HTMLDivElement>(null);
  const secondaryContentRef = useRef<HTMLDivElement>(null);

  const [viewports, setViewports] = useState<UserViewport[]>([
    { userId: 'user-1', scrollTop: 0, scrollHeight: 1000, clientHeight: 500 },
    { userId: 'user-2', scrollTop: 250, scrollHeight: 1000, clientHeight: 500 },
    { userId: 'user-3', scrollTop: 700, scrollHeight: 1000, clientHeight: 500 },
  ]);

    useEffect(() => {
    // Simulate cursor movements
    const interval = setInterval(() => {
      setCursors([
        { userId: 'user-2', x: Math.random() * 400, y: Math.random() * 600 },
        { userId: 'user-3', x: Math.random() * 400, y: Math.random() * 600 },
      ]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddAnnotation = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newAnnotation: Annotation = {
        id: `anno-${Date.now()}`,
        userId: 'user-1', // Current user
        position: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        content: 'New note...'
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (mainContentRef.current && secondaryContentRef.current) {
        secondaryContentRef.current.scrollTop = mainContentRef.current.scrollTop;
    }
    // In a real app, this would update the current user's viewport
  };

  return (
    <Card className="w-full h-[800px] flex flex-col bg-background">
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div className="flex -space-x-2">
                    {mockUsers.map(user => (
                        <TooltipProvider key={user.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className='w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold border-2 border-background' style={{ backgroundColor: `hsl(var(--${Number(user.id.split('-')[1]) * 137}))` }}>
                                        {user.avatar}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="flex items-center gap-2">
                                        {permissionIcons[user.permission]} {user.name} ({permissionLabels[user.permission]})
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                        <GitCommit className="w-4 h-4" />
                        <span>Version: {versions[0].id}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {versions.map(v => (
                        <DropdownMenuItem key={v.id}>
                            {v.id} - {new Date(v.timestamp).toLocaleTimeString()} by {v.author}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {syncStatus === 'synced' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {syncStatus === 'syncing' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><AlertCircle className="w-4 h-4 text-yellow-500" /></motion.div>}
            {syncStatus === 'offline' && <AlertCircle className="w-4 h-4 text-red-500" />}
            <span>{syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 grid grid-cols-12 gap-0 overflow-hidden">
        <div className="col-span-11 grid grid-cols-2 gap-0 h-full relative">
            <div ref={mainContentRef} onScroll={handleScroll} className="h-full overflow-y-auto p-8 border-r border-border prose prose-invert max-w-none">
                <div className="relative" onDoubleClick={handleAddAnnotation}>
                    <AnimatePresence>
                        {cursors.map(cursor => {
                            const user = mockUsers.find(u => u.id === cursor.userId);
                            return user ? <UserCursor key={cursor.userId} position={cursor} user={user} /> : null;
                        })}
                    </AnimatePresence>
                    <AnimatePresence>
                        {annotations.map(anno => {
                            const user = mockUsers.find(u => u.id === anno.userId);
                            return <AnnotationComponent key={anno.id} annotation={anno} user={user} />;
                        })}
                    </AnimatePresence>
                    {mockDocumentContent}
                </div>
            </div>
            <div ref={secondaryContentRef} className="h-full overflow-y-auto p-8 prose prose-invert max-w-none bg-muted/20">
                <div className="relative" onDoubleClick={handleAddAnnotation}>
                    <AnimatePresence>
                        {cursors.map(cursor => {
                            const user = mockUsers.find(u => u.id === cursor.userId);
                            return user ? <UserCursor key={cursor.userId} position={cursor} user={user} /> : null;
                        })}
                    </AnimatePresence>
                    <AnimatePresence>
                        {annotations.map(anno => {
                            const user = mockUsers.find(u => u.id === anno.userId);
                            return <AnnotationComponent key={anno.id} annotation={anno} user={user} />;
                        })}
                    </AnimatePresence>
                    {mockDocumentContent}
                </div>
            </div>
        </div>
        <div className="col-span-1 p-2 border-l border-border">
            <Minimap content={mockDocumentContent} viewports={viewports} users={mockUsers} />
        </div>
      </CardContent>
    </Card>
  );
}
