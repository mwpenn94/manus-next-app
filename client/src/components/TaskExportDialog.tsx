import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Clipboard, Download, Check } from 'lucide-react';

interface Message {
  role: string;
  content: string;
  timestamp: number;
  toolCalls?: Array<{ name: string; result?: string }>;
}

interface Artifact {
  filename: string;
  content: string;
}

interface TaskExportDialogProps {
  taskTitle: string;
  messages: Message[];
  artifacts?: Artifact[];
  isOpen: boolean;
  onClose: () => void;
}

export const TaskExportDialog = ({ taskTitle, messages, artifacts, isOpen, onClose }: TaskExportDialogProps) => {
  const [format, setFormat] = useState<'markdown' | 'json' | 'plaintext'>('markdown');
  const [includeToolCalls, setIncludeToolCalls] = useState(true);
  const [includeArtifacts, setIncludeArtifacts] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [copied, setCopied] = useState(false);

  const formatDate = (timestamp: number) => new Date(timestamp).toISOString();

  const generatedOutput = useMemo(() => {
    const filteredMessages = messages.map(msg => {
        const newMsg: Partial<Message> = { role: msg.role, content: msg.content };
        if (includeTimestamps) newMsg.timestamp = msg.timestamp;
        if (includeToolCalls && msg.toolCalls) newMsg.toolCalls = msg.toolCalls;
        return newMsg as Message;
    });

    const filteredArtifacts = includeArtifacts ? artifacts : [];

    switch (format) {
      case 'json':
        return JSON.stringify(
          {
            title: taskTitle,
            exportedAt: new Date().toISOString(),
            messages: filteredMessages,
            artifacts: filteredArtifacts,
          },
          null,
          2
        );
      case 'markdown':
        let md = `# ${taskTitle}\n\n`;
        filteredMessages.forEach(msg => {
          md += `## ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}${includeTimestamps ? ` (${formatDate(msg.timestamp)})` : ''}\n\n`;
          md += `${msg.content}\n\n`;
          if (includeToolCalls && msg.toolCalls) {
            msg.toolCalls.forEach(tc => {
              md += `**Tool Call: ${tc.name}**\n\n`;
              if(tc.result) {
                md += '```json\n';
                md += `${tc.result}\n`;
                md += '```\n\n';
              }
            });
          }
        });
        if (includeArtifacts && filteredArtifacts && filteredArtifacts.length > 0) {
          md += `# Appendix: Artifacts\n\n`;
          filteredArtifacts.forEach(art => {
            md += `### ${art.filename}\n\n`;
            md += '```\n';
            md += `${art.content}\n`;
            md += '```\n\n';
          });
        }
        return md;
      case 'plaintext':
        let pt = `Task: ${taskTitle}\n\n`;
        filteredMessages.forEach(msg => {
          pt += `${msg.role.toUpperCase()}${includeTimestamps ? ` [${formatDate(msg.timestamp)}]` : ''}: ${msg.content}\n`;
          if (includeToolCalls && msg.toolCalls) {
             msg.toolCalls.forEach(tc => {
                pt += `  -> Tool: ${tc.name}\n`;
                if(tc.result) pt += `  <- Result: ${tc.result}\n`;
            });
          }
        });
        if (includeArtifacts && filteredArtifacts && filteredArtifacts.length > 0) {
            pt += `\n--- ARTIFACTS ---\n`;
            filteredArtifacts.forEach(art => {
                pt += `\nFilename: ${art.filename}\n${art.content}\n`;
            });
        }
        return pt;
      default:
        return '';
    }
  }, [format, messages, artifacts, taskTitle, includeToolCalls, includeArtifacts, includeTimestamps]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedOutput]);

  const handleDownload = useCallback(() => {
    const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt';
    const date = new Date().toISOString().split('T')[0];
    const filename = `${taskTitle.replace(/\s+/g, '_')}-export-${date}.${extension}`;
    const blob = new Blob([generatedOutput], { type: `text/${extension}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedOutput, format, taskTitle]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Export Task: {taskTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="col-span-1 flex flex-col gap-4">
            <h3 className="font-semibold">Options</h3>
            <div className="flex items-center space-x-2">
                <Checkbox id="include-timestamps" checked={includeTimestamps} onCheckedChange={(checked) => setIncludeTimestamps(!!checked)} />
                <Label htmlFor="include-timestamps">Include timestamps</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="include-tool-calls" checked={includeToolCalls} onCheckedChange={(checked) => setIncludeToolCalls(!!checked)} />
                <Label htmlFor="include-tool-calls">Include tool calls</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="include-artifacts" checked={includeArtifacts} onCheckedChange={(checked) => setIncludeArtifacts(!!checked)} />
                <Label htmlFor="include-artifacts">Include artifacts</Label>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <Tabs value={format} onValueChange={(value) => setFormat(value as any)} className="w-full">
              <TabsList>
                <TabsTrigger value="markdown">Markdown</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="plaintext">Plain Text</TabsTrigger>
              </TabsList>
              <TabsContent value={format} className="mt-4 relative">
                 <pre className="bg-muted/50 p-4 rounded-md text-sm max-h-[400px] overflow-auto w-full whitespace-pre-wrap break-words">
                    <code>{generatedOutput}</code>
                </pre>
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};