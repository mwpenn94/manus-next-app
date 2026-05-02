import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Copy, Cpu, FileText, Layers, Lock, MessageSquare, Search, Settings, Sparkles, Star, Users, X } from 'lucide-react';

const platformFeatures = [
  {
    icon: Cpu,
    title: "Autonomous AI Agents",
    description: "Deploy agents that can reason, plan, and execute complex tasks independently.",
    color: "oklch(67.9% 0.27 258.5)",
  },
  {
    icon: Layers,
    title: "Multi-Modal Understanding",
    description: "Process and understand information from text, images, audio, and video sources.",
    color: "oklch(70.1% 0.25 153.5)",
  },
  {
    icon: FileText,
    title: "Document Processing & Analysis",
    description: "Extract insights, summarize, and answer questions from your documents at scale.",
    color: "oklch(72.3% 0.22 58.5)",
  },
  {
    icon: Settings,
    title: "Workflow Automation",
    description: "Automate repetitive tasks and build complex workflows with a simple, natural language interface.",
    color: "oklch(65.8% 0.21 328.5)",
  },
];

const FeatureShowcaseCarousel = () => {
  const [index, setIndex] = useState(0);

  const nextFeature = useCallback(() => {
    setIndex((prev) => (prev + 1) % platformFeatures.length);
  }, []);

  const prevFeature = useCallback(() => {
    setIndex((prev) => (prev - 1 + platformFeatures.length) % platformFeatures.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextFeature, 5000);
    return () => clearInterval(timer);
  }, [nextFeature]);

  const feature = platformFeatures[index];

  return (
    <div className="relative w-full max-w-3xl mx-auto overflow-hidden">
        <AnimatePresence initial={false} custom={index}>
            <motion.div
                key={index}
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full"
            >
                <Card className="w-full border-2" style={{ borderColor: feature.color }}>
                    <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
                        <div className="p-4 rounded-full bg-muted" style={{ color: feature.color }}>
                            <feature.icon className="w-12 h-12" />
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </AnimatePresence>
        <Button onClick={prevFeature} variant="outline" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12"><ChevronLeft className="h-4 w-4" /></Button>
        <Button onClick={nextFeature} variant="outline" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
};

const quickStartTemplates = [
    { icon: Search, title: "Market Research", description: "Analyze market trends and competitor landscape." },
    { icon: FileText, title: "Content Creation", description: "Generate a blog post from a simple prompt." },
    { icon: MessageSquare, title: "Customer Support", description: "Draft responses to common customer questions." },
];

const QuickStartTemplates = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickStartTemplates.map((template, i) => (
            <Card key={i} className="group hover:border-primary transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center gap-4">
                    <template.icon className="w-8 h-8 text-primary" />
                    <div>
                        <CardTitle className="group-hover:text-primary transition-colors">{template.title}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        ))}
    </div>
);

const SocialProof = () => (
    <div className="bg-muted rounded-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
                <p className="text-4xl font-bold">10,000+</p>
                <p className="text-muted-foreground">Active Users</p>
            </div>
            <div>
                <p className="text-4xl font-bold">1M+</p>
                <p className="text-muted-foreground">Tasks Completed</p>
            </div>
            <div>
                <div className="flex items-center justify-center gap-1">
                    <p className="text-4xl font-bold">4.9/5</p>
                    <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                </div>
                <p className="text-muted-foreground">Satisfaction Rate</p>
            </div>
        </div>
    </div>
);

const comparisonFeatures = [
    { feature: "Free Queries", guest: "3", signedIn: "25/day", premium: "Unlimited" },
    { feature: "Access to Basic Models", guest: true, signedIn: true, premium: true },
    { feature: "Access to Advanced Models", guest: false, signedIn: false, premium: true },
    { feature: "Task History", guest: "Session only", signedIn: true, premium: true },
    { feature: "Workflow Automation", guest: false, signedIn: "3 Workflows", premium: "Unlimited" },
    { feature: "API Access", guest: false, signedIn: false, premium: true },
    { feature: "Priority Support", guest: false, signedIn: false, premium: true },
];

const FeatureComparisonTable = () => (
    <Card>
        <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-4 font-semibold">Feature</th>
                            <th className="p-4 font-semibold text-center">Guest</th>
                            <th className="p-4 font-semibold text-center">Signed In</th>
                            <th className="p-4 font-semibold text-center bg-primary/10">Premium</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comparisonFeatures.map((item, i) => (
                            <tr key={i} className="border-b last:border-none">
                                <td className="p-4 font-medium">{item.feature}</td>
                                <td className="p-4 text-center text-muted-foreground">
                                    {typeof item.guest === 'boolean' ? (item.guest ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />) : item.guest}
                                </td>
                                <td className="p-4 text-center text-muted-foreground">
                                    {typeof item.signedIn === 'boolean' ? (item.signedIn ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />) : item.signedIn}
                                </td>
                                <td className="p-4 text-center font-medium text-primary bg-primary/10">
                                    {typeof item.premium === 'boolean' ? (item.premium ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />) : item.premium}
                                </td>
                            </tr>
                        ))}
                        <tr className="border-b last:border-none">
                            <td className="p-4 font-medium"></td>
                            <td className="p-4 text-center"><Button variant="outline" disabled>Current Plan</Button></td>
                            <td className="p-4 text-center"><Button variant="outline">Sign Up</Button></td>
                            <td className="p-4 text-center bg-primary/10"><Button>Upgrade Now <Sparkles className="ml-2 h-4 w-4" /></Button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </CardContent>
    </Card>
);

const DemoInterface = () => {
  const [query, setQuery] = useState("");
  const [responses, setResponses] = useState<{query: string, response: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queriesLeft, setQueriesLeft] = useState(3);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || queriesLeft === 0) return;

    setIsLoading(true);
    setResponses(prev => [...prev, { query, response: "..." }]);

    setTimeout(() => {
      const mockResponse = `This is a mock response for your query: "${query}". In a real environment, Sovereign AI would provide a detailed, multi-step analysis.`;
      setResponses(prev => prev.map(r => r.query === query ? { ...r, response: mockResponse } : r));
      setQueriesLeft(prev => prev - 1);
      setIsLoading(false);
      setQuery("");
    }, 1500);
  };

  useEffect(() => {
    if (queriesLeft === 0) {
      setShowSignUpPrompt(true);
    }
  }, [queriesLeft]);

  return (
    <div className="flex flex-col h-[600px]">
        <ScrollArea className="flex-grow p-4 bg-muted/50 rounded-t-lg">
            <div className="space-y-4">
                {responses.map((r, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-end">
                            <p className="bg-primary text-primary-foreground p-3 rounded-lg max-w-lg">{r.query}</p>
                        </div>
                        <div className="flex justify-start">
                            <p className="bg-background border p-3 rounded-lg max-w-lg">{r.response}</p>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <div className="p-4 border-t">
            <form onSubmit={handleQuerySubmit} className="flex items-center gap-2">
                <Input 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={queriesLeft > 0 ? `Ask a question... (${queriesLeft} left)` : "You've used all your free queries."}
                    disabled={isLoading || queriesLeft === 0}
                />
                <Button type="submit" disabled={isLoading || queriesLeft === 0}>
                    {isLoading ? "Thinking..." : "Send"}
                </Button>
            </form>
        </div>
        <Dialog open={showSignUpPrompt} onOpenChange={setShowSignUpPrompt}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Unlock the Full Power of Sovereign AI</DialogTitle>
                    <DialogDescription>
                        You've used all your free queries. Sign up to continue exploring, save your history, and access more powerful features.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSignUpPrompt(false)}>Continue Exploring</Button>
                    <Button>Sign Up Now</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

const SessionPersistenceIndicator = () => (
    <div className="fixed bottom-4 right-4">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="flex items-center gap-2 bg-background border p-2 rounded-full shadow-lg"
                    >
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-sm text-muted-foreground">Session saved</p>
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Your progress is automatically saved for this session.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
);

const OnboardingFlow = ({ onStart }: { onStart: () => void }) => (
    <div className="text-center space-y-4">
        <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent"
        >
            Welcome to Sovereign AI
        </motion.h1>
        <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-lg text-muted-foreground"
        >
            Experience the next generation of autonomous AI agents. Start exploring our platform capabilities right away, no sign-up required.
        </motion.p>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        >
            <Button size="lg" onClick={onStart}>Start Exploration <ArrowRight className="ml-2 h-5 w-5" /></Button>
        </motion.div>
    </div>
);

const SeamlessTransition = ({ onComplete }: { onComplete: () => void }) => (
    <Dialog open={true}>
        <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
                <DialogTitle className="text-2xl">Seamless Transition</DialogTitle>
                <DialogDescription>
                    Your session has been successfully transferred to your new account.
                </DialogDescription>
            </DialogHeader>
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                className="flex justify-center items-center p-6"
            >
                <CheckCircle className="w-24 h-24 text-green-500" />
            </motion.div>
            <p className="font-semibold">Your progress has been preserved.</p>
            <DialogFooter className="sm:justify-center">
                <Button onClick={onComplete}>Continue to Dashboard</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default function GuestExplorationMode() {
  const [isExploring, setIsExploring] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (isTransitioning) {
    return <SeamlessTransition onComplete={() => setIsTransitioning(false)} />;
  }

  if (!isExploring) {
    return (
        <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-4">
            <OnboardingFlow onStart={() => setIsExploring(true)} />
        </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 lg:p-8">
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="max-w-7xl mx-auto space-y-20"
      >
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Sovereign AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setIsTransitioning(true)}>Sign In</Button>
            <Button onClick={() => setIsTransitioning(true)}>Sign Up Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </header>

        <section className="text-center">
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary">Demo Mode</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">Explore the Future of AI Agents</h1>
            <p className="max-w-2xl mx-auto mt-4 text-lg text-muted-foreground">Get a glimpse of what's possible. Your first 3 queries are on us.</p>
        </section>

        <section>
          <Card className="w-full shadow-2xl shadow-primary/10">
            <CardContent className="p-6">
              <DemoInterface />
            </CardContent>
          </Card>
        </section>

        <section>
            <h2 className="text-3xl font-bold text-center mb-12">A Platform for Every Task</h2>
            <FeatureShowcaseCarousel />
        </section>

        <section>
            <h2 className="text-3xl font-bold text-center mb-12">Start with a Template</h2>
            <QuickStartTemplates />
        </section>

        <section>
            <SocialProof />
        </section>

        <section>
            <h2 className="text-3xl font-bold text-center mb-12">Find the Right Fit</h2>
            <FeatureComparisonTable />
        </section>

        <footer className="text-center text-muted-foreground text-sm pt-8 border-t">
            <p>&copy; 2026 Sovereign AI. All rights reserved.</p>
        </footer>
      </motion.main>
      <SessionPersistenceIndicator />
    </div>
  );
}
