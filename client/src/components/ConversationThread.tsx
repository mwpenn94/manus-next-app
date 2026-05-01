import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CornerDownRight, MessageSquare, Smile, MoreHorizontal, Edit, Trash2, Undo, ChevronDown, ChevronRight, SendHorizonal, CircleX } from 'lucide-react';

// TypeScript Types
interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

interface Reaction {
  emoji: string;
  userId: string;
  username: string;
}

interface Message {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  replies: Message[];
  reactions: Reaction[];
  isEditing?: boolean;
  editHistory?: { content: string; editedAt: string }[];
  isDeleted?: boolean;
}

// Mock Data
const mockUsers: Record<string, User> = {
  'user1': { id: 'user1', name: 'Alex Turing', avatarUrl: 'https://i.pravatar.cc/150?u=alex' },
  'user2': { id: 'user2', name: 'Brenda Neumann', avatarUrl: 'https://i.pravatar.cc/150?u=brenda' },
  'user3': { id: 'user3', name: 'Casey Knuth', avatarUrl: 'https://i.pravatar.cc/150?u=casey' },
  'user4': { id: 'user4', name: 'Dana Scully', avatarUrl: 'https://i.pravatar.cc/150?u=dana' },
};

const generateMockMessages = (): Message[] => [
    { id: 'msg1', author: mockUsers['user1'], content: "Just pushed the latest updates for the real-time collaboration feature. Can everyone take a look?", timestamp: "2024-05-01T10:00:00Z", replies: [ { id: 'msg1-1', author: mockUsers['user2'], content: "On it. The new cursor presence feature looks great!", timestamp: "2024-05-01T10:05:00Z", replies: [], reactions: [{ emoji: '👍', userId: 'user1', username: 'Alex Turing' }], }, { id: 'msg1-2', author: mockUsers['user3'], content: "I'm seeing a minor CSS alignment issue on the new share modal. I'll post a screenshot.", timestamp: "2024-05-01T10:07:00Z", replies: [ { id: 'msg1-2-1', author: mockUsers['user1'], content: "Thanks, Casey. I see it too. Pushing a fix now.", timestamp: "2024-05-01T10:12:00Z", replies: [], reactions: [], } ], reactions: [], } ], reactions: [{ emoji: '🚀', userId: 'user2', username: 'Brenda Neumann' }, { emoji: '👀', userId: 'user3', username: 'Casey Knuth' }], },
    { id: 'msg2', author: mockUsers['user4'], content: "Platform intelligence report is ready. Key insight: user engagement is up 15% WoW. We should double down on the new onboarding flow.", timestamp: "2024-05-01T11:30:00Z", replies: [], reactions: [{ emoji: '🎉', userId: 'user1', username: 'Alex Turing' }, { emoji: '📈', userId: 'user2', username: 'Brenda Neumann' }], },
    { id: 'msg3', author: mockUsers['user2'], content: "I'm having trouble with the local dev environment after the last pull. Anyone else?", timestamp: "2024-05-01T12:15:00Z", replies: [ { id: 'msg3-1', author: mockUsers['user3'], content: "Yeah, you need to run `npm run clean-install`. The dependencies were updated.", timestamp: "2024-05-01T12:18:00Z", replies: [], reactions: [{ emoji: '👌', userId: 'user2', username: 'Brenda Neumann' }] } ], reactions: [] },
    { id: 'msg4', author: mockUsers['user1'], content: "Quick poll: Dark mode or Light mode for the new dashboard?", timestamp: "2024-05-01T14:00:00Z", replies: [], reactions: [{ emoji: '🤔', userId: 'user4', username: 'Dana Scully' }] },
    { id: 'msg5', author: mockUsers['user3'], content: "The end-to-end tests are failing on the staging server. It seems to be a timeout issue with the new database service.", timestamp: "2024-05-01T15:22:00Z", replies: [ { id: 'msg5-1', author: mockUsers['user1'], content: "I'll investigate. The connection pool might be too small.", timestamp: "2024-05-01T15:25:00Z", replies: [], reactions: [] } ], reactions: [{ emoji: '🚨', userId: 'user4', username: 'Dana Scully' }] }
];

const formatTime = (isoString: string): string => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🚀', '🎉'];

const findAndModifyMessage = (messages: Message[], messageId: string, modifyFn: (message: Message) => void): Message[] => {
    return messages.map(msg => {
        if (msg.id === messageId) {
            const newMsg = { ...msg };
            modifyFn(newMsg);
            return newMsg;
        }
        if (msg.replies.length > 0) {
            return { ...msg, replies: findAndModifyMessage(msg.replies, messageId, modifyFn) };
        }
        return msg;
    });
};

const MessageItem = ({ message, depth = 0, currentUser, onUpdate }: { message: Message; depth?: number; currentUser: User; onUpdate: (messageId: string, modifyFn: (message: Message) => void) => void; }) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(depth > 1);
    const [isReplying, setIsReplying] = useState<boolean>(false);
    const [replyText, setReplyText] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editText, setEditText] = useState<string>(message.content);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleReaction = (emoji: string) => {
        onUpdate(message.id, msg => {
            const existingReactionIndex = msg.reactions.findIndex(r => r.userId === currentUser.id && r.emoji === emoji);
            if (existingReactionIndex > -1) {
                msg.reactions.splice(existingReactionIndex, 1);
            } else {
                msg.reactions.push({ emoji, userId: currentUser.id, username: currentUser.name });
            }
        });
    };

    const handleEdit = () => {
        onUpdate(message.id, msg => {
            if (!msg.editHistory) msg.editHistory = [];
            msg.editHistory.push({ content: msg.content, editedAt: new Date().toISOString() });
            msg.content = editText;
        });
        setIsEditing(false);
    };

    const handleDelete = () => onUpdate(message.id, msg => { msg.isDeleted = true; });
    const handleUndoDelete = () => onUpdate(message.id, msg => { msg.isDeleted = false; });

    const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setReplyText(e.target.value);
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
    };

    if (message.isDeleted) {
        return (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={cn("flex items-center justify-between text-sm text-muted-foreground italic p-2 rounded-md bg-muted/50", depth > 0 && "ml-8 mt-4 pl-4")}>
                <span>Message deleted.</span>
                <Button variant="ghost" size="sm" onClick={handleUndoDelete}><Undo className="w-4 h-4 mr-2" />Undo</Button>
            </motion.div>
        );
    }

    return (
        <motion.div layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className={cn("flex flex-col", depth > 0 ? "ml-8 mt-4 border-l-2 border-border/50 pl-4" : "mt-6")}>
            <div className="flex items-start gap-3 group relative">
                <Avatar className="w-10 h-10 border border-border shadow-sm"><AvatarImage src={message.author.avatarUrl} alt={message.author.name} /><AvatarFallback>{message.author.name.charAt(0)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 text-sm">
                        <span className="font-semibold text-foreground">{message.author.name}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                        {message.editHistory && message.editHistory.length > 0 && <TooltipProvider><Tooltip><TooltipTrigger><span className="text-xs text-muted-foreground cursor-help">(edited)</span></TooltipTrigger><TooltipContent><p>Last edited at {formatTime(message.editHistory[message.editHistory.length - 1].editedAt)}</p></TooltipContent></Tooltip></TooltipProvider>}
                    </div>
                    {isEditing ? (
                        <div className="mt-2">
                            <Textarea value={editText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditText(e.target.value)} className="min-h-[80px] bg-background" autoFocus />
                            <div className="flex gap-2 mt-2"><Button size="sm" onClick={handleEdit}>Save Changes</Button><Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button></div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border/30 rounded-2xl rounded-tl-none p-3 text-sm text-card-foreground shadow-sm relative prose prose-sm max-w-none prose-p:my-2 prose-blockquote:my-2 prose-headings:my-3">
                            {message.content}
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {message.reactions.length > 0 && (
                            <div className="flex gap-1 items-center flex-wrap">
                                {Object.entries(message.reactions.reduce((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] || 0) + 1 }), {} as Record<string, number>)).map(([emoji, count]) => (
                                    <TooltipProvider key={emoji}><Tooltip><TooltipTrigger asChild>
                                        <button onClick={() => handleReaction(emoji)} className={cn("px-2 py-0.5 text-xs rounded-full bg-muted hover:bg-primary/20 transition-colors flex items-center gap-1 border border-border/50", message.reactions.some(r => r.userId === currentUser.id && r.emoji === emoji) && "bg-primary/20 border-primary/50")}>
                                            <span>{emoji}</span><span>{count}</span>
                                        </button>
                                    </TooltipTrigger><TooltipContent><p>{message.reactions.filter(r => r.emoji === emoji).map(r => r.username).join(', ')}</p></TooltipContent></Tooltip></TooltipProvider>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1 hover:text-foreground transition-colors"><MessageSquare className="w-3 h-3" />Reply</button>
                        {message.replies.length > 0 && <button onClick={() => setIsCollapsed(!isCollapsed)} className="flex items-center gap-1 hover:text-foreground transition-colors">{isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}</button>}
                    </div>
                    <AnimatePresence>
                        {isReplying && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-3 flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <Avatar className="w-8 h-8 border border-border"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback></Avatar>
                                    <Textarea value={replyText} onChange={handleReplyChange} placeholder={`Reply to ${message.author.name}...`} className="min-h-[60px] text-sm resize-none flex-1 bg-background" autoFocus />
                                </div>
                                <div className="flex justify-between items-center ml-10">
                                    {isTyping ? <span className="text-xs text-muted-foreground italic">Typing...</span> : <div/>}
                                    <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>Cancel</Button><Button size="sm" disabled={!replyText.trim()}>Send</Button></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="absolute top-[-12px] right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-card border border-border rounded-full shadow-sm">
                    <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="w-7 h-7 rounded-full"><Smile className="w-4 h-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-1"><div className="flex gap-1">{EMOJI_LIST.map(emoji => <Button key={emoji} variant="ghost" size="icon" className="text-lg rounded-full" onClick={() => handleReaction(emoji)}>{emoji}</Button>)}</div></PopoverContent></Popover>
                    {currentUser.id === message.author.id && <><Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button></>}
                </div>
            </div>
            <AnimatePresence initial={false}>
                {!isCollapsed && message.replies.length > 0 && <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">{message.replies.map(reply => <MessageItem key={reply.id} message={reply} depth={depth + 1} currentUser={currentUser} onUpdate={onUpdate} />)}</motion.div>}
            </AnimatePresence>
        </motion.div>
    );
};

export default function ConversationThread() {
    const [messages, setMessages] = useState<Message[]>([]);
    useEffect(() => { setMessages(generateMockMessages()); }, []);
    const currentUser = mockUsers['user1'];

    const handleUpdateMessage = useCallback((messageId: string, modifyFn: (message: Message) => void) => {
        setMessages(currentMessages => findAndModifyMessage(currentMessages, messageId, modifyFn));
    }, []);

    return (
        <div className="bg-background text-foreground p-4 md:p-6 max-w-4xl mx-auto font-sans min-h-screen">
            <div className="mb-6 border-b border-border pb-4">
                <h1 className="text-2xl font-bold tracking-tight">Team Discussion</h1>
                <p className="text-muted-foreground text-sm mt-1">Real-time collaboration and platform intelligence</p>
            </div>
            <AnimatePresence>
                <motion.div layout className="space-y-2">
                    {messages.map(msg => <MessageItem key={msg.id} message={msg} currentUser={currentUser} onUpdate={handleUpdateMessage} />)}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
