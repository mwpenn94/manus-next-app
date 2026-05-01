import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link2, Code, Pilcrow, Undo, Redo, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, AlignJustify, Quote, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Utility Functions --- //
const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

// --- Mocked shadcn/ui Components --- //
// In a real project, these would be imported from '@/components/ui/*'

const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link', size?: 'default' | 'sm' | 'lg' | 'icon' }>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };
  return <button className={cn( 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)} ref={ref} {...props} />;
});
Button.displayName = 'Button';

const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

const Badge = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' }>(({ className, variant = 'default', ...props }, ref) => {
    const variants = {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
    };
    return <div ref={ref} className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', variants[variant], className)} {...props} />;
});
Badge.displayName = 'Badge';

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return <input className={cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} ref={ref} {...props} />;
});
Input.displayName = 'Input';

// --- Component Types --- //
type FormatAction = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList' | 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull' | 'insertHorizontalRule';
type FormatBlockAction = 'H1' | 'H2' | 'H3' | 'P' | 'BLOCKQUOTE' | 'PRE';

// --- Initial Content --- //
const placeholderText = `
<h1>Welcome to the Rich Text Editor</h1>
<p>This is a <strong>production-ready</strong> component built with React, TypeScript, and Tailwind CSS.</p>
<ul>
  <li>Real-time word and character count.</li>
  <li>Markdown source view toggle.</li>
  <li>Undo/Redo functionality.</li>
</ul>
<p>Start typing to see the magic happen!</p>
`;

// --- Main Component --- //
const RichTextEditor: React.FC = () => {
    const [content, setContent] = useState<string>(placeholderText);
    const [isMarkdown, setIsMarkdown] = useState<boolean>(false);
    const [history, setHistory] = useState<string[]>([placeholderText]);
    const [historyIndex, setHistoryIndex] = useState<number>(0);
    const [showLinkPopover, setShowLinkPopover] = useState<boolean>(false);
    const [linkUrl, setLinkUrl] = useState<string>('');
    const editorRef = useRef<HTMLDivElement>(null);
    const linkInputRef = useRef<HTMLInputElement>(null);

    // Update history stack on content change
    useEffect(() => {
        if (history[historyIndex] !== content) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(content);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    }, [content, history, historyIndex]);

    // Focus link input when popover opens
    useEffect(() => {
        if (showLinkPopover) {
            linkInputRef.current?.focus();
        }
    }, [showLinkPopover]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setContent(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setContent(history[newIndex]);
        }
    }, [history, historyIndex]);

    const wordCount = useMemo(() => content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length, [content]);
    const charCount = useMemo(() => content.replace(/<[^>]*>/g, '').length, [content]);

    const executeCommand = (command: string, value?: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, value);
            setContent(editorRef.current.innerHTML);
        }
    };

    const handleFormat = (action: FormatAction) => executeCommand(action);
    const handleBlockFormat = (action: FormatBlockAction) => executeCommand('formatBlock', `<${action}>`);

    const handleLink = () => {
        if (linkUrl) {
            executeCommand('createLink', linkUrl);
            setShowLinkPopover(false);
            setLinkUrl('');
        }
    };

    const ToolbarButton = ({ onClick, children, 'aria-label': ariaLabel }: { onClick: () => void; children: React.ReactNode; 'aria-label': string }) => (
        <Button variant="ghost" size="sm" onClick={onClick} aria-label={ariaLabel} className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted">
            {children}
        </Button>
    );

    return (
        <Card className="w-full max-w-4xl mx-auto bg-background border-border shadow-2xl shadow-primary/5 relative overflow-hidden">
            {/* -- Toolbar -- */}
            <div className="p-2 border-b border-border flex items-center justify-between flex-wrap gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-1 flex-wrap">
                    <ToolbarButton onClick={handleUndo} aria-label="Undo"><Undo className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={handleRedo} aria-label="Redo"><Redo className="h-4 w-4" /></ToolbarButton>
                    <div className="w-[1px] h-6 bg-border mx-2"></div>
                    <ToolbarButton onClick={() => handleBlockFormat('H1')} aria-label="Heading 1"><Heading1 className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleBlockFormat('H2')} aria-label="Heading 2"><Heading2 className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleBlockFormat('H3')} aria-label="Heading 3"><Heading3 className="h-4 w-4" /></ToolbarButton>
                    <div className="w-[1px] h-6 bg-border mx-2"></div>
                    <ToolbarButton onClick={() => handleFormat('bold')} aria-label="Bold"><Bold className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleFormat('italic')} aria-label="Italic"><Italic className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleFormat('underline')} aria-label="Underline"><Underline className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleFormat('strikeThrough')} aria-label="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolbarButton>
                    <div className="w-[1px] h-6 bg-border mx-2"></div>
                    <ToolbarButton onClick={() => handleFormat('justifyLeft')} aria-label="Align Left"><AlignLeft className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleFormat('justifyCenter')} aria-label="Align Center"><AlignCenter className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleFormat('justifyRight')} aria-label="Align Right"><AlignRight className="h-4 w-4" /></ToolbarButton>
                    <div className="w-[1px] h-6 bg-border mx-2"></div>
                    <ToolbarButton onClick={() => handleFormat('insertUnorderedList')} aria-label="Unordered List"><List className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleFormat('insertOrderedList')} aria-label="Ordered List"><ListOrdered className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleBlockFormat('BLOCKQUOTE')} aria-label="Blockquote"><Quote className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleFormat('insertHorizontalRule')} aria-label="Horizontal Rule"><Minus className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => setShowLinkPopover(true)} aria-label="Insert Link"><Link2 className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton onClick={() => handleBlockFormat('PRE')} aria-label="Code Block"><Code className="h-4 w-4" /></ToolbarButton>
                </div>
            </div>

            {/* -- Editor Content -- */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={isMarkdown ? 'markdown' : 'editor'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4"
                >
                    {isMarkdown ? (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-96 bg-background text-foreground font-mono text-sm resize-none focus:outline-none leading-relaxed"
                            aria-label="Markdown source editor"
                        />
                    ) : (
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => setContent(e.currentTarget.innerHTML)}
                            className="w-full h-96 prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none overflow-y-auto leading-relaxed"
                            aria-label="Rich text editor"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* -- Link Popover -- */}
            <AnimatePresence>
                {showLinkPopover && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-14 right-4 bg-card p-4 rounded-lg shadow-lg border border-border z-20 w-80"
                    >
                        <h3 className="text-sm font-medium mb-2">Insert Link</h3>
                        <Input
                            ref={linkInputRef}
                            type="url"
                            placeholder="https://example.com"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                            className="w-full mb-2"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowLinkPopover(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleLink}>Insert</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* -- Footer -- */}
            <div className="p-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground sticky bottom-0 bg-background/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                    <Badge variant="secondary">{wordCount} words</Badge>
                    <Badge variant="secondary">{charCount} characters</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsMarkdown(!isMarkdown)} className="text-muted-foreground">
                    <Pilcrow className="h-4 w-4 mr-2" />
                    {isMarkdown ? 'Rich Text View' : 'Markdown View'}
                </Button>
            </div>
        </Card>
    );
};

export default RichTextEditor;
