
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, File, Search, Wind, Bot, Terminal, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

// Assuming these are correctly set up in the project
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- TYPES & MOCK DATA ---
type ToolStatus = "running" | "success" | "error";

interface ToolExecution {
  id: string;
  tool: string;
  toolName: string;
  icon: React.ReactNode;
  status: ToolStatus;
  duration: string;
  input: Record<string, any>;
  output: string;
}

// This would typically be passed as a prop
const mockExecutions: ToolExecution[] = [
  {
    id: "1",
    tool: "browse_web",
    toolName: "Browse Web",
    icon: <Wind className="w-4 h-4" />,
    status: "success",
    duration: "1.2s",
    input: {
      url: "https://www.google.com",
      query: "AI agent platforms",
    },
    output: `## Top AI Agent Platforms\n\n1. **Manus:** A platform for building and deploying autonomous agents.\n2. **LangChain:** A framework for developing applications powered by language models.\n3. **Auto-GPT:** An experimental open-source application showcasing the capabilities of the GPT-4 language model.`,
  },
  {
    id: "2",
    tool: "execute_shell",
    toolName: "Execute Shell",
    icon: <Terminal className="w-4 h-4" />,
    status: "running",
    duration: "5.6s",
    input: {
      command: "ls -la",
    },
    output: `total 8\ndrwxr-xr-x 2 user user 4096 May 1 12:00 .\ndrwxr-xr-x 4 user user 4096 May 1 11:59 ..`,
  },
  {
    id: "3",
    tool: "create_file",
    toolName: "Create File",
    icon: <File className="w-4 h-4" />,
    status: "success",
    duration: "0.3s",
    input: {
      path: "/home/user/project/README.md",
      content: "# My Project\nThis is a new project.",
    },
    output: `File created successfully at /home/user/project/README.md`,
  },
  {
    id: "4",
    tool: "search_web",
    toolName: "Search Web",
    icon: <Search className="w-4 h-4" />,
    status: "error",
    duration: "2.1s",
    input: {
      query: "latest advancements in quantum computing",
    },
    output: `Error: Failed to fetch search results. Network timeout.`,
  },
  {
    id: "5",
    tool: "generate_image",
    toolName: "Generate Image",
    icon: <Bot className="w-4 h-4" />,
    status: "success",
    duration: "15.2s",
    input: {
      prompt: "A futuristic cityscape with flying cars, photorealistic, 8k",
    },
    output: `Image generated and saved to /home/user/images/cityscape.png`,
  },
];

// --- HELPER COMPONENTS ---

const StatusIndicator = ({ status }: { status: ToolStatus }) => {
  const statusConfig = {
    running: {
      icon: <AlertCircle className="w-4 h-4 text-oklch(var(--warning))" />,
      label: "Running",
      className: "bg-oklch(var(--warning)/0.1) text-oklch(var(--warning)) border-oklch(var(--warning)/0.2)",
    },
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-oklch(var(--success))" />,
      label: "Success",
      className: "bg-oklch(var(--success)/0.1) text-oklch(var(--success)) border-oklch(var(--success)/0.2)",
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-oklch(var(--destructive))" />,
      label: "Error",
      className: "bg-oklch(var(--destructive)/0.1) text-oklch(var(--destructive)) border-oklch(var(--destructive)/0.2)",
    },
  };

  const { icon, label, className } = statusConfig[status];

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1.5", className)}>
      {icon}
      <span>{label}</span>
    </Badge>
  );
};

const SyntaxHighlightedCode = ({ code }: { code: string }) => {
  // In a real app, this would use a library like react-syntax-highlighter
  return (
    <pre className="bg-oklch(var(--muted)/0.5) text-oklch(var(--muted-foreground)) p-4 rounded-md text-sm overflow-x-auto font-mono">
      <code>{code}</code>
    </pre>
  );
};

// --- MAIN COMPONENT ---

export default function ToolExecutionDetailCard() {
  // In a real app, the execution would be a prop
  // For this demo, we'll just show all of them.
  return (
    <div className="p-4 md:p-8 bg-oklch(var(--background)) min-h-screen">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-oklch(var(--foreground))">Tool Execution Details</h1>
        {mockExecutions.map((execution) => (
          <ToolExecutionCardInternal key={execution.id} execution={execution} />
        ))}
      </div>
    </div>
  );
}

function ToolExecutionCardInternal({ execution }: { execution: ToolExecution }) {
  const [isOpen, setIsOpen] = useState(true);

  const formattedInput = useMemo(() => {
    return Object.entries(execution.input).map(([key, value]) => (
      <div key={key} className="grid grid-cols-[80px_1fr] items-start text-sm gap-2">
        <span className="font-semibold text-oklch(var(--muted-foreground)) flex-shrink-0 truncate">{key}</span>
        <pre className="font-mono break-words whitespace-pre-wrap text-xs bg-oklch(var(--muted)/0.5) p-2 rounded-sm"><code>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</code></pre>
      </div>
    ));
  }, [execution.input]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="overflow-hidden border-oklch(var(--border))">
        <CardHeader className="p-3 bg-oklch(var(--muted)/0.3) dark:bg-oklch(var(--muted)/0.2) border-b border-oklch(var(--border))">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-medium text-oklch(var(--foreground)) flex-shrink min-w-0">
              {execution.icon}
              <span className="truncate">{execution.toolName}</span>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <StatusIndicator status={execution.status} />
              <span className="text-sm text-oklch(var(--muted-foreground)) font-mono">{execution.duration}</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
          >
            <CardContent className="p-0">
              <Tabs defaultValue="output" className="w-full">
                <TabsList className="m-2">
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <div className="border-t border-oklch(var(--border)) p-4 bg-oklch(var(--background))">
                  <TabsContent value="output" className="m-0">
                    <ScrollArea className="h-64 w-full">
                      <SyntaxHighlightedCode code={execution.output} />
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="input" className="m-0">
                    <ScrollArea className="h-64 w-full">
                      <div className="space-y-3">{formattedInput}</div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="raw" className="m-0">
                    <ScrollArea className="h-64 w-full">
                      <SyntaxHighlightedCode code={JSON.stringify(execution, null, 2)} />
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </motion.div>
        )}
        </AnimatePresence>
      </Card>
    </Collapsible>
  );
}
