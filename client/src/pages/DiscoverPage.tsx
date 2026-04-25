/**
 * DiscoverPage — Manus-style Discover / Templates hub
 * 
 * Featured task templates organized by category with search,
 * matching the Manus "Discover" tab for template browsing.
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useTask } from "@/contexts/TaskContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Globe, Heart, BarChart3, GraduationCap, Rocket, Star,
  Code, Presentation, FileText, Image, Video, Music, Calendar,
  Mail, ShoppingCart, Briefcase, Lightbulb, PenTool, Database,
  Smartphone, Bot, BookOpen, TrendingUp, Users, Zap, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: typeof Globe;
  prompt: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "featured", label: "Featured", icon: Star },
  { id: "research", label: "Research", icon: Globe },
  { id: "development", label: "Development", icon: Code },
  { id: "content", label: "Content", icon: PenTool },
  { id: "data", label: "Data", icon: BarChart3 },
  { id: "design", label: "Design", icon: Image },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "productivity", label: "Productivity", icon: Rocket },
  { id: "life", label: "Life", icon: Heart },
];

const TEMPLATES: Template[] = [
  // Featured
  { id: "t1", title: "Build a Full-Stack Website", description: "Create a modern, responsive web application with authentication, database, and API.", category: "featured", icon: Code, prompt: "Build a full-stack website with authentication, database, and a modern UI", tags: ["website", "fullstack", "react"], difficulty: "intermediate" },
  { id: "t2", title: "Deep Research Report", description: "Conduct comprehensive research on any topic with citations and analysis.", category: "featured", icon: Globe, prompt: "Research and write a comprehensive report on", tags: ["research", "report", "analysis"], difficulty: "beginner" },
  { id: "t3", title: "Create a Slide Deck", description: "Design a professional presentation with compelling visuals and narrative.", category: "featured", icon: Presentation, prompt: "Create a professional slide deck about", tags: ["slides", "presentation", "design"], difficulty: "beginner" },
  { id: "t4", title: "Analyze Market Data", description: "Deep-dive into market trends with visualizations and actionable insights.", category: "featured", icon: TrendingUp, prompt: "Analyze market data and trends for", tags: ["data", "market", "analysis"], difficulty: "intermediate" },
  { id: "t5", title: "Generate AI Images", description: "Create stunning images from text descriptions using AI generation.", category: "featured", icon: Image, prompt: "Generate a high-quality image of", tags: ["image", "ai", "creative"], difficulty: "beginner" },
  { id: "t6", title: "Create a Video", description: "Produce a professional video with AI-powered editing and effects.", category: "featured", icon: Video, prompt: "Create a short video about", tags: ["video", "creative", "production"], difficulty: "intermediate" },

  // Research
  { id: "t7", title: "Competitive Intelligence", description: "Research competitors and synthesize findings into a strategic report.", category: "research", icon: Globe, prompt: "Research competitors in the space of", tags: ["competitive", "strategy", "market"], difficulty: "intermediate" },
  { id: "t8", title: "Academic Literature Review", description: "Survey recent papers and produce an annotated bibliography.", category: "research", icon: BookOpen, prompt: "Conduct a literature review on", tags: ["academic", "papers", "review"], difficulty: "advanced" },
  { id: "t9", title: "Technology Landscape Analysis", description: "Map the technology landscape for a specific domain or industry.", category: "research", icon: Database, prompt: "Analyze the technology landscape for", tags: ["tech", "landscape", "analysis"], difficulty: "advanced" },

  // Development
  { id: "t10", title: "Landing Page", description: "Build a modern, conversion-optimized landing page.", category: "development", icon: Code, prompt: "Build a modern landing page for", tags: ["landing", "website", "conversion"], difficulty: "beginner" },
  { id: "t11", title: "Mobile App Prototype", description: "Create an interactive mobile app prototype with navigation.", category: "development", icon: Smartphone, prompt: "Create a mobile app prototype for", tags: ["mobile", "app", "prototype"], difficulty: "intermediate" },
  { id: "t12", title: "API Integration", description: "Build an API integration with documentation and error handling.", category: "development", icon: Zap, prompt: "Build an API integration for", tags: ["api", "integration", "backend"], difficulty: "advanced" },
  { id: "t13", title: "Chrome Extension", description: "Develop a Chrome extension with popup UI and background scripts.", category: "development", icon: Globe, prompt: "Build a Chrome extension that", tags: ["extension", "chrome", "browser"], difficulty: "intermediate" },

  // Content
  { id: "t14", title: "Blog Post Series", description: "Write a multi-part blog series with SEO optimization.", category: "content", icon: FileText, prompt: "Write a blog post series about", tags: ["blog", "writing", "seo"], difficulty: "beginner" },
  { id: "t15", title: "Social Media Campaign", description: "Create a multi-platform social media content calendar.", category: "content", icon: Users, prompt: "Create a social media campaign for", tags: ["social", "marketing", "content"], difficulty: "intermediate" },
  { id: "t16", title: "Email Newsletter", description: "Design and write an engaging email newsletter template.", category: "content", icon: Mail, prompt: "Create an email newsletter about", tags: ["email", "newsletter", "marketing"], difficulty: "beginner" },

  // Data
  { id: "t17", title: "Dashboard Builder", description: "Create an interactive data dashboard with charts and filters.", category: "data", icon: BarChart3, prompt: "Build a data dashboard for", tags: ["dashboard", "charts", "analytics"], difficulty: "intermediate" },
  { id: "t18", title: "Customer Cohort Analysis", description: "Segment users by behavior and visualize retention over time.", category: "data", icon: Users, prompt: "Perform a customer cohort analysis on", tags: ["cohort", "retention", "users"], difficulty: "advanced" },
  { id: "t19", title: "Financial Model", description: "Build a financial model with projections and scenario analysis.", category: "data", icon: TrendingUp, prompt: "Build a financial model for", tags: ["finance", "model", "projections"], difficulty: "advanced" },

  // Design
  { id: "t20", title: "Brand Identity Kit", description: "Create a complete brand identity with logo, colors, and typography.", category: "design", icon: PenTool, prompt: "Design a brand identity kit for", tags: ["brand", "logo", "identity"], difficulty: "intermediate" },
  { id: "t21", title: "UI/UX Wireframes", description: "Design wireframes and user flows for a digital product.", category: "design", icon: Lightbulb, prompt: "Create UI/UX wireframes for", tags: ["wireframe", "ux", "design"], difficulty: "intermediate" },

  // Business
  { id: "t22", title: "Business Plan", description: "Write a comprehensive business plan with market analysis.", category: "business", icon: Briefcase, prompt: "Write a business plan for", tags: ["business", "plan", "strategy"], difficulty: "intermediate" },
  { id: "t23", title: "Pitch Deck", description: "Create a compelling investor pitch deck with financials.", category: "business", icon: Presentation, prompt: "Create an investor pitch deck for", tags: ["pitch", "investor", "startup"], difficulty: "intermediate" },
  { id: "t24", title: "E-commerce Store", description: "Build a complete e-commerce store with products and checkout.", category: "business", icon: ShoppingCart, prompt: "Build an e-commerce store for", tags: ["ecommerce", "store", "shopping"], difficulty: "advanced" },

  // Education
  { id: "t25", title: "Interactive Course", description: "Create an interactive course with quizzes and progress tracking.", category: "education", icon: GraduationCap, prompt: "Create an interactive course about", tags: ["course", "learning", "education"], difficulty: "intermediate" },
  { id: "t26", title: "Flashcard Deck", description: "Generate spaced-repetition flashcards from any study material.", category: "education", icon: BookOpen, prompt: "Create a flashcard deck for studying", tags: ["flashcards", "study", "learning"], difficulty: "beginner" },

  // Productivity
  { id: "t27", title: "Automated Reports", description: "Set up automated data collection and report generation.", category: "productivity", icon: Rocket, prompt: "Automate weekly reports for", tags: ["automation", "reports", "workflow"], difficulty: "intermediate" },
  { id: "t28", title: "Project Proposal", description: "Structure a persuasive project proposal with timeline and budget.", category: "productivity", icon: FileText, prompt: "Draft a project proposal for", tags: ["proposal", "project", "planning"], difficulty: "beginner" },
  { id: "t29", title: "Meeting Summarizer", description: "Transcribe and summarize meeting recordings with action items.", category: "productivity", icon: Bot, prompt: "Summarize this meeting recording and extract action items", tags: ["meeting", "summary", "transcription"], difficulty: "beginner" },

  // Life
  { id: "t30", title: "Travel Itinerary", description: "Plan a comprehensive trip with bookings, tips, and local insights.", category: "life", icon: Heart, prompt: "Plan a trip to", tags: ["travel", "trip", "planning"], difficulty: "beginner" },
  { id: "t31", title: "Meal Prep Plan", description: "Design a balanced weekly meal plan with shopping list.", category: "life", icon: Calendar, prompt: "Create a weekly meal prep plan for", tags: ["meal", "cooking", "health"], difficulty: "beginner" },
  { id: "t32", title: "Workout Program", description: "Create a personalized workout program with progression.", category: "life", icon: Zap, prompt: "Create a workout program for", tags: ["fitness", "workout", "health"], difficulty: "beginner" },
  { id: "t33", title: "Generate Music", description: "Compose original music tracks with AI-powered generation.", category: "life", icon: Music, prompt: "Generate a music track in the style of", tags: ["music", "audio", "creative"], difficulty: "beginner" },
];

export default function DiscoverPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { createTask } = useTask();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    let results = TEMPLATES;
    if (activeCategory !== "all") {
      results = results.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      );
    }
    return results;
  }, [activeCategory, searchQuery]);

  const handleUseTemplate = (template: Template) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    const id = createTask(template.title, template.prompt);
    navigate(`/task/${id}`);
  };

  const difficultyColor = (d: string) => {
    if (d === "beginner") return "text-green-500 bg-green-500/10";
    if (d === "intermediate") return "text-yellow-500 bg-yellow-500/10";
    return "text-red-500 bg-red-500/10";
  };

  return (
    <div className="h-full overflow-y-auto pb-mobile-nav">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Discover
          </h1>
          <p className="text-muted-foreground mb-6">
            Browse templates and get started with pre-built task workflows.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-2 scrollbar-thin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card
                className="border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all cursor-pointer group h-full"
                onClick={() => handleUseTemplate(template)}
              >
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <template.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {template.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", difficultyColor(template.difficulty))}>
                      {template.difficulty}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No templates found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
