import DOMPurify from "dompurify";
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Send, Loader, Clock, FileText, Braces, History, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Type Definitions
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Header = { id: string; key: string; value: string; enabled: boolean; };
type RequestItem = { id: string; method: HttpMethod; url: string; headers: Header[]; body: string; };
type ResponseData = { status: number; statusText: string; headers: Record<string, string>; body: any; time: number; } | null;

// Mock Data
const mockHistory: RequestItem[] = [
  { id: 'hist_1', method: 'GET', url: 'https://api.manus.ai/v1/users', headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer TEST_TOKEN', enabled: true }], body: '' },
  { id: 'hist_2', method: 'POST', url: 'https://api.manus.ai/v1/tasks', headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer TEST_TOKEN', enabled: true }, { id: 'h2', key: 'Content-Type', value: 'application/json', enabled: true }], body: JSON.stringify({ name: 'New Task', priority: 'High' }, null, 2) },
  { id: 'hist_3', method: 'DELETE', url: 'https://api.manus.ai/v1/users/123', headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer TEST_TOKEN', enabled: true }], body: '' },
  { id: 'hist_4', method: 'GET', url: 'https://api.manus.ai/v1/status', headers: [], body: '' },
];

const JsonSyntaxHighlight = React.memo(({ json }: { json: object }) => {
    const jsonString = JSON.stringify(json, null, 2);
    const highlighted = jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-pink-400'; // number
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'text-cyan-400'; // key
            } else {
                cls = 'text-amber-400'; // string
            }
        } else if (/true|false/.test(match)) {
            cls = 'text-violet-400'; // boolean
        } else if (/null/.test(match)) {
            cls = 'text-gray-500'; // null
        }
        return `<span class="${cls}">${match}</span>`;
    });
    return <pre className="text-xs p-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlighted) }} />;
});

export default function APIPlayground() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState<string>('https://api.manus.ai/v1/status');
  const [headers, setHeaders] = useState<Header[]>([{ id: `h_${Date.now()}`, key: 'Content-Type', value: 'application/json', enabled: true }]);
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<ResponseData>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<RequestItem[]>(mockHistory);
  const [activeRequestTab, setActiveRequestTab] = useState<'headers' | 'body'>('headers');
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers'>('body');
  const [copied, setCopied] = useState<boolean>(false);

  const handleHeaderChange = (id: string, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setHeaders(currentHeaders => currentHeaders.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const addHeader = () => {
    setHeaders(currentHeaders => [...currentHeaders, { id: `h_${Date.now()}`, key: '', value: '', enabled: true }]);
  };

  const removeHeader = (id: string) => {
    setHeaders(currentHeaders => currentHeaders.filter(h => h.id !== id));
  };

  const handleSendRequest = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setResponse(null);
    const startTime = Date.now();

    const activeHeaders = headers.filter(h => h.enabled && h.key);
    const newRequest: RequestItem = { id: `hist_${Date.now()}`, method, url, headers: activeHeaders, body };
    setHistory(prev => [newRequest, ...prev.filter(p => p.id !== newRequest.id).slice(0, 49)]);

    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

    const endTime = Date.now();
    const mockStatus = method === 'POST' ? 201 : (url.includes('notfound') ? 404 : 200);
    const mockStatusText = mockStatus === 201 ? 'Created' : (mockStatus === 404 ? 'Not Found' : 'OK');
    let mockBody;
    try {
        mockBody = { success: mockStatus < 400, method, url, sentHeaders: activeHeaders.reduce((acc, h) => ({...acc, [h.key]: h.value}), {}), sentBody: body ? JSON.parse(body) : null, message: `Request processed: ${mockStatusText}` };
    } catch (e) {
        mockBody = { error: "Invalid JSON body", details: (e as Error).message };
    }

    setResponse({ status: mockStatus, statusText: mockStatusText, headers: { 'Content-Type': 'application/json', 'X-Request-Id': `req_${Date.now()}` }, body: mockBody, time: endTime - startTime });
    setLoading(false);
  }, [method, url, headers, body, loading]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        handleSendRequest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSendRequest]);

  const loadFromHistory = (item: RequestItem) => {
    setMethod(item.method);
    setUrl(item.url);
    setHeaders(item.headers.length > 0 ? item.headers : [{ id: `h_${Date.now()}`, key: '', value: '', enabled: true }]);
    setBody(item.body);
  };

  const clearHistory = () => setHistory([]);

  const copyResponseToClipboard = () => {
    if (!response) return;
    navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    if (status >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  const getMethodColor = (m: HttpMethod): string => {
      const colors: Record<HttpMethod, string> = { GET: 'text-green-400', POST: 'text-blue-400', PUT: 'text-yellow-400', DELETE: 'text-red-400' };
      return colors[m];
  }

  return (
    <TooltipProvider>
      <div className="w-full h-screen bg-background text-foreground flex flex-col md:flex-row font-sans text-sm overflow-hidden">
        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border p-2 flex flex-col">
          <div className="flex justify-between items-center p-2">
            <h2 className="text-base font-bold flex items-center"><History className="w-4 h-4 mr-2"/>History</h2>
            <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={clearHistory} disabled={history.length === 0}><X className="w-4 h-4 text-muted-foreground hover:text-foreground"/></Button></TooltipTrigger>
                <TooltipContent><p>Clear History</p></TooltipContent>
            </Tooltip>
          </div>
          <ScrollArea className="flex-1 -mr-2">
            <motion.div layout className="space-y-1 pr-2">
              <AnimatePresence>
                {history.map(item => (
                  <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }} key={item.id} className="rounded-md hover:bg-muted transition-colors relative group">
                    <button onClick={() => loadFromHistory(item)} className="w-full text-left p-2 rounded-md cursor-pointer">
                      <span className={cn('font-bold text-xs', getMethodColor(item.method))}>{item.method}</span>
                      <p className="text-muted-foreground text-xs truncate mt-1">{item.url}</p>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-2 mb-4">
              <Select value={method} onValueChange={(v: string) => setMethod(v as HttpMethod)}>
                <SelectTrigger className={cn("w-32 font-bold", getMethodColor(method))}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET" className={getMethodColor('GET')}>GET</SelectItem>
                  <SelectItem value="POST" className={getMethodColor('POST')}>POST</SelectItem>
                  <SelectItem value="PUT" className={getMethodColor('PUT')}>PUT</SelectItem>
                  <SelectItem value="DELETE" className={getMethodColor('DELETE')}>DELETE</SelectItem>
                </SelectContent>
              </Select>
              <Input value={url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)} placeholder="https://api.example.com/resource" className="font-mono text-xs" />
              <Tooltip>
                <TooltipTrigger asChild><Button onClick={handleSendRequest} disabled={loading} className="w-28"><AnimatePresence mode="wait">{loading ? <motion.div key="loader" initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}><Loader className="animate-spin h-4 w-4" /></motion.div> : <motion.div key="send" initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}} className="flex items-center"><Send className="h-4 w-4 mr-2" />Send</motion.div>}</AnimatePresence></Button></TooltipTrigger>
                <TooltipContent><p>Send Request (Ctrl+Enter)</p></TooltipContent>
              </Tooltip>
            </div>

            <Tabs value={activeRequestTab} onValueChange={(value) => setActiveRequestTab(value as 'headers' | 'body')} className="w-full">
              <TabsList><TabsTrigger value="headers">Headers ({headers.filter(h => h.enabled && h.key).length})</TabsTrigger><TabsTrigger value="body">Body</TabsTrigger></TabsList>
              <TabsContent value="headers" className="mt-4 text-xs"><div className="space-y-2">
                <AnimatePresence>{headers.map((header) => (<motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }} key={header.id} className="flex items-center space-x-2"><Checkbox id={`check-${header.id}`} checked={header.enabled} onCheckedChange={(checked: boolean) => handleHeaderChange(header.id, 'enabled', checked)} /><Input placeholder="Key" value={header.key} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleHeaderChange(header.id, 'key', e.target.value)} className="flex-1 h-8 font-mono text-xs" /><Input placeholder="Value" value={header.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleHeaderChange(header.id, 'value', e.target.value)} className="flex-1 h-8 font-mono text-xs" /><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => removeHeader(header.id)}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500 transition-colors" /></Button></TooltipTrigger><TooltipContent><p>Remove Header</p></TooltipContent></Tooltip></motion.div>))}</AnimatePresence>
                <Button variant="outline" size="sm" onClick={addHeader}><Plus className="h-4 w-4 mr-2" />Add Header</Button></div>
              </TabsContent>
              <TabsContent value="body" className="mt-4"><textarea value={body} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)} placeholder='{\n  "key": "value"\n}' className="w-full h-40 p-2 font-mono bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-xs" /></TabsContent>
            </Tabs>
          </div>

          <div className="flex-1 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 h-8">
              <h2 className="text-base font-bold">Response</h2>
              {response && !loading && (<motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex items-center space-x-4 text-xs"><Badge variant="outline" className={cn("border-opacity-50", getStatusColor(response.status).replace('text-', 'border-'))}><span className={cn("font-bold", getStatusColor(response.status))}>Status: {response.status} {response.statusText}</span></Badge><span className="text-muted-foreground flex items-center"><Clock className="h-3 w-3 mr-1" /> {response.time}ms</span></motion.div>)}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={loading ? 'loader' : (response ? 'response' : 'empty')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col min-h-0">
                {loading ? (<div className="flex-1 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-md"><Loader className="animate-spin h-8 w-8" /></div>) : response ? (<Card className="flex-1 flex flex-col min-h-0 border-border relative group/response"><Tabs value={activeResponseTab} onValueChange={(v) => setActiveResponseTab(v as 'body' | 'headers')} className="w-full flex-1 flex flex-col"><TabsList className="m-2"><TabsTrigger value="body"><Braces className="h-4 w-4 mr-2"/>Body</TabsTrigger><TabsTrigger value="headers"><FileText className="h-4 w-4 mr-2"/>Headers ({Object.keys(response.headers).length})</TabsTrigger></TabsList><TabsContent value="body" className="flex-1 w-full bg-muted rounded-b-lg overflow-hidden"><ScrollArea className="h-full"><JsonSyntaxHighlight json={response.body} /></ScrollArea></TabsContent><TabsContent value="headers" className="flex-1 w-full bg-muted rounded-b-lg overflow-hidden"><ScrollArea className="h-full"><pre className="text-xs p-4 whitespace-pre-wrap break-all font-mono">{JSON.stringify(response.headers, null, 2)}</pre></ScrollArea></TabsContent></Tabs><div className="absolute top-2 right-2 opacity-0 group-hover/response:opacity-100 transition-opacity"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={copyResponseToClipboard}>{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent><p>{copied ? "Copied!" : "Copy response body"}</p></TooltipContent></Tooltip></div></Card>) : (<div className="flex-1 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-md"><p>Send a request to see the response</p></div>)}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
