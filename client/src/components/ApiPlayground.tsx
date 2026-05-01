import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench, Copy, Clock, ChevronsUpDown, X, Plus } from 'lucide-react';

interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  in: 'query' | 'body' | 'header' | 'path';
}

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: ApiParameter[];
}

interface RequestData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers: Array<{ id: string; key: string; value: string }>;
  body: string;
  params: Record<string, string>;
}

interface ResponseData {
  status: number;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

interface ApiPlaygroundProps {
  endpoints: ApiEndpoint[];
  onSendRequest: (request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
    params?: Record<string, string>;
  }) => Promise<ResponseData>;
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET': return 'text-green-400';
    case 'POST': return 'text-blue-400';
    case 'PUT': return 'text-yellow-400';
    case 'DELETE': return 'text-red-400';
    default: return 'text-foreground';
  }
};

export const ApiPlayground: React.FC<ApiPlaygroundProps> = ({ endpoints, onSendRequest, baseUrl, defaultHeaders }) => {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(endpoints[0]?.id ?? null);
  const [request, setRequest] = useState<RequestData>(() => {
    const initialEndpoint = endpoints[0];
    return {
      method: initialEndpoint?.method ?? 'GET',
      path: initialEndpoint?.path ?? '',
      headers: defaultHeaders ? Object.entries(defaultHeaders).map(([key, value], i) => ({ id: `header-${i}`, key, value })) : [],
      body: '',
      params: {},
    };
  });
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ request: RequestData; response: ResponseData }>>([]);

  const selectedEndpoint = useMemo(() => endpoints.find(e => e.id === selectedEndpointId), [endpoints, selectedEndpointId]);

  useEffect(() => {
    if (selectedEndpoint) {
      const newParams: Record<string, string> = {};
      selectedEndpoint.parameters?.forEach(p => {
        if (p.in === 'path') {
          newParams[p.name] = '';
        }
      });
      setRequest({
        method: selectedEndpoint.method,
        path: selectedEndpoint.path,
        headers: defaultHeaders ? Object.entries(defaultHeaders).map(([key, value], i) => ({ id: `header-${i}`, key, value })) : [],
        body: selectedEndpoint.parameters?.some(p => p.in === 'body') ? JSON.stringify({}, null, 2) : '',
        params: newParams,
      });
      setResponse(null);
    }
  }, [selectedEndpoint, defaultHeaders]);

  const handleSendRequest = useCallback(async () => {
    setIsLoading(true);
    setResponse(null);
    try {
      const headersObject = request.headers.reduce((acc, h) => {
        if (h.key) acc[h.key] = h.value;
        return acc;
      }, {} as Record<string, string>);

      let finalPath = request.path;
      Object.entries(request.params).forEach(([key, value]) => {
        finalPath = finalPath.replace(`:${key}`, encodeURIComponent(value));
      });

      const res = await onSendRequest({
        method: request.method,
        path: finalPath,
        headers: headersObject,
        body: request.body || undefined,
      });
      setResponse(res);
      setHistory(prev => [{ request, response: res }, ...prev.slice(0, 19)]);
    } catch (error) {
      console.error('API Request Failed:', error);
      const errResponse: ResponseData = {
        status: 500,
        headers: {},
        body: JSON.stringify({ error: (error as Error).message }, null, 2),
        duration: 0,
      };
      setResponse(errResponse);
      setHistory(prev => [{ request, response: errResponse }, ...prev.slice(0, 19)]);
    } finally {
      setIsLoading(false);
    }
  }, [request, onSendRequest]);

  const handleHeaderChange = (id: string, key: string, value: string) => {
    setRequest(prev => ({
      ...prev,
      headers: prev.headers.map(h => h.id === id ? { ...h, key, value } : h),
    }));
  };

  const addHeader = () => {
    setRequest(prev => ({
      ...prev,
      headers: [...prev.headers, { id: `header-${Date.now()}`, key: '', value: '' }],
    }));
  };

  const removeHeader = (id: string) => {
    setRequest(prev => ({ ...prev, headers: prev.headers.filter(h => h.id !== id) }));
  };

  const handleParamChange = (name: string, value: string) => {
    setRequest(prev => ({ ...prev, params: { ...prev.params, [name]: value } }));
  };

  const fullUrl = useMemo(() => {
    let finalPath = request.path;
    Object.entries(request.params).forEach(([key, value]) => {
      finalPath = finalPath.replace(`:${key}`, value || `:${key}`);
    });
    return `${baseUrl}${finalPath}`;
  }, [baseUrl, request.path, request.params]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex h-[calc(100vh-200px)] w-full bg-background text-foreground font-sans">
      <aside className="w-1/4 border-r border-border p-4">
        <h2 className="text-lg font-semibold mb-4">Endpoints</h2>
        <ScrollArea className="h-full">
          {endpoints.map(endpoint => (
            <button
              key={endpoint.id}
              onClick={() => setSelectedEndpointId(endpoint.id)}
              className={cn(
                'w-full text-left p-2 rounded-md text-sm transition-colors',
                selectedEndpointId === endpoint.id ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <div className="flex items-center">
                <span className={cn('font-bold w-16', getMethodColor(endpoint.method))}>{endpoint.method}</span>
                <span className="truncate">{endpoint.path}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{endpoint.description}</p>
            </button>
          ))}
        </ScrollArea>
      </aside>

      <main className="w-3/4 flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          {/* Request Panel */}
          <motion.div layout className="w-1/2 h-full flex flex-col p-4 border-r border-border">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle>Request</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex gap-2">
                  <Select value={request.method} onValueChange={(value: 'GET' | 'POST' | 'PUT' | 'DELETE') => setRequest(p => ({ ...p, method: value }))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                        <SelectItem key={m} value={m} className={getMethodColor(m)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={fullUrl} readOnly className="font-mono" />
                  <Button onClick={handleSendRequest} disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send'}
                  </Button>
                </div>

                <Tabs defaultValue="params" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList>
                    <TabsTrigger value="params">Params</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                    <TabsTrigger value="body">Body</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="params" className="flex-1 overflow-auto mt-2">
                    <div className="space-y-2">
                      {selectedEndpoint?.parameters?.filter(p => p.in === 'path').map(p => (
                        <div key={p.name} className="flex items-center gap-2">
                          <span className="w-1/3 font-mono text-sm">{p.name}</span>
                          <Input
                            value={request.params[p.name] || ''}
                            onChange={e => handleParamChange(p.name, e.target.value)}
                            placeholder={p.type}
                          />
                        </div>
                      ))}
                      {selectedEndpoint?.parameters?.filter(p => p.in === 'path').length === 0 && (
                        <p className="text-sm text-muted-foreground">No path parameters for this endpoint.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="headers" className="flex-1 overflow-auto mt-2">
                    <div className="space-y-2">
                      {request.headers.map(header => (
                        <div key={header.id} className="flex items-center gap-2">
                          <Input
                            value={header.key}
                            onChange={e => handleHeaderChange(header.id, e.target.value, header.value)}
                            placeholder="Key"
                            className="font-mono"
                          />
                          <Input
                            value={header.value}
                            onChange={e => handleHeaderChange(header.id, header.key, e.target.value)}
                            placeholder="Value"
                            className="font-mono"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeHeader(header.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addHeader} className="mt-2">
                      <Plus className="h-4 w-4 mr-2" /> Add Header
                    </Button>
                  </TabsContent>

                  <TabsContent value="body" className="flex-1 overflow-auto mt-2">
                    <Textarea
                      value={request.body}
                      onChange={e => setRequest(p => ({ ...p, body: e.target.value }))}
                      placeholder='Enter JSON body...'
                      className="font-mono h-full resize-none"
                      disabled={request.method === 'GET' || request.method === 'DELETE'}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="flex-1 overflow-auto mt-2">
                    <ScrollArea className="h-full">
                      {history.map((entry, index) => (
                        <button key={index} className="w-full text-left p-2 rounded-md hover:bg-accent/50" onClick={() => { setRequest(entry.request); setResponse(entry.response); }}>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold', getMethodColor(entry.request.method))}>{entry.request.method}</span>
                            <span className="truncate text-sm">{entry.request.path}</span>
                            <Badge variant={entry.response.status >= 400 ? 'destructive' : 'secondary'}>{entry.response.status}</Badge>
                          </div>
                        </button>
                      ))}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Response Panel */}
          <motion.div layout className="w-1/2 h-full flex flex-col p-4">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle>Response</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                <AnimatePresence>
                  {response ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex-1 flex flex-col gap-4 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Status:</span>
                          <Badge variant={response.status >= 400 ? 'destructive' : 'default'}>{response.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{response.duration}ms</span>
                        </div>
                      </div>

                      <Tabs defaultValue="body" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList>
                          <TabsTrigger value="body">Body</TabsTrigger>
                          <TabsTrigger value="headers">Headers</TabsTrigger>
                        </TabsList>
                        <TabsContent value="body" className="flex-1 relative mt-2">
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => copyToClipboard(response.body)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <ScrollArea className="h-full rounded-md border border-border">
                            <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-all">{response.body}</pre>
                          </ScrollArea>
                        </TabsContent>
                        <TabsContent value="headers" className="flex-1 mt-2">
                          <ScrollArea className="h-full rounded-md border border-border">
                            <div className="p-4 font-mono text-sm space-y-1">
                              {Object.entries(response.headers).map(([key, value]) => (
                                <div key={key} className="flex">
                                  <span className="font-semibold w-1/3 break-all">{key}:</span>
                                  <span className="w-2/3 break-all">{value}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                      <Wrench className="h-12 w-12 mb-4" />
                      <p>Send a request to see the response here.</p>
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
