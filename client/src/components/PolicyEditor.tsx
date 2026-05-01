import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, List, Heading2, MessageSquare, GitCommit, CheckCircle, Clock, FileText } from 'lucide-react';

// Type Definitions
type PolicyStatus = 'draft' | 'review' | 'approved' | 'published';

type Comment = {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
};

type PolicySection = {
  id: string;
  title: string;
  content: string;
  comments: Comment[];
};

type PolicyVersion = {
  version: number;
  date: string;
  author: string;
  summary: string;
};

type PolicyDocument = {
  id: string;
  title: string;
  status: PolicyStatus;
  lastModified: string;
  versions: PolicyVersion[];
  sections: PolicySection[];
};

// Mock Data
const mockPolicy: PolicyDocument = {
  id: 'POL-001',
  title: 'Acceptable Use of Technology Policy',
  status: 'review',
  lastModified: '2026-04-28T14:00:00Z',
  versions: [
    { version: 3, date: '2026-04-28', author: 'Alice Johnson', summary: 'Added section on AI usage.' },
    { version: 2, date: '2026-03-15', author: 'Alice Johnson', summary: 'Revised remote access requirements.' },
    { version: 1, date: '2025-11-20', author: 'Bob Williams', summary: 'Initial draft.' },
  ],
  sections: [
    {
      id: 'purpose',
      title: 'Purpose',
      content: 'This policy outlines the acceptable use of computer equipment, networks, and other technology resources at Manus-parity AI. It is intended to protect the company and its employees from illegal or damaging actions by individuals, either knowingly or unknowingly.',
      comments: [],
    },
    {
      id: 'scope',
      title: 'Scope',
      content: 'This policy applies to all employees, contractors, consultants, temporaries, and other workers at Manus-parity AI, including all personnel affiliated with third parties. This policy applies to all equipment that is owned or leased by Manus-parity AI.',
      comments: [
        { id: 'c1', author: 'Charlie Davis', avatar: 'CD', text: 'Should we specify if this includes personal devices used for work (BYOD)?', timestamp: '2026-04-29T10:30:00Z' },
      ],
    },
    {
      id: 'requirements',
      title: 'Requirements',
      content: 'All users are responsible for exercising good judgment in observing the standards of the company. General requirements include security and proprietary information, unacceptable use, and system and network activities.',
      comments: [],
    },
    {
      id: 'enforcement',
      title: 'Enforcement',
      content: 'Any employee found to have violated this policy may be subject to disciplinary action, up to and including termination of employment. A violation of this policy by a temporary worker, contractor or vendor may result in the termination of their contract.',
      comments: [],
    },
  ],
};

const statusConfig: Record<PolicyStatus, { color: string; icon: React.ElementType }> = {
  draft: { color: 'bg-gray-500', icon: FileText },
  review: { color: 'bg-yellow-500', icon: Clock },
  approved: { color: 'bg-green-500', icon: CheckCircle },
  published: { color: 'bg-blue-500', icon: GitCommit },
};

export default function PolicyEditor() {
  const [policy, setPolicy] = useState<PolicyDocument>(mockPolicy);
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());
  const [selectedVersion, setSelectedVersion] = useState<number>(policy.versions[0].version);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const handleContentChange = (sectionId: string, newContent: string) => {
    setPolicy(prevPolicy => ({
      ...prevPolicy,
      sections: prevPolicy.sections.map(section =>
        section.id === sectionId ? { ...section, content: newContent } : section
      ),
      lastModified: new Date().toISOString(),
    }));
  };

  const toggleTool = (tool: string) => {
    setActiveTools(prevTools => {
      const newTools = new Set(prevTools);
      if (newTools.has(tool)) {
        newTools.delete(tool);
      } else {
        newTools.add(tool);
      }
      return newTools;
    });
  };

  const handleAddComment = (sectionId: string) => {
    const text = commentInputs[sectionId];
    if (!text || text.trim() === '') return;

    setPolicy(prevPolicy => ({
      ...prevPolicy,
      sections: prevPolicy.sections.map(section => {
        if (section.id === sectionId) {
          const newComment: Comment = {
            id: `c${Date.now()}`,
            author: 'You',
            avatar: 'ME',
            text: text.trim(),
            timestamp: new Date().toISOString(),
          };
          return { ...section, comments: [...section.comments, newComment] };
        }
        return section;
      }),
    }));

    setCommentInputs(prev => ({ ...prev, [sectionId]: '' }));
  };

  const activePolicy = useMemo(() => {
    const versionData = policy.versions.find(v => v.version === selectedVersion);
    if (!versionData) return policy;

    const versionedSections = policy.sections.map((section, index) => ({
      ...section,
      content: selectedVersion === policy.versions[0].version
        ? mockPolicy.sections[index].content
        : `This is a simulated content for Version ${selectedVersion} of the ${section.title} section. ${mockPolicy.sections[index].content.substring(0, 100)}...`
    }));

    return {
      ...policy,
      sections: versionedSections,
      lastModified: versionData.date,
      status: selectedVersion === policy.versions[0].version ? policy.status : 'approved',
    };
  }, [policy, selectedVersion]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-background text-foreground min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8"
    >
      <div className="flex-grow lg:w-2/3">
        <Card className="w-full bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">{activePolicy.title}</CardTitle>
            <div className="flex items-center gap-3">
              <Badge className={cn("text-white", statusConfig[activePolicy.status].color)}>
                {React.createElement(statusConfig[activePolicy.status].icon, { className: 'w-4 h-4 mr-2' })}
                {activePolicy.status.charAt(0).toUpperCase() + activePolicy.status.slice(1)}
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-sm text-muted-foreground">
                      Last modified: {new Date(activePolicy.lastModified).toLocaleDateString()}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{new Date(activePolicy.lastModified).toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted mb-4 border-b border-border">
              {[
                { tool: 'bold', icon: Bold },
                { tool: 'italic', icon: Italic },
                { tool: 'list', icon: List },
                { tool: 'heading', icon: Heading2 },
              ].map(({ tool, icon: Icon }) => (
                <TooltipProvider key={tool}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeTools.has(tool) ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => toggleTool(tool)}
                      >
                        <Icon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tool.charAt(0).toUpperCase() + tool.slice(1)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <div className="space-y-6">
              {activePolicy.sections.map((section) => (
                <motion.div key={section.id} layout>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground/90">{section.title}</h2>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                          <MessageSquare className="w-5 h-5 text-muted-foreground" />
                          {section.comments.length > 0 && (
                            <span className="absolute top-0 right-0 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <h4 className="font-medium leading-none">Comments</h4>
                          <Separator />
                          <AnimatePresence>
                            {section.comments.length > 0 ? (
                              section.comments.map((comment) => (
                                <motion.div key={comment.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-start gap-3">
                                  <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground font-semibold">{comment.avatar}</div>
                                  <div>
                                    <p className="text-sm font-medium">{comment.author}</p>
                                    <p className="text-sm text-muted-foreground">{comment.text}</p>
                                  </div>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No comments on this section.</p>
                            )}
                          </AnimatePresence>
                          <Separator className="my-2" />
                          <div className="flex flex-col gap-2">
                            <textarea
                              placeholder="Add a comment..."
                              className="w-full p-2 text-sm rounded-md bg-muted border border-border focus:ring-1 focus:ring-primary"
                              value={commentInputs[section.id] || ''}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentInputs(prev => ({ ...prev, [section.id]: e.target.value }))}
                            />
                            <Button size="sm" onClick={() => handleAddComment(section.id)} className="w-full">Submit</Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <textarea
                    value={section.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(section.id, e.target.value)}
                    className={cn(
                      'mt-2 w-full p-2 rounded-md bg-muted/50 border border-transparent focus:border-primary focus:ring-1 focus:ring-primary transition-all',
                      'min-h-[120px] text-foreground/80',
                      {
                        'font-bold': activeTools.has('bold'),
                        'italic': activeTools.has('italic'),
                      }
                    )}
                  />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-1/3 lg:flex-shrink-0">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-4">
                {policy.versions.map((version) => (
                  <motion.div
                    key={version.version}
                    onClick={() => setSelectedVersion(version.version)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer border-2',
                      selectedVersion === version.version
                        ? 'border-primary bg-muted'
                        : 'border-transparent hover:bg-muted/50'
                    )}
                    layout
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">Version {version.version}</p>
                      <p className="text-xs text-muted-foreground">{version.date}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">By {version.author}</p>
                    <p className="text-sm mt-2">{version.summary}</p>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
