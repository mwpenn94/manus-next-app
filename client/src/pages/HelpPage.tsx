/**
 * Help & Knowledge Base — Keyboard shortcuts, FAQ, and support links
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Keyboard,
  Search,
  MessageSquare,
  BookOpen,
  Zap,
  Shield,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["⌘", "N"], description: "New task" },
  { keys: ["⌘", "B"], description: "Toggle sidebar" },
  { keys: ["⌘", "\\"], description: "Toggle sidebar (alt)" },
  { keys: ["⌘", ","], description: "Open settings" },
  { keys: ["⌘", "/"], description: "Show keyboard shortcuts" },
  { keys: ["⌘", "Enter"], description: "Send message" },
  { keys: ["Shift", "Enter"], description: "New line in input" },
  { keys: ["Esc"], description: "Close dialog / cancel" },
  { keys: ["⌘", "Shift", "D"], description: "Toggle dark mode" },
];

const FAQ: FAQItem[] = [
  {
    question: "How do I create a new task?",
    answer: "Click the + button in the sidebar or press ⌘N. Type your request in the input field and press Enter or ⌘Enter to submit.",
    category: "Getting Started",
  },
  {
    question: "Can I run multiple tasks at once?",
    answer: "Yes — you can have up to 3 tasks running concurrently. Additional tasks will be queued and processed in priority order (high → normal → low).",
    category: "Getting Started",
  },
  {
    question: "How do I organize tasks into projects?",
    answer: "Right-click a task in the sidebar and select 'Move to Project', or create a new project from the sidebar's project section. Tasks can be grouped, reordered, and archived within projects.",
    category: "Getting Started",
  },
  {
    question: "What is the Agent and how does it work?",
    answer: "The Agent is an AI assistant that can browse the web, write code, analyze data, generate images, and perform complex multi-step tasks autonomously. It works by breaking down your request into steps and executing them sequentially.",
    category: "Features",
  },
  {
    question: "How do I use voice input?",
    answer: "Click the microphone icon in the input area or enable Hands-Free Mode from Settings → Preferences. Voice input supports continuous conversation with automatic transcription.",
    category: "Features",
  },
  {
    question: "What file types can I upload?",
    answer: "You can upload images (PNG, JPG, WebP, GIF), documents (PDF, DOCX, TXT, MD), spreadsheets (XLSX, CSV), and compressed archives (ZIP). Maximum file size is 16MB per file.",
    category: "Features",
  },
  {
    question: "How do I share a task with someone?",
    answer: "Click the share icon on any task, or use the command palette (⌘K) and search for 'Share'. You can generate a public link or share with specific team members.",
    category: "Collaboration",
  },
  {
    question: "Is my data secure?",
    answer: "Yes — all data is encrypted in transit (TLS 1.3) and at rest. Your conversations and files are private by default. Shared tasks only expose the content you explicitly share.",
    category: "Privacy & Security",
  },
  {
    question: "How do I provide feedback?",
    answer: "Use the feedback widget (floating button in the bottom-right corner) to submit bug reports, feature requests, or general feedback. You can also rate individual task results with thumbs up/down.",
    category: "Support",
  },
  {
    question: "What are Skills?",
    answer: "Skills are specialized capabilities that extend the agent's functionality — like web development, data analysis, or image generation. The agent automatically selects relevant skills based on your request.",
    category: "Features",
  },
];

const CATEGORIES = ["Getting Started", "Features", "Collaboration", "Privacy & Security", "Support"];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredFAQ = FAQ.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            Help & Knowledge Base
          </h1>
          <p className="text-muted-foreground">
            Keyboard shortcuts, frequently asked questions, and support resources.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Keyboard Shortcuts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Keyboard className="w-5 h-5 text-primary" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHORTCUTS.map((shortcut, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
                >
                  <span className="text-sm text-foreground">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd
                        key={j}
                        className="px-2 py-0.5 text-xs font-mono bg-background border border-border/60 rounded shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="pt-6 text-center">
              <Zap className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-foreground mb-1">Quick Start</h3>
              <p className="text-xs text-muted-foreground">
                Get up and running in under 2 minutes
              </p>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="pt-6 text-center">
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-foreground mb-1">Documentation</h3>
              <p className="text-xs text-muted-foreground">
                In-depth guides and API reference
              </p>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="pt-6 text-center">
              <MessageSquare className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-foreground mb-1">Contact Support</h3>
              <p className="text-xs text-muted-foreground">
                Get help from the team
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Category filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs transition-colors",
                  !activeCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* FAQ items */}
            <div className="space-y-2">
              {filteredFAQ.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No matching articles found. Try a different search term.
                </p>
              ) : (
                filteredFAQ.map((item, i) => (
                  <div
                    key={i}
                    className="border border-border/60 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground pr-4">
                        {item.question}
                      </span>
                      {expandedFAQ === i ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedFAQ === i && (
                      <div className="px-4 pb-3 text-sm text-muted-foreground border-t border-border/60/50 pt-3">
                        {item.answer}
                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
