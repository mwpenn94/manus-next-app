
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Share2, Download, Bookmark, GitFork, Layers, HelpCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Type definitions
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  contextTags?: string[];
}

interface ConversationBranch {
  id: string;
  triggerQuery: string;
  messages: Message[];
  children: ConversationBranch[];
}

interface BookmarkItem {
  messageId: string;
  preview: string;
}

// Mock Data
const initialBranch: ConversationBranch = {
  id: 'root',
  triggerQuery: 'Initial Query',
  messages: [],
  children: [
    {
      id: 'branch-1',
      triggerQuery: 'Tell me about the Sovereign AI platform.',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Tell me about the Sovereign AI platform.',
          timestamp: '10:00 AM',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'The Sovereign AI platform is a Manus-parity+ autonomous agent interface designed for complex, multi-turn interactions. It focuses on maintaining context, enabling dynamic workflow adjustments, and providing deep insights into agent operations. What aspect are you most interested in? The personalization engine, or perhaps the self-improvement dashboard?',
          timestamp: '10:01 AM',
          contextTags: ['Sovereign AI', 'Platform Overview'],
        },
      ],
      children: [],
    },
  ],
};

const suggestedQueries = [
  'Explain the context preservation indicator.',
  'How does conversation branching work?',
  'Show me an example of a complex workflow.',
];

export default function SeamlessQueryTransition() {
  const [isChatActive, setIsChatActive] = useState(false);
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState<ConversationBranch>(initialBranch);
  const [activeBranch, setActiveBranch] = useState<ConversationBranch>(initialBranch);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const contextUsage = 65; // Mock percentage

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Simulate finding the right branch or creating a new one
    const matchedBranch = initialBranch.children[0];
    const updatedBranch = { 
        ...matchedBranch, 
        messages: [...matchedBranch.messages] 
    };

    if (!isChatActive) {
        // On first query, we use the pre-defined mock response
        setActiveBranch(updatedBranch);
        setIsChatActive(true);
    } else {
        // For subsequent queries, just add the message
        const assistantResponse: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `This is a simulated response to "${query}". The system would typically generate a detailed answer here, potentially creating new conversational branches.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            contextTags: ['Simulated Response']
        };
        updatedBranch.messages.push(userMessage, assistantResponse);
        setActiveBranch(updatedBranch);
    }
    setQuery('');
  };

  const toggleBookmark = (message: Message) => {
    setBookmarks(prev => {
        const existing = prev.find(b => b.messageId === message.id);
        if (existing) {
            return prev.filter(b => b.messageId !== message.id);
        } else {
            return [...prev, { messageId: message.id, preview: message.content.substring(0, 50) + '...' }];
        }
    });
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto p-4 bg-background font-sans">
        <motion.div
          layout
          initial={{ borderRadius: '0.5rem' }}
          className="bg-card border border-border shadow-lg"
        >
          <AnimatePresence>
            {!isChatActive ? (
              <motion.div
                key="query-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6"
              >
                <h2 className="text-2xl font-bold text-foreground mb-2">Sovereign AI</h2>
                <p className="text-muted-foreground mb-6">Start a conversation to explore its capabilities.</p>
                <form onSubmit={handleQuerySubmit} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask anything about the platform..."
                    className="w-full pl-10 pr-4 py-3 rounded-md bg-background border border-input focus:ring-2 focus:ring-primary focus:outline-none transition-shadow"
                  />
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="chat-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col h-[70vh]"
              >
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-lg">Conversation</h3>
                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon"><GitFork className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Conversation Branches</DialogTitle>
                                </DialogHeader>
                                <p className="text-muted-foreground text-sm">Branching visualization is a complex feature. This mock shows a placeholder.</p>
                                {/* Visualization would go here */}
                            </DialogContent>
                        </Dialog>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Bookmark className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Bookmarks</DialogTitle>
                                </DialogHeader>
                                {bookmarks.length > 0 ? (
                                    <ul>{bookmarks.map(b => <li key={b.messageId} className="text-sm p-2 border-b">{b.preview}</li>)}</ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
                                )}
                            </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon"><Share2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    </div>
                </div>

                {/* Message Area */}
                <ScrollArea className="flex-grow p-4">
                  {activeBranch.messages.map((msg) => (
                    <motion.div 
                        key={msg.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start gap-3 my-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && <div className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold">A</div>}
                      <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <div className="text-xs opacity-70 mt-2 flex items-center justify-between">
                            <span>{msg.timestamp}</span>
                            <div className="flex items-center gap-2">
                                {msg.contextTags && msg.contextTags.length > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger><Layers className="h-3 w-3" /></TooltipTrigger>
                                        <TooltipContent>
                                            <p>Context Preserved:</p>
                                            <ul className="list-disc list-inside">
                                                {msg.contextTags.map(tag => <li key={tag}>{tag}</li>)}
                                            </ul>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                <button onClick={() => toggleBookmark(msg)}>
                                    <Bookmark className={`h-3 w-3 ${bookmarks.some(b => b.messageId === msg.id) ? 'fill-current text-yellow-400' : ''}`} />
                                </button>
                            </div>
                        </div>
                      </div>
                      {msg.role === 'user' && <div className="bg-foreground text-background rounded-full h-8 w-8 flex items-center justify-center font-bold">U</div>}
                    </motion.div>
                  ))}
                </ScrollArea>

                {/* Footer with Input and Context Meter */}
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                        {suggestedQueries.map(sq => (
                            <Button key={sq} variant="outline" size="sm" onClick={() => setQuery(sq)}>{sq}</Button>
                        ))}
                    </div>
                    <Separator className="my-2"/>
                    <form onSubmit={handleQuerySubmit} className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Continue the conversation..."
                            className="w-full pr-10 pl-4 py-2 rounded-md bg-background border border-input focus:ring-2 focus:ring-primary focus:outline-none transition-shadow"
                        />
                        <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2">
                            <MessageSquare className="h-5 w-5" />
                        </Button>
                    </form>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Context Window Usage</span>
                        <Progress value={contextUsage} className="w-1/3" />
                        <span>{contextUsage}%</span>
                        <Tooltip>
                            <TooltipTrigger><HelpCircle className="h-4 w-4" /></TooltipTrigger>
                            <TooltipContent>This meter shows how much of the available conversational context is being used.</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
